// --- START OF FILE src/types/customer.ts ---

export interface Customer {
    id: string; // UUID
    created_at: string;
    name: string;
    phone: string | null;
    address: string | null;
    city: string | null;
    email: string | null;
    notes: string | null;
    credit_limit: number;
    total_credit: number;
    remaining_installments: number;
    total_debt: number;
    debt: number;
}

export interface FormData {
    name: string;
    phone: string;
    address: string;
    city: string;
    email: string;
    notes: string;
    credit_limit: string; // Formda string olarak tutuluyor
}

// Transaction -> CustomerTransaction
export interface CustomerTransaction {
    id: string; // UUID
    created_at: string;
    date: string; // YYYY-MM-DD formatı varsayılıyor
    customer_id: string; // UUID
    type: "Borç Ekleme" | "Tahsilat" | "charge" | "payment";
    amount: number; // Borç +, Tahsilat -
    balance: number; // Bu işlem sonrası bakiye
    description?: string; // Açıklama (Opsiyonel olabilir)
}

// --- END OF FILE src/types/customer.ts ---