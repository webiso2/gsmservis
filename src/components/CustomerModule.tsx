// --- START OF FILE src/CustomerModule.tsx ---

import React, { useState, useEffect, useCallback } from 'react';
import { X, Loader2, User, Users } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import DebtDetailsDialog from "@/components/DebtDetailsDialog";
import CustomerForm from "@/components/customer/CustomerForm";
import CustomerOperations from "@/components/customer/CustomerOperations";
import CustomerList from "@/components/customer/CustomerList";
import CustomerDetailPanel from "@/components/customer/CustomerDetailPanel";
import PaymentDialog from "@/components/customer/PaymentDialog";
import AddDebtDialog from "@/components/customer/AddDebtDialog";
import { Customer, FormData, CustomerTransaction } from "@/types/customer";
import type { Account } from "@/types/backup";
import { useQueryClient } from "@tanstack/react-query";
import { useCustomers, useAccounts } from "@/hooks/useAppData";
import { formatPhoneNumber } from "@/utils/customerUtils";

const initialFormData: FormData = {
  name: "", phone: "", address: "", city: "", email: "", notes: "", credit_limit: "0",
};

interface CustomerModuleProps { onClose: () => void; }

const CustomerModule: React.FC<CustomerModuleProps> = ({ onClose }) => {
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [editingCustomerId, setEditingCustomerId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const [debtDetailsOpen, setDebtDetailsOpen] = useState(false);
  const [isDetailPanelOpen, setIsDetailPanelOpen] = useState(false);
  const [isAddDebtDialogOpen, setIsAddDebtDialogOpen] = useState(false);
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);

  const [viewingCustomerId, setViewingCustomerId] = useState<string | null>(null);
  const { toast } = useToast();

  const queryClient = useQueryClient();
  const { data: customersData, isLoading: isCustomersLoading } = useCustomers();
  const { data: accountsData } = useAccounts();

  const customers = customersData || [];
  const accounts = accountsData || [];
  const isLoading = isCustomersLoading;

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleCustomerSelect = useCallback((customer: Customer) => {
    if (isEditing) {
      console.warn("Düzenleme modunda müşteri seçimi engellendi.");
      return;
    }
    setSelectedCustomer(customer);
    setFormData({
      name: customer.name,
      phone: customer.phone ?? '',
      address: customer.address ?? '',
      city: customer.city ?? '',
      email: customer.email ?? '',
      notes: customer.notes ?? '',
      credit_limit: customer.credit_limit?.toString() ?? '0',
    });
  }, [isEditing]);

  const openDetailPanel = useCallback((customer: Customer) => {
    if (isEditing) {
      console.warn("Düzenleme modunda detay paneli açma engellendi.");
      return;
    }
    setViewingCustomerId(customer.id);
    setIsDetailPanelOpen(true);
  }, [isEditing]);

  const prepareDataForSupabase = (data: FormData) => {
    const formattedPhone = formatPhoneNumber(data.phone);
    if (data.phone && !formattedPhone && data.phone.trim() !== '') {
      toast({ title: "Uyarı", description: "Geçersiz telefon numarası formatı. (Örn: 5xxxxxxxxx veya boş bırakın)", variant: "destructive" });
      return null;
    }
    if (!data.name.trim()) {
      toast({ title: "Uyarı", description: "Müşteri adı zorunludur.", variant: "destructive" });
      return null;
    }
    return {
      name: data.name.trim(),
      phone: formattedPhone,
      address: data.address?.trim() || null,
      city: data.city?.trim() || null,
      email: data.email?.trim().toLowerCase() || null,
      notes: data.notes?.trim() || null,
      credit_limit: parseFloat(data.credit_limit) || 0,
    };
  };

  const handleAddCustomer = async () => {
    if (isEditing) return;
    const customerData = prepareDataForSupabase(formData);
    if (!customerData) return;

    setIsSaving(true);
    try {
      const dataToInsert = { ...customerData, debt: 0 };
      const { data, error } = await supabase.from('customers').insert([dataToInsert]).select().single();
      if (error) throw error;

      if (data) {
        await queryClient.invalidateQueries({ queryKey: ['customers'] });
        toast({ title: "Başarılı", description: `"${data.name}" başarıyla eklendi.` });
        setFormData(initialFormData);
        setSelectedCustomer(null);
      }
    } catch (error: any) {
      console.error("Müşteri Ekleme Hatası:", error);
      toast({ title: "Hata", description: `Müşteri eklenemedi: ${error.message}`, variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const handleEditClick = () => {
    if (!isEditing) {
      if (!selectedCustomer) {
        toast({ title: "Bilgi", description: "Lütfen düzenlemek için bir müşteri seçin.", variant: "default" });
        setFormData(initialFormData);
        return;
      }
      setIsEditing(true);
      setEditingCustomerId(selectedCustomer.id);
    } else {
      handleUpdateCustomer();
    }
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditingCustomerId(null);
    setSelectedCustomer(null);
    setFormData(initialFormData);
  };

  const handleUpdateCustomer = async () => {
    if (!editingCustomerId || !isEditing) return;
    const customerData = prepareDataForSupabase(formData);
    if (!customerData) return;

    setIsSaving(true);
    try {
      const { data, error } = await supabase.from('customers').update(customerData).eq('id', editingCustomerId).select().single();
      if (error) throw error;

      if (data) {
        await queryClient.invalidateQueries({ queryKey: ['customers'] });
        toast({ title: "Başarılı", description: `"${data.name}" başarıyla güncellendi.` });
        setIsEditing(false);
        setEditingCustomerId(null);
        setSelectedCustomer(null);
        setFormData(initialFormData);
      }
    } catch (error: any) {
      console.error("Müşteri Güncelleme Hatası:", error);
      toast({ title: "Hata", description: `Müşteri güncellenemedi: ${error.message}`, variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteCustomer = async () => {
    if (!selectedCustomer || isEditing) return;
    if (!window.confirm(`"${selectedCustomer.name}" isimli müşteriyi silmek istediğinizden emin misiniz?\nBu işlem geri alınamaz!`)) return;

    setIsProcessing(true);
    try {
      const { error } = await supabase.from('customers').delete().eq('id', selectedCustomer.id);
      if (error) {
        if (error.code === '23503') {
          console.warn("Müşteri silinemedi - İlişkili kayıtlar var:", error);
          toast({ title: "Hata", description: "Bu müşteriye ait satış, servis veya işlem kaydı bulunduğu için silinemez.", variant: "destructive", duration: 7000 });
        } else throw error;
      } else {
        await queryClient.invalidateQueries({ queryKey: ['customers'] });
        toast({ title: "Başarılı", description: `"${selectedCustomer.name}" silindi.` });
        setSelectedCustomer(null);
        setFormData(initialFormData);
      }
    } catch (error: any) {
      console.error("Müşteri Silme Hatası:", error);
      toast({ title: "Hata", description: `Müşteri silinemedi: ${error.message}`, variant: "destructive" });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleAddDebt = () => {
    if (!selectedCustomer) { toast({ title: "Uyarı", description: "Lütfen önce borç eklenecek müşteriyi seçin.", variant: "destructive" }); return; }
    if (isEditing) { toast({ title: "Uyarı", description: "Müşteri düzenleme modundayken borç eklenemez.", variant: "destructive" }); return; }
    setIsAddDebtDialogOpen(true);
  };

  const handlePayment = () => {
    if (!selectedCustomer) { toast({ title: "Uyarı", description: "Lütfen önce tahsilat yapılacak müşteriyi seçin.", variant: "destructive" }); return; }
    if (isEditing) { toast({ title: "Uyarı", description: "Müşteri düzenleme modundayken tahsilat yapılamaz.", variant: "destructive" }); return; }
    if (selectedCustomer.debt <= 0) { toast({ title: "Bilgi", description: "Müşterinin tahsilat yapılacak borcu bulunmamaktadır.", variant: "default" }); return; }
    setIsPaymentDialogOpen(true);
  };

  const handleDebtDetailsClick = (customer: Customer | null) => {
    if (!customer) { toast({ title: "Uyarı", description: "Lütfen önce bir müşteri seçin.", variant: "destructive" }); return; }
    if (isEditing) { toast({ title: "Uyarı", description: "Müşteri düzenleme modundayken borç detayı görüntülenemez.", variant: "destructive" }); return; }
    setDebtDetailsOpen(true);
  };

  const handleTransactionUpdate = useCallback((updatedCustomerId: string, newDebt: number) => {
    queryClient.setQueryData(['customers'], (oldData: Customer[] | undefined) => {
      if (!oldData) return [];
      return oldData.map(c => c.id === updatedCustomerId ? { ...c, debt: newDebt } : c);
    });
    if (selectedCustomer?.id === updatedCustomerId) {
      setSelectedCustomer(prevSelected =>
        prevSelected ? { ...prevSelected, debt: newDebt } : null
      );
    }
  }, [selectedCustomer?.id]);

  return (
    <div className="h-full flex flex-col p-2 sm:p-4 overflow-hidden animate-in fade-in duration-300">
      <div className="glass-panel rounded-xl h-full flex flex-col overflow-hidden border border-white/10 shadow-2xl">
        {/* Başlık ve Kapatma Butonu */}
        <div className="bg-white/5 border-b border-white/10 p-3 flex justify-between items-center shrink-0 backdrop-blur-md">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-purple-500/20 rounded-lg">
              <Users className="h-5 w-5 text-purple-400" />
            </div>
            <h1 className="text-lg font-bold text-white tracking-tight">Müşteri Bilgi Sistemi</h1>
          </div>
          <Button variant="ghost" size="icon" className="hover:bg-red-500/20 hover:text-red-400 h-8 w-8 rounded-lg transition-colors" onClick={onClose} disabled={isSaving || isProcessing}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Ana İçerik Alanı */}
        <ScrollArea className="flex-1 overflow-auto">
          <div className="p-3 sm:p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Sol Taraf: Form */}
              <div className="glass-card p-4">
                <CustomerForm
                  formData={formData}
                  handleInputChange={handleInputChange}
                  isEditing={isEditing}
                  isSaving={isSaving}
                />
              </div>

              {/* Sağ Taraf: Operasyonlar */}
              <div className="glass-card p-4">
                <CustomerOperations
                  formData={formData}
                  handleInputChange={handleInputChange}
                  selectedCustomer={selectedCustomer}
                  isEditing={isEditing}
                  isSaving={isSaving}
                  isLoading={isProcessing}
                  handleDebtDetailsClick={handleDebtDetailsClick}
                  handleAddDebt={handleAddDebt}
                  handlePayment={handlePayment}
                  handleAddCustomer={handleAddCustomer}
                  handleEditClick={handleEditClick}
                  handleCancelEdit={handleCancelEdit}
                  handleDeleteCustomer={handleDeleteCustomer}
                />
              </div>
            </div>

            {/* Alt Taraf: Müşteri Listesi */}
            <div className="mt-4 glass-card p-4 min-h-[400px]">
              <CustomerList
                customers={customers}
                searchTerm={searchTerm}
                setSearchTerm={setSearchTerm}
                selectedCustomer={selectedCustomer}
                handleCustomerSelect={handleCustomerSelect}
                isEditing={isEditing}
                isLoading={isLoading}
                onRowClick={openDetailPanel}
              />
            </div>
          </div>
        </ScrollArea>
      </div>

      {/* Dialoglar */}
      {selectedCustomer && (
        <>
          <DebtDetailsDialog
            open={debtDetailsOpen}
            onOpenChange={setDebtDetailsOpen}
            customerName={selectedCustomer.name}
            customerId={selectedCustomer.id}
            onTransactionUpdate={handleTransactionUpdate}
          />

          <AddDebtDialog
            isOpen={isAddDebtDialogOpen}
            onOpenChange={setIsAddDebtDialogOpen}
            customer={selectedCustomer}
            accounts={accounts}
            onDebtAdded={(customerId, newDebt, updatedAccount) => {
              handleTransactionUpdate(customerId, newDebt);
              if (updatedAccount) {
                queryClient.invalidateQueries({ queryKey: ['accounts'] });
              }
            }}
          />

          <PaymentDialog
            isOpen={isPaymentDialogOpen}
            onOpenChange={setIsPaymentDialogOpen}
            customer={selectedCustomer}
            accounts={accounts}
            onPaymentCompleted={(customerId, newDebt, updatedAccount) => {
              handleTransactionUpdate(customerId, newDebt);
              if (updatedAccount) {
                queryClient.invalidateQueries({ queryKey: ['accounts'] });
              }
            }}
          />
        </>
      )}

      <CustomerDetailPanel
        customerId={viewingCustomerId}
        open={isDetailPanelOpen}
        onOpenChange={setIsDetailPanelOpen}
      />
    </div>
  );
};

export default CustomerModule;
// --- END OF FILE src/CustomerModule.tsx ---