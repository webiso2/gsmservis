import React, { useState, useEffect } from 'react';
import { X, Save, Building, Printer, ShoppingCart, Sliders, Loader2 } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { AppSettings, getSettings, saveSettings } from "@/utils/settingsUtils";
import { cn } from "@/lib/utils";

interface SettingsModuleProps {
  onClose: () => void;
}

const SettingsModule: React.FC<SettingsModuleProps> = ({ onClose }) => {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<'general' | 'sales' | 'printer' | 'appearance'>('general');
  const [settings, setSettings] = useState<AppSettings>(getSettings());
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setSettings(getSettings());
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setSettings(prev => ({ ...prev, [name]: value }));
  };

  const handleNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setSettings(prev => ({ ...prev, [name]: parseFloat(value) || 0 }));
  };

  const handleSwitchChange = (name: keyof AppSettings, checked: boolean) => {
    setSettings(prev => ({ ...prev, [name]: checked }));
  };

  const handleSelectChange = (name: keyof AppSettings, value: string) => {
    setSettings(prev => ({ ...prev, [name]: value }));
  };

  const handleSave = () => {
    setIsSaving(true);
    setTimeout(() => {
      saveSettings(settings);
      toast({
        title: "Başarılı",
        description: "Sistem ayarları güncellendi ve kaydedildi.",
      });
      setIsSaving(false);
    }, 600);
  };

  return (
    <div className="h-full p-2 sm:p-4 animate-in fade-in duration-300">
      <div className="glass-panel rounded-xl h-full flex flex-col border border-white/10 shadow-2xl overflow-hidden">
        <div className="bg-white/5 border-b border-white/10 p-3 flex justify-between items-center flex-shrink-0 backdrop-blur-md">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-gray-500/20 rounded-lg">
              <Sliders className="h-5 w-5 text-gray-400" />
            </div>
            <h1 className="text-lg font-bold text-white tracking-tight">Sistem Yapılandırması</h1>
          </div>
          <Button variant="ghost" size="icon" className="hover:bg-red-500/20 hover:text-red-400 h-8 w-8 rounded-lg transition-colors" onClick={onClose} disabled={isSaving}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        <div className="flex gap-2 p-3 border-b border-white/10 bg-black/20 overflow-x-auto">
          <Button
            variant="ghost"
            onClick={() => setActiveTab('general')}
            className={cn(
              "h-9 text-xs sm:text-sm px-4 transition-all duration-200",
              activeTab === 'general'
                ? "bg-blue-600 text-white shadow-[0_0_15px_rgba(37,99,235,0.4)]"
                : "text-gray-400 hover:text-white hover:bg-white/10"
            )}
          >
            <Building className="w-4 h-4 mr-2" /> Firma
          </Button>
          <Button
            variant="ghost"
            onClick={() => setActiveTab('sales')}
            className={cn(
              "h-9 text-xs sm:text-sm px-4 transition-all duration-200",
              activeTab === 'sales'
                ? "bg-blue-600 text-white shadow-[0_0_15px_rgba(37,99,235,0.4)]"
                : "text-gray-400 hover:text-white hover:bg-white/10"
            )}
          >
            <ShoppingCart className="w-4 h-4 mr-2" /> Satış & Stok
          </Button>
          <Button
            variant="ghost"
            onClick={() => setActiveTab('printer')}
            className={cn(
              "h-9 text-xs sm:text-sm px-4 transition-all duration-200",
              activeTab === 'printer'
                ? "bg-blue-600 text-white shadow-[0_0_15px_rgba(37,99,235,0.4)]"
                : "text-gray-400 hover:text-white hover:bg-white/10"
            )}
          >
            <Printer className="w-4 h-4 mr-2" /> Yazıcı
          </Button>
          <Button
            variant="ghost"
            onClick={() => setActiveTab('appearance')}
            className={cn(
              "h-9 text-xs sm:text-sm px-4 transition-all duration-200",
              activeTab === 'appearance'
                ? "bg-blue-600 text-white shadow-[0_0_15px_rgba(37,99,235,0.4)]"
                : "text-gray-400 hover:text-white hover:bg-white/10"
            )}
          >
            <Sliders className="w-4 h-4 mr-2" /> Görünüm
          </Button>
        </div>

        <ScrollArea className="flex-1 p-4">
          <div className="max-w-3xl mx-auto space-y-6">

            {activeTab === 'general' && (
              <div className="space-y-4 animate-in fade-in slide-in-from-left-4 duration-300">
                <div className="glass-card p-6 border border-white/10">
                  <h3 className="font-bold mb-6 text-blue-400 border-b border-white/10 pb-2 flex items-center text-lg">
                    <Building className="mr-2 h-5 w-5" /> Firma Kimliği
                  </h3>
                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="companyName" className="text-xs font-medium text-gray-400">İşletme Adı (Fiş Başlığı)</Label>
                      <Input id="companyName" name="companyName" value={settings.companyName} onChange={handleInputChange} className="bg-white/5 border-white/10 text-white focus:border-blue-500/50" placeholder="Örn: Örnek Market" />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="companyAddress" className="text-xs font-medium text-gray-400">Adres</Label>
                      <Textarea id="companyAddress" name="companyAddress" value={settings.companyAddress} onChange={handleInputChange} className="bg-white/5 border-white/10 text-white min-h-[80px] focus:border-blue-500/50 resize-none" placeholder="Fişte görünecek adres..." />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="companyPhone" className="text-xs font-medium text-gray-400">Telefon</Label>
                      <Input id="companyPhone" name="companyPhone" value={settings.companyPhone} onChange={handleInputChange} className="bg-white/5 border-white/10 text-white focus:border-blue-500/50" placeholder="0212..." />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'sales' && (
              <div className="space-y-4 animate-in fade-in slide-in-from-left-4 duration-300">
                <div className="glass-card p-6 border border-white/10">
                  <h3 className="font-bold mb-6 text-blue-400 border-b border-white/10 pb-2 flex items-center text-lg">
                    <ShoppingCart className="mr-2 h-5 w-5" /> Satış Konfigürasyonu
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-1.5">
                      <Label htmlFor="taxRate" className="text-xs font-medium text-gray-400">Varsayılan KDV Oranı (%)</Label>
                      <Input id="taxRate" name="taxRate" type="number" value={settings.taxRate} onChange={handleNumberChange} className="bg-white/5 border-white/10 text-white focus:border-blue-500/50" />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="currencySymbol" className="text-xs font-medium text-gray-400">Para Birimi Sembolü</Label>
                      <Input id="currencySymbol" name="currencySymbol" value={settings.currencySymbol} onChange={handleInputChange} className="bg-white/5 border-white/10 text-white focus:border-blue-500/50" />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="lowStockThreshold" className="text-xs font-medium text-gray-400">Kritik Stok Uyarısı (Adet)</Label>
                      <Input id="lowStockThreshold" name="lowStockThreshold" type="number" value={settings.lowStockThreshold} onChange={handleNumberChange} className="bg-white/5 border-white/10 text-white focus:border-blue-500/50" />
                      <p className="text-[10px] text-gray-500 mt-1">Bir ürünün stoğu bu sayının altına düştüğünde uyarı verilir.</p>
                    </div>
                    <div className="flex flex-col justify-end space-y-2">
                      <div className="flex items-center justify-between border border-white/10 p-3 rounded-lg bg-white/5">
                        <Label htmlFor="enableBarcodeMode" className="text-sm font-medium text-gray-300 cursor-pointer select-none">Satışta Otomatik Barkod Modu</Label>
                        <Switch id="enableBarcodeMode" checked={settings.enableBarcodeMode} onCheckedChange={(c) => handleSwitchChange('enableBarcodeMode', c)} className="data-[state=checked]:bg-blue-600" />
                      </div>
                      <p className="text-[10px] text-gray-500 px-1">Açık ise, satış ekranı açıldığında imleç otomatik barkod alanına odaklanır.</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'printer' && (
              <div className="space-y-4 animate-in fade-in slide-in-from-left-4 duration-300">
                <div className="glass-card p-6 border border-white/10">
                  <h3 className="font-bold mb-6 text-blue-400 border-b border-white/10 pb-2 flex items-center text-lg">
                    <Printer className="mr-2 h-5 w-5" /> Fiş Çıktısı
                  </h3>
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-1.5">
                        <Label htmlFor="receiptPrinterWidth" className="text-xs font-medium text-gray-400">Yazıcı Kağıt Genişliği</Label>
                        <Select value={settings.receiptPrinterWidth} onValueChange={(v) => handleSelectChange('receiptPrinterWidth', v)}>
                          <SelectTrigger className="bg-white/5 border-white/10 text-white h-10 text-sm focus:ring-blue-500/50"><SelectValue /></SelectTrigger>
                          <SelectContent className="bg-gray-900 border-gray-800 text-white">
                            <SelectItem value="58mm" className="focus:bg-gray-800 focus:text-white">58mm (Dar Fiş / Mobil Yazıcı)</SelectItem>
                            <SelectItem value="80mm" className="focus:bg-gray-800 focus:text-white">80mm (Standart Termal Fiş)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex flex-col justify-end">
                        <div className="flex items-center justify-between border border-white/10 p-3 rounded-lg bg-white/5 h-10">
                          <Label htmlFor="showDiscountOnReceipt" className="text-sm font-medium text-gray-300 cursor-pointer select-none">Fişte İndirimi Göster</Label>
                          <Switch id="showDiscountOnReceipt" checked={settings.showDiscountOnReceipt} onCheckedChange={(c) => handleSwitchChange('showDiscountOnReceipt', c)} className="data-[state=checked]:bg-blue-600" />
                        </div>
                      </div>
                    </div>

                    <div className="mt-6 border-t border-white/10 pt-6">
                      <Label className="font-bold text-sm mb-4 block text-center text-gray-300">Fiş Başlığı Önizleme</Label>
                      <div className={`bg-white text-black p-4 text-center font-mono text-sm shadow-2xl mx-auto transition-all duration-300 rounded-sm ${settings.receiptPrinterWidth === '58mm' ? 'w-[200px]' : 'w-[300px]'}`}>
                        <div className="font-bold text-lg mb-1 break-words">{settings.companyName || 'FİRMA ADI'}</div>
                        <div className="text-xs mb-1 break-words text-gray-800">{settings.companyAddress || 'Adres Bilgisi...'}</div>
                        <div className="text-xs mb-2 text-gray-800">{settings.companyPhone || 'Tel: ...'}</div>
                        <div className="border-b border-dashed border-black mb-2"></div>
                        <div className="flex justify-between text-xs font-bold">
                          <span>Ürün</span>
                          <span>Tutar</span>
                        </div>
                        <div className="flex justify-between text-xs mt-1">
                          <span>Örnek Ürün A</span>
                          <span>50.00{settings.currencySymbol}</span>
                        </div>
                        {settings.showDiscountOnReceipt && (
                          <div className="flex justify-between text-xs mt-1 text-gray-600 italic">
                            <span>İndirim</span>
                            <span>-5.00{settings.currencySymbol}</span>
                          </div>
                        )}
                        <div className="border-t border-dashed border-black mt-2 pt-1 flex justify-between font-bold">
                          <span>TOPLAM</span>
                          <span>45.00{settings.currencySymbol}</span>
                        </div>
                        <div className="text-[10px] mt-4 text-gray-600">Teşekkürler, Yine Bekleriz!</div>
                      </div>
                      <p className="text-center text-[10px] text-gray-500 mt-3">({settings.receiptPrinterWidth} genişliğinde önizleme)</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'appearance' && (
              <div className="space-y-4 animate-in fade-in slide-in-from-left-4 duration-300">
                <div className="glass-card p-6 border border-white/10">
                  <h3 className="font-bold mb-6 text-blue-400 border-b border-white/10 pb-2 flex items-center text-lg">
                    <Sliders className="mr-2 h-5 w-5" /> Görünüm Ayarları
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div
                      className={`cursor-pointer rounded-xl border-2 p-4 transition-all hover:scale-[1.02] ${settings.theme === 'modern-dark' ? 'border-blue-500 bg-blue-500/10' : 'border-white/10 bg-black/20 hover:border-white/30'}`}
                      onClick={() => handleSelectChange('theme', 'modern-dark')}
                    >
                      <div className="mb-3 h-24 w-full rounded-lg bg-gradient-to-br from-slate-900 to-slate-800 p-2 shadow-inner">
                        <div className="h-full w-full rounded border border-white/10 bg-white/5 p-2">
                          <div className="mb-2 h-2 w-1/2 rounded bg-blue-500/50"></div>
                          <div className="h-2 w-3/4 rounded bg-white/10"></div>
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-white">Modern Dark</span>
                        {settings.theme === 'modern-dark' && <div className="h-3 w-3 rounded-full bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.5)]"></div>}
                      </div>
                      <p className="mt-1 text-xs text-gray-400">Koyu tonlar, neon vurgular ve cam efektleri.</p>
                    </div>

                    <div
                      className={`cursor-pointer rounded-xl border-2 p-4 transition-all hover:scale-[1.02] ${settings.theme === 'light' ? 'border-blue-500 bg-blue-500/10' : 'border-white/10 bg-black/20 hover:border-white/30'}`}
                      onClick={() => handleSelectChange('theme', 'light')}
                    >
                      <div className="mb-3 h-24 w-full rounded-lg bg-gradient-to-br from-gray-100 to-white p-2 shadow-inner">
                        <div className="h-full w-full rounded border border-gray-200 bg-white p-2 shadow-sm">
                          <div className="mb-2 h-2 w-1/2 rounded bg-blue-500"></div>
                          <div className="h-2 w-3/4 rounded bg-gray-200"></div>
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-gray-900">Aydınlık (Light)</span>
                        {settings.theme === 'light' && <div className="h-3 w-3 rounded-full bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.5)]"></div>}
                      </div>
                      <p className="mt-1 text-xs text-gray-400">Ferah, okunaklı ve aydınlık arayüz.</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

          </div>
        </ScrollArea>

        <div className="p-4 border-t border-white/10 bg-black/20 flex justify-end backdrop-blur-md">
          <Button onClick={handleSave} disabled={isSaving} className="w-40 font-bold h-10 bg-emerald-600 hover:bg-emerald-700 text-white shadow-[0_0_15px_rgba(16,185,129,0.4)] transition-all duration-200">
            {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            Ayarları Kaydet
          </Button>
        </div>
      </div>
    </div>
  );
};

export default SettingsModule;