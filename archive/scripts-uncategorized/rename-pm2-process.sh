#!/bin/bash
# PM2 Process Rename: innpilot → muva-chat
# Project: InnPilot → MUVA Chat Rebrand
# VPS: muva.chat (195.200.6.216)

set -e  # Exit on any error

echo "🚀 Starting PM2 Process Rename Operation"
echo "================================================"
echo "⚠️  PRODUCTION OPERATION - 4 tenants activos"
echo "⏱️  Expected downtime: ~5-10 seconds"
echo ""

# 1. Verificar estado actual
echo "📋 Step 1: Verificar estado actual del proceso..."
ssh oneill@muva.chat "pm2 status"
echo ""

# 2. Stop proceso actual
echo "🛑 Step 2: Stopping proceso 'innpilot'..."
ssh oneill@muva.chat "pm2 stop innpilot"
echo ""

# 3. Delete proceso viejo
echo "🗑️  Step 3: Deleting proceso 'innpilot'..."
ssh oneill@muva.chat "pm2 delete innpilot"
echo ""

# 4. Start con nuevo nombre
echo "🚀 Step 4: Starting proceso 'muva-chat'..."
ssh oneill@muva.chat "cd /var/www/innpilot && pm2 start npm --name 'muva-chat' -- start"
echo ""

# 5. Save configuración PM2
echo "💾 Step 5: Saving PM2 configuration..."
ssh oneill@muva.chat "pm2 save"
echo ""

# 6. Verificar status final
echo "✅ Step 6: Verificar estado final..."
ssh oneill@muva.chat "pm2 status"
echo ""

echo "================================================"
echo "🔍 VALIDACIÓN POST-DEPLOYMENT"
echo "================================================"
echo ""

# Validación A: Sitio principal
echo "A. Verificando sitio principal (muva.chat)..."
HTTP_STATUS=$(curl -I https://muva.chat 2>/dev/null | head -n 1)
echo "$HTTP_STATUS"
if [[ $HTTP_STATUS == *"200"* ]]; then
    echo "✅ Sitio principal OK"
else
    echo "❌ ERROR: Sitio principal no responde correctamente"
    exit 1
fi
echo ""

# Validación B: Tenant
echo "B. Verificando tenant (simmerdown.muva.chat)..."
TENANT_STATUS=$(curl -I https://simmerdown.muva.chat 2>/dev/null | head -n 1)
echo "$TENANT_STATUS"
if [[ $TENANT_STATUS == *"200"* ]]; then
    echo "✅ Tenant OK"
else
    echo "⚠️  WARNING: Tenant puede tener problemas"
fi
echo ""

# Validación C: Logs PM2
echo "C. Verificando logs PM2 (últimas 20 líneas)..."
ssh oneill@muva.chat "pm2 logs muva-chat --lines 20 --nostream"
echo ""

echo "================================================"
echo "✅ PM2 Process Rename Complete!"
echo "================================================"
echo ""
echo "Nuevo nombre: 'muva-chat'"
echo "Status: Verificar arriba que esté 'online'"
echo ""
echo "Para ver status en tiempo real:"
echo "  ssh oneill@muva.chat 'pm2 status'"
echo ""
echo "Para ver logs:"
echo "  ssh oneill@muva.chat 'pm2 logs muva-chat'"
