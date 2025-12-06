// --- START OF FILE src/components/service/AddNewCustomerDialog.tsx ---

import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription, DialogClose } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Customer } from "@/types/service";
import { Loader2, Save, X as CancelIcon, UserPlus, User, Phone } from 'lucide-react';

interface AddNewCustomerDialogProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  onCustomerAdded: (customer: Customer | null) => void;
}

const AddNewCustomerDialog: React.FC<AddNewCustomerDialogProps> = ({ isOpen, setIsOpen, onCustomerAdded }) => {
  const { toast } = useToast();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    if (!name.trim()) {
      toast({ title: "Hata", description: "Müşteri adı boş olamaz.", variant: "destructive" });
      return;
    }
    setIsSaving(true);
    try {
      const { data: newCustomer, error } = await supabase
        .from('customers')
        .insert({ name: name.trim(), phone: phone.trim() || null })
        .select()
        .single();

      if (error) throw error;

      if (newCustomer) {
        const addedCustomer: Customer = {
          ...newCustomer, phone: newCustomer.phone ?? null, address: newCustomer.address ?? null,
          city: newCustomer.city ?? null, email: newCustomer.email ?? null, notes: newCustomer.notes ?? null,
          credit_limit: newCustomer.credit_limit ?? 0, total_credit: newCustomer.total_credit ?? 0,
          remaining_installments: newCustomer.remaining_installments ?? 0, total_debt: newCustomer.total_debt ?? 0, debt: newCustomer.debt ?? 0
        };
        onCustomerAdded(addedCustomer);
        setName('');
        setPhone('');
      } else {
        onCustomerAdded(null);
      }
    } catch (error: any) {
      console.error("Yeni müşteri ekleme hatası (Dialog):", error);
      toast({ title: "Hata", description: `Yeni müşteri eklenemedi: ${error.message}`, variant: "destructive" });
      onCustomerAdded(null);
    } finally {
      setIsSaving(false);
    }
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setName('');
      setPhone('');
    }
    setIsOpen(open);
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[425px] bg-gray-900 border border-white/10 text-white p-0 shadow-2xl backdrop-blur-xl">
        <DialogHeader className="bg-white/5 border-b border-white/10 p-4 flex flex-row justify-between items-center space-y-0">
          <DialogTitle className="text-lg font-bold flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-blue-400" />
            Yeni Müşteri Ekle
          </DialogTitle>
          <DialogClose asChild>
            <Button variant="ghost" size="icon" className="text-gray-400 hover:text-white hover:bg-white/10 h-8 w-8 rounded-full" disabled={isSaving}>
              <CancelIcon className="h-4 w-4" />
            </Button>
          </DialogClose>
        </DialogHeader>

        <div className="p-6 space-y-6">
          <DialogDescription className="text-sm text-gray-400 bg-white/5 p-3 rounded-lg border border-white/5">
            Yeni bir müşteri kaydı oluşturun. Diğer bilgileri daha sonra müşteri modülünden düzenleyebilirsiniz.
          </DialogDescription>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="new-customer-name" className="text-xs font-medium text-gray-400 ml-1">Ad Soyad *</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                <Input
                  id="new-customer-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="pl-10 bg-white/5 border-white/10 text-white h-10 text-sm focus:border-blue-500/50"
                  disabled={isSaving}
                  placeholder="Müşteri Adı"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="new-customer-phone" className="text-xs font-medium text-gray-400 ml-1">Telefon</Label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                <Input
                  id="new-customer-phone"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="pl-10 bg-white/5 border-white/10 text-white h-10 text-sm focus:border-blue-500/50"
                  placeholder="(Opsiyonel)"
                  disabled={isSaving}
                />
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="bg-white/5 border-t border-white/10 p-4">
          <Button variant="ghost" onClick={() => setIsOpen(false)} disabled={isSaving} className="text-gray-400 hover:text-white hover:bg-white/10">İptal</Button>
          <Button
            onClick={handleSave}
            disabled={isSaving || !name.trim()}
            className="bg-blue-600 hover:bg-blue-700 text-white shadow-[0_0_15px_rgba(37,99,235,0.4)]"
          >
            {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            Kaydet
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AddNewCustomerDialog;
// --- END OF FILE src/components/service/AddNewCustomerDialog.tsx ---