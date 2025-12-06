// --- START OF FILE src/components/wholesaler/WholesalerTransactionDialog.tsx ---

import React, { useState, useEffect, useCallback } from 'react';
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription, DialogClose
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
// Eye, EyeOff, List kaldırıldı, Package eklendi
import { Loader2, ArrowDownLeft, ArrowUpRight, Undo2, Settings, FileText, Trash2, Package, X as CancelIcon } from 'lucide-react';
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
// Tipler güncellendi (PurchaseInvoiceItem dahil)
import type { Wholesaler, WholesalerTransaction, WholesalerTransactionType, PurchaseInvoiceItem } from "@/types/backup";
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import { deletePurchaseInvoiceAndRollback, deleteWholesalerPaymentAndRollback } from '@/utils/wholesalerUtils'; // Yolu kontrol edin

interface WholesalerTransactionDialogProps {
    isOpen: boolean;
    setIsOpen: (open: boolean) => void;
    wholesaler: Wholesaler | null;
}

// Tipi genişletelim (invoiceItems içerecek şekilde)
interface DisplayTransaction extends WholesalerTransaction {
    invoiceItems?: PurchaseInvoiceItem[] | null; // JOIN ile gelen fatura kalemleri
}


const formatCurrencyLocal = (value: number | null | undefined, currency: 'TRY' | 'USD' = 'TRY'): string => {
    const num = value ?? 0;
    return currency === 'USD' ? `$${num.toFixed(2)}` : `${num.toFixed(2)}₺`;
}
const formatTimestampLocal = (dateString: string | null | undefined): string => { try { return dateString ? format(new Date(dateString), 'dd.MM.yyyy HH:mm', { locale: tr }) : '-'; } catch { return 'Geçersiz T.'; } };
const getTransactionTypeInfo = (type: WholesalerTransactionType) => {
    switch (type) {
        case 'purchase': return { text: 'Alım/Borç', icon: <ArrowUpRight className="h-4 w-4 text-red-600" />, color: 'text-red-600' };
        case 'payment': return { text: 'Ödeme', icon: <ArrowDownLeft className="h-4 w-4 text-green-600" />, color: 'text-green-600' };
        case 'return': return { text: 'İade', icon: <Undo2 className="h-4 w-4 text-blue-600" />, color: 'text-blue-600' };
        case 'adjustment': return { text: 'Düzeltme', icon: <Settings className="h-4 w-4 text-gray-600" />, color: 'text-gray-600' };
        default: return { text: type, icon: <Settings className="h-4 w-4 text-gray-500" />, color: '' };
    }
};

