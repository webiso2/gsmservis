// --- START OF FILE src/components/service/NewCustomerForm.tsx ---

import React, { useState } from "react";
import { X, User, Check, Loader2, Phone, Mail, MapPin, Building } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Customer } from "@/types/service";
import { customerSchema, CustomerFormValues } from "@/schemas/customerSchema";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { formatPhoneNumber } from "@/utils/customerUtils";

interface NewCustomerFormProps {
  onClose: () => void;
  onCustomerCreated: (customer: Customer) => void;
}

const NewCustomerForm: React.FC<NewCustomerFormProps> = ({
  onClose,
  onCustomerCreated,
}) => {
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);

  const customerForm = useForm<CustomerFormValues>({
    resolver: zodResolver(customerSchema),
    defaultValues: {
      name: "",
      phone: "",
      email: "",
      address: "",
      city: "",
    },
  });

  const onSubmit = async (data: CustomerFormValues) => {
    setIsSaving(true);

    try {
      const formattedPhone = formatPhoneNumber(data.phone);
      if (data.phone && !formattedPhone) {
        toast({
          title: "Uyarı",
          description: "Geçersiz telefon formatı.",
          variant: "destructive",
        });
        setIsSaving(false);
        return;
      }

      const newCustomerData = {
        name: data.name.trim(),
        phone: formattedPhone || null,
        address: data.address?.trim() || null,
        city: data.city?.trim() || null,
        email: data.email?.trim() || null,
      };

      const { data: insertedCustomer, error } = await supabase
        .from("customers")
        .insert(newCustomerData)
        .select()
        .single();

      if (error) throw error;

      if (insertedCustomer) {
        const createdCustomer: Customer = {
          id: insertedCustomer.id,
          created_at: insertedCustomer.created_at,
          name: insertedCustomer.name,
          phone: insertedCustomer.phone ?? null,
          address: insertedCustomer.address ?? null,
          city: insertedCustomer.city ?? null,
          email: insertedCustomer.email ?? null,
          notes: insertedCustomer.notes ?? null,
          credit_limit: insertedCustomer.credit_limit ?? 0,
          total_credit: insertedCustomer.total_credit ?? 0,
          remaining_installments: insertedCustomer.remaining_installments ?? 0,
          total_debt: insertedCustomer.total_debt ?? 0,
          debt: insertedCustomer.debt ?? 0,
        };

        toast({
          title: "Başarılı",
          description: "Müşteri kaydedildi.",
        });
        onCustomerCreated(createdCustomer);
      }
    } catch (error: any) {
      console.error("[NewCustomerForm] Müşteri kaydı hatası:", error);
      toast({
        title: "Hata",
        description: `Müşteri kaydedilemedi: ${error.message}`,
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="glass-panel p-6 mb-6 relative animate-in fade-in slide-in-from-top-4 duration-300">
      <div className="flex justify-between items-center mb-6 border-b border-white/10 pb-4">
        <h2 className="text-lg font-bold flex items-center gap-2 text-white">
          <User className="h-5 w-5 text-blue-400" />
          Yeni Müşteri Kaydı
        </h2>
        <Button
          variant="ghost"
          size="sm"
          className="text-gray-400 hover:text-white hover:bg-white/10 h-8 w-8 rounded-full"
          onClick={onClose}
          disabled={isSaving}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      <Form {...customerForm}>
        <form
          onSubmit={customerForm.handleSubmit(onSubmit)}
          className="space-y-4"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={customerForm.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-medium text-gray-400 ml-1">Müşteri Adı *</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                      <Input
                        {...field}
                        className="pl-10 bg-black/40 border-white/10 text-white h-10 text-sm focus:border-blue-500/50"
                        placeholder="Müşteri adını girin..."
                        disabled={isSaving}
                      />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={customerForm.control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-medium text-gray-400 ml-1">Telefon</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                      <Input
                        {...field}
                        className="pl-10 bg-black/40 border-white/10 text-white h-10 text-sm focus:border-blue-500/50"
                        placeholder="Telefon numarası girin..."
                        disabled={isSaving}
                      />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={customerForm.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-medium text-gray-400 ml-1">E-posta</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                      <Input
                        {...field}
                        type="email"
                        className="pl-10 bg-black/40 border-white/10 text-white h-10 text-sm focus:border-blue-500/50"
                        placeholder="E-posta adresi girin..."
                        disabled={isSaving}
                      />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={customerForm.control}
              name="city"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-medium text-gray-400 ml-1">Şehir</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Building className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                      <Input
                        {...field}
                        className="pl-10 bg-black/40 border-white/10 text-white h-10 text-sm focus:border-blue-500/50"
                        placeholder="Şehir girin..."
                        disabled={isSaving}
                      />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={customerForm.control}
            name="address"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs font-medium text-gray-400 ml-1">Adres</FormLabel>
                <FormControl>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-3 h-4 w-4 text-gray-500" />
                    <Input
                      {...field}
                      className="pl-10 bg-black/40 border-white/10 text-white h-10 text-sm focus:border-blue-500/50"
                      placeholder="Adres girin..."
                      disabled={isSaving}
                    />
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="flex justify-end pt-4 border-t border-white/10">
            <Button
              type="submit"
              className="bg-blue-600 hover:bg-blue-700 text-white shadow-[0_0_15px_rgba(37,99,235,0.4)] transition-all duration-300"
              disabled={isSaving}
            >
              {isSaving ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Check className="mr-2 h-4 w-4" />
              )}
              Müşteriyi Kaydet
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
};

export default NewCustomerForm;
// --- END OF FILE src/components/service/NewCustomerForm.tsx ---