import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, DollarSign, Wallet } from "lucide-react";
import { formatCurrency } from "@/utils/formatUtils";
import type { Supplier, Account } from "@/types/backup";

interface SupplierPaymentDialogProps {
    isOpen: boolean;
    onClose: () => void;
    supplier: Supplier;
    accounts: Account[];
    onPaymentComplete: () => void;
}

const SupplierPaymentDialog: React.FC<SupplierPaymentDialogProps> = ({
    isOpen,
    onClose,
    supplier,
    accounts,
    onPaymentComplete
}) => {
    const { toast } = useToast();
    const [isSaving, setIsSaving] = useState(false);
    const [amount, setAmount] = useState('');
    const [selectedAccountId, setSelectedAccountId] = useState('');
    const [description, setDescription] = useState('');

    useEffect(() => {
        if (isOpen) {
            setAmount('');
            setDescription('');
            // Varsayılan olarak nakit hesabı seç
            const cashAccount = accounts.find(a => a.type === 'cash' && a.is_default);
            if (cashAccount) {
                setSelectedAccountId(cashAccount.id);
            } else if (accounts.length > 0) {
                setSelectedAccountId(accounts[0].id);
            }
        }
    }, [isOpen, accounts]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        const paymentAmount = parseFloat(amount);
        if (isNaN(paymentAmount) || paymentAmount <= 0) {
            toast({ title: "Hata", description: "Geçerli bir tutar giriniz.", variant: "destructive" });
            return;
        }

        if (!selectedAccountId) {
            toast({ title: "Hata", description: "Lütfen bir ödeme hesabı seçiniz.", variant: "destructive" });
            return;
        }

        setIsSaving(true);
        try {
            // 1. Tedarikçi bakiyesini güncelle (Borç düşer)
            const { error: supplierError } = await supabase.rpc('decrement_supplier_balance', {
                supplier_id_input: supplier.id,
                amount_input: paymentAmount
            });

            if (supplierError) throw supplierError;

            // 2. Hesap bakiyesini güncelle (Para çıkar)
            const { error: accountError } = await supabase.rpc('increment_account_balance', {
                account_id_input: selectedAccountId,
                balance_change: -paymentAmount
            });

            if (accountError) throw accountError;

            // 3. Hesap hareketini kaydet
            const { error: txError } = await supabase
                .from('account_transactions')
                .insert([{
                    account_id: selectedAccountId,
                    type: 'supplier_payment',
                    amount: -paymentAmount,
                    description: `Tedarikçi Ödemesi: ${supplier.name} - ${description}`,
                    date: new Date().toISOString(),
                    related_wholesaler_transaction_id: null // Şimdilik null, gerekirse supplier_transactions tablosu ile ilişkilendirilebilir
                }]);

            if (txError) throw txError;

            toast({ title: "Başarılı", description: "Ödeme işlemi kaydedildi." });
            onPaymentComplete();
        } catch (error: any) {
            console.error('Ödeme hatası:', error);
            toast({ title: "Hata", description: `Ödeme kaydedilemedi: ${error.message}`, variant: "destructive" });
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="bg-[#1a1b26] border-white/10 text-white sm:max-w-[400px]">
                <DialogHeader>
                    <DialogTitle className="text-xl font-bold flex items-center gap-2">
                        <DollarSign className="h-5 w-5 text-green-400" />
                        Tedarikçi Ödemesi
                    </DialogTitle>
                </DialogHeader>

                <div className="py-4 space-y-4">
                    <div className="bg-white/5 p-3 rounded-lg border border-white/10">
                        <div className="text-sm text-gray-400">Tedarikçi</div>
                        <div className="font-bold text-lg text-white">{supplier.name}</div>
                        <div className="text-sm text-gray-400 mt-1">
                            Güncel Bakiye: <span className={supplier.balance > 0 ? 'text-red-400' : 'text-emerald-400'}>{formatCurrency(supplier.balance)}</span>
                        </div>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="account" className="text-xs font-medium text-gray-400">Ödeme Hesabı</Label>
                            <Select value={selectedAccountId} onValueChange={setSelectedAccountId}>
                                <SelectTrigger className="bg-white/5 border-white/10 text-white">
                                    <SelectValue placeholder="Hesap Seçiniz" />
                                </SelectTrigger>
                                <SelectContent className="bg-gray-900 border-gray-800 text-white">
                                    {accounts.map(acc => (
                                        <SelectItem key={acc.id} value={acc.id}>
                                            {acc.name} ({formatCurrency(acc.current_balance)})
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="amount" className="text-xs font-medium text-gray-400">Ödeme Tutarı</Label>
                            <div className="relative">
                                <Input
                                    id="amount"
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={amount}
                                    onChange={(e) => setAmount(e.target.value)}
                                    className="bg-white/5 border-white/10 text-white pl-8 focus:border-green-500/50"
                                    placeholder="0.00"
                                />
                                <DollarSign className="absolute left-2.5 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-500" />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="description" className="text-xs font-medium text-gray-400">Açıklama</Label>
                            <Input
                                id="description"
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                className="bg-white/5 border-white/10 text-white focus:border-green-500/50"
                                placeholder="Örn: Fatura No: 123"
                            />
                        </div>

                        <DialogFooter className="pt-4">
                            <Button type="button" variant="ghost" onClick={onClose} className="hover:bg-white/10 text-gray-300">
                                İptal
                            </Button>
                            <Button
                                type="submit"
                                disabled={isSaving || !amount || !selectedAccountId}
                                className="bg-green-600 hover:bg-green-700 text-white"
                            >
                                {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Wallet className="mr-2 h-4 w-4" />}
                                Ödemeyi Tamamla
                            </Button>
                        </DialogFooter>
                    </form>
                </div>
            </DialogContent>
        </Dialog>
    );
};

export default SupplierPaymentDialog;
