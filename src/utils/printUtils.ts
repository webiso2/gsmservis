// --- START OF FILE src/utils/printUtils.ts ---
import { Service, Customer } from "@/types/service";
import { getStatusText } from "@/utils/serviceUtils";

const LINE_WIDTH = 32;

const centerText = (text: string): string => {
  const t = text || '';
  // Tam ortalama formülü: boşluklar eşit dağıtılacak
  const padding = LINE_WIDTH - t.length;
  const leftPadding = Math.floor(padding / 2);
  const rightPadding = padding - leftPadding;

  // Uzun metinleri kes
  if (padding < 0) return t.substring(0, LINE_WIDTH);

  return ' '.repeat(Math.max(0, leftPadding)) + t + ' '.repeat(Math.max(0, rightPadding));
};

const truncateText = (text: string | null | undefined, maxLength: number): string => {
  const t = text || '';
  return t.length > maxLength ? t.substring(0, maxLength - 1) + '…' : t;
};

const createTwoColumnRow = (left: string, right: string): string => {
  const maxLeftLen = 10; // Sabit sol kolon genişliği

  // Sol kısmı sabit genişlikte formatla
  const leftPart = truncateText(left, maxLeftLen).padEnd(maxLeftLen);

  // Sağ kısım için kalan alan (eksi bir boşluk tamponu)
  const rightMaxLen = LINE_WIDTH - maxLeftLen - 1;
  const rightPart = truncateText(right, rightMaxLen).padStart(rightMaxLen, ' ');

  // Sol + boşluk + sağ formattı
  return leftPart + ' ' + rightPart;
};

const wrapText = (text: string | null | undefined, maxWidth: number): string[] => {
  const t = text || '';
  if (!t) return [''];

  const words = t.split(' ');
  const lines: string[] = [];
  let currentLine = '';

  words.forEach(word => {
    if (word.length > maxWidth) {
      // Çok uzun kelimeleri böl
      if (currentLine) lines.push(currentLine);
      currentLine = '';

      for (let i = 0; i < word.length; i += maxWidth) {
        lines.push(word.substring(i, i + maxWidth));
      }
    } else if (currentLine.length + word.length + 1 <= maxWidth) {
      currentLine += (currentLine ? ' ' : '') + word;
    } else {
      lines.push(currentLine);
      currentLine = word;
    }
  });

  if (currentLine) lines.push(currentLine);
  return lines;
};

export const printServiceRecord = async (service: Service, customer?: Customer | null): Promise<void> => {
  try {
    const separator = '-'.repeat(LINE_WIDTH);
    let content = '\n';

    // TAM ORTALANMIŞ BAŞLIK
    content += centerText('GSM TEKNIK SERVIS') + '\n';
    content += centerText('ismail sarikaya') + '\n';
    content += centerText('0(555) 333 51 33') + '\n';
    content += separator + '\n';

    // Tarih ve saat (düzgün formatlı)
    const date = service.date ? new Date(service.date).toLocaleDateString('tr-TR') : '-';
    const time = service.date ? new Date(service.date).toLocaleTimeString('tr-TR',
      { hour: '2-digit', minute: '2-digit' }) : '';
    content += createTwoColumnRow('Tarih:', `${date} ${time}`) + '\n';
    content += createTwoColumnRow('Fis No:', service.id?.toString() || '') + '\n';
    if (service.tracking_code) content += createTwoColumnRow('Takip Kodu:', service.tracking_code) + '\n';
    content += separator + '\n';

    // Müşteri bilgileri
    const customerName = truncateText(
      `Ad: ${customer?.name || service.customerName || '-'}`,
      LINE_WIDTH
    );
    content += customerName + '\n';
    if (customer?.phone) {
      content += truncateText('Tel: ' + customer.phone, LINE_WIDTH) + '\n';
    }
    content += separator + '\n';

    // Cihaz bilgileri
    content += truncateText('Cihaz: ' + (service.deviceType || '-'), LINE_WIDTH) + '\n';
    if (service.brand) content += truncateText('Marka: ' + service.brand, LINE_WIDTH) + '\n';
    if (service.model) content += truncateText('Model: ' + service.model, LINE_WIDTH) + '\n';
    if (service.serialNumber) content += truncateText('S.No: ' + service.serialNumber, LINE_WIDTH) + '\n';
    content += separator + '\n';

    // Sorun ve çözüm
    content += 'SORUN:\n';
    wrapText(service.problem || 'Belirtilmemiş', LINE_WIDTH).forEach(l => {
      content += l + '\n';
    });

    if (service.solution) {
      content += '\nYAPILAN:\n';
      wrapText(service.solution, LINE_WIDTH).forEach(l => {
        content += l + '\n';
      });
    }
    content += separator + '\n';

    // Durum ve ücret (geliştirilmiş sütun formatı)
    const statusText = getStatusText(service.status || 'pending');
    const costText = (service.cost ?? 0).toFixed(2) + 'TL';
    content += createTwoColumnRow('DURUM:', statusText) + '\n';
    content += createTwoColumnRow('UCRET:', costText) + '\n';
    content += separator + '\n';

    content += centerText('Tesekkurler!') + '\n';
    content += centerText('www.gsmteknik.com') + '\n\n';

    await printContent(content);
  } catch (error) {
    console.error('Yazdırma hatası:', error);
    alert('Yazdırma hatası: ' + (error as Error).message);
  }
};

const printContent = async (content: string): Promise<void> => {
  const pW = window.open('', '_blank');
  if (!pW) {
    alert('Lütfen pop-up engelleyiciyi devre dışı bırakın');
    return;
  }

  pW.document.write(`<!DOCTYPE html>
<html>
<head>
  <title>Servis Fisi</title>
  <meta charset="UTF-8">
  <style>
    @page {
      size: 58mm auto;
      margin: 1mm;
    }
    body {
      font-family: 'Courier New', monospace;
      font-weight: bold;
      font-size: 10px;
      line-height: 1.2;
      margin: 0;
      width: 56mm;
      color: #000;
    }
    pre {
      text-align: center;
      margin: 0;
      padding: 0;
      letter-spacing: 0.3px;
      word-break: break-all;
    }
  </style>
</head>
<body>
  <pre>${content}</pre>
</body>
</html>`);

  pW.document.close();
  pW.focus();
  await new Promise(r => setTimeout(r, 100));
  pW.print();
  pW.close();
};

export const printWithESCPOS = async (service: Service): Promise<void> => {
  alert('ESC/POS yazdırma şu anda desteklenmemektedir');
  printServiceRecord(service);
};
// --- END OF FILE src/utils/printUtils.ts ---
