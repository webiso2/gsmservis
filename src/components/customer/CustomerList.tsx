// --- START OF FILE src/components/customer/CustomerList.tsx ---

import React from 'react';
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, Search, User, Phone, Wallet } from 'lucide-react';
import { Customer } from "@/types/customer";
import { cn } from "@/lib/utils";

interface CustomerListProps {
  customers: Customer[];
  searchTerm: string;
  setSearchTerm: (value: string) => void;
  selectedCustomer: Customer | null;
  handleCustomerSelect: (customer: Customer) => void;
  isEditing: boolean;
  isLoading: boolean;
  onRowClick: (customer: Customer) => void;
}

const getDigits = (str: string | null | undefined): string => str ? str.replace(/\D/g, '') : '';

const CustomerList: React.FC<CustomerListProps> = ({
  customers,
  searchTerm,
  setSearchTerm,
  selectedCustomer,
  handleCustomerSelect,
  isEditing,
  isLoading,
  onRowClick,
}) => {
  const normalizedSearchTerm = searchTerm.toLowerCase();
  const searchDigits = getDigits(searchTerm);

  const filteredCustomers = customers.filter((customer) => {
    const cNL = customer.name.toLowerCase();
    const cPD = getDigits(customer.phone);
    const nameMatch = cNL.includes(normalizedSearchTerm);
    const phoneMatch = searchDigits.length > 0 && cPD.includes(searchDigits);
    return nameMatch || phoneMatch;
  });

  return (
    <div className="flex flex-col h-full bg-black/20 rounded-lg overflow-hidden border border-white/5">
      <div className="p-3 border-b border-white/5 bg-white/5">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
          <Input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="İsme veya telefona göre ara..."
            className="pl-10 bg-black/40 border-white/10 text-white h-9 text-sm focus:border-blue-500/50"
          />
        </div>
      </div>

      <div className="flex-1 overflow-hidden">
        <ScrollArea className="h-full">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center h-40 text-gray-500 gap-2">
              <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
              <p className="text-sm">Müşteriler yükleniyor...</p>
            </div>
          ) : (
            <table className="w-full text-left text-sm">
              <thead className="sticky top-0 bg-gray-900/95 backdrop-blur-sm z-10 border-b border-white/10 text-gray-400">
                <tr>
                  <th className="px-4 py-3 font-medium flex items-center gap-2"><User className="h-3 w-3" /> Müşteri Adı</th>
                  <th className="px-4 py-3 font-medium"><div className="flex items-center gap-2"><Phone className="h-3 w-3" /> Telefon</div></th>
                  <th className="px-4 py-3 font-medium text-right"><div className="flex items-center justify-end gap-2"><Wallet className="h-3 w-3" /> Güncel Borç</div></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredCustomers.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="p-8 text-center text-gray-500">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <User className="h-8 w-8 opacity-20" />
                        <p>Müşteri bulunamadı.</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredCustomers.map((customer) => {
                    const isSelected = selectedCustomer?.id === customer.id;
                    return (
                      <tr
                        key={customer.id}
                        onClick={() => {
                          if (!isEditing) {
                            handleCustomerSelect(customer);
                            onRowClick(customer);
                          }
                        }}
                        className={cn(
                          "cursor-pointer transition-colors",
                          isSelected
                            ? "bg-blue-600/20 hover:bg-blue-600/30"
                            : "hover:bg-white/5",
                          isEditing && "opacity-50 cursor-not-allowed pointer-events-none"
                        )}
                      >
                        <td className={cn("px-4 py-3 font-medium", isSelected ? "text-blue-400" : "text-gray-200")}>{customer.name}</td>
                        <td className="px-4 py-3 text-gray-400 font-mono text-xs">{customer.phone || '-'}</td>
                        <td
                          className={cn(
                            "px-4 py-3 text-right font-mono font-medium",
                            customer.debt && customer.debt > 0 ? 'text-red-400' : 'text-emerald-400'
                          )}
                        >
                          {customer.debt !== undefined ? customer.debt.toFixed(2) : '0.00'}₺
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          )}
        </ScrollArea>
      </div>
    </div>
  );
};

export default CustomerList;
// --- END OF FILE src/components/customer/CustomerList.tsx ---