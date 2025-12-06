// --- START OF FILE src/components/NeedsModule.tsx ---

import React, { useState, useEffect, useCallback } from 'react';
import { X, Plus, Edit, Trash2, Save, Loader2, Users, ClipboardList, ShoppingCart, User } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import CustomerModule from '@/components/CustomerModule';
import type { Customer } from "@/types/customer";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

interface Need {
  id: string;
  created_at: string;
  date: string;
  description: string;
  quantity: number;
  product_id: string | null;
  supplier: string | null;
  customer_id: string | null;
  customer_name?: string | null;
}

interface NeedsModuleProps {
  onClose: () => void;
}

const NeedsModule: React.FC<NeedsModuleProps> = ({ onClose }) => {
  const [needs, setNeeds] = useState<Need[]>([]);
  const [newDescription, setNewDescription] = useState('');
  const [newQuantity, setNewQuantity] = useState('');
  const [newSupplier, setNewSupplier] = useState('');
  const [editingNeed, setEditingNeed] = useState<Need | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [allCustomers, setAllCustomers] = useState<Pick<Customer, 'id' | 'name'>[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [isLoadingCustomers, setIsLoadingCustomers] = useState(false);
  const [isCustomerModuleOpen, setIsCustomerModuleOpen] = useState(false);
  const { toast } = useToast();

  const fetchCustomers = useCallback(async () => {
    setIsLoadingCustomers(true);
    try {
      const { data, error } = await supabase.from('customers').select('id, name').order('name', { ascending: true });
      if (error) throw error;
      setAllCustomers(data || []);
    } catch (error: any) {
      console.error("[NeedsModule] Müşteriler yüklenirken hata:", error);
      toast({ title: "Hata", description: "Müşteri listesi yüklenemedi.", variant: "destructive" });
      setAllCustomers([]);
    } finally {
      setIsLoadingCustomers(false);
    }
  }, [toast]);

  const fetchNeeds = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.from('needs').select(`*, customer:customers ( id, name )`).order('date', { ascending: false });
      if (error) {
        toast({ title: "Veri Yükleme Hatası", description: error.message, variant: "destructive" });
        setNeeds([]);
        return;
      }
      const fetchedNeeds: Need[] = data.map(n => ({
        id: n.id, created_at: n.created_at, date: n.date,
        description: n.description ?? '', quantity: n.quantity ?? 0,
        product_id: n.product_id ?? null, supplier: n.supplier ?? null,
        customer_id: n.customer?.id ?? null, customer_name: n.customer?.name ?? null,
      }));
      setNeeds(fetchedNeeds);
    } catch (error: any) {
      toast({ title: "Hata", description: `İhtiyaçlar yüklenemedi: ${error.message}`, variant: "destructive" });
      setNeeds([]);
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchNeeds();
    fetchCustomers();
    const handleNeedsUpdate = () => { fetchNeeds(); };
    window.addEventListener('needs-updated', handleNeedsUpdate);
    return () => window.removeEventListener('needs-updated', handleNeedsUpdate);
  }, [fetchNeeds, fetchCustomers]);

  const clearForm = () => {
    setNewDescription('');
    setNewQuantity('');
    setNewSupplier('');
    setSelectedCustomerId(null);
    setEditingNeed(null);
  };

  const handleAddNeed = async () => {
    if (!newDescription || !newQuantity) { toast({ title: "Uyarı", description: "Açıklama ve Miktar zorunludur." }); return; }
    const quantity = parseFloat(newQuantity);
    if (isNaN(quantity) || quantity <= 0) { toast({ title: "Uyarı", description: "Geçerli pozitif miktar giriniz." }); return; }

    setIsSaving(true);
    try {
      const newNeedData = {
        date: new Date().toISOString(),
        description: newDescription,
        quantity,
        supplier: newSupplier || null,
        product_id: null,
        customer_id: selectedCustomerId || null
      };
      const { data, error } = await supabase.from('needs').insert(newNeedData).select().single();
      if (error) throw error;
      if (data) {
        await fetchNeeds();
        toast({ title: "Başarılı", description: "İhtiyaç eklendi." });
        clearForm();
      }
    } catch (error: any) { toast({ title: "Hata", description: `İhtiyaç eklenemedi: ${error.message}`, variant: "destructive" }); }
    finally { setIsSaving(false); }
  };

  const handleStartEdit = (need: Need) => {
    if (isSaving || isLoading) return;
    setEditingNeed({ ...need });
    setNewDescription(need.description);
    setNewQuantity(need.quantity.toString());
    setNewSupplier(need.supplier ?? '');
    setSelectedCustomerId(need.customer_id);
  };

  const handleCancelEdit = () => { clearForm(); };

  const handleUpdateNeed = async () => {
    if (!editingNeed) return;
    const updatedDescription = newDescription; const updatedQuantityStr = newQuantity; const updatedSupplier = newSupplier;
    if (!updatedDescription || !updatedQuantityStr) { toast({ title: "Uyarı", description: "Açıklama ve Miktar zorunludur." }); return; }
    const quantity = parseFloat(updatedQuantityStr); if (isNaN(quantity) || quantity <= 0) { toast({ title: "Uyarı", description: "Geçerli miktar giriniz." }); return; }

    setIsSaving(true);
    try {
      const updateData = {
        description: updatedDescription,
        quantity: quantity,
        supplier: updatedSupplier || null,
        customer_id: selectedCustomerId || null,
      };
      const { data, error } = await supabase.from('needs').update(updateData).eq('id', editingNeed.id).select().single();
      if (error) throw error;
      if (data) {
        await fetchNeeds();
        toast({ title: "Başarılı", description: "İhtiyaç güncellendi." });
        clearForm();
      }
    } catch (error: any) { toast({ title: "Hata", description: `İhtiyaç güncellenemedi: ${error.message}`, variant: "destructive" }); }
    finally { setIsSaving(false); }
  };

  const handleDeleteNeed = async (id: string) => {
    if (isSaving || isLoading || editingNeed) return;
    if (!window.confirm('Bu ihtiyacı silmek istediğinize emin misiniz?')) return;
    setIsLoading(true);
    try {
      const { error } = await supabase.from('needs').delete().eq('id', id);
      if (error) throw error;
      await fetchNeeds();
      toast({ title: "Başarılı", description: "İhtiyaç silindi." });
    } catch (error: any) { toast({ title: "Hata", description: `İhtiyaç silinemedi: ${error.message}`, variant: "destructive" }); }
    finally { setIsLoading(false); }
  };

  const formatNeedDate = (dateString: string) => {
    try { return new Date(dateString).toLocaleDateString('tr-TR'); }
    catch { return 'Geçersiz Tarih'; }
  }

  const openCustomerManagement = () => { setIsCustomerModuleOpen(true); };
  const handleCustomerSelected = async (customer: Customer) => {
    setIsCustomerModuleOpen(false);
    await fetchCustomers();
    setSelectedCustomerId(customer.id);
    toast({ title: "Bilgi", description: `"${customer.name}" müşterisi seçildi.` });
  };
  const handleCustomerModuleClose = () => { setIsCustomerModuleOpen(false); };

  return (
    <div className="h-full p-2 sm:p-4 animate-in fade-in duration-300 relative">
      <div className="glass-panel rounded-xl h-full flex flex-col border border-white/10 shadow-2xl overflow-hidden">
        <div className="bg-white/5 border-b border-white/10 p-3 flex justify-between items-center flex-shrink-0 backdrop-blur-md">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-orange-500/20 rounded-lg">
              <ClipboardList className="h-5 w-5 text-orange-400" />
            </div>
            <h1 className="text-lg font-bold text-white tracking-tight">İhtiyaçlar Listesi</h1>
          </div>
          <Button variant="ghost" size="icon" className="hover:bg-red-500/20 hover:text-red-400 h-8 w-8 rounded-lg transition-colors" onClick={onClose} disabled={isLoading || isSaving || isCustomerModuleOpen}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        <ScrollArea className="flex-1">
          <div className="p-3 sm:p-6 space-y-6">

            {/* İhtiyaç Ekleme/Düzenleme Formu */}
            <div className="glass-card p-5 border border-white/10 space-y-4">
              <div className="flex items-center gap-2 border-b border-white/10 pb-2 mb-2">
                <ShoppingCart className="h-5 w-5 text-blue-400" />
                <h2 className="text-lg font-semibold text-white">{editingNeed ? 'İhtiyacı Düzenle' : 'Yeni İhtiyaç Ekle'}</h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Müşteri Seçimi */}
                <div className="space-y-1.5">
                  <Label htmlFor="customer-select" className="text-xs font-medium text-gray-400">Müşteri (Opsiyonel)</Label>
                  <div className="flex items-center gap-2">
                    <Select
                      value={selectedCustomerId ?? ''}
                      onValueChange={(value) => setSelectedCustomerId(value === '' ? null : value)}
                      disabled={isSaving || isLoadingCustomers || isCustomerModuleOpen}
                    >
                      <SelectTrigger id="customer-select" className="bg-white/5 border-white/10 text-white h-9 text-xs sm:text-sm focus:ring-blue-500/50">
                        <SelectValue placeholder={isLoadingCustomers ? "Müşteriler yükleniyor..." : "Müşteri seçin (opsiyonel)..."} />
                      </SelectTrigger>
                      <SelectContent className="bg-gray-900 border-gray-800 text-white">
                        {allCustomers
                          .filter(customer => customer && customer.id)
                          .map(customer => (
                            <SelectItem key={customer.id} value={customer.id} className="focus:bg-gray-800 focus:text-white">
                              {customer.name}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                    <Button
                      variant="outline" size="sm"
                      className="h-9 bg-white/5 border-white/10 text-white hover:bg-white/10"
                      onClick={openCustomerManagement}
                      disabled={isSaving || isCustomerModuleOpen}
                      title="Yeni Müşteri Ekle veya Mevcutları Yönet"
                    >
                      <Users className="mr-1 h-4 w-4" /> Yönet
                    </Button>
                  </div>
                </div>

                {/* Açıklama */}
                <div className="space-y-1.5">
                  <Label htmlFor='need-desc' className="text-xs font-medium text-gray-400">Açıklama *</Label>
                  <Input id='need-desc' type="text" value={newDescription} onChange={(e) => setNewDescription(e.target.value)} placeholder="İhtiyacın açıklamasını giriniz" className="bg-white/5 border-white/10 text-white focus:border-blue-500/50" disabled={isSaving} />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor='need-qty' className="text-xs font-medium text-gray-400">Miktar *</Label>
                  <Input id='need-qty' type="number" value={newQuantity} onChange={(e) => setNewQuantity(e.target.value)} placeholder="0" min="0.01" step="any" className="bg-white/5 border-white/10 text-white focus:border-blue-500/50" disabled={isSaving} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor='need-supp' className="text-xs font-medium text-gray-400">Tedarikçi</Label>
                  <Input id='need-supp' type="text" value={newSupplier} onChange={(e) => setNewSupplier(e.target.value)} placeholder="Tedarikçi firma adı (opsiyonel)" className="bg-white/5 border-white/10 text-white focus:border-blue-500/50" disabled={isSaving} />
                </div>
              </div>

              {/* Butonlar */}
              {editingNeed ? (
                <div className="flex gap-2 pt-2">
                  <Button className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white" onClick={handleUpdateNeed} disabled={isSaving}>{isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />} Güncelle</Button>
                  <Button variant="outline" className="flex-1 bg-white/5 border-white/10 text-white hover:bg-white/10" onClick={handleCancelEdit} disabled={isSaving}><X className="mr-2 h-4 w-4" /> İptal</Button>
                </div>
              ) : (
                <Button className="w-full mt-2 bg-blue-600 hover:bg-blue-700 text-white shadow-[0_0_15px_rgba(37,99,235,0.4)]" onClick={handleAddNeed} disabled={isSaving || isLoadingCustomers}>{isSaving || isLoadingCustomers ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />} İhtiyaç Ekle</Button>
              )}
            </div>

            {/* İhtiyaç Listesi */}
            <div className="glass-card border border-white/10 overflow-hidden rounded-lg">
              <div className="bg-white/5 border-b border-white/10 p-3">
                <h3 className="font-bold text-sm text-gray-300 flex items-center gap-2"><ClipboardList className="h-4 w-4" /> Kayıtlı İhtiyaçlar</h3>
              </div>
              <div className="max-h-[400px] overflow-y-auto">
                {isLoading ? (<div className="flex justify-center items-center h-32 text-gray-400"><Loader2 className="h-8 w-8 animate-spin text-blue-500 mr-2" /> Yükleniyor...</div>) : (
                  <table className="w-full text-sm text-left">
                    <thead className="bg-white/5 text-gray-400 sticky top-0 backdrop-blur-md z-10">
                      <tr>
                        <th className="px-4 py-3 font-medium">Tarih</th>
                        <th className="px-4 py-3 font-medium">Açıklama</th>
                        <th className="px-4 py-3 font-medium">Müşteri</th>
                        <th className="px-4 py-3 font-medium">Tedarikçi</th>
                        <th className="px-4 py-3 font-medium text-right">Miktar</th>
                        <th className="px-4 py-3 font-medium text-center">İşlemler</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {needs.length === 0 ? (<tr><td colSpan={6} className="px-4 py-8 text-center text-gray-500">Henüz kayıtlı ihtiyaç bulunmamaktadır.</td></tr>) : (
                        needs.map((need) => (
                          <tr key={need.id} className={cn("hover:bg-white/5 transition-colors text-gray-300", editingNeed?.id === need.id && "bg-blue-500/10 border-l-2 border-blue-500")}>
                            <td className="px-4 py-3 text-gray-400 whitespace-nowrap">{formatNeedDate(need.date)}</td>
                            <td className="px-4 py-3 font-medium text-white">{need.description}</td>
                            <td className="px-4 py-3 flex items-center gap-1.5">
                              {need.customer_name ? <><User className="h-3 w-3 text-blue-400" /> {need.customer_name}</> : <span className="text-gray-600">-</span>}
                            </td>
                            <td className="px-4 py-3 text-gray-400">{need.supplier || '-'}</td>
                            <td className="px-4 py-3 text-right font-mono text-emerald-400">{need.quantity}</td>
                            <td className="px-4 py-3 text-center space-x-1">
                              {editingNeed?.id === need.id ? (<span className="text-xs text-blue-400 animate-pulse">Düzenleniyor...</span>) : (<>
                                <Button variant="ghost" size="icon" onClick={() => handleStartEdit(need)} className="h-8 w-8 hover:bg-blue-500/20 hover:text-blue-400 rounded-md" disabled={!!editingNeed || isSaving || isLoading} title="Düzenle"><Edit className="h-4 w-4" /></Button>
                                <Button variant="ghost" size="icon" onClick={() => handleDeleteNeed(need.id)} className="h-8 w-8 hover:bg-red-500/20 hover:text-red-400 rounded-md" disabled={!!editingNeed || isSaving || isLoading} title="Sil"><Trash2 className="h-4 w-4" /></Button>
                              </>
                              )}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </div>
        </ScrollArea>
      </div>

      {isCustomerModuleOpen && (
        <div className="absolute inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-5xl h-[85vh] bg-gray-900 rounded-xl shadow-2xl border border-white/10 overflow-hidden relative">
            <CustomerModule
              onClose={handleCustomerModuleClose}
              onCustomerSelected={handleCustomerSelected}
            />
          </div>
        </div>
      )}

    </div>
  );
};

export default NeedsModule;
// --- END OF FILE src/components/NeedsModule.tsx ---