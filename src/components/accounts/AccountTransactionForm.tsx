// --- START OF FILE src/components/accounts/AccountTransactionForm.tsx ---

import React, { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription, DialogClose } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Save, X as CancelIcon, ArrowDownUp, Tag, CreditCard, DollarSign, Calendar, FileText } from 'lucide-react';
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import type { Account, AccountTransaction, ExpenseCategory, AccountTransactionType } from "@/types/backup";
import { format } from 'date-fns';
import { cn } from "@/lib/utils";

interface AccountTransactionFormProps {
    isOpen: boolean;
    setIsOpen: (open: boolean) => void;
    onTransactionSaved: () => void;
    accounts: Account[];
    selectedAccountId: string | null;
}

type TransactionFormType = 'income' | 'expense' | 'transfer' | 'credit_card_payment';

interface TransactionFormData {
    type: TransactionFormType;
    amount: string;
    description: string;
    date: string;
    targetAccountId?: string;
    expenseCategoryId?: string;
}

const initialFormData: TransactionFormData = {
    type: 'expense',
    amount: '',
    description: '',
    date: format(new Date(), 'yyyy-MM-dd'),
    targetAccountId: '',
    expenseCategoryId: ''
};

const AccountTransactionForm: React.FC<AccountTransactionFormProps> = ({ isOpen, setIsOpen, onTransactionSaved, accounts, selectedAccountId }) => {
    const { toast } = useToast();
    const [formData, setFormData] = useState<TransactionFormData>(initialFormData);
    const [isSaving, setIsSaving] = useState(false);
    const [expenseCategories, setExpenseCategories] = useState<ExpenseCategory[]>([]);
    const [isLoadingCategories, setIsLoadingCategories] = useState(false);

    const fetchExpenseCategories = useCallback(async () => {
        if (!isOpen) return;
        setIsLoadingCategories(true);
        try {
            const { data, error } = await supabase.from('expense_categories').select('*').order('name', { ascending: true });
            if (error) throw error;
            setExpenseCategories(data || []);
        } catch (e: any) {
            console.error("[AccTxForm] Gider kategorileri yüklenirken hata:", e);
            toast({ title: "Hata", description: `Gider kategorileri yüklenemedi: ${e.message}`, variant: "destructive" });
            setExpenseCategories([]);
        } finally {
            setIsLoadingCategories(false);
        }
    }, [toast, isOpen]);

    useEffect(() => {
        if (isOpen) {
            setFormData({ ...initialFormData, date: format(new Date(), 'yyyy-MM-dd') });
            fetchExpenseCategories();
        } else {
            setExpenseCategories([]);
            setIsLoadingCategories(false);
        }
    }, [isOpen, fetchExpenseCategories]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => { const { name, value } = e.target; setFormData(prev => ({ ...prev, [name]: value })); };

    const handleSelectChange = (name: keyof TransactionFormData, value: string) => {
        setFormData(prev => {
            const newState = { ...prev, [name]: value };
            if (name === 'type') {
                newState.targetAccountId = '';
                newState.expenseCategoryId = '';
            }
            return newState;
        });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedAccountId) { toast({ title: "Hata", description: "Kaynak hesap seçili değil.", variant: "destructive" }); return; }
        const sourceAccount = accounts.find(a => a.id === selectedAccountId);
        if (!sourceAccount) { toast({ title: "Hata", description: "Kaynak hesap bulunamadı.", variant: "destructive" }); return; }

        const amount = parseFloat(formData.amount);
        if (isNaN(amount) || amount <= 0) { toast({ title: "Uyarı", description: "Geçerli pozitif bir tutar girin.", variant: "destructive" }); return; }
        if (!formData.description.trim()) { toast({ title: "Uyarı", description: "Açıklama zorunludur.", variant: "destructive" }); return; }
        if (!formData.date) { toast({ title: "Uyarı", description: "Tarih zorunludur.", variant: "destructive" }); return; }

        if (formData.type === 'expense' && !formData.expenseCategoryId) { toast({ title: "Uyarı", description: "Lütfen bir gider kategorisi seçin.", variant: "destructive" }); return; }
        if ((formData.type === 'transfer' || formData.type === 'credit_card_payment') && !formData.targetAccountId) { toast({ title: "Uyarı", description: "Hedef hesap seçin.", variant: "destructive" }); return; }
        if (formData.type === 'transfer' && formData.targetAccountId === selectedAccountId) { toast({ title: "Uyarı", description: "Aynı hesaba transfer yapılamaz.", variant: "destructive" }); return; }
        if (formData.type === 'credit_card_payment') {
            const targetCreditCard = accounts.find(a => a.id === formData.targetAccountId);
            if (targetCreditCard?.type !== 'credit_card') { toast({ title: "Uyarı", description: "Kredi kartı ödemesi için hedef hesap kredi kartı olmalıdır.", variant: "destructive" }); return; }
        }

        if (formData.type !== 'income' && sourceAccount.type !== 'credit_card' && sourceAccount.current_balance < amount) {
            toast({ title: "Uyarı", description: `"${sourceAccount.name}" hesabında yeterli bakiye yok.`, variant: "destructive" }); return;
        }

        if (formData.type === 'expense' && sourceAccount.type === 'credit_card') {
            const availableLimit = (sourceAccount.credit_limit ?? 0) - sourceAccount.current_balance;
            if (amount > availableLimit) {
                if (!window.confirm(`"${sourceAccount.name}" için kullanılabilir limit (${availableLimit.toFixed(2)}₺) aşıyor. Bu gider (${amount.toFixed(2)}₺) borcu artıracak. Devam edilsin mi?`)) {
                    setIsSaving(false); return;
                }
            }
        }


        setIsSaving(true);
        const selectedDate = formData.date;
        const now = new Date();
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        const seconds = String(now.getSeconds()).padStart(2, '0');
        const transactionTimestamp = `${selectedDate}T${hours}:${minutes}:${seconds}+03:00`;

        const updateBalanceRPC = async (accountId: string, balanceChange: number) => {
            const { error } = await supabase.rpc('increment_account_balance', {
                account_id_input: accountId,
                balance_change: balanceChange
            });
            if (error) throw new Error(`Hesap (${accountId}) bakiye güncelleme (RPC) hatası: ${error.message}`);
        };

        let sourceTxId: string | null = null;
        let targetTxId: string | null = null;

        try {
            if (formData.type === 'transfer' || formData.type === 'credit_card_payment') {
                const targetAccount = accounts.find(a => a.id === formData.targetAccountId);
                if (!targetAccount) throw new Error("Hedef hesap bulunamadı.");

                const isCreditCardPayment = formData.type === 'credit_card_payment';

                let sourceBalanceChange = -amount;
                if (sourceAccount.type === 'credit_card' && !isCreditCardPayment) {
                    sourceBalanceChange = amount;
                }
                await updateBalanceRPC(sourceAccount.id, sourceBalanceChange);

                const updatedSourceAccountData = await supabase.from('accounts').select('current_balance').eq('id', sourceAccount.id).single();
                if (updatedSourceAccountData.error) throw updatedSourceAccountData.error;
                const newSourceBalance = updatedSourceAccountData.data?.current_balance ?? (sourceAccount.current_balance + sourceBalanceChange);

                const sourceTxData: Omit<AccountTransaction, 'id' | 'created_at'> = {
                    date: transactionTimestamp,
                    account_id: sourceAccount.id,
                    type: isCreditCardPayment ? 'expense' : 'transfer_out',
                    amount: -amount,
                    balance_after: newSourceBalance,
                    description: `${isCreditCardPayment ? 'KK Ödeme' : 'Transfer'} -> ${targetAccount.name}: ${formData.description}`,
                    expense_category_id: null,
                    related_sale_id: null, related_service_id: null, related_customer_tx_id: null, transfer_pair_id: null, related_wholesaler_transaction_id: null,
                };
                const { data: outTx, error: outError } = await supabase.from('account_transactions').insert(sourceTxData).select('id').single();
                if (outError || !outTx) throw outError || new Error("Kaynak hesap hareketi kaydedilemedi.");
                sourceTxId = outTx.id;

                let targetBalanceChange: number;
                let targetType: AccountTransactionType;
                let targetTransactionAmount = amount;

                if (targetAccount.type === 'credit_card') {
                    targetBalanceChange = -amount;
                    targetType = 'income';
                } else {
                    targetBalanceChange = amount;
                    targetType = 'transfer_in';
                }
                await updateBalanceRPC(targetAccount.id, targetBalanceChange);
                const updatedTargetAccountData = await supabase.from('accounts').select('current_balance').eq('id', targetAccount.id).single();
                if (updatedTargetAccountData.error) throw updatedTargetAccountData.error;
                const newTargetBalance = updatedTargetAccountData.data?.current_balance ?? (targetAccount.current_balance + targetBalanceChange);

                const targetTxData: Omit<AccountTransaction, 'id' | 'created_at'> = {
                    date: transactionTimestamp,
                    account_id: targetAccount.id,
                    type: targetType,
                    amount: targetTransactionAmount,
                    balance_after: newTargetBalance,
                    description: `${isCreditCardPayment ? 'Ödeme Alındı' : 'Transfer'} <- ${sourceAccount.name}: ${formData.description}`,
                    expense_category_id: null,
                    transfer_pair_id: formData.type === 'transfer' ? sourceTxId : null,
                    related_wholesaler_transaction_id: null,
                    related_sale_id: null, related_service_id: null, related_customer_tx_id: null,
                };
                const { data: inTx, error: inError } = await supabase.from('account_transactions').insert(targetTxData).select('id').single();
                if (inError || !inTx) {
                    await supabase.from('account_transactions').delete().eq('id', sourceTxId);
                    await updateBalanceRPC(sourceAccount.id, -sourceBalanceChange);
                    throw inError || new Error("Hedef hesap hareketi kaydedilemedi.");
                }
                targetTxId = inTx.id;

                if (formData.type === 'transfer') {
                    await supabase.from('account_transactions').update({ transfer_pair_id: targetTxId }).eq('id', sourceTxId);
                }

            } else {
                let amountWithSign: number;
                if (formData.type === 'income') {
                    amountWithSign = amount;
                } else {
                    if (sourceAccount.type === 'credit_card') {
                        amountWithSign = amount;
                    } else {
                        amountWithSign = -amount;
                    }
                }

                await updateBalanceRPC(sourceAccount.id, amountWithSign);

                const updatedAccountData = await supabase.from('accounts').select('current_balance').eq('id', sourceAccount.id).single();
                if (updatedAccountData.error) throw updatedAccountData.error;
                const newBalance = updatedAccountData.data?.current_balance ?? (sourceAccount.current_balance + amountWithSign);


                const transactionData: Omit<AccountTransaction, 'id' | 'created_at'> = {
                    date: transactionTimestamp,
                    account_id: selectedAccountId,
                    type: formData.type,
                    amount: formData.type === 'income' ? amount : -amount,
                    balance_after: newBalance,
                    description: formData.description,
                    expense_category_id: formData.type === 'expense' ? formData.expenseCategoryId : null,
                    related_sale_id: null, related_service_id: null, related_customer_tx_id: null, transfer_pair_id: null,
                    related_wholesaler_transaction_id: null,
                };
                const { data: insertedTx, error: insertError } = await supabase.from('account_transactions').insert(transactionData).select('id').single();
                if (insertError || !insertedTx) {
                    await updateBalanceRPC(sourceAccount.id, -amountWithSign);
                    throw insertError || new Error("Hareket kaydedilemedi.");
                }
                sourceTxId = insertedTx.id;
            }

            toast({ title: "Başarılı", description: "Hesap hareketi kaydedildi." });
            onTransactionSaved();
            setIsOpen(false);

        } catch (error: any) {
            console.error("Hesap hareketi kaydetme hatası:", error);
            toast({ title: "Hata", description: `Hareket kaydedilemedi: ${error.message}`, variant: "destructive" });
            try {
                if (targetTxId) await supabase.from('account_transactions').delete().eq('id', targetTxId);
                if (sourceTxId) await supabase.from('account_transactions').delete().eq('id', sourceTxId);
                onTransactionSaved();
            } catch (rollbackError) {
                console.error("Rollback sırasında hata:", rollbackError);
            }
        } finally {
            setIsSaving(false);
        }
    };

    const targetAccountsForTransfer = accounts.filter(acc => acc.id !== selectedAccountId);
    const targetAccountsForCreditCardPayment = accounts.filter(acc => acc.type === 'credit_card' && acc.id !== selectedAccountId);

    return (
        <Dialog open={isOpen} onOpenChange={(open) => { if (!isSaving) setIsOpen(open) }}>
            <DialogContent className="sm:max-w-[450px] bg-gray-900 border border-white/10 text-white p-0 shadow-2xl backdrop-blur-xl">
                <DialogHeader className="bg-white/5 border-b border-white/10 p-4 flex flex-row items-center justify-between space-y-0">
                    <DialogTitle className="text-lg font-bold flex items-center gap-2">
                        <ArrowDownUp className="h-5 w-5 text-blue-400" />
                        Yeni Hesap Hareketi
                    </DialogTitle>
                    <DialogClose asChild>
                        <Button variant="ghost" size="icon" className="text-gray-400 hover:text-white hover:bg-white/10 h-8 w-8 rounded-full">
                            <CancelIcon className="h-4 w-4" />
                        </Button>
                    </DialogClose>
                </DialogHeader>

                <div className="p-6">
                    <DialogDescription className="text-gray-400 text-xs mb-6">
                        {accounts.find(a => a.id === selectedAccountId)?.name || 'Hesap Seçilmedi'} için gelir, gider, transfer veya ödeme girin.
                    </DialogDescription>

                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div className="space-y-2">
                            <Label htmlFor="tx-type" className="text-xs font-medium text-gray-400 ml-1">İşlem Türü *</Label>
                            <Select value={formData.type} onValueChange={(v: TransactionFormType) => handleSelectChange('type', v)} disabled={isSaving}>
                                <SelectTrigger id="tx-type" className="bg-white/5 border-white/10 text-white h-10 text-sm focus:ring-blue-500/50">
                                    <SelectValue placeholder="Tür seçin..." />
                                </SelectTrigger>
                                <SelectContent className="bg-gray-800 border-gray-700 text-white">
                                    <SelectItem value="expense"><span className="flex items-center"><Tag className="mr-2 h-3 w-3" />Gider</span></SelectItem>
                                    <SelectItem value="income"><span className="flex items-center"><DollarSign className="mr-2 h-3 w-3" />Gelir</span></SelectItem>
                                    <SelectItem value="transfer"><span className="flex items-center"><ArrowDownUp className="mr-2 h-3 w-3" />Transfer</span></SelectItem>
                                    <SelectItem value="credit_card_payment"><span className="flex items-center"><CreditCard className="mr-2 h-3 w-3" />K. Kartı Ödeme</span></SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {formData.type === 'expense' && (
                            <div className="space-y-2">
                                <Label htmlFor="tx-expenseCategoryId" className="text-xs font-medium text-gray-400 ml-1">Kategori *</Label>
                                {isLoadingCategories ? (<div className="flex items-center"><Loader2 className="h-5 w-5 animate-spin text-gray-500" /></div>) : (
                                    <Select value={formData.expenseCategoryId} onValueChange={(value) => handleSelectChange('expenseCategoryId', value)} disabled={isSaving}>
                                        <SelectTrigger id="tx-expenseCategoryId" className="bg-white/5 border-white/10 text-white h-10 text-sm focus:ring-blue-500/50">
                                            <SelectValue placeholder="Gider kategorisi..." />
                                        </SelectTrigger>
                                        <SelectContent className="bg-gray-800 border-gray-700 text-white">
                                            {expenseCategories.length === 0 ? (<SelectItem value="placeholder-disabled" disabled>Kategori yok.</SelectItem>) : (expenseCategories.map(cat => (<SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>)))}
                                        </SelectContent>
                                    </Select>
                                )}
                            </div>
                        )}

                        <div className="space-y-2">
                            <Label htmlFor="tx-amount" className="text-xs font-medium text-gray-400 ml-1">Tutar *</Label>
                            <div className="relative">
                                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                                <Input id="tx-amount" name="amount" type="number" step="0.01" min="0.01" value={formData.amount} onChange={handleInputChange} className="pl-10 bg-white/5 border-white/10 text-white h-10 text-sm focus:border-blue-500/50" disabled={isSaving} required />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="tx-date" className="text-xs font-medium text-gray-400 ml-1">Tarih *</Label>
                            <div className="relative">
                                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                                <Input id="tx-date" name="date" type="date" value={formData.date} onChange={handleInputChange} className="pl-10 bg-white/5 border-white/10 text-white h-10 text-sm focus:border-blue-500/50" disabled={isSaving} required />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="tx-description" className="text-xs font-medium text-gray-400 ml-1">Açıklama *</Label>
                            <div className="relative">
                                <FileText className="absolute left-3 top-3 h-4 w-4 text-gray-500" />
                                <Textarea id="tx-description" name="description" value={formData.description} onChange={handleInputChange} className="pl-10 min-h-[80px] bg-white/5 border-white/10 text-white text-sm focus:border-blue-500/50" disabled={isSaving} required />
                            </div>
                        </div>

                        {(formData.type === 'transfer' || formData.type === 'credit_card_payment') && (
                            <div className="space-y-2">
                                <Label htmlFor="tx-targetAccountId" className="text-xs font-medium text-gray-400 ml-1">Hedef Hesap *</Label>
                                <Select value={formData.targetAccountId} onValueChange={(v) => handleSelectChange('targetAccountId', v)} disabled={isSaving}>
                                    <SelectTrigger id="tx-targetAccountId" className="bg-white/5 border-white/10 text-white h-10 text-sm focus:ring-blue-500/50">
                                        <SelectValue placeholder="Hedef hesap..." />
                                    </SelectTrigger>
                                    <SelectContent className="bg-gray-800 border-gray-700 text-white">
                                        {(formData.type === 'transfer' ? targetAccountsForTransfer : targetAccountsForCreditCardPayment).length === 0 ? (
                                            <SelectItem value="-" disabled>Uygun hedef hesap yok.</SelectItem>
                                        ) : (
                                            (formData.type === 'transfer' ? targetAccountsForTransfer : targetAccountsForCreditCardPayment).map(acc => <SelectItem key={acc.id} value={acc.id}>{acc.name} ({acc.type})</SelectItem>)
                                        )}
                                    </SelectContent>
                                </Select>
                            </div>
                        )}

                        <DialogFooter className="pt-2">
                            <Button type="button" variant="ghost" onClick={() => setIsOpen(false)} disabled={isSaving} className="text-gray-400 hover:text-white hover:bg-white/10">İptal</Button>
                            <Button type="submit" disabled={isSaving} className="bg-blue-600 hover:bg-blue-700 text-white shadow-[0_0_15px_rgba(37,99,235,0.4)]">
                                {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />} Kaydet
                            </Button>
                        </DialogFooter>
                    </form>
                </div>
            </DialogContent>
        </Dialog>
    );
};

export default AccountTransactionForm;
// --- END OF FILE src/components/accounts/AccountTransactionForm.tsx ---