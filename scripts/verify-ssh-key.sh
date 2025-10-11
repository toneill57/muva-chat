#!/bin/bash

echo "================================================"
echo "🔑 SSH Key Verification Helper"
echo "================================================"
echo ""

# Buscar claves SSH en el sistema
echo "1️⃣  Buscando claves SSH en tu sistema..."
echo ""

if [ -d ~/.ssh ]; then
  echo "Claves privadas encontradas:"
  ls -1 ~/.ssh | grep -v ".pub" | grep -v "known_hosts" | grep -v "config"
  echo ""
  echo "Claves públicas encontradas:"
  ls -1 ~/.ssh/*.pub 2>/dev/null
else
  echo "❌ No se encontró el directorio ~/.ssh"
  exit 1
fi

echo ""
echo "================================================"
echo "2️⃣  Para copiar una clave al clipboard (macOS):"
echo "================================================"
echo ""
echo "cat ~/.ssh/TU_CLAVE | pbcopy"
echo ""
echo "Ejemplo:"
echo "cat ~/.ssh/innpilot_deploy | pbcopy"
echo "cat ~/.ssh/id_rsa | pbcopy"
echo ""
echo "================================================"
echo "3️⃣  Para verificar que la clave es válida:"
echo "================================================"
echo ""
echo "head -1 ~/.ssh/TU_CLAVE"
echo "# Debe mostrar: -----BEGIN OPENSSH PRIVATE KEY-----"
echo ""
echo "tail -1 ~/.ssh/TU_CLAVE"
echo "# Debe mostrar: -----END OPENSSH PRIVATE KEY-----"
echo ""
echo "================================================"
echo "4️⃣  ¿La clave pública está en el VPS?"
echo "================================================"
echo ""
echo "Prueba conectarte al VPS:"
echo "ssh -i ~/.ssh/TU_CLAVE USER@HOST"
echo ""
echo "Si pide contraseña, la clave NO está autorizada."
echo "Debes copiarla con:"
echo "ssh-copy-id -i ~/.ssh/TU_CLAVE.pub USER@HOST"
echo ""
