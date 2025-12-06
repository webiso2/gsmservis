import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Save } from "lucide-react";
import type { Supplier } from "@/types/backup";

interface SupplierFormDialogProps {
    isOpen: boolean;
    onClose: () => void;
    editingSupplier: Supplier | null;
    onSaved: () => void;
}

const SupplierFormDialog: React.FC<SupplierFormDialogProps> = ({
    isOpen,
    onClose,
    editingSupplier,
    onSaved
}) => {
    const { toast } = useToast();
    const [isSaving, setIsSaving] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        contact_person: '',
        phone: '',
        email: '',
        address: '',
        notes: ''
    });

    useEffect(() => {
        if (editingSupplier) {
            setFormData({
                name: editingSupplier.name,
                contact_person: editingSupplier.contact_person || '',
                phone: editingSupplier.phone || '',
                email: editingSupplier.email || '',
                address: editingSupplier.address || '',
                notes: editingSupplier.notes || ''
            });
        } else {
            setFormData({
                name: '',
                contact_person: '',
                phone: '',
                email: '',
                address: '',
                notes: ''
            });
        }
    }, [editingSupplier, isOpen]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!formData.name.trim()) {
            toast({ title: "Hata", description: "Tedarikçi adı zorunludur.", variant: "destructive" });
            return;
        }

        setIsSaving(true);
        try {
            const supplierData = {
                name: formData.name.trim(),
                contact_person: formData.contact_person.trim() || null,
                phone: formData.phone.trim() || null,
                email: formData.email.trim() || null,
                address: formData.address.trim() || null,
                notes: formData.notes.trim() || null,
            };

            if (editingSupplier) {
                const { error } = await supabase
                    .from('suppliers')
                    .update(supplierData)
                    .eq('id', editingSupplier.id);
                if (error) throw error;
                toast({ title: "Başarılı", description: "Tedarikçi güncellendi." });
            } else {
                const { error } = await supabase
                    .from('suppliers')
                    .insert([{ ...supplierData, balance: 0 }]);
                if (error) throw error;
                toast({ title: "Başarılı", description: "Yeni tedarikçi eklendi." });
            }

            onSaved();
        } catch (error: any) {
            console.error('Kaydetme hatası:', error);
            toast({ title: "Hata", description: `Kaydedilemedi: ${error.message}`, variant: "destructive" });
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="bg-[#1a1b26] border-white/10 text-white sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle className="text-xl font-bold">
                        {editingSupplier ? 'Tedarikçiyi Düzenle' : 'Yeni Tedarikçi Ekle'}
                    </DialogTitle>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label htmlFor="name" className="text-xs font-medium text-gray-400">Tedarikçi Adı *</Label>
                        <Input
                            id="name"
                            name="name"
                            value={formData.name}
                            onChange={handleInputChange}
                            className="bg-white/5 border-white/10 text-white focus:border-indigo-500/50"
                            placeholder="Örn: ABC Elektronik"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="contact_person" className="text-xs font-medium text-gray-400">İlgili Kişi</Label>
                            <Input
                                id="contact_person"
                                name="contact_person"
                                value={formData.contact_person}
                                onChange={handleInputChange}
                                className="bg-white/5 border-white/10 text-white focus:border-indigo-500/50"
                                placeholder="Ad Soyad"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="phone" className="text-xs font-medium text-gray-400">Telefon</Label>
                            <Input
                                id="phone"
                                name="phone"
                                value={formData.phone}
                                onChange={handleInputChange}
                                className="bg-white/5 border-white/10 text-white focus:border-indigo-500/50"
                                placeholder="05..."
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="email" className="text-xs font-medium text-gray-400">E-posta</Label>
                        <Input
                            id="email"
                            name="email"
                            type="email"
                            value={formData.email}
                            onChange={handleInputChange}
                            className="bg-white/5 border-white/10 text-white focus:border-indigo-500/50"
                            placeholder="ornek@sirket.com"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="address" className="text-xs font-medium text-gray-400">Adres</Label>
                        <Textarea
                            id="address"
                            name="address"
                            value={formData.address}
                            onChange={handleInputChange}
                            className="bg-white/5 border-white/10 text-white focus:border-indigo-500/50 min-h-[60px] resize-none"
                            placeholder="Açık adres..."
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="notes" className="text-xs font-medium text-gray-400">Notlar</Label>
                        <Textarea
                            id="notes"
                            name="notes"
                            value={formData.notes}
                            onChange={handleInputChange}
                            className="bg-white/5 border-white/10 text-white focus:border-indigo-500/50 min-h-[60px] resize-none"
                            placeholder="Özel notlar..."
                        />
                    </div>

                    <DialogFooter className="pt-4">
                        <Button type="button" variant="ghost" onClick={onClose} className="hover:bg-white/10 text-gray-300">
                            İptal
                        </Button>
                        <Button
                            type="submit"
                            disabled={isSaving}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white"
                        >
                            {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                            {editingSupplier ? 'Güncelle' : 'Kaydet'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
};

export default SupplierFormDialog;
