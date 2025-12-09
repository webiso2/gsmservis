// --- START OF FILE src/utils/wholesalerUtils.ts ---

import { supabase } from "@/integrations/supabase/client";
// Gerekli tipleri import et
import type { PurchaseInvoice, PurchaseInvoiceItem, WholesalerTransaction, AccountTransaction } from "@/types/backup";

interface DeleteInvoiceResult {
    success: boolean;
    message: string;
}

/**
 * Belirtilen Alım Faturasını ve ilişkili kayıtları siler,
 * toptancı borcunu (TRY ve USD) ve ürün stoklarını geri alır.
 * @param invoiceId Silinecek faturanın ID'si.
 * @param wholesalerId Faturanın ait olduğu toptancı ID'si.
 * @returns İşlemin başarılı olup olmadığını ve mesajı içeren bir nesne.
 */
export const deletePurchaseInvoiceAndRollback = async (
    invoiceId: string,
    wholesalerId: string
): Promise<DeleteInvoiceResult> => {
    console.log(`[deletePurchaseInvoiceAndRollback] Fatura silme işlemi başlıyor: InvoiceID=${invoiceId}, WholesalerID=${wholesalerId}`);

    let invoiceData: PurchaseInvoice | null = null;
    let transactionData: Pick<WholesalerTransaction, 'id'> | null = null;

    try {
        // 1. Fatura Verisini Çek
        console.log("Adım 1: Fatura verisi çekiliyor...");
        const { data: fetchedInvoice, error: fetchInvoiceError } = await supabase
            .from('purchase_invoices')
            .select('*')
            .eq('id', invoiceId)
            .single();

        if (fetchInvoiceError) throw new Error(`Fatura bulunamadı veya çekilemedi: ${fetchInvoiceError.message}`);
        if (!fetchedInvoice) throw new Error("Fatura verisi boş geldi.");
        invoiceData = fetchedInvoice as PurchaseInvoice;
        console.log("Fatura verisi çekildi. Toplam TRY:", invoiceData.total_try);

        // 2. İlişkili Toptancı Hareketini Bul
        console.log("Adım 2: İlişkili toptancı hareketi aranıyor...");
        const { data: fetchedTransaction, error: fetchTxError } = await supabase
            .from('wholesaler_transactions')
            .select('id')
            .eq('related_purchase_invoice_id', invoiceId)
            .maybeSingle();

        if (fetchTxError) console.warn("İlişkili toptancı hareketi aranırken hata (silme işlemine devam edilecek):", fetchTxError.message);
        if (fetchedTransaction) {
            transactionData = fetchedTransaction;
            console.log("İlişkili toptancı hareketi bulundu. ID:", transactionData.id);
        } else {
            console.warn("İlişkili toptancı hareketi bulunamadı!");
        }

        // 3. Toptancı Hareketini Sil (varsa)
        if (transactionData) {
            console.log("Adım 3: Toptancı hareketi siliniyor...");
            const { error: deleteTxError } = await supabase.from('wholesaler_transactions').delete().eq('id', transactionData.id);
            if (deleteTxError) console.error("Toptancı hareketi silinirken hata:", deleteTxError.message);
            else console.log("Toptancı hareketi silindi.");
        }

        // 4. Alım Faturasını Sil
        console.log("Adım 4: Alım faturası siliniyor...");
        const { error: deleteInvoiceError } = await supabase.from('purchase_invoices').delete().eq('id', invoiceId);
        if (deleteInvoiceError) throw new Error(`Alım faturası silinemedi: ${deleteInvoiceError.message}`);
        console.log("Alım faturası silindi.");

        // 5. Toptancı Borcunu Azalt (HEM TRY HEM USD)
        let totalUsdInInvoice = 0;
        if (invoiceData.notes) {
            const lines = invoiceData.notes.split('\n');
            const usdLine = lines.find(line => line.toLowerCase().startsWith('toplam usd:'));
            if (usdLine) { const usdValue = parseFloat(usdLine.split(':')[1]?.trim() || 'NaN'); if (!isNaN(usdValue)) { totalUsdInInvoice = usdValue; } }
        }
        if (totalUsdInInvoice === 0 && Array.isArray(invoiceData.items)) {
            totalUsdInInvoice = invoiceData.items.reduce((sum, item: PurchaseInvoiceItem) => { if (item.purchase_price_currency === 'USD') { const quantity = item.quantity ?? 0; const price = item.purchase_price_value ?? 0; return sum + (quantity * price); } return sum; }, 0);
        }

        if (invoiceData.total_try > 0 || totalUsdInInvoice > 0) {
            console.log(`Adım 5: Toptancı borcu azaltılıyor (RPC): WholesalerID=${wholesalerId}, TRY Değişim=${-invoiceData.total_try}, USD Değişim=${-totalUsdInInvoice}`);
            const { error: debtUpdateError } = await supabase.rpc('increment_wholesaler_debt', {
                wholesaler_id_input: wholesalerId,
                debt_change_try: -invoiceData.total_try,
                debt_change_usd: -totalUsdInInvoice
            });
            if (debtUpdateError) throw new Error(`Toptancı borcu güncellenemedi: ${debtUpdateError.message}`);
            console.log("Toptancı borcu güncellendi.");
            window.dispatchEvent(new CustomEvent('wholesaler-updated', { detail: { wholesalerId: wholesalerId } }));
        } else {
            console.log("Adım 5: Fatura tutarı 0 veya negatif, borç güncellemesi atlandı.");
        }

        // 6. Stokları Geri Al (Azalt)
        const stockItems = invoiceData.items?.filter(item => item.product_id) ?? [];
        if (stockItems.length > 0) {
            console.log(`Adım 6: Stoklar geri alınıyor (${stockItems.length} kalem)...`);
            const stockRollbackPromises = stockItems.map(async (item) => {
                try {
                    const quantityChange = -Math.abs(item.quantity);
                    const { error } = await supabase.rpc('increment_product_quantity', { product_id_input: item.product_id!, quantity_change: quantityChange });
                    if (error) { console.error(`Stok geri alma hatası (RPC) ${item.product_id}:`, error); return { id: item.product_id, success: false }; }
                    return { id: item.product_id, success: true };
                } catch (e) { console.error(`Stok geri alma Exception ${item.product_id}:`, e); return { id: item.product_id, success: false }; }
            });
            const results = await Promise.all(stockRollbackPromises);
            const failedRollbacks = results.filter(r => !r.success);
            if (failedRollbacks.length > 0) { console.error("Başarısız stok geri alma işlemleri:", failedRollbacks); return { success: true, message: `Fatura silindi ancak ${failedRollbacks.length} ürünün stoğu geri alınırken sorun oluştu.` }; }
            else { console.log("Tüm stoklar başarıyla geri alındı."); window.dispatchEvent(new CustomEvent('products-updated')); }
        } else {
            console.log("Adım 6: Stok geri alma işlemi gerektiren ürün yok.");
        }

        console.log("[deletePurchaseInvoiceAndRollback] İşlem başarıyla tamamlandı.");
        return { success: true, message: "Fatura başarıyla silindi ve ilgili kayıtlar geri alındı." };

    } catch (error: any) {
        console.error("[deletePurchaseInvoiceAndRollback] Genel Hata:", error);
        return { success: false, message: `Fatura silinirken bir hata oluştu: ${error.message}.` };
    }
};


