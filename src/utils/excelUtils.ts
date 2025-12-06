// --- START OF FILE src/utils/excelUtils.ts ---
import * as XLSX from 'xlsx';
import { supabase } from '@/integrations/supabase/client';

export interface PriceListItem {
  wholesaler_product_code: string;
  parsed_model_code: string | null;
  product_name_detail: string;
  product_full_name: string;
  price: number;
  currency: string;
  unit: string;
  your_product_id: string | null;
  your_product_code: string | null;
  notes: string | null;
  original_sheet_name?: string;
}

export async function processAndSavePriceList(
  workbook: XLSX.WorkBook,
  wholesalerId: string,
  originalFilename: string,
  priceListCurrency: 'USD' | 'TRY' = 'USD'
): Promise<{ success: boolean; message: string; processedItemCount?: number; processedSheetCount?: number }> {
  if (!workbook || !workbook.SheetNames || workbook.SheetNames.length === 0) {
    return { success: false, message: "Excel çalışma kitabı boş veya sayfa bulunamadı." };
  }

  const allProcessedItems: PriceListItem[] = [];
  let processedSheetCount = 0;
  console.log(`[excelUtils] Excel'de ${workbook.SheetNames.length} çalışma sayfası bulundu.`);

  for (const sheetName of workbook.SheetNames) {
    console.log(`[excelUtils] "${sheetName}" sayfası işleniyor...`);
    const worksheet = workbook.Sheets[sheetName];
    if (!worksheet) {
      console.warn(`[excelUtils] "${sheetName}" sayfası okunamadı, atlanıyor.`);
      continue;
    }

    const sheetJsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: null }) as any[][];
    if (!sheetJsonData || sheetJsonData.length < 2) {
      console.warn(`[excelUtils] "${sheetName}" sayfası boş veya geçersiz format (başlık + en az 1 veri satırı bekleniyor), atlanıyor.`);
      continue;
    }

    const sheetHeaders = sheetJsonData[0];
    const isValidSheet = sheetHeaders && sheetHeaders.length >= 2 &&
                         typeof sheetHeaders[0] === 'string' &&
                         typeof sheetHeaders[1] === 'string';

    if (!isValidSheet) {
        console.warn(`[excelUtils] "${sheetName}" sayfasının başlıkları beklenildiği gibi değil (en az 2 sütun başlığı bekleniyor), atlanıyor. Başlıklar:`, sheetHeaders);
        continue;
    }

    const dataRows = sheetJsonData.slice(1);
    let itemsFromThisSheet = 0;

    for (const [rowIndex, row] of dataRows.entries()) {
      if (row.every(cell => cell === null || cell?.toString().trim() === '')) {
        continue;
      }
      const rawProductInfo = row[0]?.toString().trim();
      const rawPrice = row[1]?.toString().trim();

      if (!rawProductInfo) {
        console.warn(`[excelUtils] "${sheetName}" - Satır ${rowIndex + 2}: Ürün bilgisi boş, atlanıyor.`);
        continue;
      }
      if (rawPrice === undefined || rawPrice === null || rawPrice === '') {
          console.warn(`[excelUtils] "${sheetName}" - Satır ${rowIndex + 2} (${rawProductInfo}): Fiyat bilgisi boş, atlanıyor.`);
          continue;
      }
      const price = parseFloat(rawPrice.replace(',', '.'));
      if (isNaN(price)) {
        console.warn(`[excelUtils] "${sheetName}" - Satır ${rowIndex + 2} (${rawProductInfo}): Geçersiz fiyat "${rawPrice}", atlanıyor.`);
        continue;
      }

      let parsedModelCode: string | null = null;
      let productNameDetail = rawProductInfo;
      let productFullName = rawProductInfo;
      const commaIndex = rawProductInfo.indexOf(',');
      if (commaIndex > -1) {
        parsedModelCode = rawProductInfo.substring(0, commaIndex).trim();
        productNameDetail = rawProductInfo.substring(commaIndex + 1).trim();
        productFullName = `${parsedModelCode} ${productNameDetail}`;
      } else {
        const firstSpaceIndex = rawProductInfo.indexOf(' ');
        if (firstSpaceIndex > -1 && firstSpaceIndex < 15) {
          parsedModelCode = rawProductInfo.substring(0, firstSpaceIndex).trim();
          productNameDetail = rawProductInfo.substring(firstSpaceIndex + 1).trim();
          productFullName = rawProductInfo;
        } else {
          parsedModelCode = null;
          productNameDetail = rawProductInfo;
          productFullName = rawProductInfo;
        }
      }
      const modelInParenthesesMatch = rawProductInfo.match(/\(([^()]+)\)/);
      if (modelInParenthesesMatch && modelInParenthesesMatch[1]) {
          const potentialModel = modelInParenthesesMatch[1].trim();
          if (!/FİLM/i.test(potentialModel) && potentialModel.length < 12 && /^[A-Z0-9\s/-]+$/.test(potentialModel) && potentialModel.length > 2) {
              if(!/MODEL KODU/i.test(potentialModel) && !potentialModel.includes(',')) {
                   parsedModelCode = potentialModel;
              }
          }
      }

      let yourProductId: string | null = null;
      let yourProductCode: string | null = null;
      if (parsedModelCode) {
          try {
              // Basit bir eşleştirme: Toptancının parsedModelCode'u senin product.code ile eşleşiyor mu?
              // Bu kısım projenin product yapısına göre çok daha detaylı olmalı.
              const { data: matchedProduct, error: matchError } = await supabase
                  .from('products')
                  .select('id, code') // Eşleştirme için gerekli alanlar
                  .ilike('code', `%${parsedModelCode}%`) // Daha esnek bir arama için ilike
                  .limit(1) // İlk eşleşeni al
                  .maybeSingle();

              if (matchError) {
                  console.warn(`[excelUtils] Ürün eşleştirme sorgu hatası (${parsedModelCode}): ${matchError.message}`);
              } else if (matchedProduct) {
                  yourProductId = matchedProduct.id;
                  yourProductCode = matchedProduct.code;
                  console.log(`[excelUtils] Eşleşme bulundu: ${rawProductInfo} -> Senin Kodun: ${yourProductCode}`);
              }
          } catch(e) {
              console.error(`[excelUtils] Eşleştirme sırasında beklenmedik hata (${parsedModelCode}):`, e);
          }
      }

      allProcessedItems.push({
        wholesaler_product_code: rawProductInfo,
        parsed_model_code: parsedModelCode,
        product_name_detail: productNameDetail,
        product_full_name: productFullName,
        price: price,
        currency: priceListCurrency,
        unit: 'adet',
        your_product_id: yourProductId,
        your_product_code: yourProductCode,
        notes: null,
        original_sheet_name: sheetName,
      });
      itemsFromThisSheet++;
    }
    if (itemsFromThisSheet > 0) {
        processedSheetCount++;
    }
    console.log(`[excelUtils] "${sheetName}" sayfasından ${itemsFromThisSheet} ürün işlendi.`);
  }

  if (allProcessedItems.length === 0) {
    return { success: false, message: "Excel'den işlenecek geçerli ürün bulunamadı (tüm sayfalarda)." };
  }
  console.log(`[excelUtils] Toplam ${allProcessedItems.length} ürün ${processedSheetCount} sayfadan işlendi. Veritabanına kaydediliyor...`);

  try {
    const { error: updateError } = await supabase
      .from('wholesaler_pricelists')
      .update({ is_active: false })
      .eq('wholesaler_id', wholesalerId)
      .eq('is_active', true);
    if (updateError) {
      console.error("[excelUtils] Eski aktif liste güncellenirken hata:", updateError);
      return { success: false, message: `Eski fiyat listesi güncellenemedi: ${updateError.message}` };
    }
    console.log("[excelUtils] Eski aktif listeler (varsa) pasif yapıldı.");

    const listName = `${originalFilename} - ${new Date().toLocaleDateString('tr-TR')} ${new Date().toLocaleTimeString('tr-TR', {hour: '2-digit', minute:'2-digit'})}`;
    const { error: insertError } = await supabase
      .from('wholesaler_pricelists')
      .insert({
        wholesaler_id: wholesalerId,
        uploaded_at: new Date().toISOString(),
        original_filename: originalFilename,
        list_name: listName,
        is_active: true,
        processed_data: allProcessedItems,
      });
    if (insertError) {
      console.error("[excelUtils] Yeni fiyat listesi eklenirken hata:", insertError);
      return { success: false, message: `Yeni fiyat listesi kaydedilemedi: ${insertError.message}` };
    }
    console.log("[excelUtils] Yeni fiyat listesi başarıyla eklendi.");
    return { success: true, message: `${allProcessedItems.length} ürün (${processedSheetCount} sayfadan) içeren fiyat listesi başarıyla yüklendi.`, processedItemCount: allProcessedItems.length, processedSheetCount };
  } catch (error: any) {
    console.error("[excelUtils] Fiyat listesi kaydetme genel hata:", error);
    return { success: false, message: `Fiyat listesi işlenirken bir hata oluştu: ${error.message}` };
  }
}
// --- END OF FILE src/utils/excelUtils.ts ---