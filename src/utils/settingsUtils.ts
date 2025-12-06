export interface AppSettings {
  companyName: string;
  companyAddress: string;
  companyPhone: string;
  taxRate: number; // Varsayılan KDV oranı (%)
  currencySymbol: string;
  receiptPrinterWidth: '58mm' | '80mm'; // Yazıcı kağıt boyutu
  showDiscountOnReceipt: boolean; // Fişte indirim satırı görünsün mü?
  enableBarcodeMode: boolean; // Satış ekranı varsayılan olarak barkod modunda mı açılsın?
  lowStockThreshold: number; // Kritik stok uyarısı seviyesi
  themeColor: string; // Windows 95 başlık rengi (Opsiyonel - Legacy)
  theme: 'modern-dark' | 'light' | 'classic'; // Yeni Tema Sistemi
}

const DEFAULT_SETTINGS: AppSettings = {
  companyName: 'İşletmem A.Ş.',
  companyAddress: 'Merkez Mah. İşlek Cad. No:1 İstanbul',
  companyPhone: '0212 555 00 00',
  taxRate: 20,
  currencySymbol: '₺',
  receiptPrinterWidth: '80mm',
  showDiscountOnReceipt: true,
  enableBarcodeMode: false,
  lowStockThreshold: 5,
  themeColor: '#000080', // Legacy
  theme: 'modern-dark' // Varsayılan Tema
};

const SETTINGS_KEY = 'win95_erp_settings';

// Ayarları Kaydet
export const saveSettings = (settings: AppSettings): void => {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    // Ayarlar değiştiğinde dinleyen bileşenleri (örn: Satış Ekranı) haberdar et
    window.dispatchEvent(new Event('settings-updated'));
  } catch (error) {
    console.error("Ayarlar kaydedilirken hata oluştu:", error);
  }
};

// Ayarları Getir
export const getSettings = (): AppSettings => {
  try {
    const saved = localStorage.getItem(SETTINGS_KEY);
    if (!saved) return DEFAULT_SETTINGS;
    // Yeni eklenen ayar alanları varsa varsayılanlarla birleştir
    return { ...DEFAULT_SETTINGS, ...JSON.parse(saved) };
  } catch (error) {
    console.error("Ayarlar okunurken hata oluştu:", error);
    return DEFAULT_SETTINGS;
  }
};

// Belirli bir ayarı tek olarak getir (Örn: getSetting('taxRate'))
export const getSetting = <K extends keyof AppSettings>(key: K): AppSettings[K] => {
  const settings = getSettings();
  return settings[key];
};