#!/bin/bash
# Abre VISU desde un servidor local, solo si al abrir index.html con doble clic
# tu navegador no guarda el progreso. Ver «Cómo funciona» en la web.
cd "$(dirname "$0")" || exit 1
PORT=8642
if ! command -v python3 >/dev/null 2>&1; then
  echo "Hace falta Python 3. macOS te ofrecerá instalarlo (Herramientas de línea de comandos)."
  python3 --version
  exit 1
fi
echo "VISU se está sirviendo en http://localhost:$PORT  (cierra esta ventana para pararlo)"
( sleep 1; open "http://localhost:$PORT/index.html" ) &
exec python3 -m http.server "$PORT" --bind 127.0.0.1
