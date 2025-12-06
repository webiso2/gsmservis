// --- START OF FILE src/components/service/CustomerInfoDialog.tsx ---

import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Phone,
  Mail,
  MapPin,
  StickyNote,
  Wrench,
  User,
  Calendar,
  Hash,
  ClipboardList,
  CheckCircle,
  Clock,
  XCircle,
  DollarSign,
  Info,
  CreditCard,
  X as CancelIcon
} from "lucide-react";
import { formatDate, getStatusText, getStatusColor } from "@/utils/serviceUtils";
import { Customer, Service } from "@/types/service";
import { cn } from "@/lib/utils";

interface CustomerInfoDialogProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  customer: Customer | null;
  serviceContext?: Service | null;
}

const renderField = (
  label: string,
  value: string | number | null | undefined,
  icon?: React.ReactNode,
  className?: string
) => {
  if (value === null || value === undefined || value === "") return null;
  return (
    <div className={cn("flex items-start gap-3 p-2 rounded-lg hover:bg-white/5 transition-colors", className)}>
      {icon && <div className="mt-0.5 text-gray-400">{icon}</div>}
      <div className="flex-1">
        <p className="text-xs text-gray-500 font-medium">{label}</p>
        <p className="text-sm text-gray-200">{value}</p>
      </div>
    </div>
  );
};

const renderCurrencyField = (
  label: string,
  value: number | null | undefined,
  icon?: React.ReactNode,
  className?: string
) => {
  if (value === null || value === undefined) return null;
  return (
    <div className={cn("flex items-start gap-3 p-2 rounded-lg hover:bg-white/5 transition-colors", className)}>
      {icon || <DollarSign className="h-4 w-4 text-emerald-400 mt-0.5" />}
      <div className="flex-1">
        <p className="text-xs text-gray-500 font-medium">{label}</p>
        <p className="text-sm font-mono font-bold text-emerald-400">{value.toFixed(2)} ₺</p>
      </div>
    </div>
  );
};

const renderStatusField = (label: string, status: Service["status"] | undefined) => {
  if (!status) return null;
  const text = getStatusText(status);
  const color = getStatusColor(status);
  let IconComponent;
  switch (status) {
    case "completed": IconComponent = CheckCircle; break;
    case "in_progress": IconComponent = Clock; break;
    case "cancelled": IconComponent = XCircle; break;
    case "pending": default: IconComponent = Info; break;
  }
  return (
    <div className="flex items-center gap-3 p-2 rounded-lg bg-white/5 border border-white/5">
      <IconComponent className={cn("h-5 w-5", color)} />
      <div>
        <p className="text-xs text-gray-500 font-medium">{label}</p>
        <p className={cn("text-sm font-bold", color)}>{text}</p>
      </div>
    </div>
  );
};

