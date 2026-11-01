@echo off
rem Abre VISU desde un servidor local, solo si al abrir index.html con doble clic
rem tu navegador no guarda el progreso. Ver "Como funciona" en la web.
cd /d "%~dp0"
set PORT=8642
where py >nul 2>nul && (set PY=py -3) || (set PY=python)
%PY% --version >nul 2>nul || (
  echo Hace falta Python 3. Instalalo desde https://www.python.org/downloads/ y marca "Add python.exe to PATH".
  pause
  exit /b 1
)
echo VISU se esta sirviendo en http://localhost:%PORT%  (cierra esta ventana para pararlo)
start "" /b cmd /c "timeout /t 2 /nobreak >nul & start "" http://localhost:%PORT%/index.html"
%PY% -m http.server %PORT% --bind 127.0.0.1
