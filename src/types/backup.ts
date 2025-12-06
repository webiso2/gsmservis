// --- START OF FILE src/types/backup.ts ---

// Temel Tipler (Diğer dosyalardan import edilebilir veya burada tanımlanabilir)
import type { Customer, CustomerTransaction } from './customer';
import type { Service, ServicePart } from './service';

export interface Account {
    id: string;
    created_at: string;
    name: string;
    type: 'cash' | 'bank' | 'pos' | 'credit_card' | 'other'; // 'credit_card' eklendi
    account_number: string | null;
    bank_name: string | null;
    initial_balance: number;
    current_balance: number; // Kredi kartları için bu "borç" anlamına gelebilir
    is_default: boolean;
    credit_limit?: number | null; // Kredi kartı limiti
}

export interface Product {
    id: string;
    created_at: string;
    code: string;
    name: string;
    description: string | null;
    category: string | null; // Bu, main_category/sub_category ile yer değiştirebilir
    quantity: number;
    unit: string | null;
    purchase_price: number;
    selling_price: number;
    min_stock_level: number;
    supplier: string | null;
    main_category?: 'YP' | 'AK' | 'SR' | null; // StockModule için
    sub_category?: string | null;            // StockModule için
    brand?: string | null;                   // StockModule için
    model?: string | null;                   // StockModule için
}

export interface SaleItem {
    product_id: string | null;
    id?: string; // Bu JSONB içinde olmayabilir, frontend'de üretiliyor olabilir
    code: string;
    name: string;
    cartQuantity: number;
    unit: string | null;
    purchasePrice: number;
    sellingPrice: number;
}

export interface Sale {
    id: string;
    created_at: string;
    date: string;
    customer_id: string | null;
    items: SaleItem[];
    total: number;
    discount_amount: number;
    net_total: number;
    is_stockless: boolean;
    related_service_id: string | null;
}

export interface Need {
    id: string;
    created_at: string;
    date: string;
    description: string;
    quantity: number;
    product_id: string | null;
    supplier: string | null;
    customer_id: string | null;
}

export interface ExpenseCategory {
  id: string;
  created_at: string;
  name: string;
}

export type AccountTransactionType =
    | 'income'
    | 'expense'
    | 'transfer_in'
    | 'transfer_out'
    | 'sale_payment'
    | 'customer_payment'
    | 'service_payment'
    | 'supplier_payment'
    | 'initial_balance'
    | 'adjustment'
    // Kredi kartı ödemesi için özel tipler eklenebilir (opsiyonel)
    | 'cc_payment_source' // Kaynak hesaptan çıkış
    | 'cc_payment_target'; // Hedef kredi kartına giriş (borcu azaltan)

export interface AccountTransaction {
  id: string;
  created_at: string;
  date: string;
  account_id: string;
  type: AccountTransactionType;
  amount: number;
  balance_after: number;
  description: string | null;
  related_sale_id: string | null;
  related_service_id: string | null;
  related_customer_tx_id: string | null;
  transfer_pair_id: string | null;
  expense_category_id: string | null;
  related_wholesaler_transaction_id?: string | null;
}

export interface Wholesaler {
    id: string;
    created_at: string;
    name: string;
    contact_person: string | null;
    phone: string | null;
    email: string | null;
    address: string | null;
    notes: string | null;
    debt: number;
    debt_usd?: number | null; // USD borcu opsiyonel
}

export type WholesalerTransactionType =
    | 'purchase' | 'payment' | 'return' | 'adjustment';

export interface WholesalerTransaction {
    id: string;
    created_at: string;
    wholesaler_id: string;
    date: string;
    type: WholesalerTransactionType;
    amount: number;
    balance_after: number;
    description: string | null;
    related_account_tx_id: string | null;
    related_purchase_invoice_id: string | null;
}

export interface PurchaseInvoiceItem {
    product_id: string | null;
    name: string;
    quantity: number;
    purchase_price_currency: 'TRY' | 'USD';
    purchase_price_value: number;
    exchange_rate: number | null;
    line_total_try: number;
    id?: string; // UI için
    originalUnit?: string; // UI için
}

export interface PurchaseInvoice {
    id: string;
    created_at: string;
    date: string;
    wholesaler_id: string;
    items: PurchaseInvoiceItem[];
    total_try: number;
    notes: string | null;
}

export interface BackupRecord {
    id: string;
    created_at: string;
    filename: string;
    storage_path: string;
}

export interface BackupData {
  timestamp: string;
  customers?: Customer[] | null;
  accounts?: Account[] | null;
  expense_categories?: ExpenseCategory[] | null;
  products?: Product[] | null;
  needs?: Need[] | null;
  services?: Service[] | null;
  sales?: Sale[] | null;
  customer_transactions?: CustomerTransaction[] | null;
  account_transactions?: AccountTransaction[] | null;
  wholesalers?: Wholesaler[] | null;
  wholesaler_transactions?: WholesalerTransaction[] | null;
  purchase_invoices?: PurchaseInvoice[] | null;
  // cashTransactions?: any[] | null; // Eğer artık kullanılmıyorsa kaldırılabilir
}