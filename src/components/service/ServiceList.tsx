// --- START OF FILE src/components/service/ServiceList.tsx ---

import React, { useState, useMemo } from 'react';
import { Search, Edit, Trash, Printer, User, Loader2, MessageCircle, Smartphone, Wrench, Calendar, AlertCircle } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import type { Customer, Service } from "@/types/service";
import { getStatusColor, getStatusText, formatDate } from "@/utils/serviceUtils";
import { printServiceRecord } from "@/utils/printUtils";
import { supabase } from "@/integrations/supabase/client";
import CustomerInfoDialog from './CustomerInfoDialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { generateServiceMessage, openWhatsApp } from "@/utils/whatsappUtils";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

type StatusFilter = Service['status'] | 'all';

interface ServiceListProps {
  services: Service[];
  customers: Customer[];
  onDeleteService: (id: string) => void;
  onEditService: (service: Service) => void;
  isLoading: boolean;
  fetchServices: () => Promise<void>;
  activeFilter: StatusFilter;
}

const safeToLower = (str: string | null | undefined): string => typeof str === 'string' ? str.toLowerCase() : '';

const ServiceList: React.FC<ServiceListProps> = ({
  services = [],
  customers = [],
  onDeleteService,
  onEditService,
  isLoading,
  fetchServices,
  activeFilter,
}) => {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [isDeletingId, setIsDeletingId] = useState<string | null>(null);
  const [isCustomerInfoOpen, setIsCustomerInfoOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [selectedServiceContext, setSelectedServiceContext] = useState<Service | null>(null);

  const filteredServices = useMemo(() => {
    if (!Array.isArray(services)) return [];
    const lowerSearchTerm = searchTerm.toLowerCase().trim();
    const statusFiltered = activeFilter === 'all' ? services : services.filter(service => service?.status === activeFilter);
    if (!lowerSearchTerm) return statusFiltered;
    return statusFiltered.filter(service => service && (
      safeToLower(service.customerName).includes(lowerSearchTerm) ||
      safeToLower(service.deviceType).includes(lowerSearchTerm) ||
      safeToLower(service.serialNumber).includes(lowerSearchTerm) ||
      safeToLower(service.brand).includes(lowerSearchTerm) ||
      safeToLower(service.model).includes(lowerSearchTerm) ||
      safeToLower(service.problem).includes(lowerSearchTerm) ||
      safeToLower(getStatusText(service.status)).includes(lowerSearchTerm)
    ));
  }, [services, searchTerm, activeFilter]);

  const handleDelete = async (service: Service) => {
    if (isDeletingId) return;
    let confirmMessage = `Bu servis kaydını (${service.customerName} - ${service.deviceType}) silmek istiyor musunuz?`;
    if (service.status === 'completed' && service.cost > 0) {
      const { data: relatedSale } = await supabase.from('sales').select('id').eq('related_service_id', service.id).maybeSingle();
      const { data: relatedAccTx } = await supabase.from('account_transactions').select('id').eq('related_service_id', service.id).limit(1);
      if (relatedSale || (relatedAccTx && relatedAccTx.length > 0)) confirmMessage += '\n\nUYARI: Bu servisle ilişkili satış ve/veya hesap hareketi(leri) de bulunmaktadır. Bu işlem geri alınamaz!';
      else confirmMessage += '\nBu işlem geri alınamaz!';
    } else confirmMessage += '\nBu işlem geri alınamaz!';

    if (window.confirm(confirmMessage)) {
      setIsDeletingId(service.id);
      try {
        await supabase.from('account_transactions').delete().eq('related_service_id', service.id);
        await supabase.from('sales').delete().eq('related_service_id', service.id);
        const { error } = await supabase.from('services').delete().eq('id', service.id);
        if (error) toast({ title: "Hata", description: `Servis kaydı silinemedi: ${error.message}`, variant: "destructive" });
        else onDeleteService(service.id);
      } catch (error: any) {
        toast({ title: "Hata", description: `Silme işlemi sırasında hata: ${error.message}`, variant: "destructive", });
      } finally { setIsDeletingId(null); }
    }
  };

  const handlePrint = (service: Service) => {
    const customer = customers.find(c => c.id === service.customer_id);
    printServiceRecord(service, customer || undefined);
  };

  const handleCustomerClick = (service: Service) => {
    const customer = customers.find(c => c.id === service.customer_id);
    if (customer) { setSelectedCustomer(customer); setSelectedServiceContext(service); setIsCustomerInfoOpen(true); }
    else { toast({ title: "Hata", description: "Müşteri bulunamadı.", variant: "destructive" }); }
  };

  const handleWhatsApp = (service: Service) => {
    const customer = customers.find(c => c.id === service.customer_id);
    if (!customer) { toast({ title: "Hata", description: "Müşteri bilgisine ulaşılamadı.", variant: "destructive" }); return; }
    if (!customer.phone) { toast({ title: "Uyarı", description: "Müşterinin telefon numarası kayıtlı değil.", variant: "destructive" }); return; }

    const deviceName = `${service.brand || ''} ${service.model || ''} ${service.deviceType || 'Cihaz'}`.trim();

    const message = generateServiceMessage(customer.name, deviceName, service.status, service.cost, service.tracking_code);
    openWhatsApp(customer.phone, message);
  };

  return (
    <div className="flex flex-col h-full space-y-4">
      <div className="flex-shrink-0">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-500" />
          <Input
            placeholder="Müşteri, cihaz, sorun, durum vb. ara..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 bg-black/40 border-white/10 text-white h-10 focus:border-blue-500/50"
          />
        </div>
      </div>

      <div className="flex-1 glass-panel overflow-hidden flex flex-col">
        <div className="flex-1 overflow-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-gray-400 uppercase bg-white/5 sticky top-0 z-10 backdrop-blur-md">
              <tr>
                <th className="px-4 py-3 font-medium rounded-tl-lg">Tarih</th>
                <th className="px-4 py-3 font-medium">Müşteri</th>
                <th className="px-4 py-3 font-medium">Cihaz</th>
                <th className="px-4 py-3 font-medium hidden md:table-cell">Sorun</th>
                <th className="px-4 py-3 font-medium text-center">Durum</th>
                <th className="px-4 py-3 font-medium text-right hidden sm:table-cell">Ücret</th>
                <th className="px-4 py-3 font-medium text-center rounded-tr-lg">İşlem</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {isLoading ? (
                <tr><td colSpan={7} className="h-32 text-center text-gray-500"><Loader2 className="inline mr-2 h-6 w-6 animate-spin" /> Yükleniyor...</td></tr>
              ) : !Array.isArray(filteredServices) || filteredServices.length === 0 ? (
                <tr><td colSpan={7} className="h-32 text-center text-gray-500 italic flex flex-col items-center justify-center gap-2">
                  <Wrench className="h-8 w-8 opacity-20" />
                  {searchTerm || activeFilter !== 'all' ? 'Filtreye uygun kayıt bulunamadı.' : 'Servis kaydı yok.'}
                </td></tr>
              ) : (
                filteredServices.map((service) => (
                  <tr key={service.id} className="hover:bg-white/5 transition-colors group">
                    <td className="px-4 py-3 whitespace-nowrap text-gray-400 text-xs">
                      <div className="flex flex-col">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-3 w-3" />
                          {formatDate(service.date)}
                        </div>
                        {service.tracking_code && (
                          <span className="text-[10px] text-gray-500 font-mono mt-1 ml-5 tracking-wider">#{service.tracking_code}</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <button onClick={() => handleCustomerClick(service)} className="flex items-center gap-2 text-blue-400 hover:text-blue-300 transition-colors font-medium">
                        <User className="h-3 w-3" />
                        {service.customerName || 'Misafir'}
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col">
                        <span className="font-medium text-gray-200 flex items-center gap-1">
                          <Smartphone className="h-3 w-3 text-gray-500" />
                          {service.brand} {service.model}
                        </span>
                        <span className="text-xs text-gray-500 ml-4">{service.deviceType}</span>
                        {service.serialNumber && <span className="text-[10px] text-gray-600 font-mono ml-4">SN: {service.serialNumber}</span>}
                      </div>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell max-w-[200px]">
                      <div className="flex items-start gap-2">
                        <AlertCircle className="h-3 w-3 text-red-400 mt-1 flex-shrink-0" />
                        <p className="truncate text-gray-400 text-xs" title={service.problem}>{service.problem}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <Badge variant="outline" className={cn("text-xs font-normal border-0",
                        service.status === 'completed' && "bg-green-500/10 text-green-400 shadow-[0_0_10px_rgba(34,197,94,0.2)]",
                        service.status === 'in_progress' && "bg-blue-500/10 text-blue-400 shadow-[0_0_10px_rgba(59,130,246,0.2)] animate-pulse",
                        service.status === 'pending' && "bg-yellow-500/10 text-yellow-400",
                        service.status === 'cancelled' && "bg-red-500/10 text-red-400"
                      )}>
                        {getStatusText(service.status)}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-right hidden sm:table-cell">
                      <span className={cn("font-mono font-bold",
                        service.cost > 0 ? "text-emerald-400" : "text-gray-500"
                      )}>
                        {service.cost.toFixed(2)}₺
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex justify-center items-center gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                        {isDeletingId === service.id ? (<Loader2 className="h-4 w-4 animate-spin text-gray-400" />) : (
                          <>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-blue-400 hover:bg-blue-500/10 hover:text-blue-300" onClick={() => onEditService(service)} disabled={!!isDeletingId} title="Düzenle">
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-purple-400 hover:bg-purple-500/10 hover:text-purple-300" onClick={() => handlePrint(service)} disabled={!!isDeletingId} title="Yazdır">
                              <Printer className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-green-400 hover:bg-green-500/10 hover:text-green-300" onClick={() => handleWhatsApp(service)} disabled={!!isDeletingId} title="WhatsApp">
                              <MessageCircle className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-red-400 hover:bg-red-500/10 hover:text-red-300" onClick={() => handleDelete(service)} disabled={!!isDeletingId} title="Sil">
                              <Trash className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
      <CustomerInfoDialog isOpen={isCustomerInfoOpen} setIsOpen={setIsCustomerInfoOpen} customer={selectedCustomer} serviceContext={selectedServiceContext} />
    </div>
  );
};

export default ServiceList;
// --- END OF FILE src/components/service/ServiceList.tsx ---