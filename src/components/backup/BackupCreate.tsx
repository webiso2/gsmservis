// --- START OF FILE src/components/backup/BackupCreate.tsx ---

import React, { useState } from 'react';
import { Save, Database, Loader2, Cloud, HardDrive, Download, UploadCloud } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import {
  createBackupDataFromSupabase,
  uploadBackupToStorage,
  addBackupMetadata
} from "@/utils/backupUtils";
import { format } from 'date-fns';
import { cn } from "@/lib/utils";

interface BackupCreateProps {
  isSupabaseConnected: boolean;
  onBackupCreated?: () => void;
}

const BackupCreate: React.FC<BackupCreateProps> = ({ isSupabaseConnected, onBackupCreated }) => {
  const { toast } = useToast();
  const [isLocalLoading, setIsLocalLoading] = useState(false);
  const [isCloudLoading, setIsCloudLoading] = useState(false);

  const createLocalBackup = async () => {
    setIsLocalLoading(true);
    try {
      console.log("Yerel yedekleme için Supabase'den veri çekiliyor...");
      const backupData = await createBackupDataFromSupabase();
      if (!backupData) { throw new Error("Yedek verisi oluşturulamadı. Supabase bağlantısını veya tabloları kontrol edin."); }
      console.log("Veri çekildi, dosya oluşturuluyor...");
      const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url;
      const timestamp = format(new Date(), 'yyyyMMdd_HHmmss');
      a.download = `supabase_backup_${timestamp}.json`;
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast({ title: "Başarılı", description: "Yerel yedekleme dosyası başarıyla indirildi." });
    } catch (error: any) { console.error("Yerel yedekleme hatası:", error); toast({ title: "Hata", description: `Yerel yedekleme alınamadı: ${error.message}`, variant: "destructive" }); }
    finally { setIsLocalLoading(false); }
  };

  const createCloudBackup = async () => {
    if (!isSupabaseConnected || isCloudLoading || isLocalLoading) return;
    setIsCloudLoading(true); const timestamp = format(new Date(), 'yyyyMMdd_HHmmss'); const filename = `supabase_backup_${timestamp}.json`;
    try {
      console.log("Bulut yedekleme için Supabase'den veri çekiliyor...");
      const backupData = await createBackupDataFromSupabase();
      if (!backupData) { throw new Error("Yedek verisi oluşturulamadı. Supabase bağlantısını veya tabloları kontrol edin."); }
      console.log("Veri çekildi, Storage'a yükleniyor...");
      const { storagePath, error: uploadError } = await uploadBackupToStorage(backupData, filename);
      if (uploadError || !storagePath) { throw uploadError || new Error("Dosya Storage'a yüklenemedi veya dosya yolu alınamadı."); }
      console.log("Storage'a yüklendi, meta veri ekleniyor...");
      const { error: metaError } = await addBackupMetadata(filename, storagePath);
      if (metaError) { console.error("Meta veri eklenemedi:", metaError); throw metaError; }
      toast({ title: "Başarılı", description: "Veriler başarıyla buluta yedeklendi." });
      if (onBackupCreated) onBackupCreated();
    } catch (error: any) { console.error("Bulut yedekleme hatası:", error); toast({ title: "Hata", description: `Bulut yedekleme alınamadı: ${error.message}`, variant: "destructive" }); }
    finally { setIsCloudLoading(false); }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* Yerel Yedekleme Kartı */}
      <div className="glass-card border border-white/10 rounded-xl p-6 flex flex-col items-center text-center space-y-4 hover:bg-white/5 transition-colors group">
        <div className="p-4 rounded-full bg-blue-500/10 border border-blue-500/20 group-hover:scale-110 transition-transform duration-300">
          <HardDrive className="h-8 w-8 text-blue-400" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-white mb-1">Yerel Yedekleme</h2>
          <p className="text-sm text-gray-400">Verilerinizi JSON formatında bilgisayarınıza indirin.</p>
        </div>
        <Button
          variant="outline"
          className="w-full mt-auto bg-transparent border-blue-500/30 text-blue-400 hover:bg-blue-500/20 hover:text-blue-300"
          onClick={createLocalBackup}
          disabled={isLocalLoading || isCloudLoading}
        >
          {isLocalLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
          Bilgisayara İndir
        </Button>
      </div>

      {/* Bulut Yedekleme Kartı */}
      <div className="glass-card border border-white/10 rounded-xl p-6 flex flex-col items-center text-center space-y-4 hover:bg-white/5 transition-colors group relative overflow-hidden">
        {!isSupabaseConnected && (
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm z-10 flex items-center justify-center p-4">
            <p className="text-red-400 font-medium text-center">Bulut bağlantısı yok</p>
          </div>
        )}
        <div className="p-4 rounded-full bg-purple-500/10 border border-purple-500/20 group-hover:scale-110 transition-transform duration-300">
          <Cloud className="h-8 w-8 text-purple-400" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-white mb-1">Bulut Yedekleme</h2>
          <p className="text-sm text-gray-400">Verilerinizi güvenli bulut sunucusuna yedekleyin.</p>
        </div>
        <Button
          variant="outline"
          className="w-full mt-auto bg-transparent border-purple-500/30 text-purple-400 hover:bg-purple-500/20 hover:text-purple-300"
          onClick={createCloudBackup}
          disabled={isCloudLoading || isLocalLoading || !isSupabaseConnected}
        >
          {isCloudLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UploadCloud className="mr-2 h-4 w-4" />}
          Buluta Yükle
        </Button>
      </div>
    </div>
  );
};

export default BackupCreate;
// --- END OF FILE src/components/backup/BackupCreate.tsx ---