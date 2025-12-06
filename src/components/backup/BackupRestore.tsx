// --- START OF FILE src/components/backup/BackupRestore.tsx ---

import React from 'react';
import { Upload, Loader2, RefreshCw, AlertTriangle } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface BackupRestoreProps {
  onFileSelected: (event: React.ChangeEvent<HTMLInputElement>) => void;
  isLoading?: boolean;
}

const BackupRestore: React.FC<BackupRestoreProps> = ({ onFileSelected, isLoading = false }) => {

  return (
    <div className="glass-card border border-white/10 rounded-xl p-6 flex flex-col items-center text-center space-y-4 hover:bg-white/5 transition-colors group">
      <div className="p-4 rounded-full bg-emerald-500/10 border border-emerald-500/20 group-hover:scale-110 transition-transform duration-300">
        <RefreshCw className="h-8 w-8 text-emerald-400" />
      </div>
      <div>
        <h2 className="text-lg font-bold text-white mb-1">Yerel Geri Yükleme</h2>
        <p className="text-sm text-gray-400">Bilgisayarınızdaki .json dosyasından verileri geri yükleyin.</p>
      </div>

      <div className="w-full p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-start gap-2 text-left">
        <AlertTriangle className="h-4 w-4 text-amber-500 flex-shrink-0 mt-0.5" />
        <p className="text-xs text-amber-200/80">Dikkat: Geri yükleme işlemi mevcut verilerin üzerine yazacaktır.</p>
      </div>

      <Button
        variant="outline"
        className="w-full mt-auto bg-transparent border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20 hover:text-emerald-300"
        onClick={() => document.getElementById('localBackupFile')?.click()}
        disabled={isLoading}
      >
        {isLoading
          ? <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          : <Upload className="mr-2 h-4 w-4" />
        }
        Dosya Seç ve Yükle
      </Button>
      <input
        type="file"
        id="localBackupFile"
        accept=".json"
        className="hidden"
        onChange={onFileSelected}
        disabled={isLoading}
      />
    </div>
  );
};

export default BackupRestore;
// --- END OF FILE src/components/backup/BackupRestore.tsx ---