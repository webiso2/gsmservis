import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Product, Account, Sale, Wholesaler, AccountTransaction, WholesalerTransaction, ExpenseCategory } from "@/types/backup";
import type { Customer } from "@/types/customer";

// --- PRODUCTS ---
export const useProducts = () => {
    return useQuery({
        queryKey: ["products"],
        queryFn: async () => {
            const { data, error } = await supabase.from("products").select("*").order("name");
            if (error) throw error;
            return data as Product[];
        },
    });
};

// --- CUSTOMERS ---
export const useCustomers = () => {
    return useQuery({
        queryKey: ["customers"],
        queryFn: async () => {
            const { data, error } = await supabase.from("customers").select("*").order("name");
            if (error) throw error;
            return data as Customer[];
        },
    });
};

// --- ACCOUNTS ---
export const useAccounts = () => {
    return useQuery({
        queryKey: ["accounts"],
        queryFn: async () => {
            const { data, error } = await supabase.from("accounts").select("*").order("name");
            if (error) throw error;
            return data as Account[];
        },
    });
};

// --- WHOLESALERS ---
export const useWholesalers = () => {
    return useQuery({
        queryKey: ["wholesalers"],
        queryFn: async () => {
            const { data, error } = await supabase.from("wholesalers").select("*").order("name");
            if (error) throw error;
            return data as Wholesaler[];
        },
    });
};

// --- SALES (Date Range) ---
export const useSales = (startDate: string, endDate: string) => {
    return useQuery({
        queryKey: ["sales", startDate, endDate],
        queryFn: async () => {
            console.log('[useSales] Tarih aralığı:', { startDate, endDate });

            // Bitiş tarihine 1 gün ekle
            const endDateObj = new Date(endDate);
            endDateObj.setDate(endDateObj.getDate() + 1);
            const nextDayISO = endDateObj.toISOString().split('T')[0];

            // 1. Satışları Çek
            const { data: salesData, error: salesError } = await supabase
                .from("sales")
                .select("*, customer:customers(id, name)")
                .gte("date", `${startDate}T00:00:00`)
                .lt("date", `${nextDayISO}T00:00:00`)
                .order("date", { ascending: false });

            if (salesError) {
                console.error('[useSales] Sales Hata:', salesError);
                throw salesError;
            }

            // 2. Bu satışlara ait ödemeleri çek (Application-side Join)
            const saleIds = salesData.map(s => s.id);
            let transactionsMap: Record<string, any[]> = {};

            if (saleIds.length > 0) {
                const { data: txData, error: txError } = await supabase
                    .from("account_transactions")
                    .select("*")
                    .in("related_sale_id", saleIds);

                if (txError) {
                    console.warn('[useSales] Transaction çekme hatası (Önemsiz):', txError);
                    // Hata olsa bile satışı göstermeye devam et, sadece ödeme bilgisi eksik olur
                } else {
                    txData?.forEach(tx => {
                        if (!transactionsMap[tx.related_sale_id]) transactionsMap[tx.related_sale_id] = [];
                        transactionsMap[tx.related_sale_id].push(tx);
                    });
                }
            }

            // 3. Veriyi Birleştir
            const combinedData = salesData.map(sale => ({
                ...sale,
                account_transactions: transactionsMap[sale.id] || []
            }));

            console.log('[useSales] Çekilen satış sayısı:', combinedData.length);
            return combinedData as any[];
        },
        enabled: !!startDate && !!endDate,
    });
};

// --- ACCOUNT TRANSACTIONS (Date Range) ---
export const useAccountTransactions = (startDate: string, endDate: string) => {
    return useQuery({
        queryKey: ["account_transactions", startDate, endDate],
        queryFn: async () => {
            // Bitiş tarihine 1 gün ekle
            const endDateObj = new Date(endDate);
            endDateObj.setDate(endDateObj.getDate() + 1);
            const nextDayISO = endDateObj.toISOString().split('T')[0];

            const { data, error } = await supabase
                .from("account_transactions")
                .select("*")
                .gte("date", `${startDate}T00:00:00`)
                .lt("date", `${nextDayISO}T00:00:00`)
                .order("date", { ascending: false });

            if (error) throw error;
            return data as AccountTransaction[];
        },
        enabled: !!startDate && !!endDate,
    });
};

// --- WHOLESALER TRANSACTIONS (Date Range) ---
export const useWholesalerTransactions = (startDate: string, endDate: string) => {
    return useQuery({
        queryKey: ["wholesaler_transactions", startDate, endDate],
        queryFn: async () => {
            // Bitiş tarihine 1 gün ekle
            const endDateObj = new Date(endDate);
            endDateObj.setDate(endDateObj.getDate() + 1);
            const nextDayISO = endDateObj.toISOString().split('T')[0];

            const { data, error } = await supabase
                .from("wholesaler_transactions")
                .select("*")
                .gte("date", `${startDate}T00:00:00`)
                .lt("date", `${nextDayISO}T00:00:00`)
                .order("date", { ascending: false });

            if (error) throw error;
            return data as WholesalerTransaction[];
        },
        enabled: !!startDate && !!endDate,
    });
};

// --- EXPENSE CATEGORIES ---
export const useExpenseCategories = () => {
    return useQuery({
        queryKey: ["expense_categories"],
        queryFn: async () => {
            const { data, error } = await supabase.from("expense_categories").select("*").order("name");
            if (error) throw error;
            return data as ExpenseCategory[];
        },
    });
};
