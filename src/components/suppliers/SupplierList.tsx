import React from 'react';
import { Edit, Trash2, DollarSign, History, Phone, MapPin, Mail } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/utils/formatUtils";
import type { Supplier } from "@/types/backup";

interface SupplierListProps {
    suppliers: Supplier[];
    onEdit: (supplier: Supplier) => void;
    onDelete: (supplier: Supplier) => void;
    onPayment: (supplier: Supplier) => void;
    onHistory: (supplier: Supplier) => void;
}

const SupplierList: React.FC<SupplierListProps> = ({
    suppliers,
    onEdit,
    onDelete,
    onPayment,
    onHistory
}) => {
    if (suppliers.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-full text-gray-400 p-8">
                <p>Henüz kayıtlı tedarikçi bulunmamaktadır.</p>
            </div>
        );
    }

    return (
        <div className="overflow-auto h-full">
            <table className="w-full text-sm text-left">
                <thead className="bg-white/5 text-gray-300 sticky top-0 z-10 backdrop-blur-md">
                    <tr>
                        <th className="px-4 py-3 font-medium">Tedarikçi Adı</th>
                        <th className="px-4 py-3 font-medium hidden sm:table-cell">İletişim</th>
                        <th className="px-4 py-3 font-medium text-right">Bakiye (Borç)</th>
                        <th className="px-4 py-3 font-medium text-center">İşlemler</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                    {suppliers.map((supplier) => (
                        <tr key={supplier.id} className="hover:bg-white/5 transition-colors group">
                            <td className="px-4 py-3">
                                <div className="font-medium text-white">{supplier.name}</div>
                                <div className="text-xs text-gray-500 sm:hidden mt-1">
                                    {supplier.contact_person && <div>{supplier.contact_person}</div>}
                                    {supplier.phone && <div>{supplier.phone}</div>}
                                </div>
                            </td>
                            <td className="px-4 py-3 hidden sm:table-cell text-gray-400">
                                <div className="flex flex-col gap-1 text-xs">
                                    {supplier.contact_person && <span className="text-gray-300">{supplier.contact_person}</span>}
                                    {supplier.phone && <span className="flex items-center gap-1"><Phone className="h-3 w-3" /> {supplier.phone}</span>}
                                    {supplier.email && <span className="flex items-center gap-1"><Mail className="h-3 w-3" /> {supplier.email}</span>}
                                </div>
                            </td>
                            <td className="px-4 py-3 text-right">
                                <div className={`font-mono font-bold ${supplier.balance > 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                                    {formatCurrency(supplier.balance || 0)}
                                </div>
                            </td>
                            <td className="px-4 py-3">
                                <div className="flex justify-center gap-2">
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => onPayment(supplier)}
                                        className="h-8 w-8 p-0 hover:bg-green-500/20 hover:text-green-400 rounded-md"
                                        title="Ödeme Yap"
                                    >
                                        <DollarSign className="h-4 w-4" />
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => onHistory(supplier)}
                                        className="h-8 w-8 p-0 hover:bg-blue-500/20 hover:text-blue-400 rounded-md"
                                        title="İşlem Geçmişi"
                                    >
                                        <History className="h-4 w-4" />
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => onEdit(supplier)}
                                        className="h-8 w-8 p-0 hover:bg-yellow-500/20 hover:text-yellow-400 rounded-md"
                                        title="Düzenle"
                                    >
                                        <Edit className="h-4 w-4" />
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => onDelete(supplier)}
                                        className="h-8 w-8 p-0 hover:bg-red-500/20 hover:text-red-400 rounded-md"
                                        title="Sil"
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

export default SupplierList;
