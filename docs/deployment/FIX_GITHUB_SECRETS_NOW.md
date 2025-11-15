# 🔧 SOLUCIÓN: Actualizar GitHub Secrets

**Fecha:** October 11, 2025
**Problema identificado:** VPS_HOST incorrecto y VPS_SSH_KEY no autorizada

---

## ✅ Problema Resuelto

**Causa raíz encontrada:**
1. ❌ `VPS_HOST` era `muva.chat` → debe ser `195.200.6.216` (IP directa)
2. ❌ `VPS_SSH_KEY` no tenía una clave autorizada en el VPS
3. ✅ Nueva clave SSH generada y autorizada: `~/.ssh/muva_deploy`

---

## 🚀 ACCIÓN INMEDIATA REQUERIDA

Ve a: **https://github.com/toneill57/muva-chat/settings/secrets/actions**

### 1️⃣ Actualizar VPS_HOST

- **Click en:** `VPS_HOST` → **Update**
- **Nuevo valor:** `195.200.6.216`
- **Click en:** Update secret

---

### 2️⃣ Actualizar VPS_SSH_KEY

**✅ La clave privada YA ESTÁ en tu clipboard** (copiada con `pbcopy`)

- **Click en:** `VPS_SSH_KEY` → **Update**
- **Pegar** (⌘+V) el contenido del clipboard
- **Verificar** que se vea así:
  ```
  -----BEGIN OPENSSH PRIVATE KEY-----
  b3BlbnNzaC1rZXktdjEAAAAABG5vbmUAAAAEbm9uZQAAAAAAAAABAAAAMwAAAAtzc2gtZW
  ...
  (muchas líneas más)
  ...
  -----END OPENSSH PRIVATE KEY-----
  ```
- **Click en:** Update secret

---

### 3️⃣ Verificar VPS_USER

- **Debe ser:** `root`
- Si no existe, créalo con ese valor

---

### 4️⃣ Verificar VPS_APP_PATH

- **Debe ser:** `/var/www/muva-chat`
- Si no existe, créalo con ese valor

---

## ✅ Secrets Finales (Checklist)

Después de actualizar, debes tener estos secrets configurados:

- [x] **VPS_HOST** = `195.200.6.216`
- [x] **VPS_USER** = `root`
- [x] **VPS_SSH_KEY** = Clave privada completa (BEGIN...END)
- [x] **VPS_APP_PATH** = `/var/www/muva-chat`
- [ ] **NEXT_PUBLIC_SUPABASE_URL** (si no existe, copiar de .env.local)
- [ ] **NEXT_PUBLIC_SUPABASE_ANON_KEY** (si no existe, copiar de .env.local)
- [ ] **SUPABASE_SERVICE_ROLE_KEY** (si no existe, copiar de .env.local)
- [ ] **OPENAI_API_KEY** (si no existe, copiar de .env.local)
- [ ] **ANTHROPIC_API_KEY** (si no existe, copiar de .env.local)

---

## 🧪 Test del Deployment

Una vez actualizados los secrets, ejecuta:

```bash
# En tu máquina local
git commit --allow-empty -m "chore: test deployment with fixed SSH configuration"
git push origin dev
```

Luego monitorea:
**https://github.com/toneill57/muva-chat/actions**

**Debe:**
1. ✅ Conectarse al VPS via SSH
2. ✅ Hacer pull del código
3. ✅ Ejecutar build
4. ✅ Recargar PM2
5. ✅ Pasar health check

---

## 🔐 Información de la Nueva Clave

**Clave privada:** `~/.ssh/muva_deploy`
**Clave pública:** `~/.ssh/muva_deploy.pub`

**Autorizada en VPS:**
```bash
ssh -i ~/.ssh/muva_deploy root@195.200.6.216
# Debe conectar SIN pedir contraseña ✅
```

**Para uso futuro:**

Si necesitas regenerar o rotar la clave:

1. Generar nueva:
```bash
ssh-keygen -t ed25519 -C "github-actions@muva.chat" -f ~/.ssh/muva_deploy_new
```

2. Autorizar en VPS:
```bash
ssh-copy-id -i ~/.ssh/muva_deploy_new.pub root@195.200.6.216
# Contraseña: rabbitHole0+
```

3. Actualizar GitHub Secret `VPS_SSH_KEY` con:
```bash
cat ~/.ssh/muva_deploy_new | pbcopy
```

---

## 📝 Resumen del Cambio

**Antes (NO funcionaba):**
- VPS_HOST: `muva.chat` ❌
- VPS_SSH_KEY: Clave no autorizada ❌

**Después (funcionando):**
- VPS_HOST: `195.200.6.216` ✅
- VPS_SSH_KEY: `~/.ssh/muva_deploy` (autorizada) ✅
- VPS_USER: `root` ✅
- VPS_APP_PATH: `/var/www/muva-chat` ✅

---

**🎯 SIGUIENTE PASO:** Actualizar los 2 secrets en GitHub (VPS_HOST y VPS_SSH_KEY) y hacer un test commit.
