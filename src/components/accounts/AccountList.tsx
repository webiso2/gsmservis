// --- START OF FILE src/components/accounts/AccountList.tsx ---

import React from 'react';
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Edit, Trash2, Landmark, Wallet, Smartphone, CreditCard, BadgeDollarSign, CheckCircle2 } from "lucide-react";
import type { Account } from "@/types/backup";
import { cn } from "@/lib/utils";

interface AccountListProps {
    accounts: Account[];
    selectedAccountId: string | null;
    onSelectAccount: (id: string) => void;
    onEditAccount: (account: Account) => void;
    onDeleteAccount: (id: string) => void;
}

const getAccountIcon = (type: Account['type']): React.ReactNode => {
    switch (type) {
        case 'cash': return <Wallet className="h-4 w-4 text-emerald-400" />;
        case 'bank': return <Landmark className="h-4 w-4 text-blue-400" />;
        case 'pos': return <Smartphone className="h-4 w-4 text-purple-400" />;
        case 'credit_card': return <CreditCard className="h-4 w-4 text-red-400" />;
        default: return <BadgeDollarSign className="h-4 w-4 text-gray-400" />;
    }
};

const formatCurrency = (value: number | null | undefined): string => {
    return (value ?? 0).toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' });
};

const AccountList: React.FC<AccountListProps> = ({
    accounts, selectedAccountId, onSelectAccount, onEditAccount, onDeleteAccount
}) => {
    return (
        <ScrollArea className="flex-1 -mx-2 px-2">
            <ul className="space-y-2">
                {accounts.length === 0 ? (
                    <div className="flex flex-col items-center justify-center p-6 text-center text-gray-500 gap-2">
                        <Wallet className="h-8 w-8 opacity-20" />
                        <p className="text-xs">Henüz hesap eklenmemiş.</p>
                    </div>
                ) : (
                    accounts.map((account) => {
                        const isSelected = selectedAccountId === account.id;
                        const isCreditCard = account.type === 'credit_card';
                        const currentBalanceOrDebt = account.current_balance ?? 0;
                        const creditLimit = account.credit_limit ?? 0;
                        const availableLimit = isCreditCard ? creditLimit - currentBalanceOrDebt : null;

                        return (
                            <li key={account.id} className="group relative">
                                <div
                                    className={cn(
                                        "flex flex-col p-3 rounded-lg border transition-all duration-200 cursor-pointer",
                                        isSelected
                                            ? "bg-blue-600/20 border-blue-500/50 shadow-[0_0_15px_rgba(37,99,235,0.1)]"
                                            : "bg-white/5 border-white/5 hover:bg-white/10 hover:border-white/10"
                                    )}
                                    onClick={() => onSelectAccount(account.id)}
                                >
                                    <div className="flex items-center justify-between mb-2">
                                        <div className="flex items-center gap-2">
                                            <div className={cn("p-1.5 rounded-md bg-black/20", isSelected && "bg-blue-500/20")}>
                                                {getAccountIcon(account.type)}
                                            </div>
                                            <div className="flex flex-col">
                                                <span className={cn("font-semibold text-sm", isSelected ? "text-white" : "text-gray-200")}>{account.name}</span>
                                                {account.is_default && (
                                                    <span className="text-[10px] text-blue-400 flex items-center gap-0.5">
                                                        <CheckCircle2 className="h-3 w-3" /> Varsayılan
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity absolute top-2 right-2">
                                            <Button variant="ghost" size="icon" className="h-7 w-7 hover:bg-blue-500/20 hover:text-blue-400 rounded-md" onClick={(e) => { e.stopPropagation(); onEditAccount(account); }} title="Düzenle"><Edit className="h-3.5 w-3.5" /></Button>
                                            <Button variant="ghost" size="icon" className="h-7 w-7 hover:bg-red-500/20 hover:text-red-400 rounded-md" onClick={(e) => { e.stopPropagation(); onDeleteAccount(account.id); }} title="Sil"><Trash2 className="h-3.5 w-3.5" /></Button>
                                        </div>
                                    </div>

                                    <div className="flex items-end justify-between mt-1">
                                        <div className="flex flex-col">
                                            <span className="text-[10px] text-gray-500 uppercase tracking-wider font-medium">Bakiye</span>
                                            <span className={cn(
                                                "text-sm font-mono font-bold",
                                                !isCreditCard
                                                    ? (currentBalanceOrDebt < 0 ? 'text-red-400' : 'text-emerald-400')
                                                    : 'text-red-400'
                                            )}>
                                                {formatCurrency(currentBalanceOrDebt)}
                                                {isCreditCard && <span className="text-[10px] font-normal text-gray-400 ml-1">Borç</span>}
                                            </span>
                                        </div>

                                        {isCreditCard && (
                                            <div className="flex flex-col items-end">
                                                <span className="text-[10px] text-gray-500 uppercase tracking-wider font-medium">Kullanılabilir</span>
                                                <span className={cn(
                                                    "text-xs font-mono font-medium",
                                                    availableLimit !== null && availableLimit < 0 ? 'text-orange-400' : 'text-gray-300'
                                                )}>
                                                    {availableLimit !== null ? formatCurrency(availableLimit) : '-'}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </li>
                        );
                    })
                )}
            </ul>
        </ScrollArea>
    );
};

export default AccountList;
// --- END OF FILE src/components/accounts/AccountList.tsx ---