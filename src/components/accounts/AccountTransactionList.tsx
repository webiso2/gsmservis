// --- START OF FILE src/components/accounts/AccountTransactionList.tsx ---

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from "@/integrations/supabase/client";
import type { AccountTransaction } from "@/types/backup";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, ArrowDownUp, ArrowUpRight, ArrowDownLeft, ShoppingCart, User, Wrench, Filter, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { cn } from "@/lib/utils";

interface AccountTransactionListProps {
    accountId: string;
}

const AccountTransactionList: React.FC<AccountTransactionListProps> = ({ accountId }) => {
    const [transactions, setTransactions] = useState<AccountTransaction[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [startDate, setStartDate] = useState<string>('');
    const [endDate, setEndDate] = useState<string>('');
    const [typeFilter, setTypeFilter] = useState<string>('all');
    const { toast } = useToast();

    const formatCurrency = (value: number | null | undefined): string => (value ?? 0).toFixed(2) + '₺';
    const formatDate = (dateString: string | null | undefined): string => { try { return dateString ? format(new Date(dateString), 'dd.MM.yyyy HH:mm', { locale: tr }) : '-'; } catch { return '-'; } };

    const fetchTransactions = useCallback(async () => {
        console.log(`[AccountTransactionList] Hareketler çekiliyor: AccountID=${accountId}, Start=${startDate}, End=${endDate}, Type=${typeFilter}`);
        setIsLoading(true); setError(null);
        try {
            let query = supabase
                .from('account_transactions')
                .select('*')
                .eq('account_id', accountId);

            if (startDate) query = query.gte('date', `${startDate}T00:00:00`);
            if (endDate) { const eD = new Date(endDate); eD.setDate(eD.getDate() + 1); const eDS = format(eD, 'yyyy-MM-dd'); query = query.lt('date', `${eDS}T00:00:00`); }
            if (typeFilter !== 'all') { if (typeFilter === 'transfer') query = query.in('type', ['transfer_in', 'transfer_out']); else if (typeFilter === 'payment') query = query.in('type', ['sale_payment', 'customer_payment']); else query = query.eq('type', typeFilter); }

            query = query.order('date', { ascending: false });

            const { data, error: fetchError } = await query;

            if (fetchError) throw fetchError;

            const fetchedTransactions: AccountTransaction[] = (data || []).map(tx => ({
                id: tx.id, created_at: tx.created_at, date: tx.date, account_id: tx.account_id,
                type: tx.type, amount: tx.amount ?? 0, balance_after: tx.balance_after ?? 0,
                description: tx.description ?? '', related_sale_id: tx.related_sale_id ?? null,
                related_service_id: tx.related_service_id ?? null, related_customer_tx_id: tx.related_customer_tx_id ?? null,
                transfer_pair_id: tx.transfer_pair_id ?? null
            }));
            setTransactions(fetchedTransactions);
            console.log(`[AccountTransactionList] ${fetchedTransactions.length} hareket yüklendi.`);

        } catch (err: any) {
            console.error("Hesap hareketleri yüklenirken hata:", err);
            setError(err.message || "Hareketler yüklenemedi.");
            setTransactions([]);
            toast({ title: "Hata", description: `Hareketler yüklenemedi: ${err.message}`, variant: "destructive" });
        } finally {
            setIsLoading(false);
        }
    }, [accountId, startDate, endDate, typeFilter, toast]);

    useEffect(() => {
        fetchTransactions();
    }, [fetchTransactions]);

    const getTransactionIcon = (type: AccountTransaction['type']) => {
        switch (type) {
            case 'income': return <ArrowDownLeft className="h-4 w-4 text-emerald-400" title="Gelir" />;
            case 'expense': return <ArrowUpRight className="h-4 w-4 text-red-400" title="Gider" />;
            case 'transfer_in': return <ArrowDownLeft className="h-4 w-4 text-blue-400" title="Gelen Transfer" />;
            case 'transfer_out': return <ArrowUpRight className="h-4 w-4 text-blue-400" title="Giden Transfer" />;
            case 'sale_payment': return <ShoppingCart className="h-4 w-4 text-purple-400" title="Satış Ödemesi" />;
            case 'customer_payment': return <User className="h-4 w-4 text-teal-400" title="Müşteri Tahsilatı" />;
            default: return <ArrowDownUp className="h-4 w-4 text-gray-400" />;
        }
    }

    return (
        <div className="flex flex-col h-full bg-black/20 rounded-lg overflow-hidden border border-white/5">
            {/* Filtreleme Alanı */}
            <div className="flex flex-wrap gap-2 p-3 border-b border-white/5 bg-white/5">
                <div className="relative">
                    <Calendar className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-gray-500" />
                    <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="h-8 pl-8 text-xs bg-black/40 border-white/10 text-white w-[130px]" placeholder="Başlangıç" />
                </div>
                <div className="relative">
                    <Calendar className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-gray-500" />
                    <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} min={startDate || undefined} className="h-8 pl-8 text-xs bg-black/40 border-white/10 text-white w-[130px]" placeholder="Bitiş" />
                </div>
                <div className="relative">
                    <Filter className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-gray-500" />
                    <Select value={typeFilter} onValueChange={setTypeFilter}>
                        <SelectTrigger className="h-8 pl-8 text-xs w-[160px] bg-black/40 border-white/10 text-white">
                            <SelectValue placeholder="Türe Göre Filtrele" />
                        </SelectTrigger>
                        <SelectContent className="bg-gray-900 border-gray-800 text-white">
                            <SelectItem value="all">Tümü</SelectItem>
                            <SelectItem value="income">Gelir (Manuel)</SelectItem>
                            <SelectItem value="expense">Gider (Manuel)</SelectItem>
                            <SelectItem value="transfer">Transferler</SelectItem>
                            <SelectItem value="payment">Ödemeler (Satış/Tahsilat)</SelectItem>
                            <SelectItem value="sale_payment">Satış Ödemesi</SelectItem>
                            <SelectItem value="customer_payment">Müşteri Tahsilatı</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>

            {/* Liste Alanı */}
            <ScrollArea className="flex-1">
                {isLoading ? (
                    <div className="flex justify-center items-center h-40 text-gray-500 gap-2">
                        <Loader2 className="h-5 w-5 animate-spin text-blue-500" />
                        <span className="text-sm">Yükleniyor...</span>
                    </div>
                ) : error ? (
                    <div className="flex flex-col items-center justify-center h-40 text-red-400 gap-2 p-4 text-center">
                        <span className="text-sm">{error}</span>
                    </div>
                ) : transactions.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-40 text-gray-500 gap-2">
                        <ArrowDownUp className="h-8 w-8 opacity-20" />
                        <p className="text-xs">Seçili hesap veya filtre için hareket bulunamadı.</p>
                    </div>
                ) : (
                    <table className="w-full text-xs text-left">
                        <thead className="sticky top-0 bg-gray-900/90 backdrop-blur-sm z-10 border-b border-white/10 text-gray-400">
                            <tr>
                                <th className="px-4 py-3 font-medium w-[140px]">Tarih</th>
                                <th className="px-4 py-3 font-medium">Açıklama</th>
                                <th className="px-4 py-3 font-medium text-center w-[60px]">Tür</th>
                                <th className="px-4 py-3 font-medium text-right w-[100px]">Tutar</th>
                                <th className="px-4 py-3 font-medium text-right w-[100px]">Son Bakiye</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {transactions.map(tx => (
                                <tr key={tx.id} className="hover:bg-white/5 transition-colors group">
                                    <td className="px-4 py-3 text-gray-400 whitespace-nowrap font-mono">{formatDate(tx.date)}</td>
                                    <td className="px-4 py-3 text-gray-300">{tx.description}</td>
                                    <td className="px-4 py-3 flex justify-center">
                                        <div className="p-1.5 rounded-md bg-white/5 group-hover:bg-white/10 transition-colors">
                                            {getTransactionIcon(tx.type)}
                                        </div>
                                    </td>
                                    <td className={cn("px-4 py-3 text-right whitespace-nowrap font-mono font-medium", tx.amount > 0 ? 'text-emerald-400' : 'text-red-400')}>
                                        {tx.amount > 0 ? '+' : ''}{formatCurrency(tx.amount)}
                                    </td>
                                    <td className="px-4 py-3 text-right whitespace-nowrap font-mono text-gray-400">{formatCurrency(tx.balance_after)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </ScrollArea>
        </div>
    );
};

export default AccountTransactionList;
// --- END OF FILE src/components/accounts/AccountTransactionList.tsx ---