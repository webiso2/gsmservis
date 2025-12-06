// --- START OF FILE src/components/backup/BackupList.tsx ---

import React from 'react';
import { Download, Trash2, Loader2, Clock, FileJson, Cloud } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { BackupRecord } from "@/types/backup";
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

interface BackupListProps {
  backups: BackupRecord[];
  isLoading: boolean;
  isProcessing: string | null;
  onRestoreBackup: (backup: BackupRecord) => void;
  onDeleteBackup: (backup: BackupRecord) => void;
}

const BackupList: React.FC<BackupListProps> = ({ backups, isLoading, isProcessing, onRestoreBackup, onDeleteBackup }) => {
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-gray-500 gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
        <p className="text-sm">Yedekler yükleniyor...</p>
      </div>
    );
  }

  if (!backups || backups.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-gray-500 gap-3 border border-dashed border-white/10 rounded-xl bg-white/5">
        <Cloud className="h-10 w-10 opacity-20" />
        <p className="text-sm">Henüz bulut yedeği bulunmuyor.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-white">
        <Cloud className="h-5 w-5 text-blue-400" />
        <h3 className="text-lg font-bold">Bulut Yedekleriniz</h3>
      </div>

      <div className="glass-card border border-white/10 rounded-xl overflow-hidden">
        <ScrollArea className="h-[300px]">
          <table className="w-full text-left text-sm">
            <thead className="bg-white/5 text-gray-400 sticky top-0 backdrop-blur-md z-10">
              <tr>
                <th className="px-4 py-3 font-medium w-[180px]">Tarih</th>
                <th className="px-4 py-3 font-medium">Dosya Adı</th>
                <th className="px-4 py-3 font-medium text-center w-[140px]">İşlemler</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {backups.map((backup) => {
                const isCurrentProcessing = isProcessing === backup.id;
                return (
                  <tr key={backup.id} className={cn("hover:bg-white/5 transition-colors group", isCurrentProcessing && "opacity-50 pointer-events-none")}>
                    <td className="px-4 py-3 text-gray-300 whitespace-nowrap font-mono flex items-center gap-2">
                      <Clock className="h-3 w-3 text-gray-500" />
                      {format(new Date(backup.created_at), 'dd.MM.yyyy HH:mm', { locale: tr })}
                    </td>
                    <td className="px-4 py-3 text-gray-400 font-mono text-xs">
                      <div className="flex items-center gap-2">
                        <FileJson className="h-3 w-3 text-yellow-500/50" />
                        {backup.filename}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 px-2 text-blue-400 hover:text-blue-300 hover:bg-blue-500/20"
                          onClick={() => onRestoreBackup(backup)}
                          disabled={!!isProcessing}
                          title="Geri Yükle"
                        >
                          {isCurrentProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 px-2 text-red-400 hover:text-red-300 hover:bg-red-500/20"
                          onClick={() => onDeleteBackup(backup)}
                          disabled={!!isProcessing}
                          title="Sil"
                        >
                          {isCurrentProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </ScrollArea>
      </div>
    </div>
  );
};

export default BackupList;
// --- END OF FILE src/components/backup/BackupList.tsx ---