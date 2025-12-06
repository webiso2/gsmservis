// --- START OF FILE src/components/customer/PaymentDialog.tsx ---

import React, { useState, useEffect } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription, DialogClose
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import { Loader2, CreditCard, X as CancelIcon, DollarSign, Wallet } from 'lucide-react';
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import type { Customer, CustomerTransaction } from "@/types/customer";
import type { Account, AccountTransaction } from "@/types/backup";
import { format } from 'date-fns';
import { cn } from "@/lib/utils";

interface PaymentDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  customer: Customer;
  accounts: Account[];
  onPaymentCompleted: (customerId: string, newDebt: number, updatedAccount?: Account) => void;
}

const formatCurrencyLocal = (value: number | null | undefined): string => {
  return (value ?? 0).toFixed(2) + '₺';
};

const PaymentDialog: React.FC<PaymentDialogProps> = ({ isOpen, onOpenChange, customer, accounts, onPaymentCompleted }) => {
  const { toast } = useToast();
  const [amount, setAmount] = useState<string>('');
  const [selectedAccountId, setSelectedAccountId] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    if (isOpen && customer) {
      console.log("[PaymentDialog] Açıldı. Müşteri:", customer.name, `(${customer.id})`, "Mevcut Borç:", customer.debt);
      setAmount('');
      const defaultCash = accounts.find(a => a.type === 'cash' && a.is_default);
      const firstCash = accounts.find(a => a.type === 'cash');
      const firstAccount = accounts.length > 0 ? accounts[0] : null;
      const accountToSelect = defaultCash || firstCash || firstAccount;
      setSelectedAccountId(accountToSelect?.id || '');
      console.log("[PaymentDialog] Seçilen Hesap:", accountToSelect?.name || 'Hesap Yok');
      setIsProcessing(false);
    }
  }, [isOpen, customer, accounts]);

  const handlePayment = async () => {
    const paymentAmount = parseFloat(amount);
    if (isNaN(paymentAmount) || paymentAmount <= 0) {
      toast({ title: "Uyarı", description: "Lütfen geçerli bir pozitif tahsilat tutarı girin.", variant: "destructive" }); return;
    }
    if (!customer || customer.debt <= 0) {
      toast({ title: "Uyarı", description: "Müşterinin tahsilat yapılacak borcu bulunmamaktadır.", variant: "destructive" }); return;
    }
    if (paymentAmount > customer.debt) {
      toast({ title: "Uyarı", description: `Tahsilat tutarı (${formatCurrencyLocal(paymentAmount)}) müşterinin borcundan (${formatCurrencyLocal(customer.debt)}) fazla olamaz.`, variant: "destructive" }); return;
    }
    if (!selectedAccountId) {
      toast({ title: "Uyarı", description: "Lütfen tahsilatın yapılacağı hesabı seçin.", variant: "destructive" }); return;
    }
    const targetAccount = accounts.find(a => a.id === selectedAccountId);
    if (!targetAccount) {
      toast({ title: "Hata", description: "Seçilen hesap bulunamadı. Lütfen sayfayı yenileyin.", variant: "destructive" }); return;
    }

    console.log(`[PaymentDialog] Tahsilat başlıyor. Müşteri ID: ${customer.id}, Tutar: ${paymentAmount}, Hesap ID: ${selectedAccountId}`);
    setIsProcessing(true);
    let insertedCustTxId: string | null = null;
    let insertedAccTxId: string | null = null;

    try {
      const transactionDate = new Date();
      const year = transactionDate.getFullYear();
      const month = String(transactionDate.getMonth() + 1).padStart(2, '0');
      const day = String(transactionDate.getDate()).padStart(2, '0');
      const hours = String(transactionDate.getHours()).padStart(2, '0');
      const minutes = String(transactionDate.getMinutes()).padStart(2, '0');
      const seconds = String(transactionDate.getSeconds()).padStart(2, '0');
      const transactionDateISO = `${year}-${month}-${day}T${hours}:${minutes}:${seconds}+03:00`;
      const transactionDateOnly = format(transactionDate, 'yyyy-MM-dd');

      console.log("[PaymentDialog] Adım 1: Müşteri hareketi ekleniyor (Tahsilat)...");
      const customerTransactionData: Omit<CustomerTransaction, 'id' | 'created_at' | 'balance'> = {
        customer_id: customer.id,
        date: transactionDateOnly,
        type: 'payment',
        amount: -paymentAmount,
        description: `Tahsilat - ${targetAccount.name}`
      };
      const { data: insertedCustTx, error: custTxError } = await supabase
        .from('customer_transactions')
        .insert(customerTransactionData)
        .select('id')
        .single();

      if (custTxError || !insertedCustTx) {
        console.error("[PaymentDialog] Hata - Müşteri hareketi eklenemedi:", custTxError);
        throw custTxError || new Error("Müşteri hareketi oluşturulamadı.");
      }
      insertedCustTxId = insertedCustTx.id;
      console.log("[PaymentDialog] Adım 1: Başarılı. Müşteri Tx ID:", insertedCustTxId);

      console.log("[PaymentDialog] Adım 1.1: Müşteri borcu yeniden hesaplanıyor...");
      const { data: allCustTxData, error: fetchAllError } = await supabase
        .from('customer_transactions')
        .select('id, amount, created_at')
        .eq('customer_id', customer.id)
        .order('created_at', { ascending: true });

      if (fetchAllError) {
        console.error("[PaymentDialog] Hata - Müşteri işlemleri çekilemedi:", fetchAllError);
        throw new Error("Müşteri borcu hesaplanamadı (işlemler çekilemedi).");
      }

      const newCustomerDebt = (allCustTxData || []).reduce((sum, tx) => sum + (tx.amount ?? 0), 0);
      console.log(`[PaymentDialog] Adım 1.1: Hesaplanan yeni borç: ${newCustomerDebt}`);

      if (allCustTxData && allCustTxData.length > 0) {
        console.log("[PaymentDialog] Adım 1.2: Müşteri işlem bakiyeleri güncelleniyor...");
        let runningBalance = 0;
        const balanceUpdates = allCustTxData.map(tx => {
          runningBalance += (tx.amount ?? 0);
          return supabase.from('customer_transactions').update({ balance: runningBalance }).eq('id', tx.id);
        });
        try {
          const results = await Promise.all(balanceUpdates);
          results.forEach((res, index) => {
            if (res.error) console.warn(`[PaymentDialog] Bakiye güncellenemedi (Tx ID: ${allCustTxData[index].id}):`, res.error.message);
          });
          console.log("[PaymentDialog] Adım 1.2: Tamamlandı.");
        } catch (err) {
          console.error("[PaymentDialog] Hata - Müşteri işlem bakiye güncelleme:", err);
        }
      }

      console.log(`[PaymentDialog] Adım 1.3: Müşteri tablosu borcu güncelleniyor: ${newCustomerDebt}`);
      const { error: custUpdateError } = await supabase
        .from('customers')
        .update({ debt: newCustomerDebt })
        .eq('id', customer.id);

      if (custUpdateError) {
        console.error("[PaymentDialog] Hata - Müşteri borcu güncellenemedi:", custUpdateError);
        throw new Error("Müşteri borcu güncellenemedi.");
      }
      console.log("[PaymentDialog] Adım 1.3: Başarılı.");


      console.log("[PaymentDialog] Adım 2: Hesap hareketi ekleniyor...");
      const newAccountBalance = (targetAccount.current_balance || 0) + paymentAmount;
      const accountTransactionData: Omit<AccountTransaction, 'id' | 'created_at'> = {
        date: transactionDateISO,
        account_id: selectedAccountId,
        type: 'customer_payment',
        amount: paymentAmount,
        balance_after: newAccountBalance,
        description: `Tahsilat: ${customer.name}`,
        related_sale_id: null,
        related_service_id: null,
        related_customer_tx_id: insertedCustTxId,
        transfer_pair_id: null,
        expense_category_id: null,
      };
      const { data: insertedAccTx, error: accInsertError } = await supabase
        .from('account_transactions')
        .insert(accountTransactionData)
        .select('id')
        .single();

      if (accInsertError || !insertedAccTx) {
        console.error("[PaymentDialog] Hata - Hesap hareketi eklenemedi:", accInsertError);
        throw accInsertError || new Error("Hesap hareketi oluşturulamadı.");
      }
      insertedAccTxId = insertedAccTx.id;
      console.log("[PaymentDialog] Adım 2: Başarılı. Hesap Tx ID:", insertedAccTxId);


      console.log(`[PaymentDialog] Adım 3: Hesap bakiyesi güncelleniyor: ${newAccountBalance}`);
      const { error: accUpdateError } = await supabase
        .from('accounts')
        .update({ current_balance: newAccountBalance })
        .eq('id', selectedAccountId);

      if (accUpdateError) {
        console.error("[PaymentDialog] Hata - Hesap bakiyesi güncellenemedi:", accUpdateError);
        throw new Error("Hesap bakiyesi güncellenemedi.");
      }
      console.log("[PaymentDialog] Adım 3: Başarılı.");

      const finalUpdatedAccount: Account = { ...targetAccount, current_balance: newAccountBalance };

      console.log("[PaymentDialog] Tahsilat işlemi başarıyla tamamlandı.");
      toast({ title: "Başarılı", description: `${formatCurrencyLocal(paymentAmount)} tutarında tahsilat kaydedildi.` });
      onPaymentCompleted(customer.id, newCustomerDebt, finalUpdatedAccount);
      onOpenChange(false);

    } catch (error: any) {
      console.error("[PaymentDialog] Tahsilat işlemi sırasında HATA:", error);
      toast({ title: "Hata", description: `Tahsilat işlemi başarısız: ${error.message}`, variant: "destructive" });
      console.warn("[PaymentDialog] Hata nedeniyle geri alma işlemleri başlatılıyor...");

      let rollbackErrorOccurred = false;
      try {
        if (insertedAccTxId) {
          console.log(`[Geri Alma] Hesap hareketi siliniyor: ${insertedAccTxId}`);
          const { error: delAccTxErr } = await supabase.from('account_transactions').delete().eq('id', insertedAccTxId);
          if (delAccTxErr) { console.error("[Geri Alma] Hesap hareketi silinemedi:", delAccTxErr); rollbackErrorOccurred = true; }
        }

        if (insertedCustTxId) {
          console.log(`[Geri Alma] Müşteri hareketi siliniyor: ${insertedCustTxId}`);
          const { error: delCustTxErr } = await supabase.from('customer_transactions').delete().eq('id', insertedCustTxId);
          if (delCustTxErr) { console.error("[Geri Alma] Müşteri hareketi silinemedi:", delCustTxErr); rollbackErrorOccurred = true; }
          console.log(`[Geri Alma] Müşteri borcu eski değerine (${customer.debt}) döndürülüyor.`);
          const { error: revertCustDebtErr } = await supabase.from('customers').update({ debt: customer.debt }).eq('id', customer.id);
          if (revertCustDebtErr) { console.error("[Geri Alma] Müşteri borcu eski haline getirilemedi:", revertCustDebtErr); }

        }

      } catch (rollbackError: any) {
        console.error("[PaymentDialog] Geri alma sırasında beklenmedik hata:", rollbackError);
        rollbackErrorOccurred = true;
      }

      if (rollbackErrorOccurred) {
        toast({ title: "Kritik Hata", description: "Tahsilat işlemi başarısız oldu VE geri alma sırasında da hatalar oluştu. Veri tutarlılığını manuel olarak kontrol edin!", variant: "destructive", duration: 15000 });
      } else {
        console.log("[PaymentDialog] Geri alma işlemleri tamamlandı (veya denendi).");
      }
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[450px] bg-gray-900 border border-white/10 text-white p-0 shadow-2xl backdrop-blur-xl">
        <DialogHeader className="bg-white/5 border-b border-white/10 p-4 flex flex-row justify-between items-center space-y-0">
          <DialogTitle className="text-lg font-bold flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-emerald-400" />
            Tahsilat Yap: {customer?.name || '...'}
          </DialogTitle>
          <DialogClose asChild>
            <Button variant="ghost" size="icon" className="text-gray-400 hover:text-white hover:bg-white/10 h-8 w-8 rounded-full" disabled={isProcessing}>
              <CancelIcon className="h-4 w-4" />
            </Button>
          </DialogClose>
        </DialogHeader>

        <div className="p-6 space-y-6">
          <DialogDescription className="text-sm text-gray-400 bg-white/5 p-3 rounded-lg border border-white/5">
            Mevcut borç: <span className={cn("font-bold font-mono ml-1", customer?.debt > 0 ? 'text-red-400' : 'text-emerald-400')}>{formatCurrencyLocal(customer?.debt)}</span>.
            <br />Alınacak tutarı ve paranın gireceği hesabı seçin.
          </DialogDescription>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="payment-amount" className="text-xs font-medium text-gray-400 ml-1">Tutar *</Label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                <Input
                  id="payment-amount"
                  name="amount"
                  type="number"
                  step="0.01"
                  min="0.01"
                  max={customer?.debt > 0 ? customer.debt.toFixed(2) : undefined}
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="pl-10 bg-white/5 border-white/10 text-white h-10 text-sm focus:border-blue-500/50"
                  disabled={isProcessing}
                  required
                  placeholder='0.00'
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="payment-account" className="text-xs font-medium text-gray-400 ml-1">Hesap *</Label>
              <div className="relative">
                <Wallet className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                <Select value={selectedAccountId} onValueChange={setSelectedAccountId} disabled={isProcessing}>
                  <SelectTrigger id="payment-account" className="pl-10 bg-white/5 border-white/10 text-white h-10 text-sm focus:ring-blue-500/50">
                    <SelectValue placeholder="Hesap seçin..." />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-800 border-gray-700 text-white">
                    {accounts.length === 0 ? (
                      <SelectItem value="no-accounts" disabled>Hesap bulunamadı.</SelectItem>
                    ) : (
                      accounts.map(acc => (
                        <SelectItem key={acc.id} value={acc.id}>
                          {acc.name} ({acc.type}) [{formatCurrencyLocal(acc.current_balance)}]
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="bg-white/5 border-t border-white/10 p-4">
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} disabled={isProcessing} className="text-gray-400 hover:text-white hover:bg-white/10">İptal</Button>
          <Button
            onClick={handlePayment}
            className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-[0_0_15px_rgba(16,185,129,0.4)]"
            disabled={isProcessing || !amount || !selectedAccountId || parseFloat(amount) <= 0 || parseFloat(amount) > (customer?.debt ?? 0)}
          >
            {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CreditCard className="mr-2 h-4 w-4" />}
            Tahsilatı Kaydet
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default PaymentDialog;
// --- END OF FILE src/components/customer/PaymentDialog.tsx ---