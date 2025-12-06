// --- START OF FILE src/components/AccountsModule.tsx ---

import React, { useState, useEffect, useCallback } from 'react';
import { X, Banknote, Plus, List, Loader2, Wallet, CreditCard, Landmark, ArrowRightLeft, History } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import type { Account } from "@/types/backup";
import AccountList from "./accounts/AccountList";
import AccountForm from "./accounts/AccountForm";
import AccountTransactionList from "./accounts/AccountTransactionList";
import AccountTransactionForm from "./accounts/AccountTransactionForm";
import { cn } from "@/lib/utils";

interface AccountsModuleProps { onClose: () => void; }

const AccountsModule: React.FC<AccountsModuleProps> = ({ onClose }) => {
  const { toast } = useToast();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);
  const [showAccountForm, setShowAccountForm] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [showTransactionForm, setShowTransactionForm] = useState(false);

  const fetchAccounts = useCallback(async (selectIdAfterFetch: string | null = selectedAccountId) => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.from('accounts').select('*').order('name', { ascending: true });
      if (error) throw error;
      const fetchedAccounts: Account[] = (data || []).map(acc => ({
        id: acc.id, created_at: acc.created_at,
        name: acc.name ?? 'İsimsiz Hesap', type: acc.type ?? 'bank',
        account_number: acc.account_number ?? null, bank_name: acc.bank_name ?? null,
        initial_balance: acc.initial_balance ?? 0, current_balance: acc.current_balance ?? 0,
        is_default: acc.is_default ?? false,
        credit_limit: acc.credit_limit ?? 0
      }));
      setAccounts(fetchedAccounts);
      const idToSelect = selectIdAfterFetch ?? selectedAccountId;
      if (idToSelect && fetchedAccounts.some(acc => acc.id === idToSelect)) { setSelectedAccountId(idToSelect); }
      else if (!fetchedAccounts.some(acc => acc.id === selectedAccountId)) { setSelectedAccountId(null); }
    } catch (error: any) { console.error("Hesaplar yüklenirken hata:", error); toast({ title: "Hata", description: `Hesaplar yüklenemedi: ${error.message}`, variant: "destructive" }); setAccounts([]); }
    finally { setIsLoading(false); }
  }, [toast, selectedAccountId]);

  useEffect(() => { fetchAccounts(); }, [fetchAccounts]);

  const handleDeleteAccount = async (accountId: string) => {
    const accountToDelete = accounts.find(acc => acc.id === accountId);
    if (!accountToDelete) return;
    if (!window.confirm(`"${accountToDelete.name}" hesabını silmek istediğinize emin misiniz?`)) return;
    setIsLoading(true);
    try {
      const { error } = await supabase.from('accounts').delete().eq('id', accountId);
      if (error) {
        if (error.code === '23503') toast({ title: "Hata", description: "İlişkili hareketler var, silinemez.", variant: "destructive", duration: 5000 });
        else throw error;
      } else {
        toast({ title: "Başarılı", description: "Hesap silindi." });
        setAccounts(prev => prev.filter(acc => acc.id !== accountId));
        if (selectedAccountId === accountId) { setSelectedAccountId(null); }
      }
    } catch (error: any) {
      console.error("Hesap silme hatası:", error);
      toast({ title: "Hata", description: `Hesap silinemedi: ${error.message}`, variant: "destructive" });
    } finally { setIsLoading(false); }
  };

  const handleEditAccount = (account: Account) => { setEditingAccount(account); setShowAccountForm(true); };
  const openNewAccountForm = () => { setEditingAccount(null); setShowAccountForm(true); };

  const handleAccountSaved = (savedAccount: Account) => {
    fetchAccounts(savedAccount.id);
    setEditingAccount(null);
    setShowAccountForm(false);
  };

  const handleTransactionSaved = () => {
    if (selectedAccountId) {
      fetchAccounts(selectedAccountId);
    } else {
      fetchAccounts();
    }
    setShowTransactionForm(false);
  };

  return (
    <div className="h-full p-2 sm:p-4 animate-in fade-in duration-300">
      <div className="glass-panel rounded-xl h-full flex flex-col border border-white/10 shadow-2xl overflow-hidden">
        <div className="bg-white/5 border-b border-white/10 p-3 flex justify-between items-center flex-shrink-0 backdrop-blur-md">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-emerald-500/20 rounded-lg">
              <Banknote className="h-5 w-5 text-emerald-400" />
            </div>
            <h1 className="text-lg font-bold text-white tracking-tight">Hesap Yönetimi</h1>
          </div>
          <Button variant="ghost" size="icon" className="hover:bg-red-500/20 hover:text-red-400 h-8 w-8 rounded-lg transition-colors" onClick={onClose} disabled={isLoading}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        <div className="flex-1 flex flex-col md:flex-row overflow-hidden p-3 gap-3">
          <div className="w-full md:w-1/3 lg:w-[300px] flex flex-col gap-3 glass-card p-3 border border-white/10 rounded-lg">
            <div className="flex justify-between items-center px-1">
              <h2 className="font-bold text-sm text-gray-300">Hesaplar</h2>
              <Button size="sm" className="h-7 text-xs bg-blue-600 hover:bg-blue-700 text-white shadow-[0_0_10px_rgba(37,99,235,0.3)]" onClick={openNewAccountForm}>
                <Plus className="h-3.5 w-3.5 mr-1.5" /> Yeni Hesap
              </Button>
            </div>

            {isLoading ? (
              <div className="flex-1 flex items-center justify-center text-gray-400">
                <Loader2 className="h-6 w-6 animate-spin text-blue-500 mr-2" /> Yükleniyor...
              </div>
            ) : (
              <AccountList
                accounts={accounts}
                selectedAccountId={selectedAccountId}
                onSelectAccount={setSelectedAccountId}
                onEditAccount={handleEditAccount}
                onDeleteAccount={handleDeleteAccount}
              />
            )}
          </div>

          <div className="flex-1 flex flex-col gap-3 overflow-hidden">
            <div className="glass-card p-4 border border-white/10 rounded-lg flex-1 flex flex-col min-h-0">
              <div className="flex justify-between items-center mb-4 border-b border-white/10 pb-2">
                <div className="flex items-center gap-2">
                  <History className="h-5 w-5 text-blue-400" />
                  <h2 className="font-bold text-lg text-white">
                    {selectedAccountId ? `${accounts.find(a => a.id === selectedAccountId)?.name || ''} Hareketleri` : "Hesap Hareketleri"}
                  </h2>
                </div>
                <Button size="sm" className="h-8 text-xs bg-emerald-600 hover:bg-emerald-700 text-white shadow-[0_0_10px_rgba(16,185,129,0.3)]" disabled={!selectedAccountId} onClick={() => setShowTransactionForm(true)}>
                  <ArrowRightLeft className="h-3.5 w-3.5 mr-1.5" /> Yeni İşlem
                </Button>
              </div>

              <div className="flex-1 overflow-hidden bg-black/20 rounded-lg border border-white/5">
                {selectedAccountId ? (
                  <AccountTransactionList accountId={selectedAccountId} />
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-gray-500 gap-3 opacity-60">
                    <Wallet className="h-12 w-12 text-gray-600" />
                    <p>Hareketleri görmek için soldaki listeden bir hesap seçin.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <AccountForm isOpen={showAccountForm} setIsOpen={setShowAccountForm} onAccountSaved={handleAccountSaved} editingAccount={editingAccount} />
      <AccountTransactionForm isOpen={showTransactionForm} setIsOpen={setShowTransactionForm} onTransactionSaved={handleTransactionSaved} accounts={accounts} selectedAccountId={selectedAccountId} />
    </div>
  );
};

export default AccountsModule;
// --- END OF FILE src/components/AccountsModule.tsx ---