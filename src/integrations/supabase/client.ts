// --- START OF FILE src/integrations/supabase/client.ts ---

import { createClient } from '@supabase/supabase-js';
// types/supabase.ts dosyasının doğru yerde olduğunu varsayıyoruz
import type { Database } from '@/types/supabase';

// Ortam değişkenlerinden URL ve Anahtarı al
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Konsola değerleri yazdır (Hata ayıklama için)
// console.log("VITE_SUPABASE_URL:", supabaseUrl);
// console.log("VITE_SUPABASE_ANON_KEY:", supabaseAnonKey ? supabaseAnonKey.substring(0, 10) + "..." : undefined);

// Eksikse konsola hata yazdır
if (!supabaseUrl) {
  console.error("Supabase URL eksik. Lütfen .env dosyasını ve VITE_SUPABASE_URL değişkenini kontrol edin.");
  // Geliştirme ortamında çalışmaya devam etmek için boş string ile başlatabiliriz,
  // ancak üretimde hata fırlatmak daha iyi olabilir.
  // throw new Error("Supabase URL is required.");
}
if (!supabaseAnonKey) {
  console.error("Supabase Anon Key eksik. Lütfen .env dosyasını ve VITE_SUPABASE_ANON_KEY değişkenini kontrol edin.");
  // throw new Error("Supabase Anon Key is required.");
}

// Supabase istemcisini oluştur
// URL veya Anahtar eksikse bile null/boş string ile oluşturulur,
// ancak sonraki sorgularda hata verecektir.
export const supabase = createClient<Database>(supabaseUrl || '', supabaseAnonKey || '');

// Bağlantı Kontrolü Fonksiyonu (Veritabanı Sorgusu ile)
export const checkSupabaseConnection = async (): Promise<boolean> => {
  // Eğer URL veya Anahtar baştan eksikse, bağlantı mümkün değil
  if (!supabaseUrl || !supabaseAnonKey) {
    console.error("Supabase URL/Key eksik olduğu için bağlantı kontrolü başarısız.");
    return false;
  }

  try {
    // Veritabanına basit bir sorgu yapmayı dene
    // 'customers' tablosunun var olduğunu varsayıyoruz
    console.log("Supabase bağlantısı test ediliyor (DB sorgusu)...");
    const { error } = await supabase
      .from('customers') // Var olan bir tablo adı olduğundan emin olun
      .select('id', { count: 'exact', head: true }) // Sadece 1 kayıt var mı diye bak, veri çekme
      .limit(1);

    // Sorgu sırasında bir hata oluştuysa
    if (error) {
      // "relation ... does not exist" hatası tablo adının yanlış olduğunu gösterir
      // "fetch failed" gibi ağ hataları gerçek bağlantı sorunudur
      // Auth/JWT hataları bağlantının olduğunu ama yetkinin olmadığını gösterir, bunu BAŞARILI sayabiliriz.
      if (!error.message.toLowerCase().includes('auth') && !error.message.toLowerCase().includes('jwt')) {
        console.error('Supabase bağlantı hatası (DB Sorgusu):', error.message);
        return false; // Gerçek bir hata varsa false dön
      }
      console.warn('Supabase sorgu hatası (Auth olabilir, bağlantı var sayılıyor):', error.message);
      // Auth hatası olsa bile bağlantı var, true dönelim
    }

    // Hata yoksa veya sadece Auth hatasıysa bağlantı başarılıdır
    console.log('Supabase bağlantısı başarılı (DB sorgusu).');
    return true;

  } catch (error) {
    // Beklenmedik diğer hatalar
    console.error('Supabase bağlantı kontrolü sırasında beklenmedik hata:', error);
    return false;
  }
};
// --- Bağlantı Kontrolü Sonu ---

// --- END OF FILE src/integrations/supabase/client.ts ---