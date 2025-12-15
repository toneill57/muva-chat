#!/bin/bash
# Verificar si AIDE está corriendo o atascado

echo "Verificando proceso AIDE..."
ps aux | grep aide | grep -v grep

echo ""
echo "Esperando desde (revisar timestamp):"
ls -lh /var/lib/aide/aide.db* 2>/dev/null || echo "Sin archivos generados aún"
