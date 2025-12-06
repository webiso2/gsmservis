// --- START OF FILE src/components/wholesaler/WholesalerFormDialog.tsx ---

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription, DialogClose } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea"; // Textarea eklendi
import { Loader2, Save, X as CancelIcon } from 'lucide-react';
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import type { Wholesaler } from "@/types/backup"; // Tipi import et

interface WholesalerFormDialogProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  onWholesalerSaved: (wholesaler: Wholesaler) => void;
  editingWholesaler: Wholesaler | null; // Düzenlenecek toptancı (null ise yeni kayıt)
}

// Form verisi için interface
interface WholesalerFormData {
  name: string;
  contact_person: string;
  phone: string;
  email: string;
  address: string;
  notes: string;
  // debt alanı formda olmaz, işlemlerle hesaplanır
}

const WholesalerFormDialog: React.FC<WholesalerFormDialogProps> = ({ isOpen, setIsOpen, onWholesalerSaved, editingWholesaler }) => {
  const { toast } = useToast();
  const [formData, setFormData] = useState<WholesalerFormData>({ name: '', contact_person: '', phone: '', email: '', address: '', notes: '' });
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (editingWholesaler && isOpen) {
      // Düzenleme modundaysa formu doldur
      setFormData({
        name: editingWholesaler.name,
        contact_person: editingWholesaler.contact_person || '',
        phone: editingWholesaler.phone || '',
        email: editingWholesaler.email || '',
        address: editingWholesaler.address || '',
        notes: editingWholesaler.notes || '',
      });
    } else if (!editingWholesaler && isOpen) {
      // Yeni kayıt modundaysa formu temizle
      setFormData({ name: '', contact_person: '', phone: '', email: '', address: '', notes: '' });
    }
    // Dialog kapanırken de temizlenebilir ama açılırken temizlemek daha garanti
  }, [editingWholesaler, isOpen]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) { toast({ title: "Uyarı", description: "Toptancı adı zorunludur.", variant: "destructive" }); return; }
    setIsSaving(true);

    try {
      const dataToSave = {
        name: formData.name.trim(),
        contact_person: formData.contact_person.trim() || null,
        phone: formData.phone.trim() || null,
        email: formData.email.trim() || null,
        address: formData.address.trim() || null,
        notes: formData.notes.trim() || null,
        // debt alanı burada güncellenmez/eklenmez
      };

      let savedWholesalerData: any = null;
      let error: any = null;

      if (editingWholesaler) {
        // Güncelleme
        console.log("Toptancı güncelleniyor:", editingWholesaler.id, dataToSave);
        const { data, error: updateError } = await supabase
          .from('wholesalers')
          .update(dataToSave)
          .eq('id', editingWholesaler.id)
          .select()
          .single();
        savedWholesalerData = data;
        error = updateError;
      } else {
        // Ekleme (Başlangıç borcu 0 olacak - DB default'u)
        console.log("Yeni toptancı ekleniyor:", dataToSave);
        const { data, error: insertError } = await supabase
          .from('wholesalers')
          .insert(dataToSave)
          .select()
          .single();
        savedWholesalerData = data;
        error = insertError;
      }

      if (error) throw error;

      if (savedWholesalerData) {
        const finalWholesaler: Wholesaler = { // Tipi doğrula
          id: savedWholesalerData.id, created_at: savedWholesalerData.created_at,
          name: savedWholesalerData.name ?? '', contact_person: savedWholesalerData.contact_person ?? null,
          phone: savedWholesalerData.phone ?? null, email: savedWholesalerData.email ?? null,
          address: savedWholesalerData.address ?? null, notes: savedWholesalerData.notes ?? null,
          debt: savedWholesalerData.debt ?? 0, // DB'den gelen borcu al
        };
        toast({ title: "Başarılı", description: `Toptancı başarıyla ${editingWholesaler ? 'güncellendi' : 'kaydedildi'}.` });
        onWholesalerSaved(finalWholesaler); // Kaydedilen veriyi ana modüle gönder
        setIsOpen(false); // Dialogu kapat
      }

    } catch (error: any) { console.error("Toptancı kaydetme/güncelleme hatası:", error); toast({ title: "Hata", description: `İşlem başarısız: ${error.message}`, variant: "destructive" }); }
    finally { setIsSaving(false); }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-[450px] bg-gray-900 border border-white/10 text-white p-0 shadow-2xl backdrop-blur-xl">
        <DialogHeader className="bg-white/5 border-b border-white/10 p-4">
          <DialogTitle>{editingWholesaler ? 'Toptancıyı Düzenle' : 'Yeni Toptancı Ekle'}</DialogTitle>
          <DialogDescription className="text-gray-400 text-xs pt-1 text-left">
            Toptancı bilgilerini girin veya güncelleyin.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 p-5">
            <div className="grid grid-cols-4 items-center gap-3"><Label htmlFor="name" className="text-right text-xs font-medium text-gray-400">Adı *</Label><Input id="name" name="name" value={formData.name} onChange={handleInputChange} className="col-span-3 h-9 bg-white/5 border-white/10 text-white text-sm focus:border-blue-500/50" disabled={isSaving} /></div>
            <div className="grid grid-cols-4 items-center gap-3"><Label htmlFor="contact_person" className="text-right text-xs font-medium text-gray-400">Yetkili</Label><Input id="contact_person" name="contact_person" value={formData.contact_person} onChange={handleInputChange} className="col-span-3 h-9 bg-white/5 border-white/10 text-white text-sm focus:border-blue-500/50" disabled={isSaving} /></div>
            <div className="grid grid-cols-4 items-center gap-3"><Label htmlFor="phone" className="text-right text-xs font-medium text-gray-400">Telefon</Label><Input id="phone" name="phone" value={formData.phone} onChange={handleInputChange} className="col-span-3 h-9 bg-white/5 border-white/10 text-white text-sm focus:border-blue-500/50" disabled={isSaving} /></div>
            <div className="grid grid-cols-4 items-center gap-3"><Label htmlFor="email" className="text-right text-xs font-medium text-gray-400">E-posta</Label><Input id="email" name="email" type="email" value={formData.email} onChange={handleInputChange} className="col-span-3 h-9 bg-white/5 border-white/10 text-white text-sm focus:border-blue-500/50" disabled={isSaving} /></div>
            <div className="grid grid-cols-4 items-start gap-3"><Label htmlFor="address" className="text-right text-xs font-medium text-gray-400 pt-2">Adres</Label><Textarea id="address" name="address" value={formData.address} onChange={handleInputChange} className="col-span-3 min-h-[60px] bg-white/5 border-white/10 text-white text-sm focus:border-blue-500/50 resize-none" disabled={isSaving} /></div>
            <div className="grid grid-cols-4 items-start gap-3"><Label htmlFor="notes" className="text-right text-xs font-medium text-gray-400 pt-2">Notlar</Label><Textarea id="notes" name="notes" value={formData.notes} onChange={handleInputChange} className="col-span-3 min-h-[60px] bg-white/5 border-white/10 text-white text-sm focus:border-blue-500/50 resize-none" disabled={isSaving} /></div>
          </div>
          <DialogFooter className="p-4 bg-white/5 border-t border-white/10">
            <DialogClose asChild><Button type="button" variant="ghost" className="text-gray-400 hover:text-white hover:bg-white/10" disabled={isSaving}>İptal</Button></DialogClose>
            <Button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white shadow-[0_0_15px_rgba(37,99,235,0.4)]" disabled={isSaving}>{isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />} {editingWholesaler ? 'Güncelle' : 'Kaydet'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default WholesalerFormDialog;
// --- END OF FILE src/components/wholesaler/WholesalerFormDialog.tsx ---