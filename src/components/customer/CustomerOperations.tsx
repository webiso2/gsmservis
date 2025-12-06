// --- START OF FILE src/components/customer/CustomerOperations.tsx ---

import React from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { DollarSign, ClipboardList, Clock, UserPlus, FileEdit, UserMinus, Loader2, X as CancelIcon, FileText, CreditCard } from "lucide-react";
import { Customer, FormData } from "@/types/customer";
import { cn } from "@/lib/utils";

interface CustomerOperationsProps {
  formData: FormData;
  handleInputChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  selectedCustomer: Customer | null;
  isEditing: boolean;
  isSaving: boolean;
  isLoading: boolean;
  handleDebtDetailsClick: (customer: Customer | null) => void;
  handleAddDebt: () => void;
  handlePayment: () => void;
  handleAddCustomer: () => void;
  handleEditClick: () => void;
  handleCancelEdit: () => void;
  handleDeleteCustomer: () => void;
}

const CustomerOperations: React.FC<CustomerOperationsProps> = ({
  formData,
  handleInputChange,
  selectedCustomer,
  isEditing,
  isSaving,
  isLoading,
  handleDebtDetailsClick,
  handleAddDebt,
  handlePayment,
  handleAddCustomer,
  handleEditClick,
  handleCancelEdit,
  handleDeleteCustomer
}) => {

  const isBorcEkleDisabled = !selectedCustomer || isEditing || isLoading || isSaving;

  return (
    <div className="space-y-4 p-4">
      <div className="space-y-2">
        <label className="text-xs font-medium text-gray-400 ml-1">Özel Notlar</label>
        <div className="relative">
          <FileText className="absolute left-3 top-3 h-4 w-4 text-gray-500" />
          <Textarea
            name="notes"
            value={formData.notes}
            onChange={handleInputChange}
            className="pl-10 min-h-[80px] bg-white/5 border-white/10 text-white text-sm focus:border-blue-500/50"
            placeholder="Müşteriyle ilgili özel notlar"
            disabled={isSaving || (!isEditing && !selectedCustomer)}
          />
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-xs font-medium text-gray-400 ml-1">Kredi Limiti</label>
        <div className="relative">
          <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
          <Input
            type="number"
            name="credit_limit"
            value={formData.credit_limit}
            onChange={handleInputChange}
            placeholder="0.00"
            className="pl-10 bg-white/5 border-white/10 text-white h-10 text-sm focus:border-blue-500/50"
            disabled={isSaving || (!isEditing && !selectedCustomer)}
          />
        </div>
      </div>

      {selectedCustomer && !isEditing && (
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-xs font-medium text-gray-400 ml-1">Toplam Kredi</label>
            <Input type="number" value={selectedCustomer?.total_credit || 0} readOnly className="bg-white/5 border-white/10 text-gray-400 h-10 text-sm" />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-medium text-gray-400 ml-1">Toplam Borç (Geçmiş)</label>
            <Input type="number" value={selectedCustomer?.total_debt || 0} readOnly className="bg-white/5 border-white/10 text-gray-400 h-10 text-sm" />
          </div>
          <div className="col-span-2 space-y-2">
            <label className="text-xs font-medium text-gray-400 ml-1">Güncel Bakiye</label>
            <Input
              type="number"
              value={selectedCustomer?.debt || 0}
              readOnly
              className={cn(
                "bg-white/5 border-white/10 h-10 text-sm font-bold",
                selectedCustomer?.debt > 0 ? 'text-red-400' : 'text-emerald-400'
              )}
            />
          </div>
        </div>
      )}

      <div className="grid grid-cols-3 gap-2 pt-2">
        <Button
          variant="outline"
          className="w-full bg-white/5 border-white/10 text-gray-300 hover:bg-blue-500/20 hover:text-blue-300 hover:border-blue-500/30"
          onClick={() => handleDebtDetailsClick(selectedCustomer)}
          disabled={!selectedCustomer || isEditing || isLoading || isSaving}
        >
          <ClipboardList className="h-4 w-4 mr-2" />
          <span className="hidden sm:inline">Borç Detayı</span>
        </Button>

        <Button
          variant="outline"
          className="w-full bg-white/5 border-white/10 text-gray-300 hover:bg-emerald-500/20 hover:text-emerald-300 hover:border-emerald-500/30"
          onClick={handleAddDebt}
          disabled={isBorcEkleDisabled}
        >
          {(isSaving || isLoading) ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <DollarSign className="h-4 w-4 mr-2" />}
          <span className="hidden sm:inline">Borç Ekle</span>
        </Button>

        <Button
          variant="outline"
          className="w-full bg-white/5 border-white/10 text-gray-300 hover:bg-purple-500/20 hover:text-purple-300 hover:border-purple-500/30"
          onClick={handlePayment}
          disabled={!selectedCustomer || selectedCustomer.debt <= 0 || isEditing || isLoading || isSaving}
        >
          {(isSaving || isLoading) ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Clock className="h-4 w-4 mr-2" />}
          <span className="hidden sm:inline">Tahsilat</span>
        </Button>
      </div>

      <div className="grid grid-cols-3 gap-2 mt-2">
        {isEditing ? (
          <>
            <Button variant="default" className="bg-blue-600 hover:bg-blue-700 text-white shadow-[0_0_15px_rgba(37,99,235,0.4)]"
              onClick={handleEditClick}
              disabled={isSaving}
            >
              {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileEdit className="mr-2 h-4 w-4" />}
              Kaydet
            </Button>

            <Button variant="outline" className="bg-white/5 border-white/10 text-gray-300 hover:bg-white/10 hover:text-white"
              onClick={handleCancelEdit}
              disabled={isSaving}
            >
              <CancelIcon className="mr-2 h-4 w-4" />
              İptal
            </Button>

            <Button variant="outline" className="bg-white/5 border-white/10 text-gray-500 cursor-not-allowed" disabled={true}>
              <UserMinus className="mr-2 h-4 w-4" /> Sil
            </Button>
          </>
        ) : (
          <>
            <Button variant="default" className="bg-blue-600 hover:bg-blue-700 text-white shadow-[0_0_15px_rgba(37,99,235,0.4)]"
              onClick={handleAddCustomer}
              disabled={isSaving || isLoading}
            >
              {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UserPlus className="mr-2 h-4 w-4" />}
              Ekle
            </Button>

            <Button variant="outline" className="bg-white/5 border-white/10 text-gray-300 hover:bg-blue-500/20 hover:text-blue-300 hover:border-blue-500/30"
              onClick={handleEditClick}
              disabled={!selectedCustomer || isSaving || isLoading}
            >
              <FileEdit className="mr-2 h-4 w-4" /> Düzenle
            </Button>

            <Button variant="outline" className="bg-white/5 border-white/10 text-gray-300 hover:bg-red-500/20 hover:text-red-300 hover:border-red-500/30"
              onClick={handleDeleteCustomer}
              disabled={!selectedCustomer || isLoading || isSaving}
            >
              {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UserMinus className="mr-2 h-4 w-4" />}
              Sil
            </Button>
          </>
        )}
      </div>
    </div>
  );
};

export default CustomerOperations;
// --- END OF FILE src/components/customer/CustomerOperations.tsx ---