const WholesalerTransactionDialog: React.FC<WholesalerTransactionDialogProps> = ({ isOpen, setIsOpen, wholesaler }) => {
    const { toast } = useToast();
    // State tipi DisplayTransaction oldu
    const [transactions, setTransactions] = useState<DisplayTransaction[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isProcessingId, setIsProcessingId] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    // Fatura detaylarını fetch eden state'ler kaldırıldı.

    // Hareketleri Çekme Fonksiyonu (JOIN ile güncellendi)
    const fetchTransactions = useCallback(async () => {
        if (!isOpen || !wholesaler?.id) { setTransactions([]); return; }
        setIsLoading(true); setError(null);
        try {
            // === JOIN EKLENDİ: purchase_invoices(items) ===
            const { data, error: fetchError } = await supabase
                .from('wholesaler_transactions')
                // İlişkili faturanın 'items' alanını çekiyoruz ve 'purchase_invoice' olarak adlandırıyoruz
                .select('*, purchase_invoice:purchase_invoices(items)')
                .eq('wholesaler_id', wholesaler.id)
                .order('date', { ascending: false });

            if (fetchError) throw fetchError;

            // Tipleri doğrula ve fatura kalemlerini ekle
            const fetchedTransactions: DisplayTransaction[] = (data || []).map((tx: any) => {
                // Gelen JSONB verisini PurchaseInvoiceItem[] tipine dönüştür
                let items: PurchaseInvoiceItem[] | null = null;
                if (tx.purchase_invoice && Array.isArray(tx.purchase_invoice.items)) {
                    items = tx.purchase_invoice.items.map((item: any): PurchaseInvoiceItem => ({
                        product_id: item.product_id ?? null,
                        name: item.name ?? '?',
                        quantity: item.quantity ?? 0,
                        purchase_price_currency: item.purchase_price_currency ?? 'TRY',
                        purchase_price_value: item.purchase_price_value ?? 0,
                        exchange_rate: item.exchange_rate ?? null,
                        line_total_try: item.line_total_try ?? 0,
                        // originalUnit burada json'da olmayabilir, ihtiyaç varsa eklenmeli
                    }));
                }

                return {
                    id: tx.id, created_at: tx.created_at, wholesaler_id: tx.wholesaler_id, date: tx.date,
                    type: tx.type as WholesalerTransactionType,
                    amount: tx.amount ?? 0, balance_after: tx.balance_after ?? 0,
                    description: tx.description ?? null,
                    related_account_tx_id: tx.related_account_tx_id ?? null,
                    related_purchase_invoice_id: tx.related_purchase_invoice_id ?? null,
                    invoiceItems: items // Fatura kalemleri eklendi
                };
            });
            setTransactions(fetchedTransactions);
            console.log(`[WholesalerTxDialog] ${fetchedTransactions.length} hareket (fatura kalemleri ile) yüklendi.`);
        } catch (err: any) { console.error("Toptancı hareketleri yüklenirken hata:", err); setError(err.message || "Hareketler yüklenemedi."); setTransactions([]); toast({ title: "Hata", description: `Hareketler yüklenemedi: ${err.message}`, variant: "destructive" }); }
        finally { setIsLoading(false); }
    }, [isOpen, wholesaler, toast]);

    useEffect(() => { if (isOpen) fetchTransactions(); }, [isOpen, fetchTransactions]);

    // Fatura Silme Handler
    const handleDeleteInvoiceClick = async (invoiceId: string | null) => {
        if (!invoiceId || !wholesaler?.id || isProcessingId) return;
        const confirmDelete = window.confirm(`İlişkili alım faturasını (ID sonu: ...${invoiceId.substring(invoiceId.length - 6)}) ve bu hareket kaydını silmek istediğinize emin misiniz?\n\nDİKKAT: Stokları ve borcu geri alacaktır! İşlem geri alınamaz.`);
        if (!confirmDelete) return;
        setIsProcessingId(invoiceId);
        const result = await deletePurchaseInvoiceAndRollback(invoiceId, wholesaler.id);
        setIsProcessingId(null);
        if (result.success) { toast({ title: "Başarılı", description: result.message }); fetchTransactions(); }
        else { toast({ title: "Hata", description: result.message, variant: "destructive" }); fetchTransactions(); }
    };

    // Ödeme Silme Handler
    const handleDeletePaymentClick = async (txId: string, amount: number) => {
        if (!wholesaler?.id || isProcessingId) return;
        const confirm = window.confirm(`Bu ödeme hareketini (Tutar: ${formatCurrencyLocal(amount)}) silmek istediğinize emin misiniz?\n\nİlişkili Kasa/Hesap hareketi de silinecek ve bakiyeler geri alınacaktır!`);
        if (!confirm) return;
        setIsProcessingId(txId);
        const result = await deleteWholesalerPaymentAndRollback(txId, wholesaler.id);
        setIsProcessingId(null);
        if (result.success) { toast({ title: "Başarılı", description: result.message }); fetchTransactions(); }
        else { toast({ title: "Hata", description: result.message, variant: "destructive" }); fetchTransactions(); }
    };

    // Fatura detay getirme fonksiyonu kaldırıldı.

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogContent className="max-w-4xl h-[80vh] flex flex-col bg-gray-900 border border-white/10 text-white p-0 shadow-2xl backdrop-blur-xl">
                <DialogHeader className="bg-white/5 border-b border-white/10 p-4 flex flex-row justify-between items-center flex-shrink-0">
                    <DialogTitle className="text-lg font-bold">Toptancı Hareketleri: {wholesaler?.name || '...'}</DialogTitle>
                    <DialogDescription className="sr-only"> Seçilen toptancı için yapılan alım, ödeme ve diğer finansal işlemlerin listesi. </DialogDescription>
                    <DialogClose asChild><Button variant="ghost" size="icon" className="text-gray-400 hover:text-white hover:bg-white/10 h-8 w-8 rounded-full transition-colors"><CancelIcon className="h-4 w-4" /></Button></DialogClose>
                </DialogHeader>
                <div className="flex-1 p-0 overflow-hidden">
                    <ScrollArea className="h-full bg-black/20 p-0">
                        {isLoading ? (<div className="flex justify-center items-center h-full"><Loader2 className="h-8 w-8 animate-spin text-blue-500" /></div>)
                            : error ? (<p className="p-4 text-center text-red-400 bg-red-500/10 m-4 rounded-lg border border-red-500/20">{error}</p>)
                                : transactions.length === 0 ? (<p className="p-4 text-center text-sm text-gray-500">Bu toptancı için hareket bulunamadı.</p>)
                                    : (
                                        <table className="w-full text-xs sm:text-sm">
                                            <thead className="sticky top-0 bg-gray-900/95 backdrop-blur-md z-10 border-b border-white/10 text-gray-400">
                                                <tr>
                                                    <th className="p-3 text-left font-medium w-[140px]">Tarih</th>
                                                    <th className="p-3 text-left font-medium w-[120px]">Tür</th>
                                                    <th className="p-3 text-left font-medium">Açıklama / İlişki / Ürünler</th> {/* Başlık güncellendi */}
                                                    <th className="p-3 text-right font-medium w-[120px]">Tutar</th>
                                                    <th className="p-3 text-right font-medium w-[120px]">Son Bakiye</th>
                                                    <th className="p-3 text-center font-medium w-[80px]">İşlemler</th>
                                                </tr>
                                            </thead>
                                            {/* Fragment kullanımına gerek kalmadı */}
                                            <tbody className="divide-y divide-white/5">
                                                {transactions.map(tx => {
                                                    const typeInfo = getTransactionTypeInfo(tx.type);
                                                    // Silinen fatura veya ödeme kontrolü
                                                    const isProcessingThis = isProcessingId === tx.id || isProcessingId === tx.related_purchase_invoice_id;

                                                    return (
                                                        <tr key={tx.id} className={`hover:bg-white/5 transition-colors ${isProcessingThis ? 'opacity-50' : 'text-gray-300'}`}>
                                                            <td className="p-3 whitespace-nowrap align-top text-gray-400 font-mono">{formatTimestampLocal(tx.date)}</td>
                                                            <td className="p-3 flex items-start gap-2 align-top"> {typeInfo.icon} <span className={typeInfo.color}>{typeInfo.text}</span> </td>
                                                            <td className="p-3 align-top"> {/* Açıklama ve Ürünler */}
                                                                <div className="text-white">{tx.description || '-'}</div>

                                                                {/* İlişkili Fatura ve Ödeme ID'leri */}
                                                                {tx.related_purchase_invoice_id && (
                                                                    <span className="flex items-center text-blue-400 text-[10px] mt-1 bg-blue-500/10 px-1.5 py-0.5 rounded w-fit border border-blue-500/20" title="İlişkili Alım Faturası">
                                                                        <FileText className="h-3 w-3 mr-1" />
                                                                        Ftr: ...{tx.related_purchase_invoice_id.substring(tx.related_purchase_invoice_id.length - 6)}
                                                                    </span>
                                                                )}
                                                                {tx.type === 'payment' && tx.related_account_tx_id && (
                                                                    <span className="flex items-center text-emerald-400 text-[10px] mt-1 bg-emerald-500/10 px-1.5 py-0.5 rounded w-fit border border-emerald-500/20" title="İlişkili Hesap Hareketi (Ödeme)">
                                                                        Ödm: ...{tx.related_account_tx_id.substring(tx.related_account_tx_id.length - 6)}
                                                                    </span>
                                                                )}

                                                                {/* === YENİ: Fatura Kalemlerini Gösterme === */}
                                                                {tx.type === 'purchase' && tx.invoiceItems && tx.invoiceItems.length > 0 && (
                                                                    <div className="mt-2 pt-2 pl-2 border-l-2 border-white/10">
                                                                        <ul className="list-none space-y-1">
                                                                            {tx.invoiceItems.map((item, index) => (
                                                                                <li key={`${tx.id}-item-${index}`} className="text-[11px] text-gray-400 flex items-center" title={`Alış: ${item.purchase_price_value}${item.purchase_price_currency === 'USD' ? '$' : '₺'}${item.purchase_price_currency === 'USD' ? ' (Kur: ' + item.exchange_rate + ')' : ''}`}>
                                                                                    <Package size={12} className="mr-1.5 flex-shrink-0 text-gray-600" />
                                                                                    <span className="font-mono text-xs text-gray-300 mr-1">{item.quantity}x</span>
                                                                                    <span className="truncate flex-1 text-gray-400">{item.name}</span>
                                                                                    <span className="ml-2 font-mono text-gray-300">{formatCurrencyLocal(item.line_total_try)}</span>
                                                                                </li>
                                                                            ))}
                                                                        </ul>
                                                                    </div>
                                                                )}
                                                                {/* === Fatura Kalemleri Sonu === */}
                                                            </td>
                                                            <td className={`p-3 text-right whitespace-nowrap font-medium font-mono align-top ${tx.amount > 0 ? 'text-red-400' : 'text-emerald-400'}`}> {tx.amount > 0 ? '+' : ''}{formatCurrencyLocal(tx.amount)} </td>
                                                            <td className="p-3 text-right whitespace-nowrap font-mono text-gray-400 align-top">{formatCurrencyLocal(tx.balance_after)}</td>
                                                            <td className="p-3 text-center align-top"> {/* İşlemler Butonları */}
                                                                {tx.type === 'purchase' && tx.related_purchase_invoice_id && (<Button variant="ghost" size="icon" onClick={() => handleDeleteInvoiceClick(tx.related_purchase_invoice_id)} className="h-8 w-8 p-0 hover:bg-red-500/20 hover:text-red-400 text-gray-600 transition-colors disabled:opacity-50" disabled={!!isProcessingId} title="Alım Faturasını ve Bu Hareketi Sil"> {isProcessingId === tx.related_purchase_invoice_id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />} </Button>)}
                                                                {tx.type === 'payment' && (<Button variant="ghost" size="icon" onClick={() => handleDeletePaymentClick(tx.id, tx.amount)} className="h-8 w-8 p-0 hover:bg-red-500/20 hover:text-red-400 text-gray-600 transition-colors disabled:opacity-50" disabled={!!isProcessingId} title="Ödeme Hareketini Sil"> {isProcessingId === tx.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />} </Button>)}
                                                                {(tx.type !== 'purchase' || !tx.related_purchase_invoice_id) && tx.type !== 'payment' && (<span className="text-gray-600">-</span>)}
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    )}
                    </ScrollArea>
                </div>
                <DialogFooter className="p-4 bg-white/5 border-t border-white/10 flex-shrink-0">
                    <DialogClose asChild><Button type="button" variant="ghost" className="text-gray-400 hover:text-white hover:bg-white/10" disabled={!!isProcessingId}>Kapat</Button></DialogClose>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default WholesalerTransactionDialog;
// --- END OF FILE src/components/wholesaler/WholesalerTransactionDialog.tsx ---