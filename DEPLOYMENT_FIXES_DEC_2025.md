# Deployment Fixes - December 15, 2025

## Problema Principal

El deployment automático de producción estaba fallando silenciosamente al hacer build de Next.js.

## Causa Raíz

1. **Node v22** en VPS (incompatible con Next.js 15 + dependencias)
2. **Turbopack** (--turbopack flag) causaba fallos silenciosos
3. **ecosystem.config.js** incompatible con ES modules en Node 20
4. **Workflow complejo** con output truncado que ocultaba errores

## Soluciones Implementadas

### 1. Node 20 LTS en todos los ambientes

**VPS:**
- Desinstalado Node 22
- Instalado Node 20.18.2 LTS
- Reinstaladas dependencias nativas

**Local:**
- Agregado `.nvmrc` con Node 20.18.2
- Agregado `engines` en package.json
- Script postinstall que avisa si versión incorrecta

**CI/CD:**
- Ya usaba Node 20 ✓

### 2. Desactivado Turbopack

```json
// package.json
"build": "next build"  // Era: "next build --turbopack"
```

Turbopack es beta y tiene incompatibilidades con Node 20.

### 3. Ecosystem Config → .cjs

```bash
# Workflow ahora renombra automáticamente:
mv ecosystem.config.js ecosystem.config.cjs
```

Node 20 + `type: "module"` en package.json requiere `.cjs` para CommonJS.

### 4. Script de Deployment Dedicado

Creado `scripts/deploy-to-vps.sh`:
- Mejor manejo de output
- Logs con `tee` para debugging
- PM2 restart automático con config correcta

### 5. Workflow Simplificado

`.github/workflows/deploy-production.yml`:
- Reducido de ~200 líneas a ~100
- Usa script dedicado
- Output más limpio

## Archivos Clave Modificados

- `package.json` - Engines + turbopack removed
- `.nvmrc` - Node version enforcement
- `scripts/deploy-to-vps.sh` - New deployment script
- `scripts/check-node-version.cjs` - Postinstall check
- `.github/workflows/deploy-production.yml` - Simplified

## Verificación

✅ Deployment exitoso: Run #20236411806 (Dec 15, 14:48)
✅ Build time: ~14 segundos
✅ PM2 restart automático
✅ Health checks passing

## Próximos Pasos

1. Aplicar mismos fixes a workflow de staging
2. Monitorear próximos deployments
3. Considerar agregar más health checks

---

**Fecha:** 15 de Diciembre, 2025
**Duración del fix:** ~2.5 horas
**Commits principales:**
- b1166ba - Refactor deployment workflow
- d4213b5 - Fix postinstall hook ES module error
- b543eb1 - Enforce Node 20 LTS requirement
