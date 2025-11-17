# Three-Tier Architecture - Clarificación

**Fecha:** 2025-11-16

---

## ⚠️ ACLARACIÓN IMPORTANTE

La arquitectura three-tier de MUVA Chat es:

```
DEV (localhost)  →  TST (VPS)  →  PRD (VPS)
```

**NO** todos los ambientes van al VPS.

---

## 🏗️ Arquitectura Correcta

### DEV - Desarrollo Local (localhost SOLAMENTE)

**Deployment:**
- ❌ NO en VPS
- ✅ Solo en localhost (tu computadora)

**URLs:**
- Localhost: `http://localhost:3001`
- Supabase: `https://azytxnyiizldljxrapoe.supabase.co`

**Git Branch:** `dev`

**Uso:**
- Desarrollo activo
- Testing local
- Experimentos
- NO se deploya automáticamente

**Scripts:**
```bash
# Para correr DEV localmente
./scripts/deploy/dev-tst.sh  # Carga .env.dev, puerto 3001
```

**GitHub Actions:**
- Workflow: `validate-dev.yml` (solo validación, NO deploy)
- Trigger: Push a rama `dev`
- Acción: Build + Tests + Migrations check
- **NO deploya a ningún servidor**

---

### TST - Testing (VPS staging.muva.chat)

**Deployment:**
- ✅ VPS: `/var/www/muva-chat-tst`
- ✅ URL: https://staging.muva.chat

**Git Branch:** `tst`

**Supabase:** `https://bddcvjoeoiekzfetvxoe.supabase.co`

**Uso:**
- Testing pre-producción
- Validación con datos completos
- QA y UAT

**Deploy Automático:**
- Push a `tst` → GitHub Actions → Deploy a VPS

**Scripts locales (opcional):**
```bash
# Para testear TST localmente (antes de push)
./scripts/deploy/dev-tst.sh  # Puerto 3001, carga .env.tst
```

---

### PRD - Producción (VPS muva.chat)

**Deployment:**
- ✅ VPS: `/var/www/muva-chat-prd`
- ✅ URL: https://muva.chat

**Git Branch:** `prd`

**Supabase:** `https://kprqghwdnaykxhostivv.supabase.co`

**Uso:**
- Producción live
- Usuarios reales
- Datos críticos

**Deploy Automático:**
- Push a `prd` → GitHub Actions → Backup DB → Deploy a VPS

**Scripts locales (opcional):**
```bash
# Para testear PRD localmente (SOLO READ-ONLY)
./scripts/deploy/dev-prd.sh  # Puerto 3000, carga .env.prd
```

---

## 📊 Tabla Comparativa

| Aspecto | DEV | TST | PRD |
|---------|-----|-----|-----|
| **Deployment** | Localhost | VPS | VPS |
| **URL Pública** | ❌ No | https://staging.muva.chat | https://muva.chat |
| **VPS Path** | ❌ N/A | `/var/www/muva-chat-tst` | `/var/www/muva-chat-prd` |
| **PM2 Process** | ❌ N/A | `muva-chat-tst` | `muva-chat-prd` |
| **Git Branch** | `dev` | `tst` | `prd` |
| **Supabase** | azytxnyiizldljxrapoe | bddcvjoeoiekzfetvxoe | kprqghwdnaykxhostivv |
| **GitHub Actions** | Validate only | Deploy auto | Deploy auto + backup |
| **Port (local)** | 3001 | 3001 (si local) | 3000 (si local) |
| **Datos** | Completos | Completos | Schema only (inicialmente) |

---

## 🔄 Workflow de Desarrollo

### 1. Desarrollo Local (DEV)

```bash
# Trabajar en rama dev
git checkout dev

# Desarrollar features
# ...

# Correr localmente
./scripts/deploy/dev-tst.sh  # O pnpm run dev con .env.dev

# Commit y push
git add .
git commit -m "feat: nueva funcionalidad"
git push origin dev
```

**Resultado:**
- ✅ GitHub Actions ejecuta `validate-dev.yml`
- ✅ Build + Tests
- ❌ NO deploy (solo localhost)

---

### 2. Testing (TST)

```bash
# Merge dev → tst
git checkout tst
git merge dev
git push origin tst
```

**Resultado:**
- ✅ GitHub Actions ejecuta `deploy-tst.yml`
- ✅ Deploy automático a VPS `/var/www/muva-chat-tst`
- ✅ Accesible en https://staging.muva.chat

---

### 3. Producción (PRD)

```bash
# Merge tst → prd (después de QA OK)
git checkout prd
git merge tst
git push origin prd
```

**Resultado:**
- ✅ GitHub Actions ejecuta `deploy-prd.yml`
- ✅ Backup DB automático
- ✅ Deploy a VPS `/var/www/muva-chat-prd`
- ✅ Accesible en https://muva.chat

---

## 🚫 Lo que NO se hace

### DEV NO va al VPS

- ❌ NO crear `/var/www/muva-chat-dev` en VPS
- ❌ NO configurar PM2 para DEV en VPS
- ❌ NO configurar Nginx para DEV
- ❌ NO necesita `DEV_VPS_HOST`, `DEV_VPS_USER`, `DEV_VPS_SSH_KEY`

**Razón:** DEV es para desarrollo local en tu computadora. Cada developer tiene su propio DEV localhost.

---

## ✅ Secrets Requeridos por Ambiente

### DEV (5 secrets - Solo para validación CI)

```
DEV_SUPABASE_URL
DEV_SUPABASE_ANON_KEY
DEV_SUPABASE_SERVICE_ROLE_KEY
DEV_SUPABASE_PROJECT_ID
DEV_SUPABASE_DB_PASSWORD
```

**NO requiere:** VPS_HOST, VPS_USER, VPS_SSH_KEY

---

### TST (9 secrets - Deploy VPS)

```
TST_SUPABASE_URL
TST_SUPABASE_ANON_KEY
TST_SUPABASE_SERVICE_ROLE_KEY
TST_SUPABASE_PROJECT_ID
TST_SUPABASE_DB_PASSWORD
TST_JWT_SECRET
TST_VPS_HOST       ← Necesario para deploy
TST_VPS_USER       ← Necesario para deploy
TST_VPS_SSH_KEY    ← Necesario para deploy
```

---

### PRD (9 secrets - Deploy VPS)

```
PRD_SUPABASE_URL
PRD_SUPABASE_ANON_KEY
PRD_SUPABASE_SERVICE_ROLE_KEY
PRD_SUPABASE_PROJECT_ID
PRD_SUPABASE_DB_PASSWORD
PRD_JWT_SECRET
PRD_VPS_HOST       ← Necesario para deploy
PRD_VPS_USER       ← Necesario para deploy
PRD_VPS_SSH_KEY    ← Necesario para deploy
```

---

## 📝 Resumen

**3 ambientes, 2 deployments VPS:**

1. **DEV** = Localhost SOLAMENTE (cada developer)
2. **TST** = VPS staging.muva.chat (deploy automático)
3. **PRD** = VPS muva.chat (deploy automático)

**VPS tiene solo 2 directorios:**
- `/var/www/muva-chat-tst` (TST)
- `/var/www/muva-chat-prd` (PRD)

**NO existe `/var/www/muva-chat-dev`** ✅

---

**Documentos Actualizados:**
- ✅ FASE4_COMPLETION_REPORT.md
- ✅ Este documento (ARCHITECTURE_CLARIFICATION.md)

**Próximo paso:** FASE 6 solo configurará TST y PRD en VPS (NO DEV)
