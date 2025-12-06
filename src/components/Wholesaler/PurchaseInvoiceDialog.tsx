// --- START OF FILE src/components/wholesaler/PurchaseInvoiceDialog.tsx ---

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription, DialogClose
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Save, X as CancelIcon, PlusCircle, Trash2, PackagePlus, AlertCircle } from 'lucide-react';
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query"; // EKLENDİ: Verileri yenilemek için
import type { Wholesaler, Product, PurchaseInvoice, PurchaseInvoiceItem } from "@/types/backup";
import { format } from 'date-fns';
import { v4 as uuidv4 } from 'uuid';
import { cn } from "@/lib/utils";

// Fatura Satırı Tipi
interface InvoiceItemRow extends Omit<PurchaseInvoiceItem, 'product_id' | 'quantity' | 'purchase_price_value' | 'exchange_rate' | 'line_total_try' | 'name'> {
    id: string; // Geçici satır ID'si
    product_id: string | null;
    name: string;
    code: string;
    quantity: string;
    purchase_price_value: string; // Alış Fiyatı
    selling_price?: string; // Satış Fiyatı
    exchange_rate: string;
    line_total_try: number;
    originalUnit?: string;
    isManualSaved?: boolean; // Yeni ürün olarak kaydedildi mi?
}

interface PurchaseInvoiceDialogProps {
    isOpen: boolean;
    setIsOpen: (open: boolean) => void;
    wholesalers: Wholesaler[];
    products: Product[];
    onInvoiceSaved: () => void;
}

