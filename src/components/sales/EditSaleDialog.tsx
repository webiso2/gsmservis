// --- START OF FILE src/components/sales/EditSaleDialog.tsx ---

import React, { useState, useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Save, X as CancelIcon, AlertTriangle, Calendar, User, Wallet, Tag } from 'lucide-react';
import { format } from 'date-fns';
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import type { Sale, Account } from '@/types/backup';
import type { Customer } from '@/types/customer';
import { cn } from "@/lib/utils";

interface EditSaleDialogProps {
    isOpen: boolean;
    setIsOpen: (open: boolean) => void;
    saleToEdit: Sale;
    onSaleUpdated: () => void;
    customers: Customer[];
    accounts: Account[];
}

interface EditSaleFormData {
    customer_id: string;
    date: string;
    discount_amount: string;
    selectedAccountId: string;
}

interface OriginalTransactionInfo {
    id: string | null;
    accountId: string | null;
    amount: number | null;
}

const EditSaleDialog: React.FC<EditSaleDialogProps> = ({ isOpen, setIsOpen, saleToEdit, onSaleUpdated, customers, accounts }) => {
    const { toast } = useToast();
    const [formData, setFormData] = useState<EditSaleFormData>({ customer_id: '', date: '', discount_amount: '', selectedAccountId: '' });
    const [originalTxInfo, setOriginalTxInfo] = useState<OriginalTransactionInfo>({ id: null, accountId: null, amount: null });
    const [isSaving, setIsSaving] = useState(false);
    const [isLoadingTx, setIsLoadingTx] = useState(false);

    useEffect(() => {
        if (saleToEdit && isOpen) {
            setIsLoadingTx(true);
            setOriginalTxInfo({ id: null, accountId: null, amount: null });

            setFormData({
                customer_id: saleToEdit.customer_id ?? '',
                date: saleToEdit.date ? format(new Date(saleToEdit.date), "yyyy-MM-dd'T'HH:mm") : '',
                discount_amount: (saleToEdit.discount_amount ?? 0).toString(),
                selectedAccountId: '',
            });

            const fetchTransaction = async () => {
                try {
                    const { data: txData, error: txError } = await supabase
                        .from('account_transactions')
                        .select('id, account_id, amount')
                        .eq('related_sale_id', saleToEdit.id)
                        .maybeSingle();

                    if (txError) throw txError;

                    if (txData) {
                        setFormData(prev => ({ ...prev, selectedAccountId: txData.account_id ?? '' }));
                        setOriginalTxInfo({ id: txData.id, accountId: txData.account_id, amount: txData.amount });
                    } else {
                        console.warn(`Satış ${saleToEdit.id} için hesap hareketi bulunamadı.`);
                    }
                } catch (error) {
                    console.error("Ödeme bilgisi alınırken hata:", error);
                    toast({ title: "Uyarı", description: "Bu satışın ödeme kaydı bulunamadı, sadece müşteri/tarih güncellenebilir.", variant: "default" });
                } finally {
                    setIsLoadingTx(false);
                }
            };
            fetchTransaction();
        }
    }, [saleToEdit, isOpen, toast]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);

        try {
            const discount = parseFloat(formData.discount_amount) || 0;
            const newNetTotal = Math.max(0, (saleToEdit.total ?? 0) - discount);

            const originalAccountId = originalTxInfo.accountId;
            const newAccountId = formData.selectedAccountId;
            const transactionId = originalTxInfo.id;
            const originalAmount = originalTxInfo.amount ?? 0;

            if (transactionId && originalAccountId) {
                if (originalAccountId !== newAccountId && newAccountId) {
                    await supabase.rpc('increment_account_balance', { account_id_input: originalAccountId, balance_change: -originalAmount });
                    await supabase.rpc('increment_account_balance', { account_id_input: newAccountId, balance_change: newNetTotal });
                    await supabase.from('account_transactions').update({
                        account_id: newAccountId,
                        amount: newNetTotal,
                        balance_after: 0,
                        date: new Date(formData.date).toISOString(), // Date update added
                        description: `Satış (Düzeltildi): ${customers.find(c => c.id === formData.customer_id)?.name} ${discount > 0 ? `(İnd: ${discount}₺)` : ''}`
                    }).eq('id', transactionId);
                }
                else {
                    // Update date and amount even if account didn't change logic needs to handle potential amount diff
                    // If amount diff > 0.01 OR date changed
                    const dateChanged = saleToEdit.date !== new Date(formData.date).toISOString();
                    const amountChanged = Math.abs(originalAmount - newNetTotal) > 0.01;

                    if (amountChanged) {
                        const diff = newNetTotal - originalAmount;
                        await supabase.rpc('increment_account_balance', { account_id_input: originalAccountId, balance_change: diff });
                    }

                    if (amountChanged || dateChanged) {
                        await supabase.from('account_transactions').update({
                            amount: newNetTotal,
                            date: new Date(formData.date).toISOString(), // Date update added
                            description: `Satış (Düzeltildi): ${customers.find(c => c.id === formData.customer_id)?.name} ${discount > 0 ? `(İnd: ${discount}₺)` : ''}`
                        }).eq('id', transactionId);
                    }
                }
            }

            const { error: salesUpError } = await supabase.from('sales').update({
                customer_id: formData.customer_id || null,
                date: new Date(formData.date).toISOString(),
                discount_amount: discount,
                net_total: newNetTotal
            }).eq('id', saleToEdit.id);

            if (salesUpError) throw salesUpError;

            toast({ title: "Başarılı", description: "Satış ve bakiye bilgileri güncellendi." });
            onSaleUpdated();
            setIsOpen(false);

        } catch (error: any) {
            console.error("Güncelleme hatası:", error);
            toast({ title: "Hata", description: error.message, variant: "destructive" });
        } finally {
            setIsSaving(false);
        }
    };

    const paymentAccounts = useMemo(() => accounts.filter(acc => ['cash', 'pos', 'bank'].includes(acc.type)), [accounts]);

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogContent className="sm:max-w-[500px] bg-gray-900 border border-white/10 text-white p-0 shadow-2xl backdrop-blur-xl">
                <DialogHeader className="bg-white/5 border-b border-white/10 p-4 flex flex-row justify-between items-center space-y-0">
                    <DialogTitle className="text-lg font-bold flex items-center gap-2">
                        <Tag className="h-5 w-5 text-blue-400" />
                        Satışı Düzenle
                    </DialogTitle>
                    <Button variant="ghost" size="icon" className="text-gray-400 hover:text-white hover:bg-white/10 h-8 w-8 rounded-full" onClick={() => setIsOpen(false)}>
                        <CancelIcon className="h-4 w-4" />
                    </Button>
                </DialogHeader>

                <div className="p-6">
                    <DialogDescription className="text-amber-200/80 text-xs mb-6 p-3 border border-amber-500/20 bg-amber-500/10 rounded-lg flex items-start gap-3">
                        <AlertTriangle className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
                        <span>Dikkat: İndirim veya Hesap değişikliği yapıldığında, ilgili hesapların bakiyeleri otomatik olarak düzeltilecektir.</span>
                    </DialogDescription>

                    {isLoadingTx ? (
                        <div className="flex justify-center p-8 text-gray-400 gap-3 flex-col items-center">
                            <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
                            <span className="text-sm">İşlem detayları yükleniyor...</span>
                        </div>
                    ) : (
                        <form onSubmit={handleUpdate} className="space-y-5">
                            <div className="space-y-2">
                                <Label htmlFor="edit-customer" className="text-xs font-medium text-gray-400 ml-1">Müşteri</Label>
                                <div className="relative">
                                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                                    <Select value={formData.customer_id} onValueChange={(v) => setFormData(p => ({ ...p, customer_id: v }))} disabled={isSaving}>
                                        <SelectTrigger id="edit-customer" className="pl-10 bg-white/5 border-white/10 text-white h-10 text-sm focus:ring-blue-500/50">
                                            <SelectValue placeholder="Seçiniz" />
                                        </SelectTrigger>
                                        <SelectContent className="bg-gray-800 border-gray-700 text-white">
                                            {customers.map(c => <SelectItem key={c.id} value={c.id} className="focus:bg-gray-700 focus:text-white">{c.name}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="edit-date" className="text-xs font-medium text-gray-400 ml-1">Tarih/Saat</Label>
                                <div className="relative">
                                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                                    <Input id="edit-date" name="date" type="datetime-local" value={formData.date} onChange={handleInputChange} className="pl-10 bg-white/5 border-white/10 text-white h-10 text-sm focus:border-blue-500/50" disabled={isSaving} />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="edit-account" className="text-xs font-medium text-gray-400 ml-1">Ödeme Hesabı</Label>
                                <div className="relative">
                                    <Wallet className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                                    <Select value={formData.selectedAccountId} onValueChange={(v) => setFormData(p => ({ ...p, selectedAccountId: v }))} disabled={isSaving || !originalTxInfo.id}>
                                        <SelectTrigger id="edit-account" className="pl-10 bg-white/5 border-white/10 text-white h-10 text-sm focus:ring-blue-500/50">
                                            <SelectValue placeholder="Seçiniz" />
                                        </SelectTrigger>
                                        <SelectContent className="bg-gray-800 border-gray-700 text-white">
                                            {paymentAccounts.map(acc => <SelectItem key={acc.id} value={acc.id} className="focus:bg-gray-700 focus:text-white">{acc.name} ({acc.type})</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="edit-discount" className="text-xs font-medium text-gray-400 ml-1">İndirim (₺)</Label>
                                <div className="relative">
                                    <Tag className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                                    <Input id="edit-discount" name="discount_amount" type="number" step="0.01" min="0" value={formData.discount_amount} onChange={handleInputChange} className="pl-10 bg-white/5 border-white/10 text-white h-10 text-sm text-right pr-4 focus:border-blue-500/50" disabled={isSaving} />
                                </div>
                            </div>

                            <div className="pt-4 border-t border-white/10 flex items-center justify-between">
                                <Label className="text-sm font-bold text-blue-400">YENİ NET TUTAR:</Label>
                                <div className="h-10 px-4 bg-blue-500/20 rounded-lg border border-blue-500/30 flex items-center justify-end font-mono font-bold text-lg text-blue-400 min-w-[120px]">
                                    {((saleToEdit.total ?? 0) - (parseFloat(formData.discount_amount) || 0)).toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺
                                </div>
                            </div>

                            <DialogFooter className="pt-2">
                                <Button type="button" variant="ghost" onClick={() => setIsOpen(false)} disabled={isSaving} className="text-gray-400 hover:text-white hover:bg-white/10">İptal</Button>
                                <Button type="submit" disabled={isSaving} className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-[0_0_15px_rgba(16,185,129,0.4)]">
                                    {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                                    Değişiklikleri Kaydet
                                </Button>
                            </DialogFooter>
                        </form>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
};

export default EditSaleDialog;
// --- END OF FILE src/components/sales/EditSaleDialog.tsx ---