import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, History, ArrowDownCircle, ArrowUpCircle } from "lucide-react";
import { formatCurrency } from "@/utils/formatUtils";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import type { Supplier } from "@/types/backup";

interface SupplierHistoryDialogProps {
    isOpen: boolean;
    onClose: () => void;
    supplier: Supplier;
}

interface Transaction {
    id: string;
    date: string;
    description: string;
    amount: number;
    type: string;
}

const SupplierHistoryDialog: React.FC<SupplierHistoryDialogProps> = ({
    isOpen,
    onClose,
    supplier
}) => {
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (isOpen && supplier) {
            fetchHistory();
        }
    }, [isOpen, supplier]);

    const fetchHistory = async () => {
        setIsLoading(true);
        try {
            // Şimdilik sadece account_transactions tablosundan 'supplier_payment' tipindeki işlemleri çekiyoruz.
            // İleride 'supplier_transactions' tablosu eklenirse oradan da çekilebilir.
            // Not: Şu anki yapıda tedarikçi ID'si account_transactions'da doğrudan tutulmuyor olabilir,
            // ancak description içinde tedarikçi adı geçiyor olabilir veya related_wholesaler_transaction_id kullanılabilir.
            // Basitlik adına şimdilik description içinde tedarikçi adı arayacağız veya daha sağlam bir yapı kuracağız.

            // İdeal çözüm: account_transactions tablosuna supplier_id eklemek veya ayrı bir tablo.
            // Mevcut yapıda description üzerinden filtreleme yapmak riskli olabilir ama şimdilik en pratik yol.

            const { data, error } = await supabase
                .from('account_transactions')
                .select('*')
                .eq('type', 'supplier_payment')
                .ilike('description', `%${supplier.name}%`)
                .order('date', { ascending: false });

            if (error) throw error;

            const formattedTransactions = (data || []).map(t => ({
                id: t.id,
                date: t.date,
                description: t.description || 'Ödeme',
                amount: Math.abs(t.amount), // Gider olduğu için negatif olabilir, mutlak değer alıyoruz
                type: 'payment'
            }));

            setTransactions(formattedTransactions);
        } catch (error) {
            console.error('Geçmiş yükleme hatası:', error);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="bg-[#1a1b26] border-white/10 text-white sm:max-w-[600px] h-[80vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle className="text-xl font-bold flex items-center gap-2">
                        <History className="h-5 w-5 text-blue-400" />
                        İşlem Geçmişi - {supplier.name}
                    </DialogTitle>
                </DialogHeader>

                <div className="flex-1 overflow-hidden mt-4 bg-white/5 rounded-lg border border-white/10">
                    {isLoading ? (
                        <div className="flex justify-center items-center h-full text-gray-400">
                            <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
                        </div>
                    ) : transactions.length === 0 ? (
                        <div className="flex justify-center items-center h-full text-gray-400">
                            <p>Kayıtlı işlem bulunamadı.</p>
                        </div>
                    ) : (
                        <ScrollArea className="h-full">
                            <div className="divide-y divide-white/5">
                                {transactions.map((tx) => (
                                    <div key={tx.id} className="p-3 hover:bg-white/5 transition-colors flex justify-between items-center">
                                        <div className="flex items-start gap-3">
                                            <div className="p-2 bg-green-500/20 rounded-lg mt-1">
                                                <ArrowUpCircle className="h-4 w-4 text-green-400" />
                                            </div>
                                            <div>
                                                <div className="font-medium text-white">{tx.description}</div>
                                                <div className="text-xs text-gray-400 mt-0.5">
                                                    {format(new Date(tx.date), 'dd MMMM yyyy HH:mm', { locale: tr })}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="font-mono font-bold text-green-400">
                                            {formatCurrency(tx.amount)}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </ScrollArea>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
};

export default SupplierHistoryDialog;
