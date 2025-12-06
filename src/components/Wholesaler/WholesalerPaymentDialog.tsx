// --- START OF FILE src/components/wholesaler/WholesalerPaymentDialog.tsx ---

import React, { useState, useEffect, useCallback } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription, DialogClose
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, DollarSign, X as CancelIcon } from 'lucide-react';
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import type { Wholesaler, WholesalerTransaction } from "@/types/backup";
import type { Account, AccountTransaction } from "@/types/backup";
import { format } from 'date-fns';

interface WholesalerPaymentDialogProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  wholesaler: Wholesaler | null;
  accounts: Account[];
  onPaymentMade: () => void;
}

const formatCurrencyLocal = (value: number | null | undefined): string => (value ?? 0).toFixed(2) + '₺';

const WholesalerPaymentDialog: React.FC<WholesalerPaymentDialogProps> = ({ isOpen, setIsOpen, wholesaler, accounts, onPaymentMade }) => {
  const { toast } = useToast();
  const [amount, setAmount] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [selectedAccountId, setSelectedAccountId] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);

  const sourceAccount = accounts.find(a => a.id === selectedAccountId);

  useEffect(() => {
    if (isOpen && wholesaler) {
      console.log("[WholesalerPaymentDialog] Açıldı. Toptancı:", wholesaler.name, "Mevcut Borç (TRY):", wholesaler.debt, "Mevcut Borç (USD):", wholesaler.debt_usd);
      setAmount('');
      setDescription(`Ödeme: ${wholesaler.name}`);
      const defaultAccount = accounts.find(a => a.type === 'cash' && a.is_default) || accounts.find(a => a.type === 'cash') || accounts.find(a => a.type === 'bank') || accounts[0];
      setSelectedAccountId(defaultAccount?.id || '');
      console.log("[WholesalerPaymentDialog] Seçilen Kaynak Hesap:", defaultAccount?.name || 'Hesap Yok');
      setIsProcessing(false);
    }
  }, [isOpen, wholesaler, accounts]);

  // USD Borcu Sıfırlama (Manuel Düzeltme)
  const handleClearUSD = async () => {
    if (!wholesaler || isProcessing) return;
    const confirm = window.confirm(`"${wholesaler.name}" için kalan ${formatCurrencyLocal(wholesaler.debt_usd, 'USD')} borcu sıfırlamak istediğinize emin misiniz?`);
    if (!confirm) return;

    setIsProcessing(true);
    try {
      console.log(`[WholesalerPayment] USD Sıfırlama: ${wholesaler.debt_usd}`);
      const { error } = await supabase.rpc('increment_wholesaler_debt', {
        wholesaler_id_input: wholesaler.id,
        debt_change_try: 0,
        debt_change_usd: -(wholesaler.debt_usd ?? 0)
      });
      if (error) throw error;

      // Hareket kaydı
      await supabase.from('wholesaler_transactions').insert({
        wholesaler_id: wholesaler.id,
        date: new Date().toISOString(),
        type: 'adjustment',
        amount: 0,
        description: `Bakiye Düzeltme: USD Borcu Sıfırlandı (Eski: $${(wholesaler.debt_usd ?? 0).toFixed(2)})`,
        related_account_tx_id: null
      });

      toast({ title: "Başarılı", description: "USD borcu sıfırlandı." });
      onPaymentMade(); setIsOpen(false);
    } catch (e: any) {
      toast({ title: "Hata", description: e.message, variant: "destructive" });
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePayment = async () => {
    if (!wholesaler || !selectedAccountId || !sourceAccount) { toast({ title: "Hata", description: "Toptancı veya kaynak hesap seçilemedi.", variant: "destructive" }); return; }
    const paymentAmount = parseFloat(amount);
    if (isNaN(paymentAmount) || paymentAmount <= 0) { toast({ title: "Uyarı", description: "Geçerli bir pozitif ödeme tutarı girin.", variant: "destructive" }); return; }
    // Uyarıyı kaldırdık: if ((wholesaler.debt ?? 0) > 0 && paymentAmount > (wholesaler.debt ?? 0)) ...
    if ((sourceAccount.current_balance ?? 0) < paymentAmount) { toast({ title: "Uyarı", description: `"${sourceAccount.name}" hesabında yeterli bakiye (${formatCurrencyLocal(sourceAccount.current_balance)}) yok.`, variant: "destructive" }); return; }

    console.log(`[WholesalerPayment] Ödeme başlıyor... Tutar: ${paymentAmount}, Kaynak: ${sourceAccount.name}, Hedef: ${wholesaler.name}`);
    setIsProcessing(true);
    let createdWholesalerTxId: string | null = null;
    let createdAccountTxId: string | null = null;
    const paymentAmountNegative = -paymentAmount;

    // USD Düşüm Hesabı
    const currentDebtTRY = wholesaler.debt ?? 0;
    const currentDebtUSD = wholesaler.debt_usd ?? 0;
    let usdChangeToReduce = 0;

    if (currentDebtUSD > 0) {
      if (paymentAmount >= currentDebtTRY) {
        // Tam borç ödeniyorsa (veya fazlası), tüm USD borcunu sil
        usdChangeToReduce = currentDebtUSD;
      } else if (currentDebtTRY > 0) {
        // Orantılı düş
        const ratio = paymentAmount / currentDebtTRY;
        usdChangeToReduce = currentDebtUSD * ratio;
      }
    }

    // Flagler
    let debtUpdateSucceeded = false;
    let accUpdateSucceeded = false;

    try {
      const transactionTimestamp = new Date().toISOString();

      // 1. Toptancı Borcunu Güncelle (RPC)
      console.log(` Adım 1: Toptancı borcu güncelleniyor... TRY: ${paymentAmountNegative}, USD: -${usdChangeToReduce}`);
      const { error: rpcDebtUpdateError } = await supabase.rpc('increment_wholesaler_debt', {
        wholesaler_id_input: wholesaler.id,
        debt_change_try: paymentAmountNegative,
        debt_change_usd: -usdChangeToReduce
      });
      if (rpcDebtUpdateError) throw new Error(`Toptancı borcu güncellenemedi: ${rpcDebtUpdateError.message}`);
      debtUpdateSucceeded = true;

      const { data: updatedWholesalerData, error: fetchWError } = await supabase.from('wholesalers').select('debt').eq('id', wholesaler.id).single();
      if (fetchWError || !updatedWholesalerData) throw new Error("Güncellenmiş toptancı borcu alınamadı.");
      const wholesalerBalanceAfter = updatedWholesalerData.debt ?? (wholesaler.debt + paymentAmountNegative);

      // 2. Kaynak Hesap Bakiyesini Güncelle
      console.log(` Adım 2: Hesap: ${selectedAccountId}, Değişim: ${paymentAmountNegative}`);
      const { error: rpcAccUpdateError } = await supabase.rpc('increment_account_balance', { account_id_input: selectedAccountId, balance_change: paymentAmountNegative });
      if (rpcAccUpdateError) throw new Error(`Kaynak hesap bakiyesi güncellenemedi: ${rpcAccUpdateError.message}`);
      accUpdateSucceeded = true;

      const { data: updatedSourceAccountData, error: fetchAError } = await supabase.from('accounts').select('current_balance').eq('id', selectedAccountId).single();
      if (fetchAError || !updatedSourceAccountData) throw new Error("Güncellenmiş hesap bakiyesi alınamadı.");
      const sourceBalanceAfter = updatedSourceAccountData.current_balance ?? (sourceAccount.current_balance + paymentAmountNegative);

      // 3. Toptancı Hareketi
      const desc = description.trim() || `Ödeme - ${sourceAccount.name}`;
      const finalDesc = usdChangeToReduce > 0 ? `${desc} (Ek olarak $${usdChangeToReduce.toFixed(2)} silindi)` : desc;

      const wholesalerTxData: Omit<WholesalerTransaction, 'id' | 'created_at' | 'balance_after'> = {
        wholesaler_id: wholesaler.id, date: transactionTimestamp, type: 'payment',
        amount: paymentAmountNegative,
        description: finalDesc,
        related_account_tx_id: null, related_purchase_invoice_id: null,
      };
      const { data: insertedWholesalerTx, error: wholesalerTxError } = await supabase.from('wholesaler_transactions').insert(wholesalerTxData).select('id').single();
      if (wholesalerTxError || !insertedWholesalerTx) throw wholesalerTxError || new Error("Toptancı hareketi oluşturulamadı.");
      createdWholesalerTxId = insertedWholesalerTx.id;

      // 4. Hesap Hareketi
      const accountTxData: Omit<AccountTransaction, 'id' | 'created_at'> = {
        date: transactionTimestamp, account_id: selectedAccountId, type: 'supplier_payment',
        amount: paymentAmountNegative, balance_after: sourceBalanceAfter,
        description: description.trim() || `Toptancı Ödeme: ${wholesaler.name}`,
        related_sale_id: null, related_service_id: null, related_customer_tx_id: null,
        transfer_pair_id: null, expense_category_id: null,
        related_wholesaler_transaction_id: createdWholesalerTxId,
      };
      const { data: insertedAccTx, error: accInsertError } = await supabase.from('account_transactions').insert(accountTxData).select('id').single();
      if (accInsertError || !insertedAccTx) throw accInsertError || new Error("Hesap hareketi oluşturulamadı.");
      createdAccountTxId = insertedAccTx.id;

      // 5. İlişkilendir
      await supabase.from('wholesaler_transactions').update({ related_account_tx_id: createdAccountTxId }).eq('id', createdWholesalerTxId);

      toast({ title: "Başarılı", description: `${formatCurrencyLocal(paymentAmount)} ödeme alındı.` });
      onPaymentMade(); setIsOpen(false);

    } catch (error: any) {
      console.error("[WholesalerPayment] HATA:", error);
      toast({ title: "Hata", description: error.message, variant: "destructive" });
      try {
        if (createdAccountTxId) await supabase.from('account_transactions').delete().eq('id', createdAccountTxId);
        if (createdWholesalerTxId) await supabase.from('wholesaler_transactions').delete().eq('id', createdWholesalerTxId);
        if (debtUpdateSucceeded) {
          // Rollback only TRY part to be safe, or full reversal
          await supabase.rpc('increment_wholesaler_debt', { wholesaler_id_input: wholesaler.id, debt_change_try: -paymentAmountNegative, debt_change_usd: usdChangeToReduce });
          console.log("RB: Toptancı Borcu Geri Alındı.");
        }
        if (accUpdateSucceeded) await supabase.rpc('increment_account_balance', { account_id_input: selectedAccountId, balance_change: -paymentAmountNegative });
        onPaymentMade();
      } catch (rollbackError) { console.error("Rollback hatası:", rollbackError); }
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-[450px] bg-gray-900 border border-white/10 text-white p-0 shadow-2xl backdrop-blur-xl">
        <DialogHeader className="bg-white/5 border-b border-white/10 p-4 flex flex-row justify-between items-center">
          <DialogTitle className="text-base font-bold flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-emerald-400" />
            Toptancı Ödeme: {wholesaler?.name || '...'}
          </DialogTitle>
          <DialogClose asChild><Button variant="ghost" size="icon" className="text-gray-400 hover:text-white hover:bg-white/10 h-8 w-8 rounded-full" disabled={isProcessing}><CancelIcon className="h-4 w-4" /></Button></DialogClose>
        </DialogHeader>
        <DialogDescription className="text-xs text-gray-400 px-6 pt-4 bg-blue-500/5 mx-4 mt-4 rounded-lg border border-blue-500/10 py-3">
          <div className="flex justify-between items-center">
            <div>
              Mevcut Borç (TRY): <span className={`font-bold font-mono text-sm ${(wholesaler?.debt ?? 0) > 0 ? 'text-red-400' : 'text-emerald-400'}`}>{formatCurrencyLocal(wholesaler?.debt)}</span>.
              {(wholesaler?.debt_usd ?? 0) > 0 && (<span className="ml-2"> USD: <span className="font-bold text-red-400 font-mono">${(wholesaler?.debt_usd ?? 0).toFixed(2)}</span></span>)}
            </div>
            {(wholesaler?.debt_usd ?? 0) > 0 && (
              <Button variant="outline" size="sm" onClick={handleClearUSD} disabled={isProcessing} className="h-6 text-[10px] bg-red-500/10 text-red-400 border-red-500/20 hover:bg-red-500/20 hover:text-red-300">
                USD Sıfırla
              </Button>
            )}
          </div>
          <span className="mt-1 block opacit-70">Yapılacak ödeme tutarını (TRY) ve paranın çıkacağı hesabı seçin.</span>
        </DialogDescription>
        <div className="grid gap-4 py-4 px-6">
          <div className="grid grid-cols-4 items-center gap-4"> <Label htmlFor="payment-amount" className="text-right text-xs sm:text-sm font-medium text-gray-400">Ödeme Tutarı *</Label> <Input id="payment-amount" name="amount" type="number" step="0.01" min="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} className="col-span-3 h-10 bg-white/5 border-white/10 text-white text-lg font-mono tracking-wide focus:border-emerald-500/50" disabled={isProcessing} required placeholder='0.00' /> </div>
          <div className="grid grid-cols-4 items-center gap-4"> <Label htmlFor="payment-account" className="text-right text-xs sm:text-sm font-medium text-gray-400">Kaynak Hesap *</Label> <Select value={selectedAccountId} onValueChange={setSelectedAccountId} disabled={isProcessing}> <SelectTrigger id="payment-account" className="col-span-3 h-9 bg-white/5 border-white/10 text-white text-xs sm:text-sm focus:ring-emerald-500/50"> <SelectValue placeholder="Hesap seçin..." /> </SelectTrigger> <SelectContent className="bg-gray-800 border-gray-700 text-white"> {!Array.isArray(accounts) || accounts.length === 0 ? (<SelectItem value="no-accounts" disabled>Hesap bulunamadı.</SelectItem>) : (accounts.map(acc => (<SelectItem key={acc.id} value={acc.id} className="focus:bg-gray-700 focus:text-white"> {acc.name} ({acc.type}) <span className={acc.current_balance < 0 ? 'text-red-400' : 'text-emerald-400'}>[{formatCurrencyLocal(acc.current_balance)}]</span> </SelectItem>)))} </SelectContent> </Select> </div>
          <div className="grid grid-cols-4 items-start gap-4"> <Label htmlFor="payment-description" className="text-right text-xs sm:text-sm font-medium text-gray-400 pt-2">Açıklama</Label> <Textarea id="payment-description" name="description" value={description} onChange={(e) => setDescription(e.target.value)} className="col-span-3 min-h-[60px] bg-white/5 border-white/10 text-white text-xs focus:border-blue-500/50 resize-none" disabled={isProcessing} placeholder='(Örn: Mal Alım Ödemesi)' /> </div>
        </div>
        <DialogFooter className="p-4 bg-white/5 border-t border-white/10 flex-shrink-0">
          <DialogClose asChild><Button type="button" variant="ghost" className="text-gray-400 hover:text-white hover:bg-white/10" disabled={isProcessing}>İptal</Button></DialogClose>
          <Button onClick={handlePayment} className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-[0_0_15px_rgba(16,185,129,0.4)]" disabled={isProcessing || !amount || !selectedAccountId || parseFloat(amount) <= 0 || !sourceAccount || (sourceAccount.current_balance ?? 0) < parseFloat(amount)}>
            {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <DollarSign className="mr-2 h-4 w-4" />} Ödemeyi Kaydet
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default WholesalerPaymentDialog;
// --- END OF FILE src/components/wholesaler/WholesalerPaymentDialog.tsx ---