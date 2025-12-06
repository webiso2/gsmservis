// --- START OF FILE src/components/accounts/AccountForm.tsx ---

import React, { useState, useEffect } from 'react';
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription, DialogClose
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Save, X as CancelIcon, Landmark, Smartphone, Wallet, CreditCard, Banknote } from 'lucide-react';
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import type { Account } from "@/types/backup";
import { cn } from "@/lib/utils";

interface AccountFormData {
    name: string;
    type: Account['type'];
    account_number: string;
    bank_name: string;
    initial_balance: string;
    is_default: boolean;
    credit_limit: string;
}

const accountTypes: { value: Account['type']; label: string; icon: React.ReactNode }[] = [
    { value: 'cash', label: 'Nakit Kasa', icon: <Banknote className="mr-2 h-4 w-4" /> },
    { value: 'bank', label: 'Banka Hesabı', icon: <Landmark className="mr-2 h-4 w-4" /> },
    { value: 'pos', label: 'POS Hesabı', icon: <Smartphone className="mr-2 h-4 w-4" /> },
    { value: 'credit_card', label: 'Kredi Kartı', icon: <CreditCard className="mr-2 h-4 w-4" /> },
    { value: 'other', label: 'Diğer', icon: <Wallet className="mr-2 h-4 w-4" /> },
];

interface AccountFormProps {
    isOpen: boolean;
    setIsOpen: (open: boolean) => void;
    onAccountSaved: (account: Account) => void;
    editingAccount: Account | null;
}

