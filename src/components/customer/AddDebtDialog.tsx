// --- START OF FILE src/components/customer/AddDebtDialog.tsx ---

import React, { useState, useEffect } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription, DialogClose
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, FilePlus, X as CancelIcon, DollarSign, FileText } from 'lucide-react';
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import type { Customer, CustomerTransaction } from "@/types/customer";
import type { Account } from "@/types/backup";
import { format } from 'date-fns';
import { cn } from "@/lib/utils";

interface AddDebtDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  customer: Customer;
  accounts: Account[];
  onDebtAdded: (customerId: string, newDebt: number, updatedAccount?: Account) => void;
}

const formatCurrencyLocal = (value: number | null | undefined): string => {
  return (value ?? 0).toFixed(2) + '₺';
};

const AddDebtDialog: React.FC<AddDebtDialogProps> = ({ isOpen, onOpenChange, customer, accounts, onDebtAdded }) => {
  const { toast } = useToast();
  const [amount, setAmount] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    if (isOpen && customer) {
      console.log("[AddDebtDialog] Açıldı. Müşteri:", customer.name);
      setAmount('');
      setDescription('');
      setIsProcessing(false);
    }
  }, [isOpen, customer]);

  const handleAddDebtSubmit = async () => {
    const debtAmount = parseFloat(amount);
    if (isNaN(debtAmount) || debtAmount <= 0) {
      toast({ title: "Uyarı", description: "Lütfen geçerli bir pozitif borç tutarı girin.", variant: "destructive" }); return;
    }

    console.log(`[AddDebtDialog] Borç ekleme başlıyor. Müşteri ID: ${customer.id}, Tutar: ${debtAmount}, Açıklama: ${description}`);
    setIsProcessing(true);
    let insertedCustTxId: string | null = null;

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

      const customerTransactionData: Omit<CustomerTransaction, 'id' | 'created_at' | 'balance'> = {
        customer_id: customer.id,
        date: transactionDateOnly,
        type: 'charge',
        amount: debtAmount,
        description: description.trim() || "Manuel Borç Ekleme",
      };
      const { data: insertedCustTx, error: custTxError } = await supabase
        .from('customer_transactions')
        .insert(customerTransactionData)
        .select('id')
        .single();

      if (custTxError || !insertedCustTx) throw custTxError || new Error("Müşteri hareketi oluşturulamadı.");
      insertedCustTxId = insertedCustTx.id;
      console.log("[AddDebtDialog] Müşteri hareketi eklendi:", insertedCustTxId);

      console.log("[AddDebtDialog] Müşteri borcu yeniden hesaplanıyor...");
      const { data: allCustTxData, error: fetchAllError } = await supabase.from('customer_transactions')
        .select('id, amount, created_at').eq('customer_id', customer.id).order('created_at', { ascending: true });
      if (fetchAllError) throw new Error("Müşteri borcu hesaplanamadı (işlemler çekilemedi).");
      const newCustomerDebt = (allCustTxData || []).reduce((sum, tx) => sum + (tx.amount ?? 0), 0);
      console.log(`[AddDebtDialog] Hesaplanan yeni borç: ${newCustomerDebt}`);

      if (allCustTxData && allCustTxData.length > 0) {
        console.log("[AddDebtDialog] Müşteri işlem bakiyeleri güncelleniyor...");
      }

      console.log(`[AddDebtDialog] Müşteri tablosu borcu güncelleniyor: ${newCustomerDebt}`);
      const { error: custUpdateError } = await supabase.from('customers').update({ debt: newCustomerDebt }).eq('id', customer.id);
      if (custUpdateError) throw new Error("Müşteri borcu güncellenemedi.");

      let finalUpdatedAccount: Account | undefined = undefined;

      console.log("[AddDebtDialog] Borç ekleme başarılı.");
      toast({ title: "Başarılı", description: `${formatCurrencyLocal(debtAmount)} tutarında borç eklendi.` });
      onDebtAdded(customer.id, newCustomerDebt, finalUpdatedAccount);
      onOpenChange(false);

    } catch (error: any) {
      console.error("[AddDebtDialog] Borç ekleme sırasında HATA:", error);
      toast({ title: "Hata", description: `Borç ekleme işlemi başarısız: ${error.message}`, variant: "destructive" });
      console.warn("[AddDebtDialog] Geri alma deneniyor...");
      if (insertedCustTxId) {
        console.log(`   -> Eklenen müşteri hareketi siliniyor: ${insertedCustTxId}`);
        await supabase.from('customer_transactions').delete().eq('id', insertedCustTxId);
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
            <FilePlus className="h-5 w-5 text-blue-400" />
            Borç Ekle: {customer?.name || '...'}
          </DialogTitle>
          <DialogClose asChild>
            <Button variant="ghost" size="icon" className="text-gray-400 hover:text-white hover:bg-white/10 h-8 w-8 rounded-full" disabled={isProcessing}>
              <CancelIcon className="h-4 w-4" />
            </Button>
          </DialogClose>
        </DialogHeader>

        <div className="p-6 space-y-6">
          <DialogDescription className="text-sm text-gray-400 bg-white/5 p-3 rounded-lg border border-white/5">
            Müşterinin mevcut borcu: <span className={cn("font-bold font-mono ml-1", customer?.debt > 0 ? 'text-red-400' : 'text-emerald-400')}>{formatCurrencyLocal(customer?.debt)}</span>.
            <br />Eklenecek borç tutarını ve açıklamasını girin.
          </DialogDescription>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="debt-amount" className="text-xs font-medium text-gray-400 ml-1">Tutar *</Label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                <Input
                  id="debt-amount" name="amount" type="number" step="0.01" min="0.01"
                  value={amount} onChange={(e) => setAmount(e.target.value)}
                  className="pl-10 bg-white/5 border-white/10 text-white h-10 text-sm focus:border-blue-500/50"
                  disabled={isProcessing} required placeholder='0.00'
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="debt-description" className="text-xs font-medium text-gray-400 ml-1">Açıklama</Label>
              <div className="relative">
                <FileText className="absolute left-3 top-3 h-4 w-4 text-gray-500" />
                <Textarea
                  id="debt-description" name="description"
                  value={description} onChange={(e) => setDescription(e.target.value)}
                  className="pl-10 min-h-[80px] bg-white/5 border-white/10 text-white text-sm focus:border-blue-500/50"
                  disabled={isProcessing} placeholder='(Örn: Veresiye Satış, Hizmet Bedeli vb.)'
                />
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="bg-white/5 border-t border-white/10 p-4">
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} disabled={isProcessing} className="text-gray-400 hover:text-white hover:bg-white/10">İptal</Button>
          <Button
            onClick={handleAddDebtSubmit}
            className="bg-blue-600 hover:bg-blue-700 text-white shadow-[0_0_15px_rgba(37,99,235,0.4)]"
            disabled={isProcessing || !amount || parseFloat(amount) <= 0}
          >
            {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FilePlus className="mr-2 h-4 w-4" />}
            Borcu Ekle
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AddDebtDialog;
// --- END OF FILE src/components/customer/AddDebtDialog.tsx ---