interface DeletePaymentResult {
    success: boolean;
    message: string;
}

/**
 * Toptancıya yapılan bir ödeme hareketini ve ilişkili hesap hareketini siler,
 * toptancı borcunu (sadece TRY) ve hesap bakiyesini geri alır.
 * @param wholesalerTxId Silinecek toptancı hareket ID'si.
 * @param wholesalerId İlişkili toptancı ID'si.
 * @returns İşlemin başarılı olup olmadığını ve mesajı içeren bir nesne.
 */
export const deleteWholesalerPaymentAndRollback = async (
    wholesalerTxId: string,
    wholesalerId: string
): Promise<DeletePaymentResult> => {
    console.log(`[deleteWholesalerPayment] Başladı: WholesalerTxID=${wholesalerTxId}`);

    let wholesalerTxData: Pick<WholesalerTransaction, 'id' | 'amount' | 'related_account_tx_id'> | null = null;
    let accountTxData: Pick<AccountTransaction, 'id' | 'account_id' | 'amount'> | null = null;

    try {
        // 1. Toptancı Hareketini Çek
        console.log("Adım 1: Toptancı hareketi çekiliyor...");
        const { data: fetchedWtx, error: fetchWtxError } = await supabase.from('wholesaler_transactions').select('id, amount, related_account_tx_id').eq('id', wholesalerTxId).maybeSingle();
        if (fetchWtxError) throw new Error(`Toptancı hareketi bulunamadı: ${fetchWtxError.message}`);
        if (!fetchedWtx) throw new Error("Toptancı hareket verisi boş geldi.");
        wholesalerTxData = fetchedWtx;
        if (wholesalerTxData.amount >= 0) throw new Error("Silinmeye çalışılan hareket bir ödeme değil.");
        console.log(`Toptancı hareketi bulundu. Tutar: ${wholesalerTxData.amount}, İlişkili AccTxID: ${wholesalerTxData.related_account_tx_id}`);

        // 2. İlişkili Hesap Hareketini Çek (varsa)
        if (wholesalerTxData.related_account_tx_id) {
            console.log("Adım 2: İlişkili hesap hareketi çekiliyor...");
            const { data: fetchedAtx, error: fetchAtxError } = await supabase.from('account_transactions').select('id, account_id, amount').eq('id', wholesalerTxData.related_account_tx_id).maybeSingle();
            if (fetchAtxError) console.warn("İlişkili hesap hareketi çekilirken hata (devam edilecek):", fetchAtxError.message);
            if (fetchedAtx) {
                accountTxData = fetchedAtx;
                if (accountTxData.amount !== wholesalerTxData.amount) { console.warn(`Miktar uyuşmazlığı! WholesalerTx: ${wholesalerTxData.amount}, AccountTx: ${accountTxData.amount}`); }
                console.log(`İlişkili hesap hareketi bulundu. HesapID: ${accountTxData.account_id}, Tutar: ${accountTxData.amount}`);
            } else { console.warn("İlişkili hesap hareketi bulunamadı!"); }
        } else { console.warn("Toptancı hareketinin ilişkili hesap hareketi ID'si yok!"); }

        // 3. Hesap Hareketini Sil (varsa)
        if (accountTxData) {
            console.log(`Adım 3: Hesap hareketi siliniyor (ID: ${accountTxData.id})...`);
            const { error: deleteAtxError } = await supabase.from('account_transactions').delete().eq('id', accountTxData.id);
            if (deleteAtxError) throw new Error(`İlişkili hesap hareketi silinemedi: ${deleteAtxError.message}`);
            console.log("Hesap hareketi silindi.");
        }

        // 4. Toptancı Hareketini Sil
        console.log(`Adım 4: Toptancı hareketi siliniyor (ID: ${wholesalerTxData.id})...`);
        const { error: deleteWtxError } = await supabase.from('wholesaler_transactions').delete().eq('id', wholesalerTxData.id);
        if (deleteWtxError) { throw new Error(`Toptancı hareketi silinemedi: ${deleteWtxError.message}. Hesap hareketi silinmiş olabilir, kontrol edin!`); }
        console.log("Toptancı hareketi silindi.");

        // 5. Hesap Bakiyesini Geri Al (Artır) (Eğer hesap hareketi bulunduysa)
        if (accountTxData && accountTxData.account_id) {
            const balanceChange = -accountTxData.amount; // Negatifin tersi
            console.log(`Adım 5: Hesap bakiyesi artırılıyor (RPC): HesapID=${accountTxData.account_id}, Değişim=${balanceChange}`);
            const { error: accUpdateError } = await supabase.rpc('increment_account_balance', { account_id_input: accountTxData.account_id, balance_change: balanceChange });
            if (accUpdateError) throw new Error(`Hesap bakiyesi güncellenemedi: ${accUpdateError.message}. Hareketler silindi!`);
            console.log("Hesap bakiyesi güncellendi.");
            window.dispatchEvent(new CustomEvent('account-transaction-saved'));
        }

        // 6. Toptancı Borcunu Geri Al (Artır - Sadece TRY)
        const debtChange = -wholesalerTxData.amount; // Negatifin tersi
        console.log(`Adım 6: Toptancı borcu artırılıyor (RPC): WholesalerID=${wholesalerId}, TRY Değişim=${debtChange}, USD Değişim=0`);
        const { error: debtUpdateError } = await supabase.rpc('increment_wholesaler_debt', {
            wholesaler_id_input: wholesalerId,
            debt_change_try: debtChange,
            debt_change_usd: 0
        });
        if (debtUpdateError) throw new Error(`Toptancı borcu güncellenemedi: ${debtUpdateError.message}. Hareketler silindi!`);
        console.log("Toptancı borcu güncellendi.");
        window.dispatchEvent(new CustomEvent('wholesaler-updated', { detail: { wholesalerId: wholesalerId } }));

        console.log("[deleteWholesalerPayment] İşlem başarıyla tamamlandı.");
        return { success: true, message: "Ödeme hareketi başarıyla silindi ve ilgili kayıtlar geri alındı." };

    } catch (error: any) {
        console.error("[deleteWholesalerPayment] Genel Hata:", error);
        return { success: false, message: `Ödeme silinirken bir hata oluştu: ${error.message}.` };
    }
};

