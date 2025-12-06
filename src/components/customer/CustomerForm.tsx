// --- START OF FILE src/components/customer/CustomerForm.tsx ---

import React from 'react';
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { FormData } from "@/types/customer";
import { User, Phone, MapPin, Mail, Building } from 'lucide-react';

interface CustomerFormProps {
  formData: FormData;
  handleInputChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  isEditing: boolean;
  isSaving: boolean;
}

const CustomerForm: React.FC<CustomerFormProps> = ({
  formData,
  handleInputChange,
  isEditing,
  isSaving
}) => {
  return (
    <div className="space-y-4 p-4">
      <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
        <User className="h-5 w-5 text-blue-400" />
        {isEditing ? 'Müşteri Düzenle' : 'Yeni Müşteri'}
      </h2>

      <div className="space-y-2">
        <label className="text-xs font-medium text-gray-400 ml-1">Müşteri Adı *</label>
        <div className="relative">
          <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
          <Input
            type="text"
            name="name"
            value={formData.name}
            onChange={handleInputChange}
            placeholder="Müşteri adını giriniz"
            className="pl-10 bg-white/5 border-white/10 text-white h-10 text-sm focus:border-blue-500/50"
            disabled={isSaving}
          />
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-xs font-medium text-gray-400 ml-1">Telefon</label>
        <div className="relative">
          <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
          <Input
            type="tel"
            name="phone"
            value={formData.phone}
            onChange={handleInputChange}
            placeholder="Telefon numarası giriniz"
            className="pl-10 bg-white/5 border-white/10 text-white h-10 text-sm focus:border-blue-500/50"
            disabled={isSaving}
          />
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-xs font-medium text-gray-400 ml-1">Adres</label>
        <div className="relative">
          <MapPin className="absolute left-3 top-3 h-4 w-4 text-gray-500" />
          <Textarea
            name="address"
            value={formData.address}
            onChange={handleInputChange}
            placeholder="Adres giriniz"
            className="pl-10 min-h-[80px] bg-white/5 border-white/10 text-white text-sm focus:border-blue-500/50"
            disabled={isSaving}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="text-xs font-medium text-gray-400 ml-1">Şehir</label>
          <div className="relative">
            <Building className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
            <Input
              type="text"
              name="city"
              value={formData.city}
              onChange={handleInputChange}
              placeholder="Şehir"
              className="pl-10 bg-white/5 border-white/10 text-white h-10 text-sm focus:border-blue-500/50"
              disabled={isSaving}
            />
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-xs font-medium text-gray-400 ml-1">E-posta</label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
            <Input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleInputChange}
              placeholder="E-posta"
              className="pl-10 bg-white/5 border-white/10 text-white h-10 text-sm focus:border-blue-500/50"
              disabled={isSaving}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default CustomerForm;
// --- END OF FILE src/components/customer/CustomerForm.tsx ---