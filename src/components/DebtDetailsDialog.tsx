// --- START OF FILE src/components/DebtDetailsDialog.tsx ---

import React, { useState, useEffect, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Pencil, Trash2, Loader2, CreditCard, Wallet, Calendar, FileText, AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import type { CustomerTransaction } from "@/types/customer";
import { loadCustomerTransactions, updateCustomerDebtInSupabase } from "@/utils/customerUtils";
import type { Account, AccountTransaction } from "@/types/backup";
import { cn } from "@/lib/utils";

interface DebtDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customerName?: string;
  customerId?: string;
  onTransactionUpdate?: (customerId: string, totalDebt: number, updatedAccountId?: string) => void;
}

const DebtDetailsDialog: React.FC<DebtDetailsDialogProps> = ({
  open,
  onOpenChange,
  customerName = "",
  customerId,
  onTransactionUpdate,
}) => {
  const { toast } = useToast();
  const [transactions, setTransactions] = useState<CustomerTransaction[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isProcessing, setIsProcessing] = useState<string | null>(null);

  const recalculateAndUpdateCustomerDebt = useCallback(async (customerId: string, currentTransactions: CustomerTransaction[], updatedAccountId?: string) => {
    const totalDebt = currentTransactions.reduce((sum, t) => sum + t.amount, 0);
    console.log(`[DebtDetailsDialog] recalculateAndUpdateCustomerDebt - Yeni Borç: ${totalDebt}, Müşteri ID: ${customerId}, Hesap ID: ${updatedAccountId}`);
    const success = await updateCustomerDebtInSupabase(customerId, totalDebt);
    if (success && onTransactionUpdate) {
      onTransactionUpdate(customerId, totalDebt, updatedAccountId);
    }
    return totalDebt;
  }, [onTransactionUpdate]);


  const fetchTransactions = useCallback(async () => {
    if (!customerId) return;
    console.log("[DebtDetailsDialog] fetchTransactions çağrıldı.");
    setIsLoading(true);
    try {
      const data = await loadCustomerTransactions(customerId);
      let runningBalance = 0;
      const calculatedTransactions = data.map(t => ({
        ...t,
        balance: runningBalance += t.amount
      }));
      setTransactions(calculatedTransactions);
      console.log(`[DebtDetailsDialog] ${calculatedTransactions.length} işlem yüklendi.`);
    } catch (error) {
      console.error("[DebtDetailsDialog] İşlemler yüklenirken hata:", error);
      toast({ title: "Hata", description: "İşlemler yüklenemedi.", variant: "destructive" });
      setTransactions([]);
    } finally {
      setIsLoading(false);
    }
  }, [customerId, toast]);

  useEffect(() => {
    if (open && customerId) {
      fetchTransactions();
    } else {
      setTransactions([]);
    }
  }, [open, customerId, fetchTransactions]);


  const handleEdit = async (transaction: CustomerTransaction) => {
    if (!customerId) return;
    const newAmountStr = window.prompt("Yeni tutarı giriniz (pozitif):", Math.abs(transaction.amount).toString());
    if (!newAmountStr) return;

    const newAmount = parseFloat(newAmountStr);
    if (isNaN(newAmount) || newAmount <= 0) {
      toast({ title: "Hata", description: "Geçerli pozitif bir tutar giriniz", variant: "destructive" });
      return;
    }

    const updatedAmount = transaction.amount < 0 ? -newAmount : newAmount;

    console.log(`[DebtDetailsDialog] handleEdit - Tx ID: ${transaction.id}, Eski Tutar: ${transaction.amount}, Yeni Tutar: ${updatedAmount}`);
    setIsProcessing(transaction.id);

    try {
      const { data: updatedTransactionData, error: updateError } = await supabase
        .from('customer_transactions')
        .update({ amount: updatedAmount })
        .eq('id', transaction.id)
        .select()
        .single();

      if (updateError) throw updateError;
      if (!updatedTransactionData) throw new Error("Güncellenen işlem verisi alınamadı.");

      const temporarilyUpdatedTransactions = transactions.map(t =>
        t.id === transaction.id ? { ...t, amount: updatedAmount } : t
      ).sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

      let runningBalance = 0;
      const finalTransactions = temporarilyUpdatedTransactions.map(t => ({
        ...t,
        balance: runningBalance += t.amount
      }));

      const balanceUpdatePromises = finalTransactions.map(t =>
        supabase.from('customer_transactions').update({ balance: t.balance }).eq('id', t.id)
      );
      const results = await Promise.all(balanceUpdatePromises);
      results.forEach((res, index) => {
        if (res.error) console.warn(`[DebtDetailsDialog] Edit - Bakiye güncellenemedi (Tx ID: ${finalTransactions[index].id}):`, res.error.message);
      });

      setTransactions(finalTransactions);
      await recalculateAndUpdateCustomerDebt(customerId, finalTransactions);

      toast({ title: "Başarılı", description: "İşlem başarıyla güncellendi" });

    } catch (error: any) {
      console.error("[DebtDetailsDialog] İşlem güncellenirken hata:", error);
      toast({ title: "Hata", description: `İşlem güncellenemedi: ${error.message}`, variant: "destructive" });
      fetchTransactions();
    } finally {
      setIsProcessing(null);
    }
  };

  const handleDelete = async (transaction: CustomerTransaction) => {
    if (!window.confirm(`Bu işlemi silmek istediğinize emin misiniz?\nTutar: ${Math.abs(transaction.amount).toFixed(2)}₺\nTip: ${transaction.type}\nBu işlem geri alınamaz ve ilişkili Kasa/Hesap hareketi de silinecektir!`)) return;
    if (!customerId) return;

    console.log(`[DebtDetailsDialog] handleDelete - Başlıyor. Silinecek Tx ID: ${transaction.id}`);
    setIsProcessing(transaction.id);
    let associatedAccountId: string | null = null;

    try {
      console.log(`[DebtDetailsDialog] Adım 1: İlişkili hesap hareketi aranıyor (related_customer_tx_id = ${transaction.id})`);
      const { data: relatedAccTx, error: findError } = await supabase
        .from('account_transactions')
        .select('id, account_id')
        .eq('related_customer_tx_id', transaction.id)
        .maybeSingle();

      if (findError) {
        console.error("[DebtDetailsDialog] İlişkili hesap hareketi aranırken hata:", findError);
      }

      if (relatedAccTx) {
        associatedAccountId = relatedAccTx.account_id;
        console.log(`[DebtDetailsDialog] Adım 1: İlişkili hesap hareketi bulundu. Hesap Tx ID: ${relatedAccTx.id}, Hesap ID: ${associatedAccountId}`);
      } else {
        console.log("[DebtDetailsDialog] Adım 1: İlişkili hesap hareketi bulunamadı.");
      }

      console.log(`[DebtDetailsDialog] Adım 2: Müşteri hareketi siliniyor (ID: ${transaction.id})`);
      const { error: deleteCustTxError } = await supabase
        .from('customer_transactions')
        .delete()
        .eq('id', transaction.id);

      if (deleteCustTxError) {
        console.error("[DebtDetailsDialog] Müşteri hareketi silinirken HATA:", deleteCustTxError);
        throw new Error(`Müşteri hareketi silinemedi: ${deleteCustTxError.message}`);
      }
      console.log("[DebtDetailsDialog] Adım 2: Müşteri hareketi başarıyla silindi.");


      if (relatedAccTx) {
        console.log(`[DebtDetailsDialog] Adım 3: İlişkili hesap hareketi siliniyor (ID: ${relatedAccTx.id})`);
        const { error: deleteAccTxError } = await supabase
          .from('account_transactions')
          .delete()
          .eq('id', relatedAccTx.id);

        if (deleteAccTxError) {
          console.error("[DebtDetailsDialog] KRİTİK HATA - Hesap hareketi silinirken:", deleteAccTxError);
          toast({ title: "Kritik Tutarsızlık Riski!", description: "Müşteri hareketi silindi ancak ilişkili KASA/HESAP hareketi silinemedi! Lütfen durumu manuel olarak kontrol edin.", variant: "destructive", duration: 15000 });
        } else {
          console.log("[DebtDetailsDialog] Adım 3: Hesap hareketi başarıyla silindi.");
        }
      }

      const remainingCustomerTransactions = transactions
        .filter(t => t.id !== transaction.id)
        .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

      console.log("[DebtDetailsDialog] Adım 5: Kalan müşteri işlemlerinin bakiyeleri güncelleniyor...");
      let runningCustBalance = 0;
      const finalCustomerTransactions = remainingCustomerTransactions.map(t => ({
        ...t,
        balance: runningCustBalance += t.amount
      }));

      const custBalanceUpdatePromises = finalCustomerTransactions.map(t =>
        supabase.from('customer_transactions').update({ balance: t.balance }).eq('id', t.id)
      );
      const custBalanceResults = await Promise.all(custBalanceUpdatePromises);
      custBalanceResults.forEach((res, index) => {
        if (res.error) console.warn(`[DebtDetailsDialog] Delete - Müşteri bakiye güncellenemedi (Tx ID: ${finalCustomerTransactions[index].id}):`, res.error.message);
      });
      setTransactions(finalCustomerTransactions);
      console.log("[DebtDetailsDialog] Adım 5: Tamamlandı.");


      console.log("[DebtDetailsDialog] Adım 6: Müşteri toplam borcu güncelleniyor...");
      await recalculateAndUpdateCustomerDebt(customerId, finalCustomerTransactions, associatedAccountId ?? undefined);
      console.log("[DebtDetailsDialog] Adım 6: Tamamlandı.");


      if (associatedAccountId) {
        console.log(`[DebtDetailsDialog] Adım 7: Hesap bakiyesi güncelleniyor (Hesap ID: ${associatedAccountId})`);
        const { data: remainingAccTxs, error: fetchAccError } = await supabase
          .from('account_transactions')
          .select('amount')
          .eq('account_id', associatedAccountId);

        if (fetchAccError) {
          console.error("[DebtDetailsDialog] HATA - Hesabın kalan hareketleri çekilemedi:", fetchAccError);
          toast({ title: "Hata", description: "Hesap bakiyesi güncellenemedi (hareketler okunamadı). Lütfen manuel kontrol edin.", variant: "destructive", duration: 10000 });
        } else {
          const newAccountBalance = (remainingAccTxs || []).reduce((sum, tx) => sum + (tx.amount || 0), 0);
          console.log(`[DebtDetailsDialog] Adım 7: Hesaplanan yeni bakiye: ${newAccountBalance}`);

          const { error: updateAccError } = await supabase
            .from('accounts')
            .update({ current_balance: newAccountBalance })
            .eq('id', associatedAccountId);

          if (updateAccError) {
            console.error("[DebtDetailsDialog] HATA - Hesap bakiyesi güncellenemedi:", updateAccError);
            toast({ title: "Hata", description: "Hesap bakiyesi güncellenemedi. Lütfen manuel kontrol edin.", variant: "destructive", duration: 10000 });
          } else {
            console.log("[DebtDetailsDialog] Adım 7: Hesap bakiyesi başarıyla güncellendi.");
          }
        }
      }

      toast({ title: "Başarılı", description: "İşlem başarıyla silindi" });

    } catch (error: any) {
      console.error("[DebtDetailsDialog] İşlem silinirken genel hata:", error);
      toast({ title: "Hata", description: `İşlem silinemedi: ${error.message}`, variant: "destructive" });
      fetchTransactions();
    } finally {
      setIsProcessing(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-gray-900 border border-white/10 text-white max-w-[700px] max-h-[85vh] p-0 overflow-hidden shadow-2xl backdrop-blur-xl">
        <DialogHeader className="bg-white/5 border-b border-white/10 p-4 flex flex-row items-center justify-between space-y-0">
          <DialogTitle className="flex items-center gap-2 text-lg font-bold">
            <Wallet className="h-5 w-5 text-blue-400" />
            <span className="text-white">{customerName || "Müşteri"}</span>
            <span className="text-gray-400 font-normal text-sm">- Borç Detayları</span>
          </DialogTitle>
        </DialogHeader>

        <div className="p-4 bg-black/20">
          <div className="glass-card border border-white/10 rounded-lg overflow-hidden">
            <ScrollArea className="h-[400px]">
              {isLoading ? (
                <div className="flex flex-col items-center justify-center h-full text-gray-400 gap-3 py-10">
                  <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
                  <p>İşlemler yükleniyor...</p>
                </div>
              ) : (
                <table className="w-full text-sm text-left">
                  <thead className="bg-white/5 text-gray-400 sticky top-0 backdrop-blur-md z-10">
                    <tr>
                      <th className="px-4 py-3 font-medium w-[120px]">Tarih</th>
                      <th className="px-4 py-3 font-medium w-[140px]">İşlem</th>
                      <th className="px-4 py-3 font-medium">Açıklama</th>
                      <th className="px-4 py-3 font-medium text-right w-[100px]">Tutar</th>
                      <th className="px-4 py-3 font-medium text-right w-[100px]">Bakiye</th>
                      <th className="px-4 py-3 font-medium text-center w-[80px]">Sil</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {transactions.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-4 py-10 text-center text-gray-500 flex flex-col items-center gap-2">
                          <FileText className="h-8 w-8 opacity-50" />
                          <span>Bu müşteriye ait işlem bulunamadı.</span>
                        </td>
                      </tr>
                    ) : (
                      transactions.map((transaction) => (
                        <tr key={transaction.id} className="hover:bg-white/5 transition-colors group">
                          <td className="px-4 py-3 text-gray-400 whitespace-nowrap font-mono text-xs">
                            {new Date(transaction.date + 'T00:00:00').toLocaleDateString('tr-TR')}
                          </td>
                          <td className="px-4 py-3">
                            <span className={cn(
                              "px-2 py-1 rounded text-xs font-medium",
                              transaction.type === 'charge' ? "bg-red-500/10 text-red-400" :
                                transaction.type === 'payment' ? "bg-emerald-500/10 text-emerald-400" : "bg-blue-500/10 text-blue-400"
                            )}>
                              {transaction.type === 'charge' ? 'Borç Ekleme' : transaction.type === 'payment' ? 'Tahsilat' : transaction.type}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-gray-300 max-w-[200px] truncate" title={transaction.description ?? ''}>
                            {transaction.description ?? '-'}
                          </td>
                          <td className={cn("px-4 py-3 text-right font-mono font-medium", transaction.amount < 0 ? 'text-emerald-400' : 'text-red-400')}>
                            {Math.abs(transaction.amount).toFixed(2)}₺
                          </td>
                          <td className="px-4 py-3 text-right font-mono text-gray-300">{transaction.balance.toFixed(2)}₺</td>
                          <td className="px-4 py-3 text-center">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 hover:bg-red-500/20 hover:text-red-400 rounded-md transition-colors"
                              onClick={() => handleDelete(transaction)}
                              disabled={!!isProcessing}
                              title="Sil"
                            >
                              {isProcessing === transaction.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                            </Button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              )}
            </ScrollArea>
          </div>
        </div>

        <DialogFooter className="bg-white/5 border-t border-white/10 p-4">
          <Button variant="outline" className="bg-transparent border-white/10 text-white hover:bg-white/10" onClick={() => onOpenChange(false)}>
            Kapat
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default DebtDetailsDialog;
// --- END OF FILE src/components/DebtDetailsDialog.tsx ---