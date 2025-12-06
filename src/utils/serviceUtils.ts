// --- START OF FILE src/utils/serviceUtils.ts ---
import { supabase } from "@/integrations/supabase/client";
import type { Service, ServicePart, Product, Customer } from "@/types/service";
import type { Sale, SaleItem, Account, AccountTransaction } from "@/types/backup";
import { useToast } from "@/hooks/use-toast"; // Hook'u import et, ama direkt çağırma
import { printServiceRecord } from "@/utils/printUtils"; // Yazdırma için import

/**
 * Ürün stok seviyesini kontrol eder ve ihtiyaç listesine ekler (eğer gerekliyse).
 */
async function checkAndAddNeed(
  productId: string,
  productName: string,
  currentQuantity: number,
  minStockLevel: number,
  showToast: (options: any) => void
) {
  if (minStockLevel > 0 && currentQuantity < minStockLevel) {
    try {
      const { count, error: checkError } = await supabase
        .from("needs")
        .select("id", { count: "exact", head: true })
        .eq("product_id", productId);

      if (checkError) {
        console.error("[checkAndAddNeed] İhtiyaç kontrol hatası:", checkError);
        return;
      }

      if (count === 0) {
        console.log(`[checkAndAddNeed] "${productName}" için ihtiyaç listesine ekleniyor...`);
        const { error: insertError } = await supabase.from("needs").insert({
          date: new Date().toISOString(),
          description: `${productName} (Stok Azaldı)`,
          quantity: Math.max(minStockLevel - currentQuantity, 1),
          product_id: productId,
          supplier: null,
        });

        if (insertError) {
          console.error("[checkAndAddNeed] Otomatik ihtiyaç ekleme hatası:", insertError);
          showToast({
            title: "Uyarı",
            description: `"${productName}" ihtiyaç listesine eklenemedi.`,
            variant: "destructive",
          });
        } else {
          console.log(`[checkAndAddNeed] "${productName}" ihtiyaç listesine eklendi.`);
          showToast({
            title: "Bilgi",
            description: `"${productName}" stok seviyesi azaldı, ihtiyaç listesine eklendi.`,
          });
          window.dispatchEvent(new CustomEvent("needs-updated"));
        }
      } else {
        console.log(`[checkAndAddNeed] "${productName}" zaten ihtiyaç listesinde.`);
      }
    } catch (error) {
      console.error("[checkAndAddNeed] Hata:", error);
    }
  }
}

/**
 * Servis durumuna göre renk döndürür.
 */
export const getStatusColor = (status: Service["status"] | null | undefined): string => {
  switch (status) {
    case "pending":
      return "text-orange-600";
    case "in_progress":
      return "text-blue-600";
    case "completed":
      return "text-green-600";
    case "cancelled":
      return "text-red-600";
    default:
      return "text-gray-500";
  }
};

/**
 * Servis durumuna göre metin döndürür.
 */
export const getStatusText = (status: Service["status"] | null | undefined): string => {
  switch (status) {
    case "pending":
      return "Beklemede";
    case "in_progress":
      return "İşlemde";
    case "completed":
      return "Tamamlandı";
    case "cancelled":
      return "İptal Edildi";
    default:
      return "Bilinmiyor";
  }
};

/**
 * Tarih formatlama yardımcı fonksiyonu.
 */
export const formatDate = (dateString: string | null | undefined): string => {
  if (!dateString) return "-";
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
      return "Geçersiz T.";
    }
    return `${date.toLocaleDateString("tr-TR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    })} ${date.toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" })}`;
  } catch (e) {
    return "Format H.";
  }
};

/**
 * Servis işlemini tamamlar.
 */
