// --- START OF FILE src/components/ModuleButton.tsx ---

import React from 'react';
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ModuleButtonProps {
  icon: React.ReactNode;
  label: string;
  active: boolean;
  onClick: () => void;
}

const ModuleButton: React.FC<ModuleButtonProps> = ({ icon, label, active, onClick }) => {
  return (
    <Button
      variant="ghost"
      size="sm"
      className={cn(
        "w-full justify-start gap-3 h-10 px-3 rounded-lg transition-all duration-200 group relative overflow-hidden",
        active
          ? "bg-blue-600 text-white shadow-[0_0_15px_rgba(37,99,235,0.4)] border border-blue-500/50"
          : "text-gray-400 hover:text-white hover:bg-white/5 border border-transparent hover:border-white/5"
      )}
      onClick={onClick}
    >
      {/* Aktif İndikatörü */}
      {active && (
        <div className="absolute left-0 top-0 bottom-0 w-1 bg-white/20"></div>
      )}

      <div className={cn(
        "flex items-center justify-center transition-colors",
        active ? "text-white" : "text-gray-500 group-hover:text-blue-400"
      )}>
        {icon}
      </div>
      <span className="text-sm font-medium tracking-wide">{label}</span>

      {/* Hover Efekti (Işık) */}
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000 pointer-events-none"></div>
    </Button>
  );
};

export default ModuleButton;
// --- END OF FILE src/components/ModuleButton.tsx ---
