// --- START OF FILE src/pages/NotFound.tsx ---

import { useLocation } from "react-router-dom";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Home } from "lucide-react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname
    );
  }, [location.pathname]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-black relative overflow-hidden text-white">
      {/* Arkaplan Efektleri */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[20%] left-[20%] w-[40%] h-[40%] bg-red-900/20 rounded-full blur-[100px] animate-pulse"></div>
      </div>

      <div className="text-center relative z-10 p-8 glass-card border border-white/10 rounded-2xl shadow-2xl backdrop-blur-xl animate-in fade-in zoom-in duration-500 max-w-md w-full mx-4">
        <div className="flex justify-center mb-6">
          <div className="p-4 bg-red-500/10 rounded-full border border-red-500/20 shadow-[0_0_20px_rgba(239,68,68,0.2)]">
            <AlertTriangle className="h-12 w-12 text-red-500" />
          </div>
        </div>

        <h1 className="text-6xl font-bold mb-2 bg-clip-text text-transparent bg-gradient-to-b from-white to-gray-500">404</h1>
        <h2 className="text-2xl font-semibold text-white mb-4">Sayfa Bulunamadı</h2>
        <p className="text-gray-400 mb-8">
          Aradığınız sayfa mevcut değil veya taşınmış olabilir.
        </p>

        <Button asChild className="w-full bg-blue-600 hover:bg-blue-700 text-white shadow-[0_0_15px_rgba(37,99,235,0.4)] transition-all duration-300 h-12 text-lg">
          <a href="/" className="flex items-center justify-center gap-2">
            <Home className="h-5 w-5" />
            Ana Sayfaya Dön
          </a>
        </Button>
      </div>
    </div>
  );
};

export default NotFound;
// --- END OF FILE src/pages/NotFound.tsx ---
