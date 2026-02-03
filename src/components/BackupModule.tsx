// --- START OF FILE src/BackupModule.tsx ---

import React, { useState, useEffect, useCallback } from 'react';
import { X, Loader2, Cloud, Database, HardDrive, Upload, Download, Trash2, RefreshCw, Server, AlertTriangle, ShieldCheck } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase, checkSupabaseConnection } from "@/integrations/supabase/client";
import { BackupRecord, BackupData } from "@/types/backup";
import {
  saveToLocalStorage,
  downloadBackupFromStorage,
  validateBackupData,
  safeParseJSON,
  restoreBackupToSupabase,
  BUCKET_NAME
} from "@/utils/backupUtils";
import BackupCreate from "./backup/BackupCreate";
import BackupRestore from "./backup/BackupRestore";
import BackupList from "./backup/BackupList";
import { cn } from "@/lib/utils";

interface BackupModuleProps { onClose: () => void; }

const BackupModule: React.FC<BackupModuleProps> = ({ onClose }) => {
  const { toast } = useToast();
  const [isLoadingList, setIsLoadingList] = useState(false);
  const [isProcessing, setIsProcessing] = useState<string | null>(null);
  const [isRestoringLocal, setIsRestoringLocal] = useState(false);
  const [onlineBackups, setOnlineBackups] = useState<BackupRecord[]>([]);
  const [isSupabaseConnected, setIsSupabaseConnected] = useState<boolean | null>(null);

  const checkConnection = useCallback(async () => {
    console.log("[BackupModule] checkConnection çağrılıyor...");
    const { success, error } = await checkSupabaseConnection();
    console.log("[BackupModule] checkSupabaseConnection sonucu:", success, error);
    setIsSupabaseConnected(success);
    if (!success) toast({ title: "Bağlantı Hatası", description: `Supabase bağlantısı kurulamadı: ${error || 'Bilinmeyen hata'}`, variant: "destructive" });
    return success;
  }, [toast]);

  const fetchOnlineBackups = useCallback(async () => {
    if (isSupabaseConnected !== true) { console.log("fetchOnlineBackups: Bağlantı yok/kontrol edilmedi."); return; }
    setIsLoadingList(true);
    console.log("fetchOnlineBackups: Yedekler çekiliyor...");
    try {
      const { data, error } = await supabase.from('backups').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      setOnlineBackups(data || []);
      console.log(`fetchOnlineBackups: ${data?.length || 0} yedek meta yüklendi.`);
    } catch (error: any) {
      console.error("Yedek yükleme hatası:", error);
      toast({ title: "Hata", description: `Yedekler yüklenemedi: ${error.message}`, variant: "destructive" });
      setOnlineBackups([]);
    } finally {
      setIsLoadingList(false);
    }
  }, [isSupabaseConnected, toast]);

  useEffect(() => { console.log("BackupModule İlk useEffect."); checkConnection(); }, [checkConnection]);
  useEffect(() => { console.log("BackupModule Bağlantı useEffect. Durum:", isSupabaseConnected); if (isSupabaseConnected === true) fetchOnlineBackups(); else if (isSupabaseConnected === false) setOnlineBackups([]); }, [isSupabaseConnected, fetchOnlineBackups]);

  const handleRestore = async (backupData: BackupData | null, source: string) => {
    if (!backupData) { toast({ title: "Hata", description: `(${source}) Yedek verisi okunamadı/geçersiz.`, variant: "destructive" }); return false; }
    if (!validateBackupData(backupData)) { toast({ title: "Hata", description: `(${source}) Geçersiz yedek formatı.`, variant: "destructive" }); return false; }
    if (!window.confirm(`DİKKAT! Geri yükleme işlemi mevcut tüm verilerinizi SİLECEK ve "${source}" yedeğindeki verilerle değiştirecektir!\n\nDevam etmek istediğinize emin misiniz?`)) return false;

    console.log(`[handleRestore] (${source}) Supabase'e geri yükleme başlıyor...`);
    if (source.startsWith('Bulut')) setIsProcessing(source);
    else setIsRestoringLocal(true);

    let success = false;
    try {
      const result = await restoreBackupToSupabase(backupData);
      console.log(`[handleRestore] restoreBackupToSupabase sonucu:`, result);
      if (result.success) {
        toast({ title: "Başarılı", description: `(${source}) Yedek başarıyla geri yüklendi. Sayfa yenileniyor...`, });
        setTimeout(() => window.location.reload(), 1500);
        success = true;
      } else { throw result.error || new Error("Bilinmeyen geri yükleme hatası."); }
    } catch (error: any) {
      console.error(`[handleRestore] (${source}) Geri yükleme hatası:`, error);
      toast({ title: "Hata", description: `(${source}) Geri yüklenemedi: ${error.message}`, variant: "destructive" });
      success = false;
    } finally {
      if (source.startsWith('Bulut')) setIsProcessing(null);
      else setIsRestoringLocal(false);
      console.log(`[handleRestore] (${source}) Bitti. Başarılı: ${success}`);
    }
    return success;
  };

  const handleRestoreOnlineBackup = async (backup: BackupRecord) => {
    if (isProcessing || isRestoringLocal) return;
    console.log(`[handleRestoreOnlineBackup] Başladı: Yedek ID=${backup.id}, Path=${backup.storage_path}`);
    setIsProcessing(backup.id);
    try {
      console.log("[handleRestoreOnlineBackup] downloadBackupFromStorage çağrılıyor...");
      const { data: backupData, error: downloadError } = await downloadBackupFromStorage(backup.storage_path);
      console.log("[handleRestoreOnlineBackup] İndirme sonucu (data var mı?):", !!backupData);
      if (downloadError) { console.error("[handleRestoreOnlineBackup] İndirme hatası:", downloadError); throw downloadError; }
      if (!backupData) { throw new Error("İndirilen yedek verisi boş."); }
      console.log("[handleRestoreOnlineBackup] handleRestore çağrılıyor...");
      await handleRestore(backupData, `Bulut: ${backup.filename.substring(0, 15)}...`);
      console.log("[handleRestoreOnlineBackup] handleRestore tamamlandı.");
    } catch (error: any) { console.error("Online geri yükleme genel hatası:", error); toast({ title: "Hata", description: `Yedek geri yüklenemedi: ${error.message}`, variant: "destructive" }); }
    finally { setIsProcessing(null); console.log("[handleRestoreOnlineBackup] İşlem bitti."); }
  };

  const handleLocalFileSelected = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (isProcessing || isRestoringLocal) return; const file = event.target.files?.[0]; if (!file) return;
    setIsRestoringLocal(true); const reader = new FileReader();
    reader.onload = async (e) => { let parsedData: BackupData | null = null; try { const result = e.target?.result; if (typeof result !== 'string') throw new Error("Dosya okunamadı"); parsedData = safeParseJSON(result); await handleRestore(parsedData, `Yerel: ${file.name.substring(0, 15)}...`); } catch (error: any) { console.error("Yerel geri yükleme hatası:", error); toast({ title: "Hata", description: `Yerel yedek geri yüklenemedi: ${error.message}`, variant: "destructive" }); } finally { setIsRestoringLocal(false); if (event.target) event.target.value = ''; } };
    reader.onerror = () => { toast({ title: "Hata", description: "Dosya okunamadı", variant: "destructive" }); setIsRestoringLocal(false); }; reader.readAsText(file);
  };

  const handleDeleteOnlineBackup = async (backup: BackupRecord) => { if (isProcessing || isRestoringLocal) return; if (!window.confirm(`"${backup.filename}" bulut yedeği KALICI olarak silinsin mi?`)) return; setIsProcessing(backup.id); try { console.log(`Storage'dan siliniyor: ${backup.storage_path}`); const { error: storageError } = await supabase.storage.from(BUCKET_NAME).remove([backup.storage_path]); if (storageError) { console.warn(`Storage silme hatası: ${storageError.message}`); } else console.log("Storage dosyası silindi."); console.log(`Tablodan siliniyor: ID=${backup.id}`); const { error: dbError } = await supabase.from('backups').delete().eq('id', backup.id); if (dbError) throw dbError; console.log("Meta veri silindi."); setOnlineBackups(prev => prev.filter(b => b.id !== backup.id)); toast({ title: "Başarılı", description: "Bulut yedeği silindi." }); } catch (error: any) { console.error("Bulut yedeği silme hatası:", error); toast({ title: "Hata", description: `Yedek silinemedi: ${error.message}`, variant: "destructive" }); } finally { setIsProcessing(null); } };

  return (
    <div className="h-full p-2 sm:p-4 animate-in fade-in duration-300">
      <div className="glass-panel rounded-xl h-full flex flex-col border border-white/10 shadow-2xl overflow-hidden">
        <div className="bg-white/5 border-b border-white/10 p-3 flex justify-between items-center flex-shrink-0 backdrop-blur-md">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-indigo-500/20 rounded-lg">
              <Database className="h-5 w-5 text-indigo-400" />
            </div>
            <h1 className="text-lg font-bold text-white tracking-tight">Yedekleme ve Geri Yükleme</h1>
          </div>
          <Button variant="ghost" size="icon" className="hover:bg-red-500/20 hover:text-red-400 h-8 w-8 rounded-lg transition-colors" onClick={onClose} disabled={!!isProcessing || isRestoringLocal}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        <ScrollArea className="flex-1 overflow-auto">
          <div className="p-3 sm:p-6 space-y-6">

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Sol Kolon: Yedek Oluşturma ve Yerel İşlemler */}
              <div className="space-y-6">
                <div className="glass-card p-5 border border-white/10 space-y-4">
                  <div className="flex items-center gap-2 border-b border-white/10 pb-2 mb-2">
                    <Cloud className="h-5 w-5 text-blue-400" />
                    <h2 className="text-lg font-semibold text-white">Yeni Yedek Oluştur</h2>
                  </div>
                  <BackupCreate isSupabaseConnected={isSupabaseConnected === true} onBackupCreated={fetchOnlineBackups} />
                </div>

                <div className="glass-card p-5 border border-white/10 space-y-4">
                  <div className="flex items-center gap-2 border-b border-white/10 pb-2 mb-2">
                    <HardDrive className="h-5 w-5 text-orange-400" />
                    <h2 className="text-lg font-semibold text-white">Yerel Geri Yükleme</h2>
                  </div>
                  <BackupRestore onFileSelected={handleLocalFileSelected} isLoading={isRestoringLocal} />
                </div>
              </div>

              {/* Sağ Kolon: Bulut Yedek Listesi */}
              <div className="glass-card p-5 border border-white/10 flex flex-col h-full min-h-[400px]">
                <div className="flex items-center justify-between border-b border-white/10 pb-2 mb-4">
                  <div className="flex items-center gap-2">
                    <Server className="h-5 w-5 text-emerald-400" />
                    <h2 className="text-lg font-semibold text-white">Bulut Yedekleri</h2>
                  </div>
                  {isSupabaseConnected === true && (
                    <Button variant="ghost" size="sm" onClick={fetchOnlineBackups} disabled={isLoadingList} className="h-7 w-7 p-0 rounded-full hover:bg-white/10">
                      <RefreshCw className={cn("h-4 w-4 text-gray-400", isLoadingList && "animate-spin")} />
                    </Button>
                  )}
                </div>

                <div className="flex-1 overflow-hidden flex flex-col">
                  {isSupabaseConnected === false && (
                    <div className="flex flex-col items-center justify-center h-full text-red-400 gap-2 p-4 text-center bg-red-500/10 rounded-lg border border-red-500/20">
                      <AlertTriangle className="h-8 w-8" />
                      <p className="text-sm font-medium">Bulut bağlantısı kurulamadı.</p>
                    </div>
                  )}
                  {isSupabaseConnected === null && (
                    <div className="flex flex-col items-center justify-center h-full text-gray-400 gap-2">
                      <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
                      <p className="text-sm">Bağlantı kontrol ediliyor...</p>
                    </div>
                  )}
                  {isSupabaseConnected === true && (
                    <BackupList
                      backups={onlineBackups}
                      isLoading={isLoadingList}
                      isProcessing={isProcessing}
                      onRestoreBackup={handleRestoreOnlineBackup}
                      onDeleteBackup={handleDeleteOnlineBackup}
                    />
                  )}
                </div>
              </div>
            </div>

          </div>
        </ScrollArea>
      </div>
    </div>
  );
};

export default BackupModule;
// --- END OF FILE src/BackupModule.tsx ---