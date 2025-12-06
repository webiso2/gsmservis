# Otomatik Git Sync Script
# Bu script arka planda çalışır ve değişiklikleri otomatik olarak GitHub'a gönderir

$repoPath = "c:\Users\tv\Desktop\gsm teknik servis"
$checkInterval = 180 # 3 dakika (saniye cinsinden)

Write-Host "🚀 Otomatik Git Sync başlatıldı!" -ForegroundColor Green
Write-Host "📁 Klasör: $repoPath" -ForegroundColor Cyan
Write-Host "⏱️  Kontrol aralığı: $checkInterval saniye ($($checkInterval/60) dakika)" -ForegroundColor Cyan
Write-Host "🔄 Arka planda çalışıyor... (Kapatmak için Ctrl+C)" -ForegroundColor Yellow
Write-Host ""

# Sonsuz döngü
while ($true) {
    try {
        # Repository klasörüne git
        Set-Location -Path $repoPath
        
        # Önce pull yap (diğer yerden yapılan değişiklikleri al)
        Write-Host "[$(Get-Date -Format 'HH:mm:ss')] 📥 Değişiklikler kontrol ediliyor..." -ForegroundColor Gray
        git pull --quiet 2>&1 | Out-Null
        
        # Değişiklik var mı kontrol et
        $status = git status --porcelain
        
        if ($status) {
            Write-Host "[$(Get-Date -Format 'HH:mm:ss')] ✨ Değişiklikler bulundu!" -ForegroundColor Yellow
            
            # Tüm değişiklikleri ekle
            git add .
            
            # Commit yap (tarih ve saat ile)
            $commitMessage = "Otomatik kayıt: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
            git commit -m $commitMessage --quiet
            
            Write-Host "[$(Get-Date -Format 'HH:mm:ss')] 💾 Commit yapıldı: $commitMessage" -ForegroundColor Green
            
            # Push yap
            Write-Host "[$(Get-Date -Format 'HH:mm:ss')] 📤 GitHub'a gönderiliyor..." -ForegroundColor Cyan
            git push --quiet 2>&1 | Out-Null
            
            Write-Host "[$(Get-Date -Format 'HH:mm:ss')] ✅ Başarıyla GitHub'a yüklendi!" -ForegroundColor Green
            Write-Host ""
        } else {
            Write-Host "[$(Get-Date -Format 'HH:mm:ss')] ✓ Değişiklik yok" -ForegroundColor DarkGray
        }
        
    } catch {
        Write-Host "[$(Get-Date -Format 'HH:mm:ss')] ❌ Hata: $_" -ForegroundColor Red
    }
    
    # Belirtilen süre kadar bekle
    Start-Sleep -Seconds $checkInterval
}
