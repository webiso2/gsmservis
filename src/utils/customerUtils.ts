// --- START OF FILE src/utils/customerUtils.ts ---

import { supabase } from "@/integrations/supabase/client";
import type { Customer, CustomerTransaction } from "@/types/customer";
import { toast } from "@/hooks/use-toast"; // toast importu kalsın, ama burada direkt kullanılmayacak

// Müşterileri Supabase'den yükle
export const loadCustomersFromSupabase = async (): Promise<Customer[]> => {
  console.log("[loadCustomersFromSupabase] Müşteriler çekiliyor..."); // Başlangıç logu
  try {
    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .order('name', { ascending: true }); // İsme göre sıralı

    if (error) {
        console.error("[loadCustomersFromSupabase] Supabase hatası:", error); // Detaylı hata logu
        // Hatayı dışarı fırlat ki çağıran yer yakalayabilsin
        throw error;
    }

    console.log(`[loadCustomersFromSupabase] ${data?.length ?? 0} müşteri verisi alındı.`); // Alınan veri sayısı

    // Veritabanından gelen null değerleri handle et ve map'le
    const mappedData = data?.map(c => ({ // data null kontrolü
        id: c.id, // id her zaman olmalı
        created_at: c.created_at, // created_at her zaman olmalı
        name: c.name ?? 'İsimsiz Müşteri', // name null olmamalı ama default değer atayalım
        phone: c.phone ?? null,
        address: c.address ?? null,
        city: c.city ?? null,
        email: c.email ?? null,
        notes: c.notes ?? null,
        credit_limit: c.credit_limit ?? 0,
        total_credit: c.total_credit ?? 0, // Bu alanlar DB'de varsa
        remaining_installments: c.remaining_installments ?? 0, // Bu alanlar DB'de varsa
        total_debt: c.total_debt ?? 0, // Bu alanlar DB'de varsa
        debt: c.debt ?? 0, // Güncel borç
    } as Customer)) || []; // data null ise boş dizi dön ve tip zorlaması yap

     console.log("[loadCustomersFromSupabase] Map işlemi tamamlandı.");
     return mappedData;

  } catch (error: any) {
    // Hata zaten yukarıda loglandı, burada tekrar loglamaya gerek yok
    // Ancak hatayı tekrar fırlatmak önemli
    console.error("[loadCustomersFromSupabase] Fonksiyon hata bloğuna düştü.");
    throw error; // Hatayı çağıran yere ilet
  }
};

// Belirli bir müşterinin işlemlerini Supabase'den yükle (Önceki gibi)
export const loadCustomerTransactions = async (customerId: string): Promise<CustomerTransaction[]> => {
    // ... (önceki kod, hata yönetimi benzer şekilde iyileştirilebilir) ...
     if (!customerId) return [];
     try {
         const { data, error } = await supabase
             .from('customer_transactions')
             .select('*')
             .eq('customer_id', customerId)
             .order('created_at', { ascending: true });
         if (error) throw error;
         // Bakiye hesaplama burada yapılabilir veya dialog içinde
         let runningBalance = 0;
         const calculatedTransactions = (data || []).map(t => ({ ...t, balance: runningBalance += t.amount }));
         return calculatedTransactions;
     } catch (error: any) {
         console.error(`Müşteri ${customerId} işlemleri yüklenirken hata oluştu:`, error);
         // Burada toast göstermek yerine hatayı fırlatabiliriz
         // toast({ title: "Hata", description: `Müşteri işlemleri yüklenemedi: ${error.message}`, variant: "destructive" });
         throw error; // Dialog kendi hatasını göstersin
     }
};


// Yeni bir işlem objesi oluşturur (Önceki gibi)
export const createTransactionObject = ( /* ... */ ): Omit<CustomerTransaction, 'id' | 'created_at' | 'balance'> => {
    // ... (önceki kod) ...
     const adjustedAmount = type === "Tahsilat" ? -Math.abs(amount) : Math.abs(amount);
     return { date: new Date().toISOString().split('T')[0], customer_id: customerId, type, amount: adjustedAmount, };
};

// Müşterinin borcunu Supabase'de güncelleme (Önceki gibi)
export const updateCustomerDebtInSupabase = async (customerId: string, newDebt: number): Promise<boolean> => {
    // ... (önceki kod, hata yönetimi benzer şekilde iyileştirilebilir) ...
     try {
         const { error } = await supabase.from('customers').update({ debt: newDebt }).eq('id', customerId);
         if (error) throw error;
         return true;
     } catch (error: any) {
         console.error(`Müşteri ${customerId} borcu güncellenirken hata:`, error);
         // toast({ title: "Hata", description: `Müşteri borcu güncellenemedi: ${error.message}`, variant: "destructive" });
         throw error; // Hatayı fırlat
     }
};

// Telefon numarasını formatlama fonksiyonu (Önceki gibi)
export const formatPhoneNumber = (phoneNumber: string | null | undefined): string | null => {
    // ... (önceki kod) ...
    if (!phoneNumber) return null;
    const digits = phoneNumber.replace(/\D/g, '');
    if (digits.length === 11 && digits.startsWith('0')) { const trimmedDigits = digits.substring(1); return `0(${trimmedDigits.substring(0, 3)}) ${trimmedDigits.substring(3, 6)} ${trimmedDigits.substring(6, 8)} ${trimmedDigits.substring(8, 10)}`; }
    else if (digits.length === 10) { return `0(${digits.substring(0, 3)}) ${digits.substring(3, 6)} ${digits.substring(6, 8)} ${digits.substring(8, 10)}`; }
    console.warn(`Geçersiz telefon numarası formatı algılandı: ${phoneNumber}`);
    return null;
};


// --- END OF FILE src/utils/customerUtils.ts ---