// --- START OF FILE src/components/service/EditServiceDialog.tsx ---

import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
  DialogClose
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import type { Customer } from "@/types/customer";
import type { Product } from "@/types/backup";
import type { Service, ServicePart } from "@/types/service";
import type { Account } from "@/types/backup";
import { supabase } from "@/integrations/supabase/client";
import {
  Loader2,
  PlusCircle,
  Trash2,
  PackageSearch,
  PackagePlus,
  DollarSign,
  Save,
  X as CancelIcon,
  UserPlus,
  CheckCircle,
  Wrench,
  User,
  Smartphone,
  Tablet,
  Laptop,
  Monitor,
  AlertCircle,
  FileText,
  Search
} from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Label } from "@/components/ui/label";
import { completeServiceProcess } from "@/utils/serviceUtils";
import { cn } from "@/lib/utils";

interface EditServiceDialogProps {
  isOpen: boolean;
  setIsOpen: (open: boolean, saved?: boolean) => void;
  editingService?: Service | null;
  onServiceSaved: (service: Service, isNew: boolean) => void;
  customers: Customer[];
  products: Product[];
  accounts: Account[];
  openAddCustomerDialog: () => void;
}

const generatePartUiId = (prefix: string): string => `${prefix}-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

const getInitialLocalState = (): Omit<Partial<Service>, 'id' | 'created_at' | 'date' | 'customer_id' | 'parts' | 'cost' | 'customerName' | 'device_type' | 'serial_number'> => ({
  deviceType: "",
  brand: "",
  model: "",
  serialNumber: "",
  problem: "",
  diagnosis: "",
  solution: "",
  status: "pending",
});

const EditServiceDialog: React.FC<EditServiceDialogProps> = ({
  isOpen,
  setIsOpen,
  editingService,
  onServiceSaved,
  customers = [],
  products = [],
  accounts = [],
  openAddCustomerDialog,
}) => {
  const { toast } = useToast();
  const [formData, setFormData] = useState<ReturnType<typeof getInitialLocalState>>(getInitialLocalState());
  const [customerId, setCustomerId] = useState<string>("");
  const [selectedParts, setSelectedParts] = useState<ServicePart[]>([]);
  const [cost, setCost] = useState<number>(0);

  const [isSaving, setIsSaving] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);
  const [selectedStockProductId, setSelectedStockProductId] = useState<string>("");
  const [stockProductQuantity, setStockProductQuantity] = useState<number>(1);
  const [nonStockPartName, setNonStockPartName] = useState("");
  const [nonStockPartQuantity, setNonStockPartQuantity] = useState<number>(1);
  const [nonStockPartPrice, setNonStockPartPrice] = useState<number>(0);
  const [searchTerm, setSearchTerm] = useState("");

  const isNewRecord = useMemo(() => !editingService, [editingService]);
  const initialLoadDone = useRef(false);

  useEffect(() => {
    if (isOpen) {
      initialLoadDone.current = false;
      console.log(`[EditServiceDialog Effect 1] Dialog açılıyor.`);
      const serviceData = editingService ? {
        deviceType: editingService.deviceType || "",
        brand: editingService.brand || "",
        model: editingService.model || "",
        serialNumber: editingService.serialNumber || "",
        problem: editingService.problem || "",
        diagnosis: editingService.diagnosis || "",
        solution: editingService.solution || "",
        status: editingService.status || "pending",
      } : getInitialLocalState();

      const initialCustomerId = editingService?.customer_id ? String(editingService.customer_id) : "";
      const initialParts = editingService?.parts?.map((p, index) => ({
        ...p,
        id: p.id || generatePartUiId(p.isStockItem ? 'stock' : 'nonstock'),
        productId: p.productId || null
      })) || [];
      const initialCost = editingService?.cost ?? 0;

      setFormData(serviceData); setCustomerId(initialCustomerId); setSelectedParts(initialParts); setCost(initialCost);
      setSelectedStockProductId(""); setStockProductQuantity(1); setNonStockPartName(""); setNonStockPartQuantity(1); setNonStockPartPrice(0);
      setIsSaving(false); setIsCompleting(false); setSearchTerm("");
      setTimeout(() => { initialLoadDone.current = true; }, 0);
    } else { initialLoadDone.current = false; }
  }, [isOpen, editingService, products]);

  useEffect(() => {
    if (initialLoadDone.current) {
      const newCost = selectedParts.reduce((total, part) => total + (part.quantity || 0) * (part.unitPrice || 0), 0);
      setCost(newCost);
    }
  }, [selectedParts]);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => { const { name, value } = e.target; setFormData(prev => ({ ...prev, [name]: value })); }, []);
  const handleSelectChange = useCallback((name: keyof typeof formData, value: string) => { setFormData(prev => ({ ...prev, [name]: value })); }, []);
  const handleStatusChange = useCallback((value: Service["status"]) => { setFormData(prev => ({ ...prev, status: value })); }, []);
  const handleCustomerIdChange = useCallback((value: string) => { setCustomerId(value); }, []);

  const handleAddStockPart = useCallback(() => {
    const safeProducts = Array.isArray(products) ? products : [];
    if (!selectedStockProductId) return;
    const product = safeProducts.find((p) => p?.id === selectedStockProductId);
    if (!product) { toast({ title: "Hata", description: "Seçilen ürün bulunamadı.", variant: "destructive" }); return; }
    setSelectedParts((prev) => { const existing = prev.find(p => p.productId === product.id); if (existing) { return prev.map(p => p.productId === product.id ? { ...p, quantity: (p.quantity || 0) + stockProductQuantity } : p); } else { const newPart: ServicePart = { id: generatePartUiId('stock'), productId: product.id, name: product.name, quantity: stockProductQuantity, unitPrice: product.selling_price || 0, isStockItem: true }; return [...prev, newPart]; } });
    setSelectedStockProductId(""); setStockProductQuantity(1);
  }, [products, selectedStockProductId, stockProductQuantity, toast]);

  const handleAddNonStockPart = useCallback(() => {
    if (!nonStockPartName.trim() || nonStockPartQuantity < 1) return;
    setSelectedParts((prev) => { const existing = prev.find(p => !p.isStockItem && p.name.toLowerCase() === nonStockPartName.trim().toLowerCase()); if (existing) { return prev.map(p => p.id === existing.id ? { ...p, quantity: (p.quantity || 0) + nonStockPartQuantity, unitPrice: nonStockPartPrice } : p); } else { const newPart: ServicePart = { id: generatePartUiId('nonstock'), name: nonStockPartName.trim(), quantity: nonStockPartQuantity, unitPrice: nonStockPartPrice, isStockItem: false, productId: null }; return [...prev, newPart]; } });
    setNonStockPartName(""); setNonStockPartQuantity(1); setNonStockPartPrice(0);
  }, [nonStockPartName, nonStockPartQuantity, nonStockPartPrice]);

  const handleRemovePart = useCallback((partIdToRemove: string) => { setSelectedParts((prev) => prev.filter((part) => part.id !== partIdToRemove)); }, []);

  const handleSave = async () => {
    if (!customerId) { toast({ title: "Uyarı", description: "Müşteri seçin.", variant: "destructive" }); return; }
    if (!formData.deviceType || !formData.problem?.trim()) { toast({ title: "Uyarı", description: "Cihaz Türü ve Şikayet zorunludur.", variant: "destructive" }); return; }
    setIsSaving(true);
    try {
      const serviceDataForSupabase = {
        customer_id: customerId,
        device_type: formData.deviceType,
        brand: formData.brand || null,
        model: formData.model || null,
        serial_number: formData.serialNumber || null,
        problem: formData.problem,
        diagnosis: formData.diagnosis || null,
        solution: formData.solution || null,
        status: formData.status || "pending",
        cost: cost,
        parts: selectedParts.map(({ id, ...rest }) => ({
          ...rest,
          productId: rest.productId || null
        })),
      };

      let savedServiceData: any; let error: any;
      if (isNewRecord) { ({ data: savedServiceData, error } = await supabase.from("services").insert(serviceDataForSupabase).select().single()); }
      else { if (!editingService?.id) throw new Error("ID olmadan servis güncellenemez."); ({ data: savedServiceData, error } = await supabase.from("services").update(serviceDataForSupabase).eq("id", editingService.id).select().single()); }
      if (error) throw error; if (!savedServiceData) throw new Error("Kaydedilen servis verisi alınamadı.");

      const serviceToReturn: Service = {
        id: savedServiceData.id, created_at: savedServiceData.created_at, date: savedServiceData.date,
        customer_id: String(savedServiceData.customer_id),
        deviceType: savedServiceData.device_type,
        brand: savedServiceData.brand, model: savedServiceData.model,
        serialNumber: savedServiceData.serial_number,
        problem: savedServiceData.problem, diagnosis: savedServiceData.diagnosis, solution: savedServiceData.solution,
        status: savedServiceData.status, cost: savedServiceData.cost,
        parts: savedServiceData.parts?.map((p: any, index: number) => ({ ...p, id: generatePartUiId(p.isStockItem ? 'stock' : 'nonstock'), productId: p.productId || null })) || [],
        device_type: savedServiceData.device_type,
        serial_number: savedServiceData.serial_number,
      };
      onServiceSaved(serviceToReturn, isNewRecord);
      toast({ title: "Başarılı", description: `Servis ${isNewRecord ? 'oluşturuldu' : 'güncellendi'}.` });
    } catch (error: any) { console.error("Servis kaydetme hatası:", error); toast({ title: "Hata", description: `Servis kaydedilemedi: ${error.message}`, variant: "destructive" }); }
    finally { setIsSaving(false); }
  };

  const handleCompleteService = async () => {
    if (!editingService || editingService.status !== 'completed') { toast({ title: "Uyarı", description: "Sadece durumu 'Tamamlandı' olan servisler için işlem yapılabilir.", variant: "default" }); return; }
    if (cost <= 0 && !window.confirm("Servis ücreti 0 veya daha az. Yine de tamamlayıp ilgili kayıtları (Satış, Hesap Hareketi) oluşturmak istiyor musunuz?")) return;
    if (cost > 0 && !window.confirm("Bu servisi tamamlanmış olarak işaretleyip ilgili satış ve hesap hareketlerini oluşturmak istediğinize emin misiniz?")) return;
    setIsCompleting(true);
    try {
      const currentServiceState: Service = {
        ...(editingService || {} as Service),
        customer_id: customerId,
        deviceType: formData.deviceType,
        brand: formData.brand || null,
        model: formData.model || null,
        serialNumber: formData.serialNumber || null,
        problem: formData.problem || '',
        diagnosis: formData.diagnosis || null,
        solution: formData.solution || null,
        status: formData.status || 'completed',
        cost: cost,
        parts: selectedParts,
        device_type: formData.deviceType,
        serial_number: formData.serialNumber || null,
      };

      await completeServiceProcess(currentServiceState, selectedParts, toast);
      toast({ title: "Başarılı", description: "Servis tamamlama işlemi başarılı." });
      setIsOpen(false, true);
    } catch (error: any) { console.error("Servis tamamlama hatası:", error); toast({ title: "Hata", description: `Servis tamamlama işlemi başarısız: ${error.message}`, variant: "destructive" }); }
    finally { setIsCompleting(false); }
  };

  const formatCurrency = (value: number | string | null | undefined): string => (parseFloat(String(value ?? 0)) || 0).toFixed(2) + '₺';

  const filteredProducts = useMemo(() => {
    const safeProducts: Product[] = Array.isArray(products) ? products : [];
    if (typeof safeProducts?.filter !== 'function') { return []; }
    try { return safeProducts.filter(p => p && (p.name?.toLowerCase().includes(searchTerm.toLowerCase()) || p.code?.toLowerCase().includes(searchTerm.toLowerCase()))); }
    catch (e) { return []; }
  }, [products, searchTerm]);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => setIsOpen(open, false)}>
      <DialogContent className="bg-gray-900 border border-white/10 text-white max-w-4xl lg:max-w-5xl xl:max-w-6xl max-h-[90vh] flex flex-col p-0 shadow-2xl backdrop-blur-xl">
        <DialogHeader className="bg-white/5 border-b border-white/10 p-4 flex flex-row justify-between items-center space-y-0">
          <DialogTitle className="text-lg font-bold flex items-center gap-2">
            <Wrench className="h-5 w-5 text-blue-400" />
            {isNewRecord ? "Yeni Servis Kaydı" : "Servis Düzenle"}
          </DialogTitle>
          <DialogDescription className="sr-only">
            {isNewRecord ? "Yeni teknik servis kaydı oluşturun." : "Mevcut servis kaydını düzenleyin."}
          </DialogDescription>
          <DialogClose asChild>
            <Button variant="ghost" size="icon" className="text-gray-400 hover:text-white hover:bg-white/10 h-8 w-8 rounded-full" disabled={isSaving || isCompleting}>
              <CancelIcon className="h-4 w-4" />
            </Button>
          </DialogClose>
        </DialogHeader>

        <ScrollArea className="flex-1 overflow-y-auto p-6 bg-black/20">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Sol Taraf */}
            <div className="space-y-6">
              {/* Müşteri */}
              <div className="bg-white/5 p-4 rounded-xl border border-white/5 space-y-3">
                <Label htmlFor="customer_id" className="text-xs font-bold text-gray-400 flex items-center gap-2">
                  <User className="h-3 w-3" /> Müşteri *
                </Label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                    <Select value={customerId} onValueChange={handleCustomerIdChange} disabled={isSaving || isCompleting}>
                      <SelectTrigger id="customer_id" className="pl-10 bg-black/40 border-white/10 text-white h-10 text-sm">
                        <SelectValue placeholder="Müşteri Seçin..." />
                      </SelectTrigger>
                      <SelectContent className="bg-gray-800 border-gray-700 text-white">
                        {!Array.isArray(customers) || customers.length === 0 ? (
                          <SelectItem value="placeholder-disabled" disabled>Müşteri yok.</SelectItem>
                        ) : (
                          customers.map((c) => (<SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>))
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button type="button" variant="outline" size="icon" onClick={openAddCustomerDialog} disabled={isSaving || isCompleting} className="h-10 w-10 bg-blue-600/20 border-blue-500/30 text-blue-400 hover:bg-blue-600/40 hover:text-blue-300">
                    <UserPlus className="h-5 w-5" />
                  </Button>
                </div>
              </div>

              {/* Cihaz Bilgileri */}
              <div className="bg-white/5 p-4 rounded-xl border border-white/5 space-y-4">
                <Label className="text-sm font-bold text-blue-400 border-b border-blue-500/20 pb-2 flex items-center gap-2">
                  <Smartphone className="h-4 w-4" /> Cihaz Bilgileri
                </Label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="deviceType" className="text-xs font-medium text-gray-400">Tür *</Label>
                    <Select value={formData.deviceType || ""} onValueChange={(v) => handleSelectChange("deviceType", v)} disabled={isSaving || isCompleting}>
                      <SelectTrigger id="deviceType" className="bg-black/40 border-white/10 text-white h-9 text-sm">
                        <SelectValue placeholder="Seçin..." />
                      </SelectTrigger>
                      <SelectContent className="bg-gray-800 border-gray-700 text-white">
                        <SelectItem value="Telefon"><div className="flex items-center gap-2"><Smartphone className="h-3 w-3" /> Telefon</div></SelectItem>
                        <SelectItem value="Tablet"><div className="flex items-center gap-2"><Tablet className="h-3 w-3" /> Tablet</div></SelectItem>
                        <SelectItem value="Bilgisayar"><div className="flex items-center gap-2"><Laptop className="h-3 w-3" /> Bilgisayar</div></SelectItem>
                        <SelectItem value="Diğer"><div className="flex items-center gap-2"><Monitor className="h-3 w-3" /> Diğer</div></SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="brand" className="text-xs font-medium text-gray-400">Marka</Label>
                    <Input id="brand" name="brand" value={formData.brand || ""} onChange={handleInputChange} disabled={isSaving || isCompleting} className="bg-black/40 border-white/10 text-white h-9 text-sm" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="model" className="text-xs font-medium text-gray-400">Model</Label>
                    <Input id="model" name="model" value={formData.model || ""} onChange={handleInputChange} disabled={isSaving || isCompleting} className="bg-black/40 border-white/10 text-white h-9 text-sm" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="serialNumber" className="text-xs font-medium text-gray-400">Seri No</Label>
                    <Input id="serialNumber" name="serialNumber" value={formData.serialNumber || ""} onChange={handleInputChange} disabled={isSaving || isCompleting} className="bg-black/40 border-white/10 text-white h-9 text-sm" />
                  </div>
                </div>
              </div>

              {/* Şikayet, Teşhis, Çözüm */}
              <div className="bg-white/5 p-4 rounded-xl border border-white/5 space-y-4">
                <Label className="text-sm font-bold text-purple-400 border-b border-purple-500/20 pb-2 flex items-center gap-2">
                  <FileText className="h-4 w-4" /> Detaylar
                </Label>
                <div className="space-y-3">
                  <div className="space-y-2">
                    <Label htmlFor="problem" className="text-xs font-medium text-gray-400 flex items-center gap-1"><AlertCircle className="h-3 w-3 text-red-400" /> Şikayet *</Label>
                    <Textarea id="problem" name="problem" value={formData.problem || ""} onChange={handleInputChange} rows={3} className="bg-black/40 border-white/10 text-white text-sm min-h-[80px]" disabled={isSaving || isCompleting} required placeholder="Müşterinin şikayeti..." />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="diagnosis" className="text-xs font-medium text-gray-400">Teşhis</Label>
                    <Textarea id="diagnosis" name="diagnosis" value={formData.diagnosis || ""} onChange={handleInputChange} rows={3} className="bg-black/40 border-white/10 text-white text-sm min-h-[80px]" disabled={isSaving || isCompleting} placeholder="Teknik servis teşhisi..." />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="solution" className="text-xs font-medium text-gray-400">Yapılan İşlem / Notlar</Label>
                    <Textarea id="solution" name="solution" value={formData.solution || ""} onChange={handleInputChange} rows={3} className="bg-black/40 border-white/10 text-white text-sm min-h-[80px]" disabled={isSaving || isCompleting} placeholder="Yapılan işlemler ve notlar..." />
                  </div>
                </div>
              </div>
            </div>

            {/* Sağ Taraf */}
            <div className="space-y-6">
              {/* Durum ve Ücret */}
              <div className="bg-white/5 p-4 rounded-xl border border-white/5 grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="status" className="text-xs font-bold text-gray-400">Durum *</Label>
                  <Select value={formData.status || "pending"} onValueChange={handleStatusChange} disabled={isSaving || isCompleting}>
                    <SelectTrigger id="status" className="bg-black/40 border-white/10 text-white h-10 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-800 border-gray-700 text-white">
                      <SelectItem value="pending">Beklemede</SelectItem>
                      <SelectItem value="in_progress">İşlemde</SelectItem>
                      <SelectItem value="completed">Tamamlandı</SelectItem>
                      <SelectItem value="cancelled">İptal Edildi</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-bold text-gray-400">Hesaplanan Ücret</Label>
                  <div className="h-10 flex items-center justify-end px-4 rounded-md bg-black/40 border border-white/10 text-emerald-400 text-lg font-mono font-bold">
                    {cost.toFixed(2)} ₺
                  </div>
                </div>
              </div>

              {/* Parça Yönetimi */}
              <div className="bg-white/5 p-4 rounded-xl border border-white/5 space-y-4 flex-1 flex flex-col">
                <Label className="text-sm font-bold text-emerald-400 border-b border-emerald-500/20 pb-2 flex items-center gap-2">
                  <PackageSearch className="h-4 w-4" /> Parça / Hizmet Ekle
                </Label>

                <div className="space-y-3">
                  {/* Stoktan Ekle */}
                  <div className="p-3 rounded-lg bg-black/20 border border-white/5 space-y-2">
                    <Label className="text-xs font-medium text-gray-400 flex items-center gap-1"><Search className="h-3 w-3" /> Stoktan Seç</Label>
                    <div className="flex gap-2">
                      <Select value={selectedStockProductId} onValueChange={setSelectedStockProductId} disabled={isSaving || isCompleting}>
                        <SelectTrigger className="flex-1 bg-black/40 border-white/10 text-white h-8 text-xs">
                          <SelectValue placeholder="Ürün Ara..." />
                        </SelectTrigger>
                        <SelectContent className="bg-gray-800 border-gray-700 text-white max-h-[200px]">
                          {!Array.isArray(products) || products.length === 0 ? (
                            <SelectItem value="placeholder-disabled" disabled>Ürün yok.</SelectItem>
                          ) : (
                            products.map((p) => (
                              <SelectItem key={p.id} value={String(p.id)} className="text-xs">
                                {p.name} ({p.quantity} Adet) - {(p.selling_price || 0).toFixed(2)}₺
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                      <Input
                        type="number" min="1" step="1"
                        value={stockProductQuantity}
                        onChange={(e) => setStockProductQuantity(parseInt(e.target.value) || 1)}
                        className="w-16 h-8 bg-black/40 border-white/10 text-white text-xs text-center"
                        disabled={isSaving || isCompleting || !selectedStockProductId}
                      />
                      <Button size="sm" type="button" onClick={handleAddStockPart} disabled={isSaving || isCompleting || !selectedStockProductId || stockProductQuantity < 1} className="h-8 w-8 p-0 bg-emerald-600 hover:bg-emerald-700 text-white">
                        <PlusCircle className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Stok Dışı Ekle */}
                  <div className="p-3 rounded-lg bg-black/20 border border-white/5 space-y-2">
                    <Label className="text-xs font-medium text-gray-400 flex items-center gap-1"><PackagePlus className="h-3 w-3" /> Stok Dışı / Hizmet Gir</Label>
                    <div className="flex flex-col gap-2">
                      <Input
                        placeholder="Parça/Hizmet Adı *"
                        value={nonStockPartName}
                        onChange={(e) => setNonStockPartName(e.target.value)}
                        disabled={isSaving || isCompleting}
                        className="h-8 bg-black/40 border-white/10 text-white text-xs"
                      />
                      <div className="flex gap-2">
                        <div className="flex-1 relative">
                          <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px] text-gray-500">Adet</span>
                          <Input
                            type="number" min="1" step="1"
                            value={nonStockPartQuantity}
                            onChange={(e) => setNonStockPartQuantity(parseInt(e.target.value) || 1)}
                            className="h-8 pl-10 bg-black/40 border-white/10 text-white text-xs"
                            disabled={isSaving || isCompleting || !nonStockPartName.trim()}
                          />
                        </div>
                        <div className="flex-1 relative">
                          <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px] text-gray-500">Fiyat</span>
                          <Input
                            type="number" min="0" step="0.01"
                            value={nonStockPartPrice}
                            onChange={(e) => setNonStockPartPrice(parseFloat(e.target.value) || 0)}
                            className="h-8 pl-10 bg-black/40 border-white/10 text-white text-xs"
                            disabled={isSaving || isCompleting || !nonStockPartName.trim()}
                          />
                        </div>
                        <Button size="sm" type="button" onClick={handleAddNonStockPart} disabled={isSaving || isCompleting || !nonStockPartName.trim() || nonStockPartQuantity < 1} className="h-8 w-8 p-0 bg-blue-600 hover:bg-blue-700 text-white">
                          <PlusCircle className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Eklenenler Listesi */}
                <div className="flex-1 flex flex-col min-h-[150px]">
                  <Label className="text-xs font-bold text-gray-400 mb-2">Eklenen Parça/Hizmetler:</Label>
                  <div className="flex-1 rounded-lg border border-white/10 bg-black/40 overflow-hidden">
                    <ScrollArea className="h-[200px]">
                      {selectedParts.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-gray-500 gap-2 p-4">
                          <PackageSearch className="h-8 w-8 opacity-20" />
                          <p className="text-xs italic">Henüz parça veya hizmet eklenmedi.</p>
                        </div>
                      ) : (
                        <table className="w-full text-xs text-left">
                          <thead className="bg-white/5 text-gray-400 sticky top-0 z-10">
                            <tr>
                              <th className="p-2 font-medium">Parça/Hizmet</th>
                              <th className="p-2 font-medium text-center">Adet</th>
                              <th className="p-2 font-medium text-right">Birim F.</th>
                              <th className="p-2 font-medium text-right">Toplam</th>
                              <th className="p-2 font-medium text-center w-8"></th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-white/5">
                            {selectedParts.map((part, index) => {
                              const quantity = part.quantity || 0;
                              const unitPrice = part.unitPrice || 0;
                              const totalPrice = quantity * unitPrice;
                              return (
                                <tr key={part.id || `part-${index}`} className="hover:bg-white/5 transition-colors group">
                                  <td className="p-2 text-gray-300">
                                    {part.name}
                                    {!part.isStockItem && <span className="text-blue-400 text-[10px] ml-1">(Dış)</span>}
                                  </td>
                                  <td className="p-2 text-center text-gray-400">{quantity}</td>
                                  <td className="p-2 text-right text-gray-400 font-mono">{unitPrice.toFixed(2)}₺</td>
                                  <td className="p-2 text-right text-emerald-400 font-mono font-medium">{totalPrice.toFixed(2)}₺</td>
                                  <td className="p-2 text-center">
                                    <Button variant="ghost" size="icon" className="h-6 w-6 text-gray-500 hover:text-red-400 hover:bg-red-500/10 p-0 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => handleRemovePart(part.id)} disabled={isSaving || isCompleting}>
                                      <Trash2 className="h-3.5 w-3.5" />
                                    </Button>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      )}
                    </ScrollArea>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </ScrollArea>

        <DialogFooter className="bg-white/5 border-t border-white/10 p-4 flex flex-row justify-end gap-3">
          {!isNewRecord && formData.status === 'completed' && (
            <Button variant="default" className="bg-green-600 hover:bg-green-700 text-white shadow-[0_0_15px_rgba(22,163,74,0.4)]" onClick={handleCompleteService} disabled={isSaving || isCompleting}>
              {isCompleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle className="mr-2 h-4 w-4" />}
              Servisi Tamamla ve İşle
            </Button>
          )}
          <Button variant="default" className="bg-blue-600 hover:bg-blue-700 text-white shadow-[0_0_15px_rgba(37,99,235,0.4)] order-1" onClick={handleSave} disabled={isSaving || isCompleting || !customerId || !formData.deviceType || !formData.problem?.trim()}>
            {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            {isNewRecord ? "Oluştur" : "Kaydet"}
          </Button>
          <Button variant="outline" className="bg-transparent border-white/10 text-gray-300 hover:bg-white/10 hover:text-white order-2" onClick={() => setIsOpen(false, false)} disabled={isSaving || isCompleting}>
            <CancelIcon className="mr-2 h-4 w-4" /> İptal
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default EditServiceDialog;
// --- END OF FILE src/components/service/EditServiceDialog.tsx ---