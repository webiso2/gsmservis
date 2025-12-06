// --- START OF FILE src/StockModule.tsx ---

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { X, PackagePlus, FileEdit, PackageMinus, Plus, Minus, Search, Loader2, ArrowUpDown, ArrowUp, ArrowDown, Save } from 'lucide-react'; // Save ikonu eklendi
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
// import { ScrollArea } from "@/components/ui/scroll-area"; // Manuel scroll
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
// backup.ts içindeki tipleri kullanıyoruz (veya tiplerinizin olduğu dosya)
import type { Product, Wholesaler, WholesalerTransaction } from "@/types/backup";

// --- Tipler ---
// Product tipi backup.ts'den geldiği için burada tekrar tanımlamaya gerek yok.
interface FormData { code: string; name: string; description: string; category: string; quantity: string; unit: string; purchase_price: string; selling_price: string; min_stock_level: string; supplier: string; }
const initialFormData: FormData = { code: "", name: "", description: "", category: "", quantity: "0", unit: "adet", purchase_price: "0", selling_price: "0", min_stock_level: "0", supplier: "" };
interface StockModuleProps { onClose: () => void; }

// İhtiyaç kontrol fonksiyonu (Mevcut haliyle bırakıldı)
async function checkAndAddNeed(productId: string, productName: string, currentQuantity: number, minStockLevel: number, toastFn: (options: any) => void) {
     if (minStockLevel <= 0 || currentQuantity >= minStockLevel) return;
     try {
         const { count, error: checkError } = await supabase.from('needs').select('id', { count: 'exact', head: true }).eq('product_id', productId);
         if (checkError) { console.error("İhtiyaç Kontrol hatası:", checkError); return; }
         if (count === 0) {
             const quantityNeeded = minStockLevel - currentQuantity > 0 ? minStockLevel - currentQuantity : 1;
             const { error: insertError } = await supabase.from('needs').insert({ date: new Date().toISOString(), description: `${productName} (Stok Azaldı)`, quantity: quantityNeeded, product_id: productId, supplier: null });
             if (insertError) {
                 console.error("Otomatik ihtiyaç EKLEME hatası:", insertError);
                 toastFn({ title: "Hata", description: `"${productName}" ihtiyaç listesine eklenemedi: ${insertError.message}`, variant: "destructive" });
             } else {
                 toastFn({ title: "Bilgi", description: `"${productName}" ihtiyaç listesine eklendi.` });
                 window.dispatchEvent(new CustomEvent('needs-updated'));
             }
         }
     } catch (error) {
         console.error("[checkAndAddNeed] İhtiyaç ekleme sırasında hata:", error);
     }
 }

type SortColumn = keyof Pick<Product, 'code' | 'name' | 'quantity' | 'selling_price'> | null;
type SortDirection = 'asc' | 'desc';

// Helper function to get wholesaler ID by name
async function getWholesalerIdByName(name: string): Promise<string | null> {
    if (!name) return null;
    try {
        // Tedarikçi isimlerinin wholesalers tablosunda unique olduğunu varsayıyoruz
        const { data, error } = await supabase
            .from('wholesalers')
            .select('id')
            .eq('name', name)
            .maybeSingle();
        if (error) throw error;
        return data?.id || null;
    } catch (error) {
        console.error(`Toptancı ID bulunamadı (${name}):`, error);
        return null; // Hata durumunda null dön
    }
}


