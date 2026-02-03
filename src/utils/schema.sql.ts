export const SCHEMA_SQL = `-- Veritabanı Kurulum Scripti
-- Bu scripti Supabase SQL Editor'de çalıştırarak tabloları oluşturun.

-- 1. Tablo: customers (Müşteriler)
CREATE TABLE IF NOT EXISTS public.customers (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    name TEXT NOT NULL,
    phone TEXT,
    address TEXT,
    city TEXT,
    email TEXT,
    notes TEXT,
    credit_limit NUMERIC DEFAULT 0,
    total_credit NUMERIC DEFAULT 0,
    remaining_installments NUMERIC DEFAULT 0,
    total_debt NUMERIC DEFAULT 0,
    debt NUMERIC DEFAULT 0
);

-- 2. Tablo: wholesalers (Toptancılar/Tedarikçiler)
CREATE TABLE IF NOT EXISTS public.wholesalers (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    name TEXT NOT NULL,
    contact_person TEXT,
    phone TEXT,
    email TEXT,
    address TEXT,
    notes TEXT,
    debt NUMERIC DEFAULT 0,
    debt_usd NUMERIC DEFAULT 0
);

-- 3. Tablo: expense_categories (Gider Kategorileri)
CREATE TABLE IF NOT EXISTS public.expense_categories (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    name TEXT NOT NULL
);

-- 4. Tablo: products (Stok/Ürünler)
CREATE TABLE IF NOT EXISTS public.products (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    code TEXT NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    category TEXT,
    quantity NUMERIC DEFAULT 0,
    unit TEXT,
    purchase_price NUMERIC DEFAULT 0,
    selling_price NUMERIC DEFAULT 0,
    min_stock_level NUMERIC DEFAULT 0,
    supplier TEXT,
    main_category TEXT,
    sub_category TEXT,
    brand TEXT,
    model TEXT
);

-- 5. Tablo: accounts (Hesaplar - Kasa/Banka)
CREATE TABLE IF NOT EXISTS public.accounts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    name TEXT NOT NULL,
    type TEXT CHECK (type IN ('cash', 'bank', 'pos', 'credit_card', 'other')),
    account_number TEXT,
    bank_name TEXT,
    initial_balance NUMERIC DEFAULT 0,
    current_balance NUMERIC DEFAULT 0,
    is_default BOOLEAN DEFAULT FALSE,
    credit_limit NUMERIC
);

-- 6. Tablo: services (Servis Kayıtları)
CREATE TABLE IF NOT EXISTS public.services (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    date TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
    device_type TEXT NOT NULL,
    brand TEXT,
    model TEXT,
    serial_number TEXT,
    problem TEXT,
    diagnosis TEXT,
    solution TEXT,
    status TEXT DEFAULT 'pending',
    cost NUMERIC DEFAULT 0,
    tracking_code TEXT
);

-- 7. Tablo: sales (Satışlar)
CREATE TABLE IF NOT EXISTS public.sales (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    date TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
    items JSONB DEFAULT '[]'::jsonb,
    total NUMERIC DEFAULT 0,
    discount_amount NUMERIC DEFAULT 0,
    net_total NUMERIC DEFAULT 0,
    is_stockless BOOLEAN DEFAULT FALSE,
    related_service_id UUID REFERENCES public.services(id) ON DELETE SET NULL
);

-- 8. Tablo: needs (İhtiyaç Listesi)
CREATE TABLE IF NOT EXISTS public.needs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    date TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    description TEXT NOT NULL,
    quantity NUMERIC DEFAULT 1,
    product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
    supplier TEXT,
    customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL
);

-- 9. Tablo: purchase_invoices (Alış Faturaları)
CREATE TABLE IF NOT EXISTS public.purchase_invoices (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    date TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    wholesaler_id UUID REFERENCES public.wholesalers(id) ON DELETE SET NULL,
    items JSONB DEFAULT '[]'::jsonb,
    total_try NUMERIC DEFAULT 0,
    notes TEXT
);

-- 10. Tablo: account_transactions (Hesap Hareketleri)
-- Bu tablo sales ve services ve wholesaler_transactions tablolarına referans verir.
CREATE TABLE IF NOT EXISTS public.account_transactions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    date TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    account_id UUID REFERENCES public.accounts(id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    amount NUMERIC DEFAULT 0,
    balance_after NUMERIC DEFAULT 0,
    description TEXT,
    related_sale_id UUID REFERENCES public.sales(id) ON DELETE SET NULL,
    related_service_id UUID REFERENCES public.services(id) ON DELETE SET NULL,
    related_customer_tx_id UUID,
    transfer_pair_id UUID,
    expense_category_id UUID REFERENCES public.expense_categories(id) ON DELETE SET NULL,
    related_wholesaler_transaction_id UUID
);

-- 11. Tablo: wholesaler_transactions (Toptancı Hareketleri)
-- Bu tablo account_transactions'e referans verir.
CREATE TABLE IF NOT EXISTS public.wholesaler_transactions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    wholesaler_id UUID REFERENCES public.wholesalers(id) ON DELETE CASCADE,
    date TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    type TEXT NOT NULL,
    amount NUMERIC DEFAULT 0,
    balance_after NUMERIC DEFAULT 0,
    description TEXT,
    related_account_tx_id UUID REFERENCES public.account_transactions(id) ON DELETE SET NULL,
    related_purchase_invoice_id UUID
);

-- Döngüsel referansı tamamla: account_transactions -> wholesaler_transactions
ALTER TABLE public.account_transactions 
ADD CONSTRAINT fk_related_wholesaler_tx 
FOREIGN KEY (related_wholesaler_transaction_id) 
REFERENCES public.wholesaler_transactions(id) ON DELETE SET NULL;

-- 12. Tablo: customer_transactions (Müşteri Hareketleri)
CREATE TABLE IF NOT EXISTS public.customer_transactions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    date TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    customer_id UUID REFERENCES public.customers(id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    amount NUMERIC DEFAULT 0,
    balance NUMERIC DEFAULT 0,
    description TEXT
);

-- 13. Tablo: backups (Yedekler)
CREATE TABLE IF NOT EXISTS public.backups (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    filename TEXT NOT NULL,
    data JSONB,
    storage_path TEXT
);

-- RLS (Row Level Security) Politikaları
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable all for users" ON public.customers FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable all for users" ON public.services FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable all for users" ON public.products FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE public.needs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable all for users" ON public.needs FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE public.expense_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable all for users" ON public.expense_categories FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable all for users" ON public.accounts FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE public.account_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable all for users" ON public.account_transactions FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE public.wholesalers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable all for users" ON public.wholesalers FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE public.wholesaler_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable all for users" ON public.wholesaler_transactions FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE public.purchase_invoices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable all for users" ON public.purchase_invoices FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable all for users" ON public.sales FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE public.customer_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable all for users" ON public.customer_transactions FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE public.backups ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable all for users" ON public.backups FOR ALL USING (true) WITH CHECK (true);

-- Realtime
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    CREATE PUBLICATION supabase_realtime;
  END IF;
END $$;

ALTER PUBLICATION supabase_realtime ADD TABLE public.customers;
ALTER PUBLICATION supabase_realtime ADD TABLE public.services;
ALTER PUBLICATION supabase_realtime ADD TABLE public.products;
ALTER PUBLICATION supabase_realtime ADD TABLE public.sales;
`;