const CustomerInfoDialog: React.FC<CustomerInfoDialogProps> = ({
  isOpen,
  setIsOpen,
  customer,
  serviceContext,
}) => {
  if (!isOpen || !customer) return null;

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto bg-gray-900 border border-white/10 text-white p-0 shadow-2xl backdrop-blur-xl">
        <DialogHeader className="bg-white/5 border-b border-white/10 p-4 flex flex-row justify-between items-center space-y-0">
          <DialogTitle className="text-lg font-bold flex items-center gap-2">
            <User className="h-5 w-5 text-blue-400" />
            {customer.name}
            <span className="text-sm font-normal text-gray-400 ml-2">- Detaylı Bilgiler</span>
          </DialogTitle>
          <DialogDescription className="sr-only">
            Bu pencere, seçilen müşteri '{customer.name}' için iletişim bilgilerini,
            finansal durumu, notları ve (varsa) ilgili servis kaydının detaylarını gösterir.
          </DialogDescription>
          <DialogClose asChild>
            <Button variant="ghost" size="icon" className="text-gray-400 hover:text-white hover:bg-white/10 h-8 w-8 rounded-full">
              <CancelIcon className="h-4 w-4" />
            </Button>
          </DialogClose>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-0">
          <div className="p-6 space-y-6 border-b md:border-b-0 md:border-r border-white/10">
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-blue-400 uppercase tracking-wider border-b border-blue-500/20 pb-2 flex items-center gap-2">
                <User className="h-4 w-4" /> Müşteri İletişim
              </h3>
              <div className="space-y-1">
                {renderField("Telefon", customer.phone, <Phone className="h-4 w-4" />)}
                {renderField("E-posta", customer.email, <Mail className="h-4 w-4" />)}
                {renderField("Adres", customer.address, <MapPin className="h-4 w-4" />)}
                {renderField("Şehir", customer.city, <MapPin className="h-4 w-4" />)}
              </div>
            </div>

            {(customer.credit_limit != null || customer.total_debt != null || customer.debt != null) && (
              <div className="space-y-4 pt-2">
                <h3 className="text-sm font-bold text-emerald-400 uppercase tracking-wider border-b border-emerald-500/20 pb-2 flex items-center gap-2">
                  <CreditCard className="h-4 w-4" /> Finansal Durum
                </h3>
                <div className="grid grid-cols-2 gap-2">
                  {renderCurrencyField("Kredi Limiti", customer.credit_limit)}
                  {renderCurrencyField("Toplam Borç", customer.total_debt)}
                  {renderCurrencyField("Ödenmemiş Borç", customer.debt)}
                  {renderField("Kalan Taksit", customer.remaining_installments, <Hash className="h-4 w-4 text-gray-400" />)}
                </div>
              </div>
            )}

            {customer.notes && (
              <div className="space-y-2 pt-2">
                <h3 className="text-sm font-bold text-yellow-400 uppercase tracking-wider border-b border-yellow-500/20 pb-2 flex items-center gap-2">
                  <StickyNote className="h-4 w-4" /> Notlar
                </h3>
                <div className="bg-yellow-500/10 border border-yellow-500/20 p-3 rounded-lg text-sm text-yellow-200/90 italic">
                  {customer.notes}
                </div>
              </div>
            )}

            <div className="pt-4 text-xs text-gray-500 flex items-center gap-2">
              <Calendar className="h-3 w-3" />
              Kayıt Tarihi: {formatDate(customer.created_at)}
            </div>
          </div>

          <div className="p-6 space-y-6 bg-black/20">
            {serviceContext ? (
              <div className="space-y-6">
                <h3 className="text-sm font-bold text-purple-400 uppercase tracking-wider border-b border-purple-500/20 pb-2 flex items-center gap-2">
                  <Wrench className="h-4 w-4" /> İlgili Servis Kaydı
                </h3>

                <div className="space-y-1">
                  {renderField("Servis Tarihi", formatDate(serviceContext.date), <Calendar className="h-4 w-4" />)}
                  {renderField("Cihaz", `${serviceContext.deviceType} ${serviceContext.brand} ${serviceContext.model}`, <Wrench className="h-4 w-4" />)}
                  {renderField("Seri Numarası", serviceContext.serialNumber, <Hash className="h-4 w-4" />)}
                </div>

                <div className="space-y-4">
                  <div className="bg-white/5 p-3 rounded-lg border border-white/5 space-y-1">
                    <h4 className="text-xs font-bold text-gray-400 flex items-center gap-2 mb-1">
                      <ClipboardList className="h-3 w-3" /> Şikayet
                    </h4>
                    <p className="text-sm text-gray-200">{serviceContext.problem}</p>
                  </div>

                  {serviceContext.diagnosis && (
                    <div className="bg-white/5 p-3 rounded-lg border border-white/5 space-y-1">
                      <h4 className="text-xs font-bold text-gray-400 flex items-center gap-2 mb-1">
                        <ClipboardList className="h-3 w-3" /> Teşhis
                      </h4>
                      <p className="text-sm text-gray-200">{serviceContext.diagnosis}</p>
                    </div>
                  )}

                  {serviceContext.solution && (
                    <div className="bg-white/5 p-3 rounded-lg border border-white/5 space-y-1">
                      <h4 className="text-xs font-bold text-gray-400 flex items-center gap-2 mb-1">
                        <CheckCircle className="h-3 w-3" /> Yapılan İşlem
                      </h4>
                      <p className="text-sm text-gray-200">{serviceContext.solution}</p>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4 pt-2">
                  {renderStatusField("Durum", serviceContext.status)}
                  <div className="flex items-center gap-3 p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                    <DollarSign className="h-5 w-5 text-emerald-400" />
                    <div>
                      <p className="text-xs text-emerald-400/70 font-medium">Servis Ücreti</p>
                      <p className="text-sm font-bold text-emerald-400">{serviceContext.cost?.toFixed(2)} ₺</p>
                    </div>
                  </div>
                </div>

                <div className="text-xs text-gray-500 font-mono text-right">
                  ID: {serviceContext.id.substring(0, 8)}...
                </div>
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-gray-500 gap-3">
                <Wrench className="h-12 w-12 opacity-20" />
                <p>İlişkili servis kaydı seçilmedi.</p>
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="bg-white/5 border-t border-white/10 p-4">
          <DialogClose asChild>
            <Button variant="outline" className="bg-transparent border-white/10 text-gray-300 hover:bg-white/10 hover:text-white">
              Kapat
            </Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CustomerInfoDialog;
// --- END OF FILE src/components/service/CustomerInfoDialog.tsx ---