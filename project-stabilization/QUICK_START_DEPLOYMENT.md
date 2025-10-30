# 🚀 Quick Start - FASE 1 Deployment

**Tiempo total:** ~2h 30min (deployment automatizado + validación)

---

## ⚡ Opción Rápida (Recomendado)

### 1. Ejecutar deployment automatizado
```bash
cd /Users/oneill/Sites/apps/muva-chat
./scripts/deploy-and-validate-fase1.sh
```

**Este script hará TODO por ti:**
- ✅ Conecta al VPS
- ✅ Captura baseline PRE-deployment
- ✅ Deploy (pull, install, build, restart PM2)
- ✅ Valida POST-deployment
- ✅ Monitorea 2h (checks cada 15min)
- ✅ Reporta métricas completas

**Duración:** ~2h 20min

### 2. Documentar resultados
Cuando termine el script, llena el template:

```bash
# Copiar template
cp project-stabilization/docs/fase-1/STABILITY_TEST_RESULTS_TEMPLATE.md \
   project-stabilization/docs/fase-1/STABILITY_TEST_RESULTS.md

# Editar y reemplazar {PLACEHOLDERS} con datos reales
```

### 3. (Opcional) Test 24h
```bash
ssh muva@195.200.6.216
cd /var/www/muva-chat
./scripts/test-pm2-stability.sh
# Esperar 24h, re-ejecutar para comparar
```

---

## 🛠️ Opción Manual (Más Control)

Si prefieres ejecutar paso a paso, ver guía completa:
```
project-stabilization/docs/fase-1/DEPLOYMENT_GUIDE.md
```

---

## ✅ Criterios de Éxito

Al finalizar, verificar:
- ✅ 0 errores PGRST116 en logs
- ✅ 0 restarts PM2 en 2h
- ✅ Memory <400MB estable
- ✅ Status: online continuo

---

## 🆘 Si Algo Falla

Ver troubleshooting:
```
project-stabilization/docs/fase-1/DEPLOYMENT_GUIDE.md
```

O revisar:
- Logs PM2: `ssh muva@195.200.6.216 "pm2 logs muva-chat --lines 100"`
- Status: `ssh muva@195.200.6.216 "pm2 info muva-chat"`

---

## 📚 Documentación Completa

- **Resumen FASE 1:** `project-stabilization/docs/fase-1/FASE_1_COMPLETION_SUMMARY.md`
- **Guía deployment:** `project-stabilization/docs/fase-1/DEPLOYMENT_GUIDE.md`
- **Plan completo:** `project-stabilization/plan-part-2.md`

---

**¿Listo para deployar?** Ejecuta:
```bash
./scripts/deploy-and-validate-fase1.sh
```