const StockModule: React.FC<StockModuleProps> = ({ onClose }) => {
    const [products, setProducts] = useState<Product[]>([]);
    const [formData, setFormData] = useState<FormData>(initialFormData);
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
    const [searchTerm, setSearchTerm] = useState("");
    const [isEditing, setIsEditing] = useState(false);
    const [isLoading, setIsLoading] = useState(false); // Fetch, Delete, Stock Adjust için
    const [isSaving, setIsSaving] = useState(false); // Add, Update için
    const { toast } = useToast();
    const [sortColumn, setSortColumn] = useState<SortColumn>('name');
    const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

    // --- Fonksiyonlar ---
    const fetchProducts = useCallback(async () => { setIsLoading(true); try { const { data, error } = await supabase.from('products').select('*').order('name'); if (error) throw error; const fP: Product[] = (data || []).map(i => ({ id: i.id, created_at: i.created_at, code: i.code, name: i.name, description: i.description ?? '', category: i.category ?? '', quantity: i.quantity ?? 0, unit: i.unit ?? 'adet', purchase_price: i.purchase_price ?? 0, selling_price: i.selling_price ?? 0, min_stock_level: i.min_stock_level ?? 0, supplier: i.supplier ?? '', })); setProducts(fP); } catch (e: any) { console.error("Ürünler Hata:", e); toast({ title: "Hata", description: `Ürünler yüklenemedi: ${e.message}`, variant: "destructive" }); setProducts([]); } finally { setIsLoading(false); } }, [toast]);
    useEffect(() => { fetchProducts(); }, [fetchProducts]);
    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => { const { name, value } = e.target; setFormData(p => ({ ...p, [name]: value })); };
    const handleProductSelect = (product: Product) => { if (isEditing) return; setSelectedProduct(product); setFormData({ code: product.code, name: product.name, description: product.description ?? '', category: product.category ?? '', quantity: product.quantity.toString(), unit: product.unit ?? 'adet', purchase_price: product.purchase_price.toString(), selling_price: product.selling_price.toString(), min_stock_level: product.min_stock_level.toString(), supplier: product.supplier ?? '', }); };
    const prepareDataForSupabase = (data: FormData) => ({ code: data.code, name: data.name, description: data.description || null, category: data.category || null, quantity: parseInt(data.quantity) || 0, unit: data.unit || 'adet', purchase_price: parseFloat(data.purchase_price) || 0, selling_price: parseFloat(data.selling_price) || 0, min_stock_level: parseInt(data.min_stock_level) || 0, supplier: data.supplier || null, });
    const handleAddProduct = async () => { if (isEditing) return; if (!formData.code || !formData.name) { toast({ title: "Uyarı", description: "Kod ve Ad zorunlu.", variant: "destructive" }); return; } setIsSaving(true); try { const pD = prepareDataForSupabase(formData); const { count, error: cE } = await supabase.from('products').select('id',{count:'exact',head:true}).eq('code',pD.code); if(cE) throw cE; if(count !== null && count > 0){ toast({title:"Hata", description:`"${pD.code}" kodu zaten kullanılıyor.`,variant:"destructive"}); setIsSaving(false); return; } const { data, error } = await supabase.from('products').insert([pD]).select().single(); if (error) throw error; if (data) { toast({ title: "Başarılı", description: "Ürün eklendi." }); await fetchProducts(); setFormData(initialFormData); } } catch (e: any) { console.error("Ekleme Hata:", e); toast({ title: "Hata", description: `Ürün eklenemedi: ${e.message}`, variant: "destructive" }); } finally { setIsSaving(false); } };
    const handleEditClick = () => { if (!selectedProduct && !isEditing) { setIsEditing(false); setSelectedProduct(null); setFormData(initialFormData); return; } if (!isEditing && selectedProduct) { setIsEditing(true); } else if (isEditing) { handleUpdateProduct(); } };
    const handleCancelEdit = () => { setIsEditing(false); setSelectedProduct(null); setFormData(initialFormData); };
    const handleDeleteProduct = async () => { if (!selectedProduct || isEditing) return; if (!window.confirm(`"${selectedProduct.name}" isimli ürünü silmek istediğinize emin misiniz? Bu işlem geri alınamaz!`)) return; setIsLoading(true); try { const { error } = await supabase.from('products').delete().eq('id', selectedProduct.id); if (error) { if (error.code === '23503') { toast({ title: "Hata", description: "Bu ürünle ilişkili kayıtlar var, silinemez.", variant: "destructive", duration: 5000 }); } else { throw error; } } else { setProducts(prev => prev.filter(pr => pr.id !== selectedProduct.id)); toast({ title: "Başarılı", description: "Ürün silindi." }); setSelectedProduct(null); setFormData(initialFormData); setIsEditing(false); } } catch (e: any) { console.error("Ürün silme hatası:", e); toast({ title: "Hata", description: `Ürün silinemedi: ${e.message}`, variant: "destructive" }); } finally { setIsLoading(false); } };
    const handleUpdateProduct = async () => { if (!selectedProduct || !isEditing) return; const codeChanged = formData.code !== selectedProduct.code; setIsSaving(true); try { const productData = prepareDataForSupabase(formData); if (codeChanged) { const { count, error: checkError } = await supabase.from('products').select('id',{count:'exact',head:true}).eq('code', productData.code).neq('id',selectedProduct.id); if(checkError) throw checkError; if(count !== null && count > 0){ toast({title:"Hata",description:`"${productData.code}" kodu başka bir ürüne ait.`,variant:"destructive"}); setIsSaving(false); return; } } const { data, error } = await supabase.from('products').update(productData).eq('id', selectedProduct.id).select().single(); if (error) throw error; if (data) { toast({ title: "Başarılı", description: "Ürün güncellendi." }); await fetchProducts(); // Miktar değişmediği için checkAndAddNeed gereksiz
        setIsEditing(false); setSelectedProduct(null); setFormData(initialFormData); } else { toast({title:"Uyarı", description:"Güncelleme yapıldı ancak veri doğrulanamadı."}); await fetchProducts(); setIsEditing(false); setSelectedProduct(null); setFormData(initialFormData); } } catch (error: any) { console.error("Update Hata:", error); toast({ title: "Hata", description: `Ürün güncellenemedi: ${error.message}`, variant: "destructive" }); } finally { setIsSaving(false); } };

    // --- Stok Ayarlama Fonksiyonu (GÜNCELLENDİ) ---
    const handleStockAdjustment = async (type: 'increase' | 'decrease') => {
        if (!selectedProduct || isEditing) return;

        // Stok Azaltma (Mevcut haliyle kalabilir)
        if (type === 'decrease') {
            const promptMessage = `${selectedProduct.name} için azaltılacak miktar:`;
            const amountStr = window.prompt(promptMessage, "1");
            if (amountStr === null) return;
            const adjustmentAmount = parseInt(amountStr);
            if (isNaN(adjustmentAmount) || adjustmentAmount <= 0) { toast({ title:"Hata", description:"Lütfen geçerli pozitif bir miktar girin.", variant:"destructive"}); return; }
            const currentQuantity = selectedProduct.quantity;
            if (adjustmentAmount > currentQuantity) { toast({ title:"Hata", description:"Stoktan fazla azaltma yapılamaz.", variant:"destructive"}); return; }
            const newQuantity = currentQuantity - adjustmentAmount;

            setIsLoading(true);
            try {
                 const { data, error } = await supabase
                   .from('products')
                   .update({ quantity: newQuantity })
                   .eq('id', selectedProduct.id)
                   .select('id, name, quantity, min_stock_level') // Gerekli alanları seç
                   .single();

                if (error) throw error;
                if(data) {
                    toast({ title: "Başarılı", description: "Stok miktarı güncellendi." });
                    await fetchProducts();
                    await checkAndAddNeed(data.id, data.name, newQuantity, data.min_stock_level ?? 0, toast);
                    setSelectedProduct(null); setFormData(initialFormData); setIsEditing(false);
                } else {
                    toast({title:"Uyarı", description:"Stok ayarlandı ancak veri doğrulanamadı."}); await fetchProducts(); setSelectedProduct(null); setFormData(initialFormData); setIsEditing(false);
                }
            } catch (error: any) { console.error("Stok azaltırken hata:", error); toast({ title: "Hata", description: `Stok azaltılamadı: ${error.message}`, variant: "destructive" }); }
            finally { setIsLoading(false); }
            return; // Azaltma işlemi bitti
        }

        // --- Stok Artırma (Mal Alımı ve Borç Kaydı) ---
        if (type === 'increase') {
            // 1. Miktarı Sor
            const promptMessage = `${selectedProduct.name} için eklenecek miktar:`;
            const amountStr = window.prompt(promptMessage, "1");
            if (amountStr === null) return;
            const adjustmentAmount = parseInt(amountStr);
            if (isNaN(adjustmentAmount) || adjustmentAmount <= 0) { toast({ title:"Hata", description:"Lütfen geçerli pozitif bir miktar girin.", variant:"destructive"}); return; }

            // 2. Tedarikçiyi ve ID'sini Bul
            const supplierName = selectedProduct.supplier;
            let toptanciId: string | null = null;
            let skipDebt = false; // Borç işlemi atlanacak mı?

            if (supplierName) {
                toptanciId = await getWholesalerIdByName(supplierName);
                if (!toptanciId) {
                    toast({ title: "Uyarı", description: `"${supplierName}" isimli toptancı bulunamadı. Sadece stok artırılacak, borç kaydedilmeyecek.`, variant: "warning", duration: 6000 });
                    skipDebt = true;
                }
            } else {
                 toast({ title: "Bilgi", description: `Ürün için tedarikçi tanımlanmamış. Sadece stok artırılacak, borç kaydedilmeyecek.`, variant: "info", duration: 6000 });
                 skipDebt = true;
            }

            let unitPrice = 0;
            let totalCost = 0;

            // 3. Birim Fiyatı Sor (Eğer borç kaydedilecekse)
            if (!skipDebt && toptanciId) {
                const unitPriceStr = window.prompt(`Bu alım için birim alış fiyatı (₺):\n(Tedarikçi: ${supplierName})`, selectedProduct.purchase_price.toString());
                if (unitPriceStr === null) return;
                unitPrice = parseFloat(unitPriceStr);
                if (isNaN(unitPrice) || unitPrice < 0) {
                    toast({ title: "Hata", description: "Geçerli bir birim fiyatı girin.", variant: "destructive" });
                    return;
                }
                totalCost = adjustmentAmount * unitPrice;
            }

            // 4. Veritabanı İşlemleri
            setIsLoading(true);
            try {
                // a. Ürün Stoğunu Artır
                 const { data: productUpdateResult, error: stockUpdateErrorDirect } = await supabase
                   .from('products')
                   .update({ quantity: selectedProduct.quantity + adjustmentAmount })
                   .eq('id', selectedProduct.id)
                   .select('id, name, quantity, min_stock_level')
                   .single();

                if (stockUpdateErrorDirect) throw stockUpdateErrorDirect;
                if (!productUpdateResult) throw new Error("Stok güncellendi ancak ürün verisi alınamadı.");

                let wholesalerUpdateSuccess = false;
                let wholesalerBalanceAfter: number | null = null;

                // b. Toptancı Borcunu Artır ve Hareket Kaydet (Eğer skipDebt false ise)
                if (!skipDebt && toptanciId) {
                    console.log(`Toptancı borcu artırılıyor: ID=${toptanciId}, Değişim=${totalCost}`);
                    const { error: debtUpdateError } = await supabase.rpc('increment_wholesaler_debt', {
                        wholesaler_id_input: toptanciId,
                        debt_change: totalCost
                    });

                    if (debtUpdateError) {
                        console.error("Toptancı borcu RPC hatası:", debtUpdateError);
                        // ROLLBACK
                        await supabase.from('products').update({ quantity: selectedProduct.quantity }).eq('id', selectedProduct.id);
                        throw new Error(`Toptancı borcu güncellenemedi: ${debtUpdateError.message}. Stok artışı geri alındı.`);
                    }
                    wholesalerUpdateSuccess = true;
                    console.log("Toptancı borcu başarıyla artırıldı.");

                    // Toptancının yeni borcunu al
                    const { data: wholesalerData, error: fetchWError } = await supabase
                       .from('wholesalers')
                       .select('debt')
                       .eq('id', toptanciId)
                       .single();
                    if (fetchWError || !wholesalerData) {
                        console.warn("Güncel toptancı borcu alınamadı, hareket kaydındaki bakiye yanlış olabilir.", fetchWError);
                    }
                    wholesalerBalanceAfter = wholesalerData?.debt ?? null;

                    // Toptancı Hareket Kaydı Oluştur
                    // --- DÜZELTME: related_product_id ÇIKARILDI ---
                    const wholesalerTxData: Omit<WholesalerTransaction, 'id' | 'created_at' | 'related_product_id'> = {
                        wholesaler_id: toptanciId,
                        date: new Date().toISOString(),
                        type: 'purchase',
                        amount: totalCost,
                        balance_after: wholesalerBalanceAfter,
                        description: `Stok Girişi: ${selectedProduct.name} (${adjustmentAmount} x ${unitPrice.toFixed(2)}₺)`,
                        related_account_tx_id: null,
                        related_purchase_invoice_id: null,
                    };
                    console.log("Toptancı hareket kaydı oluşturuluyor:", wholesalerTxData);
                    const { error: txInsertError } = await supabase.from('wholesaler_transactions').insert(wholesalerTxData);
                    if (txInsertError) {
                        console.error("Toptancı hareket kaydı oluşturma hatası:", txInsertError);
                        toast({title: "Uyarı", description: "Toptancı hareket kaydı oluşturulamadı.", variant: "warning"});
                    } else {
                         console.log("Toptancı hareket kaydı başarıyla oluşturuldu.");
                    }
                }

                // c. Başarı Mesajları ve Yenileme
                toast({ title: "Başarılı", description: "Stok miktarı güncellendi." + (wholesalerUpdateSuccess ? " Toptancı borcu kaydedildi." : "") });
                await fetchProducts();
                await checkAndAddNeed(productUpdateResult.id, productUpdateResult.name, productUpdateResult.quantity ?? 0, productUpdateResult.min_stock_level ?? 0, toast);
                setSelectedProduct(null); setFormData(initialFormData); setIsEditing(false);

                // Toptancı modülünü güncellemek için event yayınla
                if (toptanciId && wholesalerUpdateSuccess) {
                    window.dispatchEvent(new CustomEvent('wholesaler-updated', { detail: { wholesalerId: toptanciId } }));
                    console.log("wholesaler-updated event'i yayınlandı:", toptanciId);
                }

            } catch (error: any) {
                console.error("Stok artırma/borç kaydı sırasında hata:", error);
                toast({ title: "Hata", description: `İşlem başarısız: ${error.message}`, variant: "destructive" });
                await fetchProducts();
            } finally {
                setIsLoading(false);
            }
        }
    };


    const handleSort = (column: SortColumn) => { if (!column) return; const newDirection = sortColumn === column && sortDirection === 'asc' ? 'desc' : 'asc'; setSortColumn(column); setSortDirection(newDirection); };
    const getSortIcon = (column: SortColumn) => { if (sortColumn !== column) { return <ArrowUpDown className="ml-2 h-3 w-3 opacity-30" />; } return sortDirection === 'asc' ? <ArrowUp className="ml-2 h-3 w-3" /> : <ArrowDown className="ml-2 h-3 w-3" />; };
    // ---

    // --- Filtrelenmiş ve Sıralanmış Ürünler ---
    const sortedAndFilteredProducts = useMemo(() => { if (!products || products.length === 0) { return []; } let filtered: Product[] = []; try { filtered = products.filter(p => { const nameMatch = p.name?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false; const codeMatch = p.code?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false; return nameMatch || codeMatch; }); } catch (filterError) { console.error("Filtreleme hatası:", filterError); return []; } if (sortColumn) { try { filtered = [...filtered].sort((a, b) => { const valA = a[sortColumn] ?? (typeof a[sortColumn] === 'number' ? 0 : ''); const valB = b[sortColumn] ?? (typeof b[sortColumn] === 'number' ? 0 : ''); let comparison = 0; if (typeof valA === 'string' && typeof valB === 'string') { comparison = valA.localeCompare(valB, 'tr', { sensitivity: 'base' }); } else if (typeof valA === 'number' && typeof valB === 'number') { comparison = valA - valB; } else { comparison = String(valA).localeCompare(String(valB), 'tr', { sensitivity: 'base' }); } return sortDirection === 'asc' ? comparison : comparison * -1; }); } catch (sortError) { console.error("Sıralama hatası:", sortError); return filtered; } } return filtered; }, [products, searchTerm, sortColumn, sortDirection]);
    // ---

    // --- JSX ---
    return (
        <div className="h-full bg-[#c0c0c0] p-2 sm:p-4">
          <div className="bg-[#c0c0c0] rounded shadow-[2px_2px_0px_0px_#ffffff,_-2px_-2px_0px_0px_#868686,_2px_2px_4px_0px_#000000] h-full flex flex-col">
            {/* Header */}
            <div className="bg-[#000080] text-white p-2 flex justify-between items-center flex-shrink-0">
                <h1 className="text-base sm:text-lg font-bold">Stok Yönetim Sistemi</h1>
                <Button variant="ghost" size="icon" className="hover:bg-red-700" onClick={onClose} disabled={isLoading || isSaving}><X className="h-4 w-4" /></Button>
            </div>
            {/* Ana İçerik Alanı */}
            <div className="flex-1 overflow-y-auto">
              <div className="p-3 sm:p-6 bg-[#c0c0c0] border-t-2 border-l-2 border-[#ffffff] border-r-2 border-b-2 border-r-[#868686] border-b-[#868686]">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                  {/* Sol Panel (Form) */}
                  <div className="space-y-3 sm:space-y-4 bg-[#c0c0c0] p-3 sm:p-4 border-t border-l border-[#868686] border-r border-b border-r-[#ffffff] border-b-[#ffffff]">
                     <h2 className="text-lg font-semibold mb-2">{isEditing ? 'Ürün Düzenle' : 'Yeni Ürün'}</h2>
                     <div className="flex flex-col"><Label className="text-sm font-bold mb-1 text-black">Ürün Kodu *</Label><Input type="text" name="code" value={formData.code} onChange={handleInputChange} placeholder="Ürün kodunu giriniz" className="bg-white border-t-2 border-l-2 border-[#868686] border-r-2 border-b-2 border-r-[#ffffff] border-b-[#ffffff]" disabled={isSaving||(selectedProduct!==null&&!isEditing)}/></div>
                     <div className="flex flex-col"><Label className="text-sm font-bold mb-1 text-black">Ürün Adı *</Label><Input type="text" name="name" value={formData.name} onChange={handleInputChange} placeholder="Ürün adını giriniz" className="bg-white border-t-2 border-l-2 border-[#868686] border-r-2 border-b-2 border-r-[#ffffff] border-b-[#ffffff]" disabled={isSaving||(selectedProduct!==null&&!isEditing)}/></div>
                     <div className="flex flex-col"><Label className="text-sm font-bold mb-1 text-black">Açıklama</Label><Textarea name="description" value={formData.description} onChange={handleInputChange} placeholder="Ürün açıklaması giriniz" className="min-h-[60px] sm:min-h-[80px] bg-white border-t-2 border-l-2 border-[#868686] border-r-2 border-b-2 border-r-[#ffffff] border-b-[#ffffff]" disabled={isSaving||!isEditing&&selectedProduct!==null}/></div>
                     <div className="flex flex-col"><Label className="text-sm font-bold mb-1 text-black">Kategori</Label><Input type="text" name="category" value={formData.category} onChange={handleInputChange} placeholder="Kategori giriniz" className="bg-white border-t-2 border-l-2 border-[#868686] border-r-2 border-b-2 border-r-[#ffffff] border-b-[#ffffff]" disabled={isSaving||!isEditing&&selectedProduct!==null}/></div>
                     <div className="grid grid-cols-2 gap-4">
                        <div className="flex flex-col"><Label className="text-sm font-bold mb-1 text-black">Mevcut Miktar</Label><Input type="number" name="quantity" value={formData.quantity} readOnly placeholder="0" className="bg-gray-100 border-t-2 border-l-2 border-[#868686] border-r-2 border-b-2 border-r-[#ffffff] border-b-[#ffffff]" disabled/></div>
                        <div className="flex flex-col"><Label className="text-sm font-bold mb-1 text-black">Birim</Label><Input type="text" name="unit" value={formData.unit} onChange={handleInputChange} placeholder="Adet, Kg, Lt vb." className="bg-white border-t-2 border-l-2 border-[#868686] border-r-2 border-b-2 border-r-[#ffffff] border-b-[#ffffff]" disabled={isSaving||!isEditing&&selectedProduct!==null}/></div>
                     </div>
                     <div className="grid grid-cols-2 gap-4">
                         <div className="flex flex-col"><Label className="text-sm font-bold mb-1 text-black">Vars. Alış Fiyatı</Label><Input type="number" name="purchase_price" value={formData.purchase_price} readOnly placeholder="0.00" className="bg-gray-100 border-t-2 border-l-2 border-[#868686] border-r-2 border-b-2 border-r-[#ffffff] border-b-[#ffffff]" disabled/></div>
                         <div className="flex flex-col"><Label className="text-sm font-bold mb-1 text-black">Satış Fiyatı</Label><Input type="number" name="selling_price" value={formData.selling_price} onChange={handleInputChange} placeholder="0.00" min="0" step="0.01" className="bg-white border-t-2 border-l-2 border-[#868686] border-r-2 border-b-2 border-r-[#ffffff] border-b-[#ffffff]" disabled={isSaving||!isEditing&&selectedProduct!==null}/></div>
                     </div>
                     <div className="grid grid-cols-2 gap-4">
                         <div className="flex flex-col"><Label className="text-sm font-bold mb-1 text-black">Min. Stok</Label><Input type="number" name="min_stock_level" value={formData.min_stock_level} onChange={handleInputChange} placeholder="0" min="0" className="bg-white border-t-2 border-l-2 border-[#868686] border-r-2 border-b-2 border-r-[#ffffff] border-b-[#ffffff]" disabled={isSaving||!isEditing&&selectedProduct!==null}/></div>
                         <div className="flex flex-col"><Label className="text-sm font-bold mb-1 text-black">Vars. Tedarikçi</Label><Input type="text" name="supplier" value={formData.supplier} onChange={handleInputChange} placeholder="Tedarikçi adı giriniz" className="bg-white border-t-2 border-l-2 border-[#868686] border-r-2 border-b-2 border-r-[#ffffff] border-b-[#ffffff]" disabled={isSaving||!isEditing&&selectedProduct!==null}/></div>
                     </div>
                     <div className="flex gap-2 mt-4">
                        {isEditing ? (
                            <>
                                <Button variant="outline" className="flex-1 bg-[#c0c0c0] text-black border-t-2 border-l-2 border-[#ffffff] border-r-2 border-b-2 border-r-[#868686] border-b-[#868686] hover:bg-[#d4d4d4]" onClick={handleUpdateProduct} disabled={isSaving}>{isSaving?<Loader2 className="mr-2 h-4 w-4 animate-spin"/>:<Save className="mr-1 h-4 w-4"/>}<span className="text-xs sm:text-sm">Kaydet</span></Button>
                                <Button variant="outline" className="flex-1 bg-[#c0c0c0] text-black border-t-2 border-l-2 border-[#ffffff] border-r-2 border-b-2 border-r-[#868686] border-b-[#868686] hover:bg-[#d4d4d4]" onClick={handleCancelEdit} disabled={isSaving}><X className="mr-1 h-4 w-4"/><span className="text-xs sm:text-sm">İptal</span></Button>
                            </>
                        ) : (
                            <Button variant="outline" className="flex-1 bg-[#c0c0c0] text-black border-t-2 border-l-2 border-[#ffffff] border-r-2 border-b-2 border-r-[#868686] border-b-[#868686] hover:bg-[#d4d4d4]" onClick={handleAddProduct} disabled={isSaving}>{isSaving?<Loader2 className="mr-2 h-4 w-4 animate-spin"/>:<PackagePlus className="mr-1 h-4 w-4"/>}<span className="text-xs sm:text-sm">Ürün Ekle</span></Button>
                        )}
                     </div>
                  </div>

                  {/* Sağ Panel (Liste) */}
                  <div className="space-y-3 sm:space-y-4 bg-[#c0c0c0] p-3 sm:p-4 border-t border-l border-[#868686] border-r border-b border-r-[#ffffff] border-b-[#ffffff]">
                    <div className="flex flex-col flex-shrink-0"> <Label className="text-sm font-bold mb-1 text-black">Ürün Ara</Label> <div className="relative"> <Input type="text" value={searchTerm} onChange={(e)=>setSearchTerm(e.target.value)} placeholder="Ürün kodu veya adına göre ara" className="bg-white border-t-2 border-l-2 border-[#868686] border-r-2 border-b-2 border-r-[#ffffff] border-b-[#ffffff] pl-10"/> <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-500"/> </div> </div>
                    <div className="border-t-2 border-l-2 border-[#868686] border-r-2 border-b-2 border-r-[#ffffff] border-b-[#ffffff] bg-white max-h-[512px] overflow-y-auto">
                        {isLoading ? ( <div className="flex items-center justify-center h-[512px]"> <Loader2 className="h-8 w-8 animate-spin text-gray-500"/> </div> ) : (
                            <table className="w-full">
                              <thead className="bg-[#000080] text-white sticky top-0 z-10">
                                <tr>
                                  <th className="px-2 sm:px-4 py-2 text-left text-xs sm:text-sm"><Button variant="ghost" onClick={() => handleSort('code')} className="px-1 py-0 h-auto text-white hover:bg-blue-800 hover:text-white">Kod {getSortIcon('code')}</Button></th>
                                  <th className="px-2 sm:px-4 py-2 text-left text-xs sm:text-sm"><Button variant="ghost" onClick={() => handleSort('name')} className="px-1 py-0 h-auto text-white hover:bg-blue-800 hover:text-white">Ürün Adı {getSortIcon('name')}</Button></th>
                                  <th className="px-2 sm:px-4 py-2 text-right text-xs sm:text-sm"><Button variant="ghost" onClick={() => handleSort('quantity')} className="px-1 py-0 h-auto text-white hover:bg-blue-800 hover:text-white">Miktar {getSortIcon('quantity')}</Button></th>
                                  <th className="px-2 sm:px-4 py-2 text-right text-xs sm:text-sm"><Button variant="ghost" onClick={() => handleSort('selling_price')} className="px-1 py-0 h-auto text-white hover:bg-blue-800 hover:text-white">Satış F. {getSortIcon('selling_price')}</Button></th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-[#c0c0c0]">
                                {sortedAndFilteredProducts.length === 0 ? (
                                    <tr><td colSpan={4} className="px-4 py-10 text-center text-gray-500">{isLoading ? 'Yükleniyor...' : 'Ürün bulunamadı.'}</td></tr>
                                 ) : (
                                    sortedAndFilteredProducts.map((product) => (
                                        <tr
                                          key={product.id}
                                          className={`cursor-pointer ${selectedProduct?.id === product.id ? 'bg-[#000080] text-white' : 'hover:bg-[#e0e0e0] hover:text-black'} ${isEditing ? 'opacity-50 cursor-not-allowed' : ''}`}
                                          onClick={()=> !isEditing && handleProductSelect(product)}
                                          tabIndex={isEditing ? -1 : 0}
                                          onKeyDown={(e) => { if(!isEditing && (e.key === 'Enter' || e.key === ' ')) handleProductSelect(product);}}
                                        >
                                            <td className="px-2 sm:px-4 py-2 text-xs sm:text-sm">{product.code}</td>
                                            <td className="px-2 sm:px-4 py-2 text-xs sm:text-sm">{product.name}</td>
                                            <td className="px-2 sm:px-4 py-2 text-right text-xs sm:text-sm">{product.quantity} {product.unit}</td>
                                            <td className="px-2 sm:px-4 py-2 text-right text-xs sm:text-sm">{product.selling_price.toFixed(2)}₺</td>
                                        </tr>
                                    ))
                                )}
                              </tbody>
                            </table>
                        )}
                    </div>
                    <div className="flex gap-2 mt-2 sm:mt-4 flex-shrink-0">
                         <Button variant="outline" className="flex-1 bg-[#c0c0c0] text-black border-t-2 border-l-2 border-[#ffffff] border-r-2 border-b-2 border-r-[#868686] border-b-[#868686] hover:bg-[#d4d4d4]" onClick={()=>handleStockAdjustment('increase')} disabled={!selectedProduct||isEditing||isLoading}><Plus className="mr-1 h-4 w-4"/><span className="text-xs sm:text-sm">Stok Ekle (Alım)</span></Button>
                         <Button variant="outline" className="flex-1 bg-[#c0c0c0] text-black border-t-2 border-l-2 border-[#ffffff] border-r-2 border-b-2 border-r-[#868686] border-b-[#868686] hover:bg-[#d4d4d4]" onClick={()=>handleStockAdjustment('decrease')} disabled={!selectedProduct||(selectedProduct?.quantity??0)<=0||isEditing||isLoading}><Minus className="mr-1 h-4 w-4"/><span className="text-xs sm:text-sm">Stok Çıkar</span></Button>
                    </div>
                    <div className="flex gap-2 mt-2 flex-shrink-0">
                        <Button variant="outline" className="flex-1 bg-[#c0c0c0] text-black border-t-2 border-l-2 border-[#ffffff] border-r-2 border-b-2 border-r-[#868686] border-b-[#868686] hover:bg-[#d4d4d4]" onClick={handleEditClick} disabled={(!selectedProduct && !isEditing) || isSaving || isLoading}><FileEdit className="mr-1 h-4 w-4"/><span className="text-xs sm:text-sm">{isEditing?'Kaydet':'Düzenle'}</span></Button>
                        <Button variant="outline" className="flex-1 bg-[#c0c0c0] text-black border-t-2 border-l-2 border-[#ffffff] border-r-2 border-b-2 border-r-[#868686] border-b-[#868686] hover:bg-[#ff4444] hover:text-white" onClick={handleDeleteProduct} disabled={!selectedProduct||isEditing||isLoading||isSaving}><PackageMinus className="mr-1 h-4 w-4"/><span className="text-xs sm:text-sm">Ürün Sil</span></Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
    );
};

export default StockModule;
// --- END OF FILE src/StockModule.tsx ---