interface DeleteStandaloneResult {
    success: boolean;
    message: string;
}

/**
 * Bağımsız (faturası olmayan) bir toptancı stok giriş hareketini siler ve bakiyeyi (sadece TRY) geri alır.
 * @param transactionId Silinecek hareket ID'si.
 * @param wholesalerId Toptancı ID'si.
 * @returns Sonuç nesnesi.
 */
export const deleteStandaloneTransactionAndRollback = async (
    transactionId: string,
    wholesalerId: string
): Promise<DeleteStandaloneResult> => {
    console.log(`[deleteStandaloneTx] Başladı: TxID=${transactionId}`);

    try {
        // 1. Hareketi Çek
        const { data: tx, error: fetchError } = await supabase
            .from('wholesaler_transactions')
            .select('id, amount, related_purchase_invoice_id')
            .eq('id', transactionId)
            .single();

        if (fetchError) throw new Error(`Hareket bulunamadı: ${fetchError.message}`);
        if (!tx) throw new Error("Hareket verisi yok.");
        if (tx.related_purchase_invoice_id) throw new Error("Bu hareket bir faturaya bağlı. Lütfen fatura silme işlemini kullanın.");

        console.log(`Hareket bulundu. Tutar: ${tx.amount} TRY`);

        // 2. Hareketi Sil
        const { error: deleteError } = await supabase
            .from('wholesaler_transactions')
            .delete()
            .eq('id', transactionId);

        if (deleteError) throw new Error(`Hareket silinemedi: ${deleteError.message}`);

        // 3. Borcu Geri Al
        // Alış işlemi "+borç" demektir. Silinince "-borç" (azaltma) yapmalıyız.
        const debtChangeTry = -(tx.amount);
        const debtChangeUsd = 0; // Şimdilik 0 varsayıyoruz

        console.log(`Borç güncelleniyor (RPC): TRY=${debtChangeTry}`);
        const { error: rpcError } = await supabase.rpc('increment_wholesaler_debt', {
            wholesaler_id_input: wholesalerId,
            debt_change_try: debtChangeTry,
            debt_change_usd: debtChangeUsd
        });

        if (rpcError) throw new Error(`Borç güncellenemedi: ${rpcError.message}. (Hareket silindi ancak bakiye güncellenemedi!)`);

        // 4. Update UI
        window.dispatchEvent(new CustomEvent('wholesaler-updated', { detail: { wholesalerId } }));

        return { success: true, message: "İşlem kaydı silindi ve bakiye güncellendi." };

    } catch (error: any) {
        console.error("Bağımsız işlem silme hatası:", error);
        return { success: false, message: `Hata: ${error.message}` };
    }
};

// --- END OF FILE src/utils/wholesalerUtils.ts ---