export const completeServiceProcess = async (
  service: Service,
  usedParts: ServicePart[],
  showToast: (options: any) => void
) => {
  console.log(`[completeServiceProcess] Başladı - Servis ID: ${service.id}`);

  if (service.status !== "completed" || service.cost <= 0) {
    console.log("completeServiceProcess: Koşullar sağlanmadı, çıkılıyor.");
    return;
  }

  if (!usedParts) {
    usedParts = [];
  }

  const stockParts = usedParts.filter((part) => part.isStockItem && part.productId);
  console.log(`[completeServiceProcess] İşlenecek stok parçaları (${stockParts.length} adet)`);

  let productsInfo: Product[] = [];

  // --- 1. Stok Kontrolü ve Düşümü ---
  if (stockParts.length > 0) {
    console.log("[completeServiceProcess] Stok kontrolü ve düşümü başlıyor...");

    const productIds = stockParts.map((p) => p.productId!);
    const { data: fetchedProductsData, error: fetchError } = await supabase
      .from("products")
      .select("*")
      .in("id", productIds);

    if (fetchError) {
      throw new Error(`Stok bilgisi alınamadı: ${fetchError.message}`);
    }

    productsInfo = (fetchedProductsData || []) as Product[];
    const productMap = new Map<string, Product>(productsInfo.map((p) => [p.id, p]));

    if (productIds.length !== productMap.size) {
      const missingIds = productIds.filter((id) => !productMap.has(id));
      throw new Error(`Bazı stok ürünleri (${missingIds.join(", ")}) bulunamadı.`);
    }

    for (const part of stockParts) {
      const product = productMap.get(part.productId!);
      if (!product) {
        console.warn(`Döngüde ürün bulunamadı: ID=${part.productId}`);
        continue;
      }

      const currentStock = product.quantity ?? 0;
      const requiredStock = part.quantity ?? 0;

      if (currentStock < requiredStock) {
        throw new Error(
          `Yetersiz stok: "${product.name}" (Mevcut: ${currentStock}, Gereken: ${requiredStock})`
        );
      }

      const newQuantity = currentStock - requiredStock;
      console.log(`[completeServiceProcess] Supabase update: ID=${part.productId}, Yeni Miktar=${newQuantity}`);

      const { data: updateData, error: updateError } = await supabase
        .from("products")
        .update({ quantity: newQuantity })
        .eq("id", part.productId!)
        .select();

      console.log(`[completeServiceProcess] Stok güncelleme sonucu (ID: ${part.productId}):`, {
        updateData,
        updateError,
      });

      if (updateError) {
        throw new Error(`"${product.name}" stoğu güncellenemedi: ${updateError.message}`);
      }

      if (!updateData || updateData.length === 0) {
        console.warn(
          `Stok güncellendi ancak veri dönmedi (ID: ${part.productId}). RLS Engeli?`
        );
      }

      await checkAndAddNeed(part.productId!, product.name ?? "?", newQuantity, product.min_stock_level ?? 0, showToast);
    }

    console.log("[completeServiceProcess] Stok düşümü tamamlandı.");
    window.dispatchEvent(new CustomEvent("stock-updated"));
  } else {
    console.log("[completeServiceProcess] Stok düşümü gerektiren parça yok.");
  }

  // --- 2. Satış Kaydı Oluşturma ---
  console.log("[completeServiceProcess] Satış kaydı oluşturuluyor...");
  const saleItems: SaleItem[] = usedParts.map((part) => {
    const productInfo = productsInfo.find((p) => p.id === part.productId);
    return {
      id: part.productId,
      code: productInfo?.code ?? (part.productId ? `STOK-${part.productId.substring(0, 6)}` : `SERV-${part.id.substring(0, 6)}`),
      name: part.name,
      cartQuantity: part.quantity,
      unit: productInfo?.unit ?? "adet",
      purchasePrice: productInfo?.purchase_price ?? 0,
      sellingPrice: part.unitPrice,
    };
  });

  const saleData: Omit<Sale, "id" | "created_at" | "payment_account_id" | "payment_method"> = {
    date: new Date().toISOString(),
    items: saleItems,
    total: service.cost,
    discount_amount: 0,
    net_total: service.cost,
    customer_id: service.customer_id,
    is_stockless: stockParts.length === 0,
    related_service_id: service.id,
  };

  const { data: insertedSale, error: saleInsertError } = await supabase
    .from("sales")
    .insert(saleData)
    .select("id")
    .single();

  if (saleInsertError || !insertedSale) {
    console.error("Satış kaydı oluşturma hatası:", saleInsertError);
    throw new Error(`Servis için satış kaydı oluşturulamadı: ${saleInsertError?.message}`);
  }

  console.log(`[completeServiceProcess] Satış kaydı oluşturuldu: ID=${insertedSale.id}`);

  // --- 3. Hesap Hareketi ve Bakiye Güncelleme ---
  console.log("[completeServiceProcess] Hesap hareketi oluşturuluyor...");

  const { data: accountData, error: accError } = await supabase
    .from("accounts")
    .select("id, current_balance")
    .eq("type", "cash")
    .order("is_default", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (accError) {
    throw new Error(`Ödeme için kasa hesabı bulunamadı: ${accError.message}`);
  }

  if (!accountData) {
    throw new Error("Gelirin işleneceği bir 'Kasa' tipi hesap bulunamadı.");
  }

  const paymentAccountId = accountData.id;
  const currentBalance = accountData.current_balance ?? 0;
  const newBalance = currentBalance + service.cost;

  const accountTransactionData: Omit<AccountTransaction, "id" | "created_at"> = {
    date: saleData.date,
    account_id: paymentAccountId,
    type: "income",
    amount: service.cost,
    balance_after: newBalance,
    description: `Servis Geliri: ${service.customerName || "?"} (Servis: ${service.id.substring(0, 6)}, Satış: ${insertedSale.id.substring(0, 6)})`,
    related_sale_id: insertedSale.id,
    related_service_id: service.id,
    related_customer_tx_id: null,
    transfer_pair_id: null,
    expense_category_id: null,
  };

  const { data: insertedTx, error: txInsertError } = await supabase
    .from("account_transactions")
    .insert(accountTransactionData)
    .select("id")
    .single();

  if (txInsertError || !insertedTx) {
    await supabase.from("sales").delete().eq("id", insertedSale.id);
    throw new Error(`Hesap hareketi oluşturulamadı: ${txInsertError?.message}`);
  }

  console.log(`[completeServiceProcess] Hesap hareketi eklendi: ID=${insertedTx.id}`);

  const { error: accUpdateError } = await supabase
    .from("accounts")
    .update({ current_balance: newBalance })
    .eq("id", paymentAccountId);

  if (accUpdateError) {
    await supabase.from("account_transactions").delete().eq("id", insertedTx.id);
    await supabase.from("sales").delete().eq("id", insertedSale.id);
    throw new Error(`Hesap bakiyesi güncellenemedi: ${accUpdateError.message}`);
  }

  console.log(`[completeServiceProcess] Hesap bakiyesi güncellendi.`);
  console.log(`[completeServiceProcess] İşlemler başarıyla tamamlandı.`);

  window.dispatchEvent(new CustomEvent("sales-updated"));
  window.dispatchEvent(new CustomEvent("account-transaction-saved"));
};
// --- END OF FILE src/utils/serviceUtils.ts ---