# GitHub Secrets Configuration

Esta guía explica cómo configurar los Secrets necesarios para el deployment automático via GitHub Actions.

## Acceso a GitHub Secrets

1. Ve al repositorio: https://github.com/toneill57/muva-chat
2. Click en **Settings** (tab superior)
3. En el menú izquierdo: **Secrets and variables** → **Actions**
4. Click en **New repository secret**

---

## Secrets Requeridos

### 1. VPS_HOST
**Descripción:** IP o hostname del servidor VPS Hostinger

**Valor:** `123.45.67.89` o `muva.chat`

**Cómo obtenerlo:**
- Panel de Hostinger → VPS → Información del servidor → IP Address

---

### 2. VPS_USER
**Descripción:** Usuario SSH para conectar al VPS

**Valor:** `root` o `innpilot` (usuario creado)

**Cómo obtenerlo:**
- Usuario root por defecto en Hostinger VPS
- O usuario creado durante setup inicial

---

### 3. VPS_SSH_KEY
**Descripción:** Private SSH key para autenticación sin password

**Valor:** Contenido completo de tu clave privada

**Cómo generarlo:**
```bash
# En tu máquina local
ssh-keygen -t rsa -b 4096 -C "github-actions@muva.chat"
# Guardar en: ~/.ssh/innpilot_deploy

# Copiar clave pública al servidor
ssh-copy-id -i ~/.ssh/innpilot_deploy.pub user@muva.chat

# Obtener clave privada para GitHub Secret
cat ~/.ssh/innpilot_deploy
# Copiar TODO el output (incluyendo BEGIN/END lines)
```

---

### 4. VPS_APP_PATH
**Descripción:** Path absoluto donde está la aplicación en el VPS

**Valor:** `/var/www/muva-chat`

---

### 5. SUPABASE_URL
**Descripción:** URL de tu proyecto Supabase

**Valor:** `https://iyeueszchbvlutlcmvcb.supabase.co`

**Cómo obtenerlo:**
- Supabase Dashboard → Settings → API → Project URL

---

### 6. SUPABASE_ANON_KEY
**Descripción:** Supabase anonymous/public key

**Valor:** `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`

**Cómo obtenerlo:**
- Supabase Dashboard → Settings → API → anon/public key

---

### 7. SUPABASE_SERVICE_ROLE_KEY
**Descripción:** Supabase service role key (secret)

**Valor:** `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`

**Cómo obtenerlo:**
- Supabase Dashboard → Settings → API → service_role key (secret)

---

### 8. OPENAI_API_KEY
**Descripción:** OpenAI API key para embeddings

**Valor:** `sk-proj-...`

**Cómo obtenerlo:**
- OpenAI Platform → API Keys → Create new secret key

---

### 9. ANTHROPIC_API_KEY
**Descripción:** Anthropic API key para Claude

**Valor:** `sk-ant-api03-...`

**Cómo obtenerlo:**
- Anthropic Console → API Keys → Create key

---

### 10. JWT_SECRET_KEY
**Descripción:** Secret key para JWT authentication

**Valor:** String aleatorio de 64+ caracteres

**Cómo generarlo:**
```bash
openssl rand -base64 64
```

---

## Verificación

Después de configurar todos los secrets:

1. Ve a: **Settings** → **Secrets and variables** → **Actions**
2. Debes ver 10 secrets listados
3. Ningún secret debe mostrar su valor (solo nombre)

## Seguridad

⚠️ **IMPORTANTE:**
- **NUNCA** comittees secrets en el código
- **NUNCA** compartas secrets en chat/email
- Rota secrets periódicamente (cada 90 días)
- Usa secrets diferentes para dev/prod
