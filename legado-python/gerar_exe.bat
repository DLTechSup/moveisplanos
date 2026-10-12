@echo off
setlocal enableextensions
chcp 65001 >nul
cd /d "%~dp0"
title Gerar ProjetaMoveis.exe

if not exist "venv\Scripts\python.exe" (
    echo Execute o iniciar.bat uma vez antes para preparar o ambiente.
    pause
    exit /b 1
)

"venv\Scripts\python.exe" -m pip install pyinstaller
if errorlevel 1 goto erro
"venv\Scripts\python.exe" gerar_icone.py

"venv\Scripts\python.exe" -m PyInstaller --noconfirm --clean --onefile --windowed ^
    --name ProjetaMoveis --icon assets\icone.ico ^
    --paths . --exclude-module PySide6.QtWebEngineCore --exclude-module PySide6.QtWebEngineWidgets ^
    app\main.py
if errorlevel 1 goto erro

echo.
echo Pronto! O programa esta em: dist\ProjetaMoveis.exe
pause
exit /b 0

:erro
echo.
echo Falha ao gerar o executavel.
pause
exit /b 1