const PurchaseInvoiceDialog: React.FC<PurchaseInvoiceDialogProps> = ({
    isOpen, setIsOpen, wholesalers, products: initialProducts, onInvoiceSaved
}) => {
    const { toast } = useToast();
    const queryClient = useQueryClient(); // EKLENDİ

    // State
    const [selectedWholesalerId, setSelectedWholesalerId] = useState<string>('');
    const [invoiceDate, setInvoiceDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
    const [invoiceItems, setInvoiceItems] = useState<InvoiceItemRow[]>([]);
    const [notes, setNotes] = useState<string>('');
    const [isSaving, setIsSaving] = useState(false);
    const [isSavingProductRowId, setIsSavingProductRowId] = useState<string | null>(null);
    const [products, setProducts] = useState<Product[]>(initialProducts);
    const [selectedProductIdToAdd, setSelectedProductIdToAdd] = useState<string>('');

    // Products prop değişirse state'i güncelle
    useEffect(() => { setProducts(initialProducts); }, [initialProducts]);

    const formatCurrencyLocal = (value: number | null | undefined, currency: 'TRY' | 'USD' = 'TRY'): string => {
        const num = value ?? 0;
        return currency === 'USD' ? `$${num.toFixed(2)}` : `${num.toFixed(2)}₺`;
    }

    // Formu Sıfırla
    const resetForm = useCallback(() => {
        setSelectedWholesalerId('');
        setInvoiceDate(format(new Date(), 'yyyy-MM-dd'));
        setInvoiceItems([]);
        setNotes('');
        setSelectedProductIdToAdd('');
        setIsSaving(false);
        setIsSavingProductRowId(null);
    }, []);

    useEffect(() => { if (isOpen) resetForm(); }, [isOpen, resetForm]);

    // Ürün Ekleme (Stoktan)
    const handleProductSelectToAdd = (productId: string) => {
        if (!productId || isSaving) return;
        const product = products.find(p => p.id === productId);
        if (!product) return;

        const newItemRow: InvoiceItemRow = {
            id: uuidv4(),
            product_id: product.id,
            code: product.code,
            name: product.name,
            quantity: '1',
            purchase_price_currency: 'TRY',
            purchase_price_value: product.purchase_price?.toString() ?? '0',
            selling_price: product.selling_price?.toString() ?? '0',
            exchange_rate: '',
            line_total_try: product.purchase_price ?? 0,
            originalUnit: product.unit ?? 'adet',
            isManualSaved: true // Zaten kayıtlı
        };
        setInvoiceItems(prev => [...prev, newItemRow]);
        setSelectedProductIdToAdd('');
    };

    // Ürün Ekleme (Manuel / Yeni)
    const addManualItem = () => {
        if (isSaving) return;
        const newItemRow: InvoiceItemRow = {
            id: uuidv4(),
            product_id: null,
            code: '',
            name: '',
            quantity: '1',
            purchase_price_currency: 'TRY',
            purchase_price_value: '0',
            selling_price: '0',
            exchange_rate: '',
            line_total_try: 0,
            originalUnit: 'adet',
            isManualSaved: false
        };
        setInvoiceItems(prev => [...prev, newItemRow]);
    };

    const removeItem = (rowId: string) => {
        if (isSaving) return;
        setInvoiceItems(prev => prev.filter(item => item.id !== rowId));
    };

    // Satır Değişiklikleri
    const handleItemChange = (rowId: string, field: keyof InvoiceItemRow, value: string | 'TRY' | 'USD') => {
        if (isSaving) return;
        setInvoiceItems(prevItems =>
            prevItems.map(item => {
                if (item.id === rowId) {
                    if (item.product_id && (field === 'name' || field === 'code' || field === 'originalUnit')) return item;

                    const updatedItem = { ...item, [field]: value };
                    if (field === 'purchase_price_currency') updatedItem.exchange_rate = value === 'USD' ? item.exchange_rate : '';

                    const quantity = parseFloat(updatedItem.quantity) || 0;
                    const price = parseFloat(updatedItem.purchase_price_value) || 0;
                    const rate = updatedItem.purchase_price_currency === 'USD' ? (parseFloat(updatedItem.exchange_rate) || 1) : 1;
                    updatedItem.line_total_try = quantity * price * rate;

                    return updatedItem;
                }
                return item;
            })
        );
    };

    // Manuel Ürünü Veritabanına Kaydet
    const saveManualProductToDb = async (rowId: string) => {
        const itemToSave = invoiceItems.find(item => item.id === rowId);
        if (!itemToSave || itemToSave.product_id || isSavingProductRowId) return;

        const code = itemToSave.code?.trim();
        const name = itemToSave.name?.trim();
        const sellingPrice = parseFloat(itemToSave.selling_price || '0');
        const purchasePriceValue = parseFloat(itemToSave.purchase_price_value || '0');
        const wholesalerName = wholesalers.find(w => w.id === selectedWholesalerId)?.name || null;

        if (!code || !name) { toast({ title: "Eksik Bilgi", description: "Kod ve Ürün Adı zorunludur.", variant: "destructive" }); return; }
        if (sellingPrice < 0 || purchasePriceValue < 0) { toast({ title: "Hata", description: "Fiyatlar negatif olamaz.", variant: "destructive" }); return; }

        let purchasePriceTRY = purchasePriceValue;
        if (itemToSave.purchase_price_currency === 'USD') {
            const rate = parseFloat(itemToSave.exchange_rate) || 0;
            if (rate <= 0) { toast({ title: "Uyarı", description: "USD için kur giriniz.", variant: "destructive" }); return; }
            purchasePriceTRY = purchasePriceValue * rate;
        }

        setIsSavingProductRowId(rowId);
        try {
            const { count } = await supabase.from('products').select('id', { count: 'exact', head: true }).eq('code', code);
            if (count && count > 0) throw new Error(`"${code}" kodu zaten kullanımda.`);

            const newProductData = {
                code, name,
                quantity: 0,
                unit: itemToSave.originalUnit || 'adet',
                purchase_price: purchasePriceTRY,
                selling_price: sellingPrice,
                min_stock_level: 5,
                supplier: wholesalerName // Tedarikçi adını ekle
            };

            const { data: insertedProduct, error } = await supabase.from('products').insert(newProductData).select().single();
            if (error) throw error;

            setInvoiceItems(prev => prev.map(item => item.id === rowId ? {
                ...item,
                product_id: insertedProduct.id,
                isManualSaved: true,
                name: insertedProduct.name,
                code: insertedProduct.code
            } : item));

            setProducts(prev => [...prev, insertedProduct as Product]);
            // Yeni ürün eklendiğinde global listeyi yenile
            await queryClient.invalidateQueries({ queryKey: ['products'] });
            toast({ title: "Başarılı", description: "Ürün karta açıldı." });

        } catch (error: any) {
            console.error(error);
            toast({ title: "Hata", description: error.message, variant: "destructive" });
        } finally {
            setIsSavingProductRowId(null);
        }
    };

    // Hesaplamalar
    const totalInvoiceTry = useMemo(() => invoiceItems.reduce((sum, item) => sum + item.line_total_try, 0), [invoiceItems]);
    const totalInvoiceUsd = useMemo(() => invoiceItems.reduce((sum, item) => {
        if (item.purchase_price_currency === 'USD') {
            return sum + ((parseFloat(item.quantity) || 0) * (parseFloat(item.purchase_price_value) || 0));
        }
        return sum;
    }, 0), [invoiceItems]);

    // --- FATURAYI KAYDET ---
    const handleSaveInvoice = async () => {
        if (!selectedWholesalerId) { toast({ title: "Hata", description: "Toptancı seçilmedi.", variant: "destructive" }); return; }
        if (invoiceItems.length === 0) { toast({ title: "Hata", description: "Ürün girilmedi.", variant: "destructive" }); return; }
        if (invoiceItems.some(i => !i.product_id)) { toast({ title: "Uyarı", description: "Kaydedilmemiş ürünler var.", variant: "destructive" }); return; }

        setIsSaving(true);
        let createdInvoiceId: string | null = null;
        const wholesalerName = wholesalers.find(w => w.id === selectedWholesalerId)?.name; // Seçili toptancı adı

        try {
            // 1. Fatura Başlığı
            const invoiceData = {
                wholesaler_id: selectedWholesalerId,
                date: new Date(invoiceDate + 'T12:00:00').toISOString(),
                total_try: totalInvoiceTry,
                notes: notes + (totalInvoiceUsd > 0 ? `\nToplam USD: ${totalInvoiceUsd.toFixed(2)}` : ''),
                items: invoiceItems.map(i => ({
                    product_id: i.product_id,
                    name: i.name,
                    quantity: parseFloat(i.quantity),
                    purchase_price_currency: i.purchase_price_currency,
                    purchase_price_value: parseFloat(i.purchase_price_value),
                    exchange_rate: i.purchase_price_currency === 'USD' ? parseFloat(i.exchange_rate) : null,
                    line_total_try: i.line_total_try
                }))
            };

            const { data: inv, error: invError } = await supabase.from('purchase_invoices').insert(invoiceData).select('id').single();
            if (invError) throw invError;
            createdInvoiceId = inv.id;

            // 2. Toptancı Borçlandırma
            const { error: debtError } = await supabase.rpc('increment_wholesaler_debt', {
                wholesaler_id_input: selectedWholesalerId,
                debt_change_try: totalInvoiceTry,
                debt_change_usd: totalInvoiceUsd
            });
            if (debtError) throw debtError;

            await supabase.from('wholesaler_transactions').insert({
                wholesaler_id: selectedWholesalerId,
                date: invoiceData.date,
                type: 'purchase',
                amount: totalInvoiceTry,
                description: `Mal Alımı - Fatura #${createdInvoiceId?.substring(0, 6)}`,
                related_purchase_invoice_id: createdInvoiceId
            });

            // 3. Stok, Maliyet ve Tedarikçi Güncelleme (DÜZELTME BURADA)
            for (const item of invoiceItems) {
                if (!item.product_id) continue;
                const qty = parseFloat(item.quantity);
                const priceValue = parseFloat(item.purchase_price_value);

                let newCostTRY = priceValue;
                if (item.purchase_price_currency === 'USD') {
                    const rate = parseFloat(item.exchange_rate) || 1;
                    newCostTRY = priceValue * rate;
                }

                // Stok Artır
                await supabase.rpc('increment_product_quantity', { product_id_input: item.product_id, quantity_change: qty });

                // Ürün Kartını Güncelle (Tedarikçi adı dahil)
                const sellingPrice = parseFloat(item.selling_price || '0');
                const updateData: any = {
                    purchase_price: newCostTRY,
                    supplier: wholesalerName // ARTIK ÜRÜN KARTINDAKİ TEDARİKÇİ GÜNCELLENİYOR
                };
                if (sellingPrice > 0) updateData.selling_price = sellingPrice;

                await supabase.from('products').update(updateData).eq('id', item.product_id);
            }

            toast({ title: "Başarılı", description: "Fatura işlendi, stoklar güncellendi." });

            // KRİTİK DÜZELTME: Global Query Invalidation
            // Bu sayede Stoklar modülü ve diğer modüller anında yeni stokları/fiyatları görür.
            await queryClient.invalidateQueries({ queryKey: ['products'] });
            await queryClient.invalidateQueries({ queryKey: ['wholesalers'] });

            onInvoiceSaved();
            setIsOpen(false);

        } catch (error: any) {
            console.error("Fatura hatası:", error);
            toast({ title: "Kritik Hata", description: error.message, variant: "destructive" });
            if (createdInvoiceId) {
                await supabase.from('purchase_invoices').delete().eq('id', createdInvoiceId);
                await supabase.rpc('increment_wholesaler_debt', { wholesaler_id_input: selectedWholesalerId, debt_change_try: -totalInvoiceTry, debt_change_usd: -totalInvoiceUsd });
            }
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => { if (!isSaving) setIsOpen(open); }}>
            <DialogContent className="max-w-6xl h-[90vh] flex flex-col bg-gray-900 border border-white/10 text-white p-0 shadow-2xl backdrop-blur-xl">
                <DialogHeader className="bg-white/5 border-b border-white/10 p-4 flex flex-row justify-between items-center">
                    <DialogTitle className="text-base font-bold flex items-center gap-2">
                        <PackagePlus className="h-5 w-5 text-emerald-400" />
                        Mal Alım Faturası Girişi
                    </DialogTitle>
                    <DialogClose asChild><Button variant="ghost" size="icon" className="text-gray-400 hover:text-white hover:bg-white/10 h-8 w-8 rounded-full" disabled={isSaving}><CancelIcon className="h-4 w-4" /></Button></DialogClose>
                </DialogHeader>

                <div className="flex-1 flex flex-col p-4 gap-4 overflow-hidden">
                    {/* Üst Bilgiler */}
                    <div className="flex gap-4 p-4 border border-white/10 bg-white/5 rounded-lg">
                        <div className="flex-1">
                            <Label className="text-xs font-medium text-gray-400 mb-1.5 block">Toptancı</Label>
                            <Select value={selectedWholesalerId} onValueChange={setSelectedWholesalerId} disabled={isSaving}>
                                <SelectTrigger className="h-9 text-xs bg-black/20 border-white/10 text-white focus:ring-blue-500/50"><SelectValue placeholder="Seçiniz..." /></SelectTrigger>
                                <SelectContent className="bg-gray-800 border-gray-700 text-white">{wholesalers.map(w => <SelectItem key={w.id} value={w.id} className="focus:bg-gray-700 focus:text-white">{w.name}</SelectItem>)}</SelectContent>
                            </Select>
                        </div>
                        <div>
                            <Label className="text-xs font-medium text-gray-400 mb-1.5 block">Tarih</Label>
                            <Input type="date" value={invoiceDate} onChange={e => setInvoiceDate(e.target.value)} className="h-9 text-xs bg-black/20 border-white/10 text-white focus:border-blue-500/50" disabled={isSaving} />
                        </div>
                    </div>

                    {/* Orta: Ürün Listesi */}
                    <div className="flex-1 border border-white/10 bg-black/20 rounded-lg flex flex-col min-h-0 overflow-hidden">
                        <div className="bg-white/5 p-2 border-b border-white/10 text-xs font-bold text-gray-400 grid grid-cols-12 gap-2 sticky top-0 z-10 text-center items-center">
                            <div className="col-span-1">Kayıt</div>
                            <div className="col-span-2 text-left pl-2">Kod</div>
                            <div className="col-span-3 text-left">Ürün Adı</div>
                            <div className="col-span-1">Miktar</div>
                            <div className="col-span-1">Birim</div>
                            <div className="col-span-2">Alış Fiyatı</div>
                            <div className="col-span-1">Satış F.</div>
                            <div className="col-span-1">Sil</div>
                        </div>
                        <ScrollArea className="flex-1">
                            {invoiceItems.map((item, index) => (
                                <div key={item.id} className="grid grid-cols-12 gap-2 p-2 border-b border-white/5 text-xs items-center hover:bg-white/5 transition-colors">
                                    <div className="col-span-1 flex justify-center">
                                        {!item.product_id ? (
                                            <Button size="sm" variant="outline" className="h-6 w-full text-[9px] bg-blue-500/10 text-blue-400 border-blue-500/30 hover:bg-blue-500/20" onClick={() => saveManualProductToDb(item.id)} disabled={isSaving || !!isSavingProductRowId}>
                                                {isSavingProductRowId === item.id ? <Loader2 className="h-3 w-3 animate-spin" /> : "KAYDET"}
                                            </Button>
                                        ) : (
                                            <span className="text-emerald-400 font-bold text-[10px] bg-emerald-500/10 px-1 py-0.5 rounded border border-emerald-500/20">STOKTA</span>
                                        )}
                                    </div>

                                    <div className="col-span-2"><Input value={item.code} onChange={e => handleItemChange(item.id, 'code', e.target.value)} className="h-7 text-xs bg-white/5 border-white/10 text-white focus:border-blue-500/50" disabled={!!item.product_id} placeholder="Kod" /></div>
                                    <div className="col-span-3"><Input value={item.name} onChange={e => handleItemChange(item.id, 'name', e.target.value)} className="h-7 text-xs bg-white/5 border-white/10 text-white focus:border-blue-500/50" disabled={!!item.product_id} placeholder="Ürün Adı" /></div>
                                    <div className="col-span-1"><Input type="number" value={item.quantity} onChange={e => handleItemChange(item.id, 'quantity', e.target.value)} className="h-7 text-xs text-center bg-white/5 border-white/10 text-white focus:border-blue-500/50" /></div>
                                    <div className="col-span-1"><Input value={item.originalUnit} onChange={e => handleItemChange(item.id, 'originalUnit', e.target.value)} className="h-7 text-xs text-center bg-white/5 border-white/10 text-white focus:border-blue-500/50" disabled={!!item.product_id} /></div>

                                    <div className="col-span-2 flex gap-1">
                                        <Input type="number" value={item.purchase_price_value} onChange={e => handleItemChange(item.id, 'purchase_price_value', e.target.value)} className="h-7 text-xs text-right flex-1 bg-white/5 border-white/10 text-white focus:border-blue-500/50" />
                                        <Select value={item.purchase_price_currency} onValueChange={v => handleItemChange(item.id, 'purchase_price_currency', v as any)}>
                                            <SelectTrigger className="h-7 w-14 text-[10px] px-1 bg-white/5 border-white/10 text-white"><SelectValue /></SelectTrigger>
                                            <SelectContent className="bg-gray-800 border-gray-700 text-white"><SelectItem value="TRY">TL</SelectItem><SelectItem value="USD">$</SelectItem></SelectContent>
                                        </Select>
                                        {item.purchase_price_currency === 'USD' && (
                                            <Input placeholder="Kur" value={item.exchange_rate} onChange={e => handleItemChange(item.id, 'exchange_rate', e.target.value)} className="h-7 w-12 text-xs text-right bg-white/5 border-white/10 text-white focus:border-blue-500/50" />
                                        )}
                                    </div>

                                    <div className="col-span-1"><Input type="number" value={item.selling_price} onChange={e => handleItemChange(item.id, 'selling_price', e.target.value)} className="h-7 text-xs text-right bg-emerald-500/10 border-emerald-500/30 text-emerald-400 focus:border-emerald-500/50" placeholder="Satış F." /></div>

                                    <div className="col-span-1 flex justify-center">
                                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0 hover:bg-red-500/20 text-gray-500 hover:text-red-400 rounded-md" onClick={() => removeItem(item.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                                    </div>
                                </div>
                            ))}
                        </ScrollArea>

                        <div className="bg-white/5 p-3 border-t border-white/10 flex justify-between items-center">
                            <div className="flex gap-2">
                                <Select value={selectedProductIdToAdd} onValueChange={handleProductSelectToAdd} disabled={isSaving}>
                                    <SelectTrigger className="h-9 w-[220px] text-xs bg-black/20 border-white/10 text-white"><SelectValue placeholder="Stoktan Ürün Seç..." /></SelectTrigger>
                                    <SelectContent className="bg-gray-800 border-gray-700 text-white">
                                        {products.map(p => <SelectItem key={p.id} value={p.id} className="focus:bg-gray-700 focus:text-white">{p.name} ({p.quantity})</SelectItem>)}
                                    </SelectContent>
                                </Select>
                                <Button size="sm" variant="outline" className="h-9 text-xs bg-white/5 border-white/10 text-white hover:bg-white/10" onClick={addManualItem} disabled={isSaving}><PlusCircle className="mr-1.5 h-3.5 w-3.5" /> Yeni Satır</Button>
                            </div>
                            <div className="text-right text-xs">
                                {totalInvoiceUsd > 0 && <div className="font-medium text-gray-400 mb-0.5">USD Toplam: ${totalInvoiceUsd.toFixed(2)}</div>}
                                <div className="font-bold text-lg text-blue-400">GENEL TOPLAM: {formatCurrencyLocal(totalInvoiceTry)}</div>
                            </div>
                        </div>
                    </div>

                    <div>
                        <Label className="text-xs font-medium text-gray-400 mb-1.5 block">Notlar</Label>
                        <Textarea value={notes} onChange={e => setNotes(e.target.value)} className="h-16 text-xs bg-black/20 border-white/10 text-white focus:border-blue-500/50 resize-none" placeholder="Fatura notları..." disabled={isSaving} />
                    </div>
                </div>

                <DialogFooter className="p-4 bg-white/5 border-t border-white/10">
                    <div className="flex gap-2 w-full justify-end items-center">
                        {invoiceItems.some(i => !i.product_id) && <div className="flex items-center text-red-400 text-xs font-bold mr-auto bg-red-500/10 px-2 py-1 rounded border border-red-500/20"><AlertCircle className="h-4 w-4 mr-1.5" /> Önce yeni ürünleri KAYDETmelisiniz!</div>}
                        <Button variant="ghost" onClick={() => setIsOpen(false)} disabled={isSaving} className="text-gray-400 hover:text-white hover:bg-white/10">İptal</Button>
                        <Button onClick={handleSaveInvoice} disabled={isSaving || invoiceItems.length === 0 || invoiceItems.some(i => !i.product_id)} className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-[0_0_15px_rgba(16,185,129,0.4)] font-bold">
                            {isSaving ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : <Save className="mr-2 h-4 w-4" />}
                            FATURAYI İŞLE
                        </Button>
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default PurchaseInvoiceDialog;
// --- END OF FILE src/components/wholesaler/PurchaseInvoiceDialog.tsx ---