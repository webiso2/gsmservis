// --- START OF FILE src/CashierModule.tsx ---

import React, { useState, useEffect, useCallback } from 'react';
import { X, DollarSign, ArrowUpCircle, ArrowDownCircle, Trash2, Loader2, Tag, CreditCard, Wallet } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { tr } from 'date-fns/locale';
import type { Account, AccountTransaction, ExpenseCategory } from "@/types/backup";
import { cn } from '@/lib/utils';

interface FormData {
    date: string;
    amount: string;
    description: string;
    expenseCategoryId: string;
}
interface CashierModuleProps { onClose: () => void; }
interface DisplayTransaction extends AccountTransaction {
    accountName?: string;
    accountType?: Account['type'];
    expenseCategoryName?: string | null;
}

const CashierModule: React.FC<CashierModuleProps> = ({ onClose }) => {
    const { toast } = useToast();
    const [accounts, setAccounts] = useState<Account[]>([]);
    const [selectedAccountId, setSelectedAccountId] = useState<string>('');
    const [transactionType, setTransactionType] = useState<'income' | 'expense'>('expense');
    const [formData, setFormData] = useState<FormData>({
        date: format(new Date(), 'yyyy-MM-dd'),
        amount: '',
        description: '',
        expenseCategoryId: ''
    });
    const [recentTransactions, setRecentTransactions] = useState<DisplayTransaction[]>([]);
    const [expenseCategories, setExpenseCategories] = useState<ExpenseCategory[]>([]);
    const [isLoadingCategories, setIsLoadingCategories] = useState(false);
    const [isLoadingAccounts, setIsLoadingAccounts] = useState(false);
    const [isSavingTransaction, setIsSavingTransaction] = useState(false);
    const [isLoadingTransactions, setIsLoadingTransactions] = useState(false);
    const [isDeleting, setIsDeleting] = useState<string | null>(null);

    const formatCurrency = (value: number | string | null | undefined): string => { if (value == null) return "0.00"; const num = typeof value === 'string' ? parseFloat(value) : value; return isNaN(num) ? "0.00" : num.toFixed(2); };
    const formatReportDate = (dateString: string | null | undefined) => { try { return dateString ? format(new Date(dateString), 'dd.MM.yyyy HH:mm', { locale: tr }) : '-'; } catch { return '-'; } };

    const fetchAccounts = useCallback(async () => {
        setIsLoadingAccounts(true);
        try {
            const { data, error } = await supabase.from('accounts').select('*').order('name');
            if (error) throw error;
            const fetchedAccounts: Account[] = (data || []).map(acc => ({
                id: acc.id, created_at: acc.created_at, name: acc.name ?? '',
                type: acc.type ?? 'cash',
                account_number: acc.account_number ?? null, bank_name: acc.bank_name ?? null,
                initial_balance: acc.initial_balance ?? 0, current_balance: acc.current_balance ?? 0,
                is_default: acc.is_default ?? false,
                credit_limit: acc.credit_limit ?? 0
            }));
            setAccounts(fetchedAccounts);
            if (!selectedAccountId || !fetchedAccounts.some(a => a.id === selectedAccountId)) {
                const defaultCash = fetchedAccounts.find(a => a.type === 'cash' && a.is_default);
                const firstCash = fetchedAccounts.find(a => a.type === 'cash');
                const firstAccount = fetchedAccounts.length > 0 ? fetchedAccounts[0] : null;
                const accountToSelect = defaultCash || firstCash || firstAccount;
                if (accountToSelect) { setSelectedAccountId(accountToSelect.id); } else { setSelectedAccountId(''); }
            }
        } catch (e: any) { console.error("Hesap yükleme hatası (Kasiyer):", e); toast({ title: "Hata", description: `Hesaplar yüklenemedi: ${e.message}`, variant: "destructive" }); }
        finally { setIsLoadingAccounts(false); }
    }, [toast, selectedAccountId]);

    const fetchExpenseCategories = useCallback(async () => {
        setIsLoadingCategories(true);
        try {
            const { data, error } = await supabase.from('expense_categories').select('*').order('name', { ascending: true });
            if (error) throw error;
            setExpenseCategories(data || []);
        } catch (e: any) { console.error("Gider kategorileri yüklenirken hata:", e); toast({ title: "Hata", description: `Gider kategorileri yüklenemedi: ${e.message}`, variant: "destructive" }); setExpenseCategories([]); }
        finally { setIsLoadingCategories(false); }
    }, [toast]);

    const fetchRecentManualTransactions = useCallback(async () => {
        setIsLoadingTransactions(true);
        try {
            const { data, error } = await supabase.from('account_transactions').select('*, account:accounts(name, type), category:expense_categories(name)').in('type', ['income', 'expense']).is('related_sale_id', null).is('related_service_id', null).is('related_customer_tx_id', null).is('transfer_pair_id', null).is('related_wholesaler_transaction_id', null).order('date', { ascending: false }).limit(20);
            if (error) throw error;
            const fetchedTransactions: DisplayTransaction[] = (data || []).map((t: any) => ({ ...t, amount: t.amount ?? 0, balance_after: t.balance_after ?? 0, accountName: t.account?.name ?? 'Bilinmeyen Hesap', accountType: t.account?.type ?? 'unknown', expenseCategoryName: t.category?.name ?? null }));
            setRecentTransactions(fetchedTransactions);
        } catch (e: any) { console.error("Son işlemler yüklenirken hata:", e); toast({ title: "Hata", description: `Son işlemler yüklenemedi: ${e.message}`, variant: "destructive" }); }
        finally { setIsLoadingTransactions(false); }
    }, [toast]);

    useEffect(() => { fetchAccounts(); fetchRecentManualTransactions(); fetchExpenseCategories(); }, [fetchAccounts, fetchRecentManualTransactions, fetchExpenseCategories]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => { const { name, value } = e.target; setFormData(prev => ({ ...prev, [name]: value })); };
    const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => { setFormData(prev => ({ ...prev, date: e.target.value || format(new Date(), 'yyyy-MM-dd') })); };
    const handleSelectChange = (name: keyof FormData, value: string) => { setFormData(prev => ({ ...prev, [name]: value })); };

    const updateBalanceRPC = async (accountId: string, balanceChange: number) => {
        const { error } = await supabase.rpc('increment_account_balance', {
            account_id_input: accountId,
            balance_change: balanceChange
        });
        if (error) throw new Error(`Hesap (${accountId}) bakiye güncelleme (RPC) hatası: ${error.message}`);
    };

    const handleAddTransaction = async () => {
        const amount = parseFloat(formData.amount);
        if (isNaN(amount) || amount <= 0) { toast({ title: "Uyarı", description: "Lütfen geçerli bir tutar girin.", variant: "destructive" }); return; }
        if (!formData.description.trim()) { toast({ title: "Uyarı", description: "Lütfen bir açıklama girin.", variant: "destructive" }); return; }
        if (!selectedAccountId) { toast({ title: "Uyarı", description: "Lütfen bir hesap seçin.", variant: "destructive" }); return; }
        const targetAccount = accounts.find(a => a.id === selectedAccountId);
        if (!targetAccount) { toast({ title: "Hata", description: "Seçilen hesap bulunamadı.", variant: "destructive" }); return; }

        if (transactionType === 'expense' && !formData.expenseCategoryId) { toast({ title: "Uyarı", description: "Lütfen bir gider kategorisi seçin.", variant: "destructive" }); return; }

        if (transactionType === 'expense' && targetAccount.type === 'credit_card') {
            const availableLimit = (targetAccount.credit_limit ?? 0) - targetAccount.current_balance;
            if (amount > availableLimit) {
                if (!window.confirm(`"${targetAccount.name}" için kullanılabilir limit (${availableLimit.toFixed(2)}₺) aşıyor. Bu gider (${amount.toFixed(2)}₺) borcu artıracak. Devam edilsin mi?`)) {
                    return;
                }
            }
        } else if (transactionType === 'expense' && targetAccount.type !== 'credit_card' && targetAccount.current_balance < amount) {
            toast({ title: "Uyarı", description: `"${targetAccount.name}" hesabında yeterli bakiye yok.`, variant: "destructive" });
            return;
        }

        setIsSavingTransaction(true);
        let insertedTxId: string | null = null;

        try {
            let amountForRPC: number;
            let transactionAmountForDB: number;

            if (transactionType === 'income') {
                amountForRPC = amount;
                transactionAmountForDB = amount;
            } else { // expense
                if (targetAccount.type === 'credit_card') {
                    amountForRPC = amount;
                    transactionAmountForDB = -amount;
                } else {
                    amountForRPC = -amount;
                    transactionAmountForDB = -amount;
                }
            }

            await updateBalanceRPC(selectedAccountId, amountForRPC);

            const { data: updatedAccountData, error: fetchError } = await supabase.from('accounts').select('current_balance').eq('id', selectedAccountId).single();
            if (fetchError || !updatedAccountData) throw fetchError || new Error("Hesap güncel bakiye alınamadı.");
            const newBalance = updatedAccountData.current_balance ?? (targetAccount.current_balance + amountForRPC);

            let transactionDate: string;
            if (formData.date) {
                const selectedDate = formData.date;
                const now = new Date();
                const hours = String(now.getHours()).padStart(2, '0');
                const minutes = String(now.getMinutes()).padStart(2, '0');
                const seconds = String(now.getSeconds()).padStart(2, '0');
                transactionDate = `${selectedDate}T${hours}:${minutes}:${seconds}+03:00`;
            } else {
                const now = new Date();
                const year = now.getFullYear();
                const month = String(now.getMonth() + 1).padStart(2, '0');
                const day = String(now.getDate()).padStart(2, '0');
                const hours = String(now.getHours()).padStart(2, '0');
                const minutes = String(now.getMinutes()).padStart(2, '0');
                const seconds = String(now.getSeconds()).padStart(2, '0');
                transactionDate = `${year}-${month}-${day}T${hours}:${minutes}:${seconds}+03:00`;
            }
            const transactionData: Omit<AccountTransaction, 'id' | 'created_at'> = {
                date: transactionDate,
                account_id: selectedAccountId,
                type: transactionType,
                amount: transactionAmountForDB,
                balance_after: newBalance,
                description: `[Manuel Kasa] ${formData.description.trim()}`,
                related_sale_id: null, related_service_id: null, related_customer_tx_id: null,
                transfer_pair_id: null,
                expense_category_id: transactionType === 'expense' ? formData.expenseCategoryId : null,
                related_wholesaler_transaction_id: null
            };
            const { data: insertedTx, error: insertError } = await supabase.from('account_transactions').insert(transactionData).select('id').single();
            if (insertError || !insertedTx) throw insertError || new Error("Eklenen hesap hareketi verisi alınamadı.");
            insertedTxId = insertedTx.id;

            toast({ title: "Başarılı", description: `${transactionType === 'income' ? 'Gelir' : 'Gider'} başarıyla kaydedildi.` });
            setFormData({ date: format(new Date(), 'yyyy-MM-dd'), amount: '', description: '', expenseCategoryId: '' });
            await fetchAccounts();
            await fetchRecentManualTransactions();
        } catch (error: any) {
            console.error("Manuel işlem kaydı hatası:", error);
            toast({ title: "Hata", description: `İşlem kaydedilemedi: ${error.message}`, variant: "destructive" });
            if (insertedTxId) {
                await supabase.from('account_transactions').delete().eq('id', insertedTxId);
            }
            if (targetAccount) {
                const amountToRollback = transactionType === 'income' ? -amount : (targetAccount.type === 'credit_card' ? -amount : amount);
                try {
                    await updateBalanceRPC(selectedAccountId, amountToRollback);
                    await fetchAccounts();
                } catch (rbError) {
                    console.error("Bakiye geri alma sırasında RPC hatası:", rbError);
                }
            }
        } finally {
            setIsSavingTransaction(false);
        }
    };

    const handleDeleteTransaction = async (transaction: AccountTransaction) => {
        if (!transaction || isDeleting) return;
        if (!['income', 'expense'].includes(transaction.type) || transaction.related_sale_id || transaction.related_service_id || transaction.related_customer_tx_id || transaction.transfer_pair_id || transaction.related_wholesaler_transaction_id) {
            toast({ title: "Uyarı", description: "Sadece manuel eklenmiş gelir/gider hareketleri silinebilir.", variant: "destructive" }); return;
        }
        if (!window.confirm(`İşlemi silmek istediğinize emin misiniz? "${transaction.description}" (Tutar: ${formatCurrency(transaction.amount)})\n\nBu işlem ilişkili hesap bakiyesini geri alacaktır.`)) return;

        setIsDeleting(transaction.id);
        const accountToUpdate = accounts.find(acc => acc.id === transaction.account_id);
        if (!accountToUpdate) { toast({ title: "Hata", description: "İlişkili hesap bulunamadı.", variant: "destructive" }); setIsDeleting(null); return; }

        try {
            const balanceChangeForRollback = -transaction.amount;
            await updateBalanceRPC(transaction.account_id, balanceChangeForRollback);

            const { error: deleteError } = await supabase.from('account_transactions').delete().eq('id', transaction.id);
            if (deleteError) {
                await updateBalanceRPC(transaction.account_id, -balanceChangeForRollback);
                throw new Error(`Hesap hareketi silinemedi: ${deleteError.message}`);
            }

            toast({ title: "Başarılı", description: "İşlem silindi ve bakiye güncellendi." });
            await fetchAccounts();
            await fetchRecentManualTransactions();
        } catch (error: any) {
            console.error("Manuel işlem silme hatası:", error);
            toast({ title: "Hata", description: `İşlem silinemedi: ${error.message}`, variant: "destructive" });
        } finally {
            setIsDeleting(null);
        }
    };

    return (
        <div className="h-full p-2 sm:p-4 animate-in fade-in duration-300">
            <div className="glass-panel rounded-xl h-full flex flex-col border border-white/10 shadow-2xl overflow-hidden">
                <div className="bg-white/5 border-b border-white/10 p-3 flex justify-between items-center flex-shrink-0 backdrop-blur-md">
                    <div className="flex items-center gap-2">
                        <div className="p-2 bg-emerald-500/20 rounded-lg">
                            <Wallet className="h-5 w-5 text-emerald-400" />
                        </div>
                        <h1 className="text-lg font-bold text-white tracking-tight">Manuel Kasa İşlemleri</h1>
                    </div>
                    <Button variant="ghost" size="icon" className="hover:bg-red-500/20 hover:text-red-400 h-8 w-8 rounded-lg transition-colors" onClick={onClose} disabled={isSavingTransaction || !!isDeleting}>
                        <X className="h-5 w-5" />
                    </Button>
                </div>

                <ScrollArea className="flex-1">
                    <div className="p-3 sm:p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="glass-card p-4 space-y-4">
                            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                                <DollarSign className="h-5 w-5 text-emerald-400" />
                                Yeni İşlem Kaydı
                            </h2>

                            <div className="space-y-4">
                                <div className="space-y-1.5">
                                    <Label htmlFor="cashier-account" className="text-xs font-medium text-gray-400">Hesap *</Label>
                                    {isLoadingAccounts ? <Loader2 className="h-5 w-5 animate-spin text-emerald-500" /> : (
                                        <Select value={selectedAccountId} onValueChange={setSelectedAccountId} disabled={isSavingTransaction}>
                                            <SelectTrigger id="cashier-account" className="h-9 bg-white/5 border-white/10 text-white text-xs focus:ring-emerald-500/50">
                                                <SelectValue placeholder="Hesap seçin..." />
                                            </SelectTrigger>
                                            <SelectContent className="bg-gray-900 border-gray-800 text-white">
                                                {accounts.length === 0 ? (<SelectItem value="placeholder-disabled" disabled>Hesap bulunamadı.</SelectItem>) : (
                                                    accounts.map(acc => {
                                                        const isCreditCard = acc.type === 'credit_card';
                                                        const displayBalance = isCreditCard ? (acc.credit_limit ?? 0) - acc.current_balance : acc.current_balance;
                                                        const balanceLabel = isCreditCard ? `Knl. Limit: ${formatCurrency(displayBalance)} (Borç: ${formatCurrency(acc.current_balance)})` : `Bakiye: ${formatCurrency(acc.current_balance)}`;
                                                        return (
                                                            <SelectItem key={acc.id} value={acc.id} className="focus:bg-gray-800 focus:text-white">
                                                                {acc.name} ({acc.type === 'credit_card' ? 'K.Kartı' : acc.type}) - {balanceLabel}
                                                            </SelectItem>
                                                        )
                                                    })
                                                )}
                                            </SelectContent>
                                        </Select>
                                    )}
                                </div>

                                <div className="space-y-2">
                                    <Label className="text-xs font-medium text-gray-400">İşlem Tipi *</Label>
                                    <RadioGroup value={transactionType} onValueChange={(v) => setTransactionType(v as 'income' | 'expense')} className="flex gap-4" disabled={isSavingTransaction}>
                                        <div className="flex items-center space-x-2">
                                            <RadioGroupItem value="income" id="cashier-type-income" className="border-emerald-500 text-emerald-500" />
                                            <Label htmlFor="cashier-type-income" className="text-sm flex items-center gap-1 text-emerald-400 cursor-pointer font-medium"><ArrowUpCircle className="h-4 w-4" /> Gelir</Label>
                                        </div>
                                        <div className="flex items-center space-x-2">
                                            <RadioGroupItem value="expense" id="cashier-type-expense" className="border-red-500 text-red-500" />
                                            <Label htmlFor="cashier-type-expense" className="text-sm flex items-center gap-1 text-red-400 cursor-pointer font-medium"><ArrowDownCircle className="h-4 w-4" /> Gider</Label>
                                        </div>
                                    </RadioGroup>
                                </div>

                                {transactionType === 'expense' && (
                                    <div className="space-y-1.5">
                                        <Label htmlFor="cashier-expense-category" className="text-xs font-medium text-gray-400">Gider Kategorisi *</Label>
                                        {isLoadingCategories ? <Loader2 className="h-5 w-5 animate-spin text-emerald-500" /> : (
                                            <Select value={formData.expenseCategoryId} onValueChange={(value) => handleSelectChange('expenseCategoryId', value)} disabled={isSavingTransaction}>
                                                <SelectTrigger id="cashier-expense-category" className="h-9 bg-white/5 border-white/10 text-white text-xs focus:ring-emerald-500/50">
                                                    <SelectValue placeholder="Kategori seçin..." />
                                                </SelectTrigger>
                                                <SelectContent className="bg-gray-900 border-gray-800 text-white">
                                                    {expenseCategories.length === 0 ? (<SelectItem value="placeholder-disabled" disabled>Kategori bulunamadı.</SelectItem>) : (expenseCategories.map(cat => (<SelectItem key={cat.id} value={cat.id} className="focus:bg-gray-800 focus:text-white"> {cat.name} </SelectItem>)))}
                                                </SelectContent>
                                            </Select>
                                        )}
                                    </div>
                                )}

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                        <Label htmlFor="cashier-date" className="text-xs font-medium text-gray-400">Tarih *</Label>
                                        <input id="cashier-date" name="date" type="date" value={formData.date} onChange={handleDateChange} className="w-full bg-white/5 border border-white/10 rounded-md p-2 h-9 text-sm text-white focus:border-emerald-500/50 focus:outline-none" disabled={isSavingTransaction} />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label htmlFor="cashier-amount" className="text-xs font-medium text-gray-400">Tutar *</Label>
                                        <Input id="cashier-amount" name="amount" type="number" placeholder="0.00" value={formData.amount} onChange={handleInputChange} min="0.01" step="0.01" className="bg-white/5 border-white/10 text-white h-9 text-sm focus:border-emerald-500/50" disabled={isSavingTransaction} />
                                    </div>
                                </div>

                                <div className="space-y-1.5">
                                    <Label htmlFor="cashier-description" className="text-xs font-medium text-gray-400">Açıklama *</Label>
                                    <Textarea id="cashier-description" name="description" placeholder="İşlem açıklaması" value={formData.description} onChange={handleInputChange} className="min-h-[80px] bg-white/5 border-white/10 text-white text-sm focus:border-emerald-500/50 resize-none" disabled={isSavingTransaction} />
                                </div>

                                <Button type="button" onClick={handleAddTransaction} className={cn("w-full h-10 font-medium transition-all duration-200", transactionType === 'income' ? "bg-emerald-600 hover:bg-emerald-700 text-white shadow-[0_0_15px_rgba(16,185,129,0.4)]" : "bg-red-600 hover:bg-red-700 text-white shadow-[0_0_15px_rgba(239,68,68,0.4)]")} disabled={isSavingTransaction || isLoadingAccounts || !selectedAccountId}>
                                    {isSavingTransaction ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : (transactionType === 'income' ? <ArrowUpCircle className="mr-2 h-4 w-4" /> : <ArrowDownCircle className="mr-2 h-4 w-4" />)}
                                    {transactionType === 'income' ? 'Gelir Kaydet' : 'Gider Kaydet'}
                                </Button>
                            </div>
                        </div>

                        <div className="flex flex-col gap-4 h-full">
                            <div className="glass-card flex-1 overflow-hidden flex flex-col min-h-[400px]">
                                <div className="p-4 border-b border-white/10 bg-white/5 backdrop-blur-md">
                                    <h2 className="text-lg font-semibold text-white">Son Manuel İşlemler</h2>
                                </div>
                                <div className="overflow-auto flex-1">
                                    {isLoadingTransactions ? (
                                        <div className="flex justify-center items-center h-40">
                                            <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
                                        </div>
                                    ) : (
                                        <table className="w-full text-xs sm:text-sm">
                                            <thead className="bg-white/5 text-gray-300 sticky top-0 z-10 backdrop-blur-md">
                                                <tr>
                                                    <th className="px-3 py-2 text-left font-medium">Tarih</th>
                                                    <th className="hidden sm:table-cell px-3 py-2 text-left font-medium">Hesap</th>
                                                    <th className="px-3 py-2 text-left font-medium">Açıklama</th>
                                                    <th className="px-3 py-2 text-right font-medium">Tutar</th>
                                                    <th className="px-3 py-2 text-center font-medium">İşlem</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-white/5">
                                                {recentTransactions.length === 0 ? (
                                                    <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-500">Yakın zamanda manuel işlem yapılmadı.</td></tr>
                                                ) : (
                                                    recentTransactions.map((tx) => (
                                                        <tr key={tx.id} className="hover:bg-white/5 transition-colors">
                                                            <td className="px-3 py-2 whitespace-nowrap text-gray-300">{formatReportDate(tx.date)}</td>
                                                            <td className="hidden sm:table-cell px-3 py-2 text-gray-300">{tx.accountName || '??'} <span className="text-gray-500 text-[10px]">({tx.accountType === 'credit_card' ? 'K.Kartı' : tx.accountType})</span></td>
                                                            <td className="px-3 py-2 text-gray-300">
                                                                <div className="flex flex-col">
                                                                    <span>{tx.description}</span>
                                                                    {tx.type === 'expense' && tx.expenseCategoryName && (
                                                                        <span className="flex items-center text-gray-500 text-[10px] mt-0.5">
                                                                            <Tag className="h-3 w-3 mr-1" />{tx.expenseCategoryName}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            </td>
                                                            <td className={cn("px-3 py-2 text-right font-mono font-medium", tx.amount >= 0 ? 'text-emerald-400' : 'text-red-400')}>
                                                                {tx.amount >= 0 ? '+' : ''}{formatCurrency(tx.amount)}₺
                                                            </td>
                                                            <td className="px-3 py-2 text-center">
                                                                <Button variant="ghost" size="sm" onClick={() => handleDeleteTransaction(tx)} className="hover:bg-red-500/20 hover:text-red-400 h-7 w-7 p-0 rounded-md transition-colors" disabled={isDeleting === tx.id || isSavingTransaction}>
                                                                    {isDeleting === tx.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                                                                </Button>
                                                            </td>
                                                        </tr>
                                                    ))
                                                )}
                                            </tbody>
                                        </table>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </ScrollArea>
            </div>
        </div>
    );
};

export default CashierModule;
// --- END OF FILE src/CashierModule.tsx ---