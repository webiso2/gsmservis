import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useNavigate, useLocation } from "react-router-dom";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import TrackingPage from "./pages/TrackingPage";
import SetupPage from "./pages/SetupPage";
import ResetPassword from "./pages/ResetPassword";

import { queryClient } from "@/lib/react-query";

import { useEffect, useState } from "react";
import { getSettings } from "@/utils/settingsUtils";
import { checkSupabaseConnection, SUPABASE_URL_KEY } from "@/integrations/supabase/client";

// Konfigürasyon Kontrolü Bileşeni
const RequireConfig = ({ children }: { children: JSX.Element }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const checkConfig = async () => {
      // 1. LocalStorage kontrolü
      const hasLocalConfig = localStorage.getItem(SUPABASE_URL_KEY);
      // 2. Env kontrolü (Geliştirme ortamı veya önceden tanımlı buildler için)
      const hasEnvConfig = import.meta.env.VITE_SUPABASE_URL;

      if (!hasLocalConfig && !hasEnvConfig) {
        // Hiçbir konfigürasyon yoksa Setup'a gönder
        navigate("/setup");
      }
      setChecking(false);
    };

    checkConfig();
  }, [navigate, location]);

  if (checking) return null; // Veya bir yükleniyor spinner'ı

  return children;
};

const App = () => {
  useEffect(() => {
    const applyTheme = () => {
      const settings = getSettings();
      const theme = settings.theme || 'modern-dark';
      document.body.className = `theme-${theme}`;
    };

    applyTheme(); // Initial application

    window.addEventListener('settings-updated', applyTheme);
    return () => window.removeEventListener('settings-updated', applyTheme);
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            {/* Kurulum Sayfası */}
            <Route path="/setup" element={<SetupPage />} />

            {/* Ana Sayfa (Yönetim Paneli) - Kor koruma altında */}
            <Route path="/" element={
              <RequireConfig>
                <Index />
              </RequireConfig>
            } />

            {/* Müşteri Takip Ekranı (Herkese Açık) */}
            {/* Not: Takip ekranı da veritabanı bağlantısına ihtiyaç duyar, bu yüzden onu da korumak mantıklı olabilir 
                veya takip ekranında özel bir hata gösterilebilir. Şimdilik aynı config gereksinimini buraya da koyuyoruz. */}
            <Route path="/takip" element={
              <RequireConfig>
                <TrackingPage />
              </RequireConfig>
            } />

            {/* Şifre Sıfırlama Sayfası */}
            <Route path="/reset-password" element={<ResetPassword />} />

            {/* Bulunamayan Sayfalar */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;