import React, { useState, useEffect, useCallback } from 'react';
import { X, Truck, DollarSign, Plus, Loader2, List, ClipboardList } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import type { Supplier, SupplierTransaction } from "@/types/backup";
import type { Account } from "@/types/backup";
import SupplierList from './suppliers/SupplierList';
import SupplierFormDialog from './suppliers/SupplierFormDialog';
import SupplierPaymentDialog from './suppliers/SupplierPaymentDialog';
import SupplierHistoryDialog from './suppliers/SupplierHistoryDialog';

interface SupplierModuleProps {
  onClose: () => void;
}

const SupplierModule: React.FC<SupplierModuleProps> = ({ onClose }) => {
  const { toast } = useToast();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [supplierForHistory, setSupplierForHistory] = useState<Supplier | null>(null);

  // Tedarikçileri Çek
  const fetchSuppliers = useCallback(async (selectSupplier: Supplier | null = selectedSupplier) => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('suppliers')
        .select('*')
        .order('name');

      if (error) throw error;

      const fetchedSuppliers = data || [];
      setSuppliers(fetchedSuppliers);

      if (selectSupplier) {
        const updatedSelected = fetchedSuppliers.find(s => s.id === selectSupplier.id);
        if (updatedSelected) {
          setSelectedSupplier(updatedSelected);
        }
      }
    } catch (error: any) {
      console.error('Tedarikçi çekme hatası:', error);
      toast({
        title: "Hata",
        description: "Tedarikçiler yüklenirken bir hata oluştu.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast, selectedSupplier]);

  // Hesapları Çek
  const fetchAccounts = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('accounts')
        .select('*')
        .order('name');

      if (error) throw error;
      setAccounts(data || []);
    } catch (error: any) {
      console.error('Hesap çekme hatası:', error);
    }
  }, []);

  useEffect(() => {
    fetchSuppliers();
    fetchAccounts();
  }, [fetchSuppliers, fetchAccounts]);

  const handleAddSupplier = () => {
    setEditingSupplier(null);
    setIsFormOpen(true);
  };

  const handleEditSupplier = (supplier: Supplier) => {
    setEditingSupplier(supplier);
    setIsFormOpen(true);
  };

  const handleDeleteSupplier = async (supplier: Supplier) => {
    if (!window.confirm(`"${supplier.name}" tedarikçisini silmek istediğinize emin misiniz?`)) return;

    try {
      const { error } = await supabase
        .from('suppliers')
        .delete()
        .eq('id', supplier.id);

      if (error) throw error;

      toast({
        title: "Başarılı",
        description: "Tedarikçi silindi.",
      });

      if (selectedSupplier?.id === supplier.id) {
        setSelectedSupplier(null);
      }
      fetchSuppliers();
    } catch (error: any) {
      console.error('Silme hatası:', error);
      toast({
        title: "Hata",
        description: "Tedarikçi silinemedi. İlişkili kayıtlar olabilir.",
        variant: "destructive"
      });
    }
  };

  const handlePaymentClick = (supplier: Supplier) => {
    setSelectedSupplier(supplier);
    setIsPaymentOpen(true);
  };

  const handleHistoryClick = (supplier: Supplier) => {
    setSupplierForHistory(supplier);
    setIsHistoryOpen(true);
  };

  const handleSupplierSaved = () => {
    fetchSuppliers();
    setIsFormOpen(false);
  };

  const handlePaymentComplete = () => {
    fetchSuppliers();
    fetchAccounts(); // Bakiyeler değiştiği için hesapları da güncelle
    setIsPaymentOpen(false);
  };

  return (
    <div className="h-full p-2 sm:p-4 animate-in fade-in duration-300">
      <div className="glass-panel rounded-xl h-full flex flex-col border border-white/10 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="bg-white/5 border-b border-white/10 p-3 flex justify-between items-center flex-shrink-0 backdrop-blur-md">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-indigo-500/20 rounded-lg">
              <Truck className="h-5 w-5 text-indigo-400" />
            </div>
            <h1 className="text-lg font-bold text-white tracking-tight">Tedarikçi Yönetimi</h1>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="hover:bg-red-500/20 hover:text-red-400 h-8 w-8 rounded-lg transition-colors"
            onClick={onClose}
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden flex flex-col p-3 sm:p-4 gap-4">
          {/* Actions Bar */}
          <div className="flex justify-between items-center bg-white/5 p-3 rounded-lg border border-white/10">
            <div className="text-sm text-gray-400">
              Toplam <span className="text-white font-bold">{suppliers.length}</span> tedarikçi
            </div>
            <Button
              onClick={handleAddSupplier}
              className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-[0_0_15px_rgba(79,70,229,0.3)] transition-all duration-200"
            >
              <Plus className="h-4 w-4 mr-2" /> Yeni Tedarikçi
            </Button>
          </div>

          {/* Supplier List */}
          <div className="flex-1 overflow-hidden glass-card rounded-lg border border-white/10">
            {isLoading ? (
              <div className="flex flex-col justify-center items-center h-full text-gray-400 gap-3">
                <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
                <span className="text-sm font-medium">Tedarikçiler yükleniyor...</span>
              </div>
            ) : (
              <SupplierList
                suppliers={suppliers}
                onEdit={handleEditSupplier}
                onDelete={handleDeleteSupplier}
                onPayment={handlePaymentClick}
                onHistory={handleHistoryClick}
              />
            )}
          </div>
        </div>
      </div>

      {/* Dialogs */}
      <SupplierFormDialog
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        editingSupplier={editingSupplier}
        onSaved={handleSupplierSaved}
      />

      {selectedSupplier && (
        <SupplierPaymentDialog
          isOpen={isPaymentOpen}
          onClose={() => setIsPaymentOpen(false)}
          supplier={selectedSupplier}
          accounts={accounts}
          onPaymentComplete={handlePaymentComplete}
        />
      )}

      {supplierForHistory && (
        <SupplierHistoryDialog
          isOpen={isHistoryOpen}
          onClose={() => setIsHistoryOpen(false)}
          supplier={supplierForHistory}
        />
      )}
    </div>
  );
};

export default SupplierModule;