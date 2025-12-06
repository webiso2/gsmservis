// --- START OF FILE src/types/service.ts ---

// Customer tipi, customer.ts ile aynı olmalı, UUID ve null değerler dikkate alınarak
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

// Service tipi Supabase'e göre güncellendi
export interface Service {
    id: string; // UUID
    created_at: string;
    date: string; // timestamp
    customer_id: string; // UUID
    customerName?: string; // Veritabanında yok ama kolaylık için eklenebilir (join ile alınacak)
    deviceType: string; // device_type -> deviceType (JSX'te kolaylık için)
    brand: string | null;
    model: string | null;
    serialNumber: string | null; // serial_number -> serialNumber
    problem: string;
    diagnosis: string | null;
    solution: string | null;
    status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
    cost: number;
    // Supabase tablosundaki sütun adları (snake_case)
    // Supabase tablosundaki sütun adları (snake_case)
    device_type: string; // Gerçek sütun adı
    serial_number: string | null; // Gerçek sütun adı
    tracking_code?: string; // Takip kodu
}

// Yeni servis eklerken kullanılacak tip (id ve created_at hariç)
// customerName de formdan gelmeyecek, customer_id ile bulunacak
export type NewService = Omit<Service, 'id' | 'created_at' | 'customerName'>;

// Kasa İşlemi Tipi (Gerekirse merkezi bir dosyadan alınabilir)
export interface CashTransaction {
    id: string;
    date: string;
    type: 'income' | 'expense';
    amount: number;
    description: string;
}

// CustomerPanel için birleşik kayıt tipi (Opsiyonel)
export interface SaleItem { // SalesModule'den alınabilir
    id: string | null; // product_id veya null (manuel)
    code: string;
    name: string;
    cartQuantity: number;
    unit: string | null;
    purchasePrice: number;
    sellingPrice: number;
}
export interface SimpleSale { // SalesModule'den alınabilir
    id: string;
    date: string;
    items: SaleItem[];
    total: number; // Brüt
    net_total: number; // Net
    customer_id: string;
    type: 'sale';
}

export type CustomerRecord = (Omit<Service, 'customerName'> & { type: 'service' }) | SimpleSale;


// --- END OF FILE src/types/service.ts ---