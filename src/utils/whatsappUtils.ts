import { getSettings } from "./settingsUtils";

const GOOGLE_REVIEW_LINK = "https://g.page/r/CQJAY3RN4q0TEBM/review";

export const formatPhoneForWhatsapp = (phone: string | null | undefined): string | null => {
  if (!phone) return null;
  let cleaned = phone.replace(/\D/g, '');
  if (cleaned.startsWith('0')) cleaned = cleaned.substring(1);
  if (cleaned.length === 10) cleaned = '90' + cleaned;
  if (cleaned.length < 10) return null;
  return cleaned;
};

export const openWhatsApp = (phone: string, message: string) => {
  const formattedPhone = formatPhoneForWhatsapp(phone);
  if (!formattedPhone) { alert("Geçerli bir telefon numarası bulunamadı."); return; }
  const encodedMessage = encodeURIComponent(message);
  const url = `https://wa.me/${formattedPhone}?text=${encodedMessage}`;
  window.open(url, '_blank');
};

export const generateSalesMessage = (customerName: string, sale: any) => {
  const settings = getSettings();
  const companyName = settings.companyName || 'İşletmemiz';

  let itemsList = "";
  if (sale.items && Array.isArray(sale.items)) {
    sale.items.forEach((item: any) => {
      itemsList += `📦 ${item.name} (${item.cartQuantity} Adet)\n`;
    });
  }

  return `👋 Merhaba *${customerName}*,\n\n` +
    `*${companyName}* ailesi olarak bizi tercih ettiğiniz için teşekkür ederiz.\n\n` +
    `Satın aldığınız ürünlerin bilgileri aşağıdadır:\n` +
    `--------------------------------\n` +
    `${itemsList}` +
    `--------------------------------\n` +
    `Ürünlerinizi güzel günlerde kullanmanızı dileriz. ✨\n\n` +
    `🌟 Hizmetimizden memnun kaldıysanız, aşağıdaki linke tıklayarak bize 5 saniye ayırıp Google'da yorum yaparsanız bizi çok mutlu edersiniz:\n` +
    `${GOOGLE_REVIEW_LINK}\n\n` +
    `Sağlıklı günler dileriz. 🙏`;
};

// --- GÜNCELLENEN SERVİS MESAJI (Premium Kart Tasarımı) ---
export const generateServiceMessage = (customerName: string, device: string, status: string, cost: number, trackingCode?: string) => {
  const settings = getSettings();
  const companyName = settings.companyName || 'GSM TEKNİK SERVİS';

  // Site adresini otomatik al, yoksa localhost varsay
  const trackingUrl = window.location.origin + "/takip";
  const separator = "━━━━━━━━━━━━━━━━━━━━";

  let statusHeader = "";
  let statusBadge = "";
  let statusDetail = "";
  let includeReview = false;

  switch (status) {
    case 'completed':
      statusHeader = "MÜJDE! CİHAZINIZ HAZIR";
      statusBadge = "✅ İŞLEM TAMAMLANDI";
      statusDetail = "Cihazınızın onarım ve test süreçleri başarıyla tamamlanmıştır. Mağazamızdan teslim alabilirsiniz.";
      includeReview = true;
      break;
    case 'in_progress':
      statusHeader = "İŞLEME ALINDI";
      statusBadge = "🛠️ İŞLEM SÜRÜYOR";
      statusDetail = "Cihazınız teknik servis birimimize ulaştı. Uzman ekibimiz onarım sürecine başlamıştır.";
      break;
    case 'cancelled':
      statusHeader = "İPTAL / İADE";
      statusBadge = "⚠️ İŞLEM İPTAL";
      statusDetail = "Cihazınızla ilgili işlem gerçekleştirilemedi. Detaylı bilgi için lütfen iletişime geçiniz.";
      break;
    default:
      statusHeader = "SERVİS KAYDI AÇILDI";
      statusBadge = "⏳ BEKLEMEDE";
      statusDetail = "Cihazınız kabul edildi ve sıraya alındı. En kısa sürede inceleme yapılacaktır.";
      break;
  }

  // 1. Header
  let message = `📱 *${companyName}*\n` +
    `Güvenilir Onarım Hizmetleri\n` +
    `${separator}\n\n`;

  // 2. User & Device (Kart Görünümü)
  message += `👤 *${customerName}*\n` +
    `--------------------------------\n` +
    `📲 *Cihaz Bilgisi:*\n` +
    `▪️ ${device}\n` +
    `--------------------------------\n\n`;

  // 3. Status (Vurgulu Alan)
  message += `*${statusBadge}*\n` +
    `🎉 *${statusHeader}*\n` +
    `${statusDetail}\n`;

  if (cost > 0) {
    message += `\n💵 *Tutar:* ${cost.toFixed(2)} TL\n`;
  }

  message += `\n${separator}\n\n`;

  // 4. Takip Bölümü
  if (trackingCode) {
    message += `🔎 *CİHAZ TAKİP*\n` +
      `Durum sorgulamak için linke tıklayın:\n` +
      `${trackingUrl}?code=${trackingCode}\n\n`;
  }

  // 5. Yorum Bölümü (Yıldızlı)
  if (includeReview) {
    message += `⭐ *MEMNUN KALDINIZ MI?* ⭐\n` +
      `Bize Google'da *5 Yıldız* vererek destek olursanız çok seviniriz! 👇\n\n` +
      `🔗 *Hemen Yorum Yap:*\n` +
      `${GOOGLE_REVIEW_LINK}\n\n` +
      `${separator}\n\n`;
  }

  // 6. Footer
  message += `💚 Sağlıklı günler dileriz\n` +
    `📞 *${companyName}*`;

  return message;
};