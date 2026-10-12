@echo off
setlocal enableextensions
chcp 65001 >nul
cd /d "%~dp0"
title Projeta Móveis

rem ---- 1. procura o Python 3.11+ ------------------------------------------------------
set "PY="
for %%C in ("py -3" "python") do (
    if not defined PY (
        %%~C -c "import sys; sys.exit(0 if sys.version_info >= (3, 11) else 1)" >nul 2>nul && set "PY=%%~C"
    )
)

if not defined PY (
    echo Python 3.11 ou superior nao foi encontrado. Instalando pelo winget...
    winget install -e --id Python.Python.3.12 --accept-package-agreements --accept-source-agreements
    if exist "%LocalAppData%\Programs\Python\Python312\python.exe" (
        set "PY="%LocalAppData%\Programs\Python\Python312\python.exe""
    ) else (
        echo.
        echo Python instalado. Feche esta janela e execute o iniciar.bat novamente.
        pause
        exit /b 1
    )
)

rem ---- 2. cria o ambiente virtual e instala as dependencias -----------------------------
if not exist "venv\Scripts\python.exe" (
    echo Criando ambiente virtual...
    %PY% -m venv venv
    if errorlevel 1 goto erro
)
if not exist "venv\.instalado" (
    echo Instalando dependencias (somente na primeira vez)...
    "venv\Scripts\python.exe" -m pip install --upgrade pip
    "venv\Scripts\python.exe" -m pip install -r requirements.txt
    if errorlevel 1 goto erro
    echo ok> "venv\.instalado"
)

rem ---- 3. abre o programa ---------------------------------------------------------------------
"venv\Scripts\python.exe" -m app.main
if errorlevel 1 goto erro
exit /b 0

:erro
echo.
echo Ocorreu um erro. Verifique a mensagem acima.
pause
exit /b 1
