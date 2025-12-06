// --- START OF FILE src/components/service/NewServiceForm.tsx ---

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Customer, Service } from "@/types/service";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, PlusCircle, User, Smartphone, AlertCircle, UserPlus, Phone, Search } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface NewServiceFormProps {
  customers: Customer[];
  onServiceCreated: (service: Service) => void;
  setCustomers: React.Dispatch<React.SetStateAction<Customer[]>>;
  setActiveTab: (tab: "new" | "list") => void;
}

interface ServiceFormData {
  customer_id: string;
  deviceType: string;
  brand: string;
  model: string;
  serialNumber: string;
  problem: string;
}

const initialFormData: ServiceFormData = {
  customer_id: "",
  deviceType: "",
  brand: "",
  model: "",
  serialNumber: "",
  problem: "",
};

const NewServiceForm: React.FC<NewServiceFormProps> = ({
  customers,
  onServiceCreated,
  setCustomers,
  setActiveTab,
}) => {
  const { toast } = useToast();
  const [formData, setFormData] = useState<ServiceFormData>(initialFormData);
  const [isSaving, setIsSaving] = useState(false);
  const [showNewCustomerForm, setShowNewCustomerForm] = useState(false);
  const [newCustomerName, setNewCustomerName] = useState("");
  const [newCustomerPhone, setNewCustomerPhone] = useState("");

  useEffect(() => {
    setFormData(initialFormData);
    setShowNewCustomerForm(false);
    setNewCustomerName("");
    setNewCustomerPhone("");
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (name: keyof ServiceFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (name === "customer_id" && value === "new") {
      setShowNewCustomerForm(true);
    } else {
      setShowNewCustomerForm(false);
    }
  };

  const handleAddNewCustomer = async (): Promise<string | null> => {
    if (!newCustomerName.trim()) {
      toast({ title: "Hata", description: "Yeni müşteri adı boş olamaz.", variant: "destructive", });
      return null;
    }
    try {
      const { data: newCustomer, error } = await supabase.from("customers").insert({ name: newCustomerName.trim(), phone: newCustomerPhone.trim() || null }).select().single();
      if (error) throw error;
      if (newCustomer) {
        toast({ title: "Başarılı", description: "Yeni müşteri eklendi.", });
        const addedCustomer: Customer = { id: newCustomer.id, name: newCustomer.name, phone: newCustomer.phone ?? null, address: newCustomer.address ?? null, city: newCustomer.city ?? null, email: newCustomer.email ?? null, notes: newCustomer.notes ?? null, credit_limit: newCustomer.credit_limit ?? 0, total_credit: newCustomer.total_credit ?? 0, remaining_installments: newCustomer.remaining_installments ?? 0, total_debt: newCustomer.total_debt ?? 0, debt: newCustomer.debt ?? 0, };
        setCustomers((prev) => [...prev, addedCustomer].sort((a, b) => a.name.localeCompare(b.name)));
        setNewCustomerName(""); setNewCustomerPhone(""); setShowNewCustomerForm(false);
        setFormData((prev) => ({ ...prev, customer_id: newCustomer.id }));
        return newCustomer.id;
      }
      return null;
    } catch (error: any) {
      console.error("Yeni müşteri ekleme hatası:", error);
      toast({ title: "Hata", description: `Yeni müşteri eklenemedi: ${error.message}`, variant: "destructive", });
      return null;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    let customerIdToSave = formData.customer_id;
    setIsSaving(true);

    try {
      if (formData.customer_id === "new") {
        const newCustomerId = await handleAddNewCustomer();
        if (!newCustomerId) { setIsSaving(false); return; }
        customerIdToSave = newCustomerId;
      }

      if (!customerIdToSave || !formData.deviceType || !formData.problem) {
        toast({ title: "Uyarı", description: "Müşteri, Cihaz Türü ve Şikayet alanları zorunludur.", variant: "destructive", });
        setIsSaving(false); return;
      }

      const trackingCode = Math.floor(100000 + Math.random() * 900000).toString();

      const newServiceData = {
        customer_id: customerIdToSave,
        device_type: formData.deviceType,
        brand: formData.brand || null,
        model: formData.model || null,
        serial_number: formData.serialNumber || null,
        problem: formData.problem,
        diagnosis: null,
        solution: null,
        status: "pending" as const,
        cost: 0,
        tracking_code: trackingCode,
        date: new Date().toISOString(),
      };

      const { data: insertedService, error } = await supabase.from("services").insert(newServiceData).select().single();

      if (error) throw error;

      if (insertedService) {
        toast({ title: "Başarılı", description: `Servis kaydı oluşturuldu. Takip Kodu: ${trackingCode}`, });

        const newService: Service = {
          id: insertedService.id, created_at: insertedService.created_at, date: insertedService.date,
          customer_id: insertedService.customer_id, deviceType: insertedService.device_type,
          brand: insertedService.brand, model: insertedService.model, serialNumber: insertedService.serial_number,
          problem: insertedService.problem, diagnosis: insertedService.diagnosis, solution: insertedService.solution,
          status: insertedService.status, cost: insertedService.cost, device_type: insertedService.device_type,
          serial_number: insertedService.serial_number,
          tracking_code: insertedService.tracking_code // Explicitly map this
        };

        onServiceCreated(newService);
        setFormData(initialFormData);
        setActiveTab("list");
      }
    } catch (error: any) {
      console.error("Servis ekleme hatası:", error);
      toast({ title: "Hata", description: `Servis eklenemedi: ${error.message}`, variant: "destructive", });
    } finally { setIsSaving(false); }
  };

  return (
    <Card className="glass-card border-none text-white max-w-4xl mx-auto">
      <CardHeader className="pb-4 border-b border-white/5">
        <CardTitle className="text-xl font-bold flex items-center gap-2 text-blue-400">
          <PlusCircle className="h-6 w-6" /> Yeni Servis Kaydı
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6">
        <form onSubmit={handleSubmit} className="space-y-6">

          {/* Müşteri Seçimi */}
          <div className="space-y-2">
            <Label htmlFor="customer_id" className="text-sm font-medium text-gray-400 flex items-center gap-2">
              <User className="h-4 w-4" /> Müşteri *
            </Label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
              <Select value={formData.customer_id} onValueChange={(value) => handleSelectChange("customer_id", value)} disabled={isSaving}>
                <SelectTrigger id="customer_id" className="pl-10 bg-black/40 border-white/10 text-white h-11">
                  <SelectValue placeholder="Müşteri seçin veya yeni ekleyin..." />
                </SelectTrigger>
                <SelectContent className="bg-gray-800 border-gray-700 text-white">
                  <SelectItem value="new" className="text-blue-400 font-medium">
                    <div className="flex items-center gap-2"><UserPlus className="h-4 w-4" /> » Yeni Müşteri Ekle...</div>
                  </SelectItem>
                  {(customers || []).map((c) => (
                    <SelectItem key={c.id} value={c.id}> {c.name} {c.phone ? `(${c.phone})` : ""} </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Yeni Müşteri Formu (Inline) */}
          {showNewCustomerForm && (
            <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/20 space-y-4 animate-in fade-in slide-in-from-top-2">
              <div className="flex items-center gap-2 text-blue-400 font-semibold border-b border-blue-500/20 pb-2">
                <UserPlus className="h-4 w-4" /> Yeni Müşteri Bilgileri
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs text-blue-300">Ad Soyad *</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-blue-500/50" />
                    <Input
                      placeholder="Müşteri Adı Soyadı"
                      value={newCustomerName}
                      onChange={(e) => setNewCustomerName(e.target.value)}
                      disabled={isSaving}
                      className="pl-10 bg-black/40 border-blue-500/30 text-white h-10 focus:border-blue-500"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs text-blue-300">Telefon</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-blue-500/50" />
                    <Input
                      placeholder="Telefon (Opsiyonel)"
                      value={newCustomerPhone}
                      onChange={(e) => setNewCustomerPhone(e.target.value)}
                      disabled={isSaving}
                      className="pl-10 bg-black/40 border-blue-500/30 text-white h-10 focus:border-blue-500"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Cihaz Bilgileri */}
          <div className="space-y-4 pt-2">
            <Label className="text-sm font-bold text-gray-300 border-b border-white/10 pb-2 block">
              <Smartphone className="h-4 w-4 inline-block mr-2 text-purple-400" /> Cihaz Bilgileri
            </Label>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label htmlFor="deviceType" className="text-xs font-medium text-gray-400">Cihaz Türü *</Label>
                <Select value={formData.deviceType} onValueChange={(v) => handleSelectChange("deviceType", v)} disabled={isSaving}>
                  <SelectTrigger id="deviceType" className="bg-black/40 border-white/10 text-white h-10">
                    <SelectValue placeholder="Seçin..." />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-800 border-gray-700 text-white">
                    <SelectItem value="Telefon">Telefon</SelectItem>
                    <SelectItem value="Tablet">Tablet</SelectItem>
                    <SelectItem value="Bilgisayar">Bilgisayar</SelectItem>
                    <SelectItem value="Diğer">Diğer</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="brand" className="text-xs font-medium text-gray-400">Marka</Label>
                <Input id="brand" name="brand" value={formData.brand} onChange={handleInputChange} className="bg-black/40 border-white/10 text-white h-10" disabled={isSaving} placeholder="Örn: Apple" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="model" className="text-xs font-medium text-gray-400">Model</Label>
                <Input id="model" name="model" value={formData.model} onChange={handleInputChange} className="bg-black/40 border-white/10 text-white h-10" disabled={isSaving} placeholder="Örn: iPhone 13" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="serialNumber" className="text-xs font-medium text-gray-400">Seri Numarası</Label>
                <Input id="serialNumber" name="serialNumber" value={formData.serialNumber} onChange={handleInputChange} className="bg-black/40 border-white/10 text-white h-10" disabled={isSaving} placeholder="Opsiyonel" />
              </div>
            </div>
          </div>

          {/* Şikayet */}
          <div className="space-y-2 pt-2">
            <Label htmlFor="problem" className="text-sm font-medium text-gray-400 flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-red-400" /> Şikayet / Sorun Açıklaması *
            </Label>
            <Textarea
              id="problem"
              name="problem"
              value={formData.problem}
              onChange={handleInputChange}
              className="min-h-[120px] bg-black/40 border-white/10 text-white resize-none focus:border-blue-500/50"
              disabled={isSaving}
              placeholder="Müşterinin cihazla ilgili şikayetini detaylıca yazın..."
            />
          </div>

          <Button
            type="submit"
            className="w-full bg-blue-600 hover:bg-blue-700 text-white h-12 text-lg font-semibold shadow-[0_0_20px_rgba(37,99,235,0.3)] hover:shadow-[0_0_30px_rgba(37,99,235,0.5)] transition-all duration-300"
            disabled={isSaving}
          >
            {isSaving ? (<Loader2 className="mr-2 h-5 w-5 animate-spin" />) : (<PlusCircle className="mr-2 h-5 w-5" />)}
            Servis Kaydını Oluştur
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

export default NewServiceForm;
// --- END OF FILE src/components/service/NewServiceForm.tsx ---