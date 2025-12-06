@echo off
setlocal

echo Proje baslatiliyor...

REM node_modules klasoru yoksa npm install calistir
if not exist "node_modules" (
    echo node_modules bulunamadi, npm install calistiriliyor...
    call npm install
    if errorlevel 1 (
        echo npm install basarisiz oldu!
        pause
        exit /b 1
    )
) else (
    echo node_modules zaten mevcut, npm install atlandi.
)

REM npm run dev calistir (arka planda baslatmak icin start kullanilir)
echo npm run dev calistiriliyor...
start cmd /c npm run dev

REM localhost:8080 adresini ac
echo Tarayici aciliyor...
timeout /t 2 >nul
start http://localhost:8080

echo Baslatma tamamlandi!
