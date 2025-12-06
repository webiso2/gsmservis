// --- START OF FILE src/components/stock/PurchaseEntryDialog.tsx ---

import React, { useState, useEffect } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription, DialogClose
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import { Loader2, Save, X as CancelIcon } from 'lucide-react';
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import type { Product, Wholesaler, WholesalerTransaction } from "@/types/backup";

interface PurchaseEntryDialogProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  product: Product | null;
  wholesalers: Pick<Wholesaler, 'id' | 'name'>[];
  onPurchaseSaved: (updatedProductId: string, wholesalerId?: string) => void;
}

const PurchaseEntryDialog: React.FC<PurchaseEntryDialogProps> = ({
  isOpen,
  setIsOpen,
  product,
  wholesalers,
  onPurchaseSaved,
}) => {
  const { toast } = useToast();
  const [quantity, setQuantity] = useState<string>('');
  const [unitPrice, setUnitPrice] = useState<string>('');
  // === DÜZELTME: State başlangıç değeri '' yerine null ===
  const [selectedWholesalerId, setSelectedWholesalerId] = useState<string | null>(null);
  const [notes, setNotes] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (isOpen && product) {
      setQuantity('');
      setUnitPrice(product.purchase_price?.toString() || '0');
      setNotes('');
      setIsSaving(false);

      if (product.supplier) {
        const foundId = wholesalers.find(w => w.name === product.supplier)?.id || null;
        setSelectedWholesalerId(foundId);
        console.log(`[PurchaseDialog] Ürün tedarikçisi (${product.supplier}) için bulunan ID: ${foundId}`);
      } else {
        // === DÜZELTME: Tedarikçi yoksa null ayarla ===
        setSelectedWholesalerId(null);
      }

    }
  }, [isOpen, product, wholesalers]);

  const handleSavePurchase = async () => {
    if (!product) return;

    const purchaseQuantity = parseFloat(quantity);
    const purchaseUnitPrice = parseFloat(unitPrice);

    if (isNaN(purchaseQuantity) || purchaseQuantity <= 0) {
      toast({ title: "Uyarı", description: "Lütfen geçerli bir miktar girin.", variant: "destructive" });
      return;
    }
    if (selectedWholesalerId && (isNaN(purchaseUnitPrice) || purchaseUnitPrice < 0)) {
       toast({ title: "Uyarı", description: "Tedarikçi seçildiğinde geçerli bir birim alış fiyatı girmek zorunludur.", variant: "destructive" });
       return;
    }

    setIsSaving(true);
    const totalCost = selectedWholesalerId ? purchaseQuantity * purchaseUnitPrice : 0;

    try {
        // Stok Artırma
        console.log(`[PurchaseDialog] Stok artırılıyor: Ürün ID=${product.id}, Miktar=${purchaseQuantity}`);
        const { error: stockUpdateError } = await supabase
            .from('products')
            .update({ quantity: (product.quantity ?? 0) + purchaseQuantity })
            .eq('id', product.id);
        if (stockUpdateError) throw stockUpdateError;
        console.log("[PurchaseDialog] Stok başarıyla güncellendi.");

        let wholesalerUpdateSuccess = false;
        let wholesalerBalanceAfter: number | null = null;

        // Borç Artırma ve Hareket Kaydı
        if (selectedWholesalerId && totalCost >= 0) {
            console.log(`[PurchaseDialog] Toptancı borcu artırılıyor: ID=${selectedWholesalerId}, Değişim=${totalCost}`);
            const { error: debtUpdateError } = await supabase.rpc('increment_wholesaler_debt', {
                wholesaler_id_input: selectedWholesalerId,
                debt_change: totalCost
            });

            if (debtUpdateError) {
                console.error("[PurchaseDialog] Toptancı borcu RPC hatası:", debtUpdateError);
                await supabase.from('products').update({ quantity: product.quantity }).eq('id', product.id);
                throw new Error(`Toptancı borcu güncellenemedi: ${debtUpdateError.message}. Stok artışı geri alındı.`);
            }
            wholesalerUpdateSuccess = true;
            console.log("[PurchaseDialog] Toptancı borcu başarıyla artırıldı.");

            // Yeni borcu al
            const { data: wholesalerData, error: fetchWError } = await supabase
               .from('wholesalers')
               .select('debt')
               .eq('id', selectedWholesalerId)
               .single();
            if (fetchWError || !wholesalerData) {
                console.warn("[PurchaseDialog] Güncel toptancı borcu alınamadı.", fetchWError);
            }
            wholesalerBalanceAfter = wholesalerData?.debt ?? null;

            // Hareket Kaydı
             const wholesalerTxData: Omit<WholesalerTransaction, 'id' | 'created_at' | 'related_product_id'> = {
                wholesaler_id: selectedWholesalerId,
                date: new Date().toISOString(),
                type: 'purchase',
                amount: totalCost,
                balance_after: wholesalerBalanceAfter,
                description: `Stok Girişi: ${product.name} (${purchaseQuantity} x ${purchaseUnitPrice.toFixed(2)}₺)${notes ? ' - Not: '+notes : ''}`,
                related_account_tx_id: null,
                related_purchase_invoice_id: null,
            };
            console.log("[PurchaseDialog] Toptancı hareketi oluşturuluyor:", wholesalerTxData);
            const { error: txInsertError } = await supabase.from('wholesaler_transactions').insert(wholesalerTxData);
            if (txInsertError) {
                console.error("[PurchaseDialog] Toptancı hareket kaydı hatası:", txInsertError);
                toast({title: "Uyarı", description: "Toptancı hareket kaydı oluşturulamadı.", variant: "warning"});
            } else {
                 console.log("[PurchaseDialog] Toptancı hareket kaydı oluşturuldu.");
            }
        } else if (selectedWholesalerId && totalCost < 0) {
             console.warn("[PurchaseDialog] Birim fiyat negatif olamaz, borç işlemi atlandı.");
        } else {
            console.log("[PurchaseDialog] Tedarikçi seçilmedi, borç ve hareket kaydı atlandı.");
        }

        toast({ title: "Başarılı", description: `Stok girişi yapıldı.${wholesalerUpdateSuccess ? ' Toptancı borcu güncellendi.' : ''}` });
        onPurchaseSaved(product.id, selectedWholesalerId ?? undefined);
        setIsOpen(false);

    } catch (error: any) {
        console.error("[PurchaseDialog] Stok girişi/borç kaydı hatası:", error);
        toast({ title: "Hata", description: `İşlem başarısız: ${error.message}`, variant: "destructive" });
    } finally {
        setIsSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-[480px] bg-[#c0c0c0] border-t-2 border-l-2 border-[#ffffff] border-r-2 border-b-2 border-r-[#868686] border-b-[#868686] p-0">
        <DialogHeader className="bg-[#000080] text-white p-2">
          <DialogTitle>Stok Girişi (Alım Kaydı)</DialogTitle>
           <DialogDescription className="text-gray-300 text-xs pt-1 px-1 text-left">
             Ürün: {product?.name ?? '...'} ({product?.code ?? '...'}) - Mevcut Stok: {product?.quantity ?? 0}
           </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 p-4">
            <div className="grid grid-cols-4 items-center gap-3">
              <Label htmlFor="quantity" className="text-right text-xs font-bold">Miktar *</Label>
              <Input id="quantity" name="quantity" type="number" value={quantity} onChange={(e) => setQuantity(e.target.value)} className="col-span-3 h-8 win95-inset bg-white" placeholder="0" min="0.01" step="any" disabled={isSaving} required />
            </div>
            <div className="grid grid-cols-4 items-center gap-3">
                <Label htmlFor="wholesaler" className="text-right text-xs font-bold">Tedarikçi</Label>
                {/* === DÜZELTME: value prop'u güncellendi === */}
                <Select
                    value={selectedWholesalerId ?? ''} // value '' olabilir ama SelectItem'ınki olamaz
                    onValueChange={(value) => setSelectedWholesalerId(value === '' ? null : value)}
                    disabled={isSaving}
                >
                    <SelectTrigger id="wholesaler" className="col-span-3 h-8 win95-outset bg-white text-xs">
                         {/* Placeholder doğrudan trigger içinde */}
                        <SelectValue placeholder="Tedarikçi Seçin (Borç Kaydı İçin)" />
                    </SelectTrigger>
                    <SelectContent>
                        {/* === DÜZELTME: value="" olan SelectItem kaldırıldı === */}
                        {wholesalers.map(w => (
                            <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>
                        ))}
                         {/* Eğer hiç toptancı yoksa bilgi mesajı eklenebilir */}
                         {wholesalers.length === 0 && (
                             <div className="px-2 py-1.5 text-xs text-gray-500">Toptancı bulunamadı.</div>
                         )}
                    </SelectContent>
                </Select>
            </div>
            <div className="grid grid-cols-4 items-center gap-3">
               <Label htmlFor="unitPrice" className="text-right text-xs font-bold">Birim Fiyatı (₺) *</Label>
               <Input id="unitPrice" name="unitPrice" type="number" value={unitPrice} onChange={(e) => setUnitPrice(e.target.value)} className="col-span-3 h-8 win95-inset bg-white" placeholder="0.00" min="0" step="0.01" disabled={isSaving || !selectedWholesalerId} required={!!selectedWholesalerId} />
             </div>
             <div className="grid grid-cols-4 items-start gap-3">
                 <Label htmlFor="notes" className="text-right text-xs font-bold pt-1">Notlar</Label>
                 <textarea id="notes" name="notes" value={notes} onChange={(e) => setNotes(e.target.value)} className="col-span-3 min-h-[60px] win95-inset bg-white text-xs p-1" placeholder="(Opsiyonel, örn: Fatura No: 123)" disabled={isSaving} />
            </div>
        </div>
        <DialogFooter className="p-3 bg-gray-100 border-t border-gray-300">
              <Button onClick={handleSavePurchase} className="win95-outset" disabled={isSaving || !quantity || (!!selectedWholesalerId && (unitPrice === '' || parseFloat(unitPrice) < 0))} >
                 {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Save className="mr-2 h-4 w-4" />}
                 Kaydet
              </Button>
              <DialogClose asChild>
                 <Button type="button" variant="outline" className="win95-outset" disabled={isSaving}> İptal </Button>
              </DialogClose>
            </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default PurchaseEntryDialog;
// --- END OF FILE src/components/stock/PurchaseEntryDialog.tsx ---