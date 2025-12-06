@echo off
chcp 65001 >nul
echo.
echo ╔════════════════════════════════════════════════╗
echo ║   🚀 Otomatik Git Sync Başlatılıyor...        ║
echo ╚════════════════════════════════════════════════╝
echo.
echo 📌 Bu pencereyi AÇIK BIRAKIN!
echo 📌 Kapatırsanız otomatik sync durur.
echo 📌 Durdurmak için Ctrl+C basın.
echo.
timeout /t 2 /nobreak >nul

cd /d "%~dp0"
powershell -ExecutionPolicy Bypass -File "auto-sync.ps1"
pause
