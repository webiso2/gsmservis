import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/supabase';

// LocalStorage anahtarları
export const SUPABASE_URL_KEY = 'app_supabase_url';
export const SUPABASE_KEY_KEY = 'app_supabase_anon_key';

// 1. Önce LocalStorage'dan, yoksa .env'den dene
const getSupabaseConfig = () => {
  const localUrl = localStorage.getItem(SUPABASE_URL_KEY);
  const localKey = localStorage.getItem(SUPABASE_KEY_KEY);

  if (localUrl && localKey) {
    return { url: localUrl, key: localKey };
  }

  return {
    url: import.meta.env.VITE_SUPABASE_URL,
    key: import.meta.env.VITE_SUPABASE_ANON_KEY
  };
};

const config = getSupabaseConfig();
const supabaseUrl = config.url;
const supabaseAnonKey = config.key;

// URL validation helper
const isValidUrl = (urlString: string) => {
  try {
    return Boolean(new URL(urlString));
  } catch (e) {
    return false;
  }
};

// Client oluşturma
// Eğer URL/Key yoksa yine de createClient çağırıyoruz (boş olsa bile),
// çünkü import eden dosyalar 'supabase' objesini bekliyor.
// Ancak kullanıldığında hata fırlatacak.
export const supabase = createClient<Database>(
  isValidUrl(supabaseUrl) ? supabaseUrl : 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    }
  }
);

export const saveSupabaseConfig = (url: string, key: string) => {
  localStorage.setItem(SUPABASE_URL_KEY, url);
  localStorage.setItem(SUPABASE_KEY_KEY, key);
  // Değişikliklerin etkili olması için reload gerekebilir,
  // ama çağıran yer (SetupPage) bunu yönetmeli.
};

export const clearSupabaseConfig = () => {
  localStorage.removeItem(SUPABASE_URL_KEY);
  localStorage.removeItem(SUPABASE_KEY_KEY);
}

export const checkSupabaseConnection = async (): Promise<{ success: boolean; error?: string }> => {
  if (!supabaseUrl || !supabaseAnonKey || !isValidUrl(supabaseUrl)) {
    return { success: false, error: 'Supabase URL veya Key eksik/geçersiz.' };
  }

  try {
    // Basit bir bağlantı testi: 'customers' tablosundan 1 satır çekmeye çalış
    // Tablo henüz yoksa (kurulum aşaması) 'relation does not exist' hatası döner.
    // Bu hata bile bağlantının (network/auth) çalıştığını gösterir!

    // Auth hatası almamak için basit bir RPC veya non-auth sorgu denenebilir,
    // ama 'customers' tablosu RLS ile public ise çalışır.

    const { error } = await supabase
      .from('customers')
      .select('id')
      .limit(1);

    if (error) {
      // Tablo yok hatası (42P01) -> Bağlantı BAŞARILI, Şema EKSİK
      // "Could not find the table" hatası da PostgREST'ten dönebilir (Schema Cache hatası)
      if (
        error.code === '42P01' ||
        error.message.includes('relation "public.customers" does not exist') ||
        error.message.includes('Could not find the table')
      ) {
        console.warn("Tablo bulunamadı, ancak Supabase bağlantısı başarılı.");
        return { success: true };
      }

      // Diğer hatalar (401 Unauthorized, Network Error vb.)
      console.error('Supabase bağlantı testi hatası:', error);

      // Eğer "Auth" hatası ise (API Key yanlış)
      if (error.code === 'PGRST301' || error.message.includes('JWT')) {
        return { success: false, error: 'API Anahtarı geçersiz veya yetkisiz.' };
      }

      // Network hatası
      if (error.message.includes('fetch failed')) {
        return { success: false, error: 'Sunucuya ulaşılamadı. URL\'i kontrol edin.' };
      }

      // Bilinmeyen bir hataysa da şimdilik başarısız sayalım
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'Beklenmedik bir hata oluştu.' };
  }
};