const AccountForm: React.FC<AccountFormProps> = ({ isOpen, setIsOpen, onAccountSaved, editingAccount }) => {
    const { toast } = useToast();
    const [formData, setFormData] = useState<AccountFormData>({
        name: '', type: 'bank', account_number: '', bank_name: '', initial_balance: '0', is_default: false, credit_limit: '0'
    });
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (isOpen) {
            if (editingAccount) {
                setFormData({
                    name: editingAccount.name,
                    type: editingAccount.type,
                    account_number: editingAccount.account_number || '',
                    bank_name: editingAccount.bank_name || '',
                    initial_balance: editingAccount.initial_balance?.toString() ?? '0',
                    is_default: editingAccount.is_default || false,
                    credit_limit: editingAccount.credit_limit?.toString() ?? '0',
                });
            } else {
                setFormData({ name: '', type: 'bank', account_number: '', bank_name: '', initial_balance: '0', is_default: false, credit_limit: '0' });
            }
        }
    }, [isOpen, editingAccount]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    const handleSelectChange = (value: Account['type']) => {
        setFormData(prev => ({ ...prev, type: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.name.trim()) { toast({ title: "Uyarı", description: "Hesap adı zorunludur.", variant: "destructive" }); return; }

        const initialBalance = parseFloat(formData.initial_balance) || 0;
        const creditLimit = parseFloat(formData.credit_limit) || 0;

        let dataToSave: Partial<Account> = {
            name: formData.name.trim(),
            type: formData.type,
            account_number: formData.account_number.trim() || null,
            bank_name: formData.bank_name.trim() || null,
            is_default: formData.is_default,
            credit_limit: formData.type === 'credit_card' ? creditLimit : 0,
        };

        setIsSaving(true);
        try {
            let savedAccountData: Account | null = null;
            let error: any = null;

            if (editingAccount) {
                console.log("Hesap güncelleniyor:", editingAccount.id, dataToSave);
                const { data, error: updateError } = await supabase
                    .from('accounts')
                    .update(dataToSave)
                    .eq('id', editingAccount.id)
                    .select()
                    .single();
                savedAccountData = data as Account | null;
                error = updateError;
            } else {
                dataToSave.initial_balance = 0;
                dataToSave.current_balance = 0;
                console.log("Yeni hesap ekleniyor:", dataToSave);
                const { data, error: insertError } = await supabase
                    .from('accounts')
                    .insert(dataToSave)
                    .select()
                    .single();
                savedAccountData = data as Account | null;
                error = insertError;
            }

            if (error) throw error;

            if (savedAccountData) {
                const finalAccount: Account = {
                    ...editingAccount,
                    ...savedAccountData,
                    initial_balance: savedAccountData.initial_balance ?? editingAccount?.initial_balance ?? 0,
                    current_balance: savedAccountData.current_balance ?? editingAccount?.current_balance ?? 0,
                    credit_limit: savedAccountData.credit_limit ?? 0,
                    is_default: savedAccountData.is_default ?? false,
                    account_number: savedAccountData.account_number ?? null,
                    bank_name: savedAccountData.bank_name ?? null,
                };

                toast({ title: "Başarılı", description: `Hesap başarıyla ${editingAccount ? 'güncellendi' : 'kaydedildi'}.` });
                onAccountSaved(finalAccount);
                setIsOpen(false);
            }

        } catch (error: any) {
            console.error("Hesap kaydetme/güncelleme hatası:", error);
            toast({ title: "Hata", description: `İşlem başarısız: ${error.message}`, variant: "destructive" });
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogContent className="sm:max-w-[480px] bg-gray-900 border border-white/10 text-white p-0 shadow-2xl backdrop-blur-xl">
                <DialogHeader className="bg-white/5 border-b border-white/10 p-4 flex flex-row items-center justify-between space-y-0">
                    <DialogTitle className="text-lg font-bold flex items-center gap-2">
                        <Wallet className="h-5 w-5 text-blue-400" />
                        {editingAccount ? 'Hesabı Düzenle' : 'Yeni Hesap Ekle'}
                    </DialogTitle>
                    <DialogClose asChild>
                        <Button variant="ghost" size="icon" className="text-gray-400 hover:text-white hover:bg-white/10 h-8 w-8 rounded-full">
                            <CancelIcon className="h-4 w-4" />
                        </Button>
                    </DialogClose>
                </DialogHeader>

                <div className="p-6">
                    <DialogDescription className="text-gray-400 text-xs mb-6">
                        Hesap bilgilerini girin veya güncelleyin. Kredi kartı için limit belirtebilirsiniz.
                    </DialogDescription>

                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div className="space-y-2">
                            <Label htmlFor="acc-name" className="text-xs font-medium text-gray-400 ml-1">Hesap Adı *</Label>
                            <Input id="acc-name" name="name" value={formData.name} onChange={handleInputChange} className="bg-white/5 border-white/10 text-white h-10 text-sm focus:border-blue-500/50" disabled={isSaving} placeholder="Örn: Ana Kasa, İş Bankası..." />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="acc-type" className="text-xs font-medium text-gray-400 ml-1">Hesap Tipi *</Label>
                            <Select value={formData.type} onValueChange={handleSelectChange} disabled={isSaving}>
                                <SelectTrigger id="acc-type" className="bg-white/5 border-white/10 text-white h-10 text-sm focus:ring-blue-500/50">
                                    <SelectValue placeholder="Hesap tipi seçin..." />
                                </SelectTrigger>
                                <SelectContent className="bg-gray-800 border-gray-700 text-white">
                                    {accountTypes.map(type => (
                                        <SelectItem key={type.value} value={type.value} className="focus:bg-gray-700 focus:text-white">
                                            <div className="flex items-center">
                                                {type.icon} {type.label}
                                            </div>
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {(formData.type === 'bank' || formData.type === 'credit_card') && (
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="acc-bank" className="text-xs font-medium text-gray-400 ml-1">Banka Adı</Label>
                                    <Input id="acc-bank" name="bank_name" value={formData.bank_name} onChange={handleInputChange} className="bg-white/5 border-white/10 text-white h-10 text-sm focus:border-blue-500/50" disabled={isSaving} />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="acc-number" className="text-xs font-medium text-gray-400 ml-1">{formData.type === 'credit_card' ? 'Kart Numarası' : 'Hesap No'}</Label>
                                    <Input id="acc-number" name="account_number" value={formData.account_number} onChange={handleInputChange} className="bg-white/5 border-white/10 text-white h-10 text-sm focus:border-blue-500/50" disabled={isSaving} />
                                </div>
                            </div>
                        )}

                        {formData.type === 'credit_card' && (
                            <div className="space-y-2">
                                <Label htmlFor="acc-limit" className="text-xs font-medium text-gray-400 ml-1">Kredi Limiti</Label>
                                <Input id="acc-limit" name="credit_limit" type="number" value={formData.credit_limit} onChange={handleInputChange} placeholder="0.00" min="0" step="0.01" className="bg-white/5 border-white/10 text-white h-10 text-sm focus:border-blue-500/50" disabled={isSaving} />
                            </div>
                        )}

                        {formData.type !== 'credit_card' && !editingAccount && (
                            <div className="space-y-2">
                                <Label htmlFor="acc-initial" className="text-xs font-medium text-gray-400 ml-1">Başlangıç Bakiyesi</Label>
                                <Input id="acc-initial" name="initial_balance" type="number" value={formData.initial_balance} onChange={handleInputChange} placeholder="0.00" step="0.01" className="bg-white/5 border-white/10 text-white h-10 text-sm focus:border-blue-500/50" disabled={isSaving || !!editingAccount} />
                            </div>
                        )}

                        <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg border border-white/5">
                            <div className="space-y-0.5">
                                <Label htmlFor="acc-default" className="text-sm font-medium text-white">Varsayılan Hesap</Label>
                                <p className="text-xs text-gray-500">Bu hesap tipi için varsayılan olarak seçilsin mi?</p>
                            </div>
                            <Switch id="acc-default" name="is_default" checked={formData.is_default} onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_default: checked }))} disabled={isSaving} />
                        </div>

                        <DialogFooter className="pt-2">
                            <Button type="button" variant="ghost" onClick={() => setIsOpen(false)} disabled={isSaving} className="text-gray-400 hover:text-white hover:bg-white/10">İptal</Button>
                            <Button type="submit" disabled={isSaving} className="bg-blue-600 hover:bg-blue-700 text-white shadow-[0_0_15px_rgba(37,99,235,0.4)]">
                                {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />} {editingAccount ? 'Güncelle' : 'Kaydet'}
                            </Button>
                        </DialogFooter>
                    </form>
                </div>
            </DialogContent>
        </Dialog>
    );
};

export default AccountForm;
// --- END OF FILE src/components/accounts/AccountForm.tsx ---