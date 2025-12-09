// --- START OF FILE src/components/customer/CustomerDetailPanel.tsx ---

import React, { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { Customer, CustomerTransaction } from "@/types/customer";
import { Service } from "@/types/service";
import { SimpleSale, SaleItem } from '@/types/service';
import { Loader2, User, Wrench, ShoppingCart, DollarSign, Info, X, Phone, Mail, MapPin, FileText, CreditCard, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import { getStatusText, getStatusColor, formatDate as formatServiceDate } from '@/utils/serviceUtils';
import { formatPhoneNumber } from '@/utils/customerUtils';
import { cn } from "@/lib/utils";

interface CustomerDetailPanelProps {
  customerId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const CustomerDetailPanel: React.FC<CustomerDetailPanelProps> = ({ customerId, open, onOpenChange }) => {
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [sales, setSales] = useState<SimpleSale[]>([]);
  const [transactions, setTransactions] = useState<CustomerTransaction[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const formatCurrency = (value: number | null | undefined): string => {
    return (value ?? 0).toFixed(2) + '₺';
  };

  const fetchData = useCallback(async () => {
    if (!customerId) return;
    setIsLoading(true); setError(null);
    setCustomer(null); setServices([]); setSales([]); setTransactions([]);
    try {
      const [customerRes, servicesRes, salesRes, transactionsRes] = await Promise.all([
        supabase.from('customers').select('*').eq('id', customerId).single(),
        supabase.from('services').select('*').eq('customer_id', customerId).order('date', { ascending: false }),
        supabase.from('sales').select('*').eq('customer_id', customerId).order('date', { ascending: false }),
        supabase.from('customer_transactions').select('*').eq('customer_id', customerId).order('created_at', { ascending: true })
      ]);

      if (customerRes.error) throw new Error(`Müşteri bilgisi: ${customerRes.error.message}`);
      if (servicesRes.error) throw new Error(`Servisler: ${servicesRes.error.message}`);
      if (salesRes.error) throw new Error(`Satışlar: ${salesRes.error.message}`);
      if (transactionsRes.error) throw new Error(`Finans: ${transactionsRes.error.message}`);

      if (customerRes.data) { setCustomer({ ...customerRes.data, phone: customerRes.data.phone ?? null, address: customerRes.data.address ?? null, city: customerRes.data.city ?? null, email: customerRes.data.email ?? null, notes: customerRes.data.notes ?? null, credit_limit: customerRes.data.credit_limit ?? 0, total_credit: customerRes.data.total_credit ?? 0, remaining_installments: customerRes.data.remaining_installments ?? 0, total_debt: customerRes.data.total_debt ?? 0, debt: customerRes.data.debt ?? 0, }); }
      else { throw new Error("Müşteri bulunamadı."); }

      setServices(servicesRes.data?.map(s => ({ ...s, deviceType: s.device_type, serialNumber: s.serial_number })) || []);
      setSales(salesRes.data?.map(s => ({ ...s, type: 'sale' as const, items: s.items as SaleItem[], net_total: s.net_total ?? 0, discount_amount: s.discount_amount ?? 0 })) || []);
      let runningBalance = 0; const calculatedTransactions = (transactionsRes.data || []).map(t => ({ ...t, balance: runningBalance += t.amount })); setTransactions(calculatedTransactions || []);

    } catch (err: any) { console.error("Detay Hata:", err); setError(err.message || "Veriler yüklenirken hata."); }
    finally { setIsLoading(false); }
  }, [customerId]);

  useEffect(() => { if (open && customerId) { fetchData(); } }, [open, customerId, fetchData]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl h-[85vh] flex flex-col bg-gray-900 border border-white/10 text-white p-0 shadow-2xl backdrop-blur-xl">
        <DialogHeader className="bg-white/5 border-b border-white/10 p-4 flex flex-row items-center justify-between space-y-0">
          <DialogTitle className="flex items-center gap-3 text-lg font-bold">
            <div className="p-2 rounded-full bg-blue-500/20 text-blue-400">
              <User className="h-5 w-5" />
            </div>
            <div className="flex flex-col">
              <span>{isLoading ? 'Yükleniyor...' : (customer?.name || 'Bulunamadı')}</span>
              <span className="text-xs font-normal text-gray-400">Müşteri Detayları</span>
            </div>
          </DialogTitle>
          <DialogDescription className="sr-only">
            Seçilen müşterinin iletişim, adres, borç ve işlem geçmişi detayları.
          </DialogDescription>
          <DialogClose asChild>
            <Button variant="ghost" size="icon" className="text-gray-400 hover:text-white hover:bg-white/10 h-8 w-8 rounded-full">
              <X className="h-4 w-4" />
            </Button>
          </DialogClose>
        </DialogHeader>

        {isLoading ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-3 text-gray-500">
            <Loader2 className="h-10 w-10 animate-spin text-blue-500" />
            <p>Müşteri bilgileri yükleniyor...</p>
          </div>
        ) : error ? (
          <div className="flex-1 flex items-center justify-center text-red-400 font-semibold p-4 bg-red-500/10 m-4 rounded-lg border border-red-500/20">
            {error}
          </div>
        ) : customer ? (
          <Tabs defaultValue="info" className="flex-1 flex flex-col overflow-hidden">
            <div className="px-6 pt-4 border-b border-white/5">
              <TabsList className="bg-black/20 border border-white/5 p-1 h-auto w-full justify-start gap-2 rounded-lg">
                <TabsTrigger value="info" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white text-gray-400 hover:text-white hover:bg-white/5 transition-all px-4 py-2 h-9">
                  <Info className="h-4 w-4 mr-2" />Bilgiler
                </TabsTrigger>
                <TabsTrigger value="services" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white text-gray-400 hover:text-white hover:bg-white/5 transition-all px-4 py-2 h-9">
                  <Wrench className="h-4 w-4 mr-2" />Servisler <span className="ml-2 px-1.5 py-0.5 rounded-full bg-black/20 text-xs">{services.length}</span>
                </TabsTrigger>
                <TabsTrigger value="sales" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white text-gray-400 hover:text-white hover:bg-white/5 transition-all px-4 py-2 h-9">
                  <ShoppingCart className="h-4 w-4 mr-2" />Satışlar <span className="ml-2 px-1.5 py-0.5 rounded-full bg-black/20 text-xs">{sales.length}</span>
                </TabsTrigger>
                <TabsTrigger value="finance" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white text-gray-400 hover:text-white hover:bg-white/5 transition-all px-4 py-2 h-9">
                  <DollarSign className="h-4 w-4 mr-2" />Finans <span className="ml-2 px-1.5 py-0.5 rounded-full bg-black/20 text-xs">{transactions.length}</span>
                </TabsTrigger>
              </TabsList>
            </div>

            <div className="flex-1 overflow-hidden bg-black/20">
              <TabsContent value="info" className="h-full m-0 p-6 overflow-auto">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="glass-card p-5 rounded-xl border border-white/10 space-y-4">
                    <h3 className="text-lg font-semibold text-white border-b border-white/10 pb-2 mb-4 flex items-center gap-2">
                      <User className="h-5 w-5 text-blue-400" /> Kişisel Bilgiler
                    </h3>
                    <div className="space-y-3">
                      <div className="flex items-center gap-3 text-sm">
                        <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center flex-shrink-0">
                          <User className="h-4 w-4 text-gray-400" />
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Ad Soyad</p>
                          <p className="text-gray-200 font-medium">{customer.name}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 text-sm">
                        <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center flex-shrink-0">
                          <Phone className="h-4 w-4 text-gray-400" />
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Telefon</p>
                          <p className="text-gray-200 font-medium">{formatPhoneNumber(customer.phone) || '-'}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 text-sm">
                        <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center flex-shrink-0">
                          <Mail className="h-4 w-4 text-gray-400" />
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">E-posta</p>
                          <p className="text-gray-200 font-medium">{customer.email || '-'}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="glass-card p-5 rounded-xl border border-white/10 space-y-4">
                    <h3 className="text-lg font-semibold text-white border-b border-white/10 pb-2 mb-4 flex items-center gap-2">
                      <MapPin className="h-5 w-5 text-purple-400" /> Adres & Notlar
                    </h3>
                    <div className="space-y-3">
                      <div className="flex items-start gap-3 text-sm">
                        <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center flex-shrink-0 mt-0.5">
                          <MapPin className="h-4 w-4 text-gray-400" />
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Adres</p>
                          <p className="text-gray-200 font-medium">{customer.address || '-'}</p>
                          {customer.city && <p className="text-gray-400 text-xs mt-1">{customer.city}</p>}
                        </div>
                      </div>
                      <div className="flex items-start gap-3 text-sm">
                        <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center flex-shrink-0 mt-0.5">
                          <FileText className="h-4 w-4 text-gray-400" />
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Notlar</p>
                          <p className="text-gray-200 font-medium italic">{customer.notes || '-'}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="glass-card p-5 rounded-xl border border-white/10 space-y-4 md:col-span-2">
                    <h3 className="text-lg font-semibold text-white border-b border-white/10 pb-2 mb-4 flex items-center gap-2">
                      <CreditCard className="h-5 w-5 text-emerald-400" /> Finansal Durum
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      {(() => {
                        const calculatedBalance = transactions.reduce((sum, t) => sum + t.amount, 0);
                        const calculatedTotalPayments = transactions
                          .filter(t => t.amount < 0)
                          .reduce((sum, t) => sum + Math.abs(t.amount), 0);

                        return (
                          <>
                            <div className="p-4 rounded-lg bg-white/5 border border-white/10">
                              <p className="text-xs text-gray-500 mb-1">Güncel Bakiye / Borç</p>
                              <p className={cn("text-2xl font-bold font-mono", calculatedBalance > 0 ? 'text-red-400' : 'text-emerald-400')}>
                                {formatCurrency(calculatedBalance)}
                              </p>
                            </div>
                            <div className="p-4 rounded-lg bg-white/5 border border-white/10">
                              <p className="text-xs text-gray-500 mb-1">Kredi Limiti</p>
                              <p className="text-2xl font-bold font-mono text-gray-200">
                                {formatCurrency(customer.credit_limit)}
                              </p>
                            </div>
                            <div className="p-4 rounded-lg bg-white/5 border border-white/10">
                              <p className="text-xs text-gray-500 mb-1">Toplam Ödeme</p>
                              <p className="text-2xl font-bold font-mono text-gray-200">
                                {formatCurrency(calculatedTotalPayments)}
                              </p>
                            </div>
                          </>
                        );
                      })()}
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="services" className="h-full m-0">
                <ScrollArea className="h-full">
                  <table className="w-full text-sm text-left">
                    <thead className="sticky top-0 bg-gray-900/95 backdrop-blur-sm z-10 border-b border-white/10 text-gray-400">
                      <tr>
                        <th className="px-6 py-3 font-medium">Tarih</th>
                        <th className="px-6 py-3 font-medium">Cihaz</th>
                        <th className="px-6 py-3 font-medium">Sorun</th>
                        <th className="px-6 py-3 font-medium text-center">Durum</th>
                        <th className="px-6 py-3 font-medium text-right">Ücret</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {services.length === 0 ? (
                        <tr><td colSpan={5} className="p-8 text-center text-gray-500">Servis kaydı bulunamadı.</td></tr>
                      ) : (
                        services.map(s => (
                          <tr key={s.id} className="hover:bg-white/5 transition-colors">
                            <td className="px-6 py-3 text-gray-300 whitespace-nowrap font-mono text-xs">
                              <div className="flex items-center gap-2">
                                <Calendar className="h-3 w-3 text-gray-500" />
                                {formatServiceDate(s.date)}
                              </div>
                            </td>
                            <td className="px-6 py-3 text-gray-300">{s.deviceType} {s.brand} {s.model}</td>
                            <td className="px-6 py-3 text-gray-400 max-w-[250px] truncate">{s.problem}</td>
                            <td className="px-6 py-3 text-center">
                              <span className={cn("px-2 py-1 rounded-full text-xs font-medium border", getStatusColor(s.status))}>
                                {getStatusText(s.status)}
                              </span>
                            </td>
                            <td className="px-6 py-3 text-right whitespace-nowrap font-mono font-medium text-emerald-400">{formatCurrency(s.cost)}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </ScrollArea>
              </TabsContent>

              <TabsContent value="sales" className="h-full m-0">
                <ScrollArea className="h-full">
                  <table className="w-full text-sm text-left">
                    <thead className="sticky top-0 bg-gray-900/95 backdrop-blur-sm z-10 border-b border-white/10 text-gray-400">
                      <tr>
                        <th className="px-6 py-3 font-medium">Tarih</th>
                        <th className="px-6 py-3 font-medium">Ürünler</th>
                        <th className="px-6 py-3 font-medium text-right">İndirim</th>
                        <th className="px-6 py-3 font-medium text-right">Net Tutar</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {sales.length === 0 ? (
                        <tr><td colSpan={4} className="p-8 text-center text-gray-500">Satış kaydı bulunamadı.</td></tr>
                      ) : (
                        sales.map(s => (
                          <tr key={s.id} className="hover:bg-white/5 transition-colors">
                            <td className="px-6 py-3 text-gray-300 whitespace-nowrap font-mono text-xs">
                              <div className="flex items-center gap-2">
                                <Calendar className="h-3 w-3 text-gray-500" />
                                {formatServiceDate(s.date)}
                              </div>
                            </td>
                            <td className="px-6 py-3 text-gray-300 max-w-[350px] truncate">
                              {s.items?.map(item => `${item.name} (${item.cartQuantity})`).join(', ') || '-'}
                            </td>
                            <td className="px-6 py-3 text-right whitespace-nowrap font-mono text-gray-400">{formatCurrency(s.discount_amount)}</td>
                            <td className="px-6 py-3 text-right whitespace-nowrap font-mono font-medium text-emerald-400">{formatCurrency(s.net_total)}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </ScrollArea>
              </TabsContent>

              <TabsContent value="finance" className="h-full m-0">
                <ScrollArea className="h-full">
                  <table className="w-full text-sm text-left">
                    <thead className="sticky top-0 bg-gray-900/95 backdrop-blur-sm z-10 border-b border-white/10 text-gray-400">
                      <tr>
                        <th className="px-6 py-3 font-medium">Tarih</th>
                        <th className="px-6 py-3 font-medium">İşlem Türü</th>
                        <th className="px-6 py-3 font-medium text-right">Tutar</th>
                        <th className="px-6 py-3 font-medium text-right">Bakiye</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {transactions.length === 0 ? (
                        <tr><td colSpan={4} className="p-8 text-center text-gray-500">Finansal işlem bulunamadı.</td></tr>
                      ) : (
                        transactions.map(t => (
                          <tr key={t.id} className="hover:bg-white/5 transition-colors">
                            <td className="px-6 py-3 text-gray-300 whitespace-nowrap font-mono text-xs">
                              <div className="flex items-center gap-2">
                                <Calendar className="h-3 w-3 text-gray-500" />
                                {t.date ? format(new Date(t.date), 'dd.MM.yyyy') : '-'}
                              </div>
                            </td>
                            <td className="px-6 py-3 text-gray-300">
                              <span className="px-2 py-1 rounded-md bg-white/5 text-xs border border-white/10">
                                {t.type === 'charge' ? 'Borçlandırma' : t.type === 'payment' ? 'Ödeme' : t.type}
                              </span>
                            </td>
                            <td className={cn("px-6 py-3 text-right whitespace-nowrap font-mono font-medium", t.amount < 0 ? 'text-emerald-400' : 'text-red-400')}>
                              {t.amount < 0 ? '+' : ''}{formatCurrency(Math.abs(t.amount))}
                            </td>
                            <td className="px-6 py-3 text-right whitespace-nowrap font-mono text-gray-400">{formatCurrency(t.balance)}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </ScrollArea>
              </TabsContent>
            </div>
          </Tabs>
        ) : (<div className="flex-1 flex items-center justify-center text-gray-500">Müşteri seçilmedi.</div>)}

        <DialogFooter className="bg-white/5 border-t border-white/10 p-4">
          <DialogClose asChild>
            <Button variant="outline" className="bg-transparent border-white/10 text-gray-300 hover:bg-white/10 hover:text-white">Kapat</Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CustomerDetailPanel;
// --- END OF FILE src/components/customer/CustomerDetailPanel.tsx ---