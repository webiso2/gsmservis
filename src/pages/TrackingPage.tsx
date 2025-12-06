// --- START OF FILE src/pages/TrackingPage.tsx ---

import React, { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Search, Package, Wrench, Calendar, CheckCircle, Clock, XCircle, AlertCircle, Loader2, Smartphone, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { getSettings } from "@/utils/settingsUtils";
import { cn } from "@/lib/utils";

// Servis Durumu İçin Yardımcılar
const getStatusConfig = (status: string) => {
  switch (status) {
    case 'completed': return { text: 'İşlem Tamamlandı', color: 'text-emerald-400', icon: <CheckCircle className="h-12 w-12 text-emerald-400 drop-shadow-[0_0_10px_rgba(52,211,153,0.5)]" />, bg: 'bg-emerald-500/10 border-emerald-500/20' };
    case 'in_progress': return { text: 'İşlem Sürüyor', color: 'text-blue-400', icon: <Wrench className="h-12 w-12 text-blue-400 animate-pulse drop-shadow-[0_0_10px_rgba(96,165,250,0.5)]" />, bg: 'bg-blue-500/10 border-blue-500/20' };
    case 'cancelled': return { text: 'İptal / İade', color: 'text-red-400', icon: <XCircle className="h-12 w-12 text-red-400 drop-shadow-[0_0_10px_rgba(248,113,113,0.5)]" />, bg: 'bg-red-500/10 border-red-500/20' };
    default: return { text: 'Sırada / Bekliyor', color: 'text-yellow-400', icon: <Clock className="h-12 w-12 text-yellow-400 drop-shadow-[0_0_10px_rgba(250,204,21,0.5)]" />, bg: 'bg-yellow-500/10 border-yellow-500/20' };
  }
};

const TrackingPage = () => {
  const [searchParams] = useSearchParams();
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState("");
  const settings = getSettings();

  // URL'den kod gelirse otomatik ara (örn: site.com/takip?code=123456)
  useEffect(() => {
    const urlCode = searchParams.get("code");
    if (urlCode) {
      setCode(urlCode);
      handleSearch(urlCode);
    }
  }, [searchParams]);

  const handleSearch = async (searchCode: string = code) => {
    if (!searchCode.trim()) return;
    setLoading(true);
    setError("");
    setResult(null);

    try {
      const { data, error } = await supabase
        .from('services')
        .select(`
          *,
          customer:customers(name)
        `)
        .eq('tracking_code', searchCode.trim())
        .maybeSingle();

      if (error) throw error;
      if (!data) {
        setError("Bu takip numarasına ait kayıt bulunamadı. Lütfen kontrol ediniz.");
      } else {
        setResult(data);
      }
    } catch (err) {
      console.error(err);
      setError("Sorgulama sırasında bir hata oluştu.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Arkaplan Efektleri */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-purple-900/20 rounded-full blur-[100px]"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-900/20 rounded-full blur-[100px]"></div>
      </div>

      <div className="w-full max-w-md relative z-10 flex flex-col gap-8">
        {/* Firma Başlığı */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center p-3 bg-white/5 rounded-2xl border border-white/10 mb-2 shadow-[0_0_20px_rgba(255,255,255,0.05)]">
            <Smartphone className="h-8 w-8 text-blue-400" />
          </div>
          <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400 tracking-tight">{settings.companyName}</h1>
          <p className="text-gray-400 text-sm font-medium tracking-wide uppercase opacity-80">Teknik Servis Takip Sistemi</p>
        </div>

        <Card className="glass-card border-white/10 bg-black/40 backdrop-blur-xl shadow-2xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-center text-lg font-medium text-white">Cihaz Durumu Sorgula</CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            {/* Arama Kutusu */}
            <div className="flex gap-2 mb-6">
              <div className="relative flex-1">
                <Input
                  placeholder="Takip Kodu (Örn: 482391)"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  className="bg-white/5 border-white/10 text-white placeholder:text-gray-600 text-center tracking-widest text-lg h-12 focus:border-blue-500/50 focus:ring-blue-500/20 transition-all"
                />
              </div>
              <Button onClick={() => handleSearch()} disabled={loading} className="h-12 w-12 bg-blue-600 hover:bg-blue-700 text-white shadow-[0_0_15px_rgba(37,99,235,0.4)] transition-all duration-300">
                {loading ? <Loader2 className="animate-spin h-5 w-5" /> : <ArrowRight className="h-5 w-5" />}
              </Button>
            </div>

            {/* Hata Mesajı */}
            {error && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-lg flex items-center gap-3 text-sm mb-4 animate-in fade-in slide-in-from-top-2">
                <AlertCircle className="h-5 w-5 flex-shrink-0" /> {error}
              </div>
            )}

            {/* Sonuç Alanı */}
            {result && (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-6">
                {/* Durum İkonu */}
                <div className={cn("flex flex-col items-center justify-center p-6 rounded-xl border transition-all duration-300", getStatusConfig(result.status).bg)}>
                  {getStatusConfig(result.status).icon}
                  <h2 className={cn("mt-3 text-xl font-bold tracking-tight", getStatusConfig(result.status).color)}>
                    {getStatusConfig(result.status).text}
                  </h2>
                  <p className="text-gray-400 text-xs mt-1 font-mono">Son Güncelleme: {new Date(result.created_at).toLocaleDateString('tr-TR')}</p>
                </div>

                {/* Detaylar */}
                <div className="space-y-3 text-sm bg-white/5 p-4 rounded-xl border border-white/5">
                  <div className="flex justify-between items-center border-b border-white/5 pb-3">
                    <span className="text-gray-400 flex items-center gap-2"><Package className="h-4 w-4 text-gray-500" /> Cihaz</span>
                    <span className="font-semibold text-white">{result.brand} {result.model}</span>
                  </div>
                  <div className="flex justify-between items-center border-b border-white/5 pb-3">
                    <span className="text-gray-400 flex items-center gap-2"><Wrench className="h-4 w-4 text-gray-500" /> İşlem</span>
                    <span className="font-semibold text-white truncate max-w-[180px]">{result.problem}</span>
                  </div>
                  <div className="flex justify-between items-center pb-1">
                    <span className="text-gray-400 flex items-center gap-2"><Calendar className="h-4 w-4 text-gray-500" /> Kabul Tarihi</span>
                    <span className="font-semibold text-white">{new Date(result.date).toLocaleDateString('tr-TR')}</span>
                  </div>

                  {/* Sonuç Notu (Varsa) */}
                  {result.solution && (
                    <div className="bg-blue-500/10 p-3 rounded-lg border border-blue-500/20 mt-3">
                      <span className="font-bold block text-[10px] text-blue-400 mb-1 uppercase tracking-wider">Teknik Servis Notu</span>
                      <p className="text-gray-200 text-xs leading-relaxed">{result.solution}</p>
                    </div>
                  )}

                  {/* Ücret Bilgisi (Sadece Tamamlandıysa Göster) */}
                  {result.status === 'completed' && result.cost > 0 && (
                    <div className="mt-4 p-3 bg-emerald-500/20 text-emerald-400 rounded-lg font-bold text-center border border-emerald-500/30 shadow-[0_0_15px_rgba(16,185,129,0.2)]">
                      Toplam Tutar: {result.cost} ₺
                    </div>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="text-center space-y-1">
          <p className="text-xs text-gray-500">&copy; {new Date().getFullYear()} {settings.companyName}</p>
          <p className="text-[10px] text-gray-600">Güvenli Servis Takip Sistemi</p>
        </div>
      </div>
    </div>
  );
};

export default TrackingPage;
// --- END OF FILE src/pages/TrackingPage.tsx ---