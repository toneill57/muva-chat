# 🔍 Checklist de Verificación de GitHub Secrets

**Fecha:** October 2025
**Propósito:** Diagnosticar y corregir fallo en deployment automático después del rebranding

---

## 🎯 Problema Actual

El workflow de deployment falla en el step "Deploy to VPS" con un error de conexión SSH que dura ~1 segundo, lo que indica que el problema está en uno de estos secrets:

1. ✅ **VPS_SSH_KEY** - Formato o clave incorrecta
2. ✅ **VPS_HOST** - IP/hostname incorrecto
3. ✅ **VPS_USER** - Usuario incorrecto (posible referencia a "innpilot")
4. ✅ **VPS_APP_PATH** - Path incorrecto (posible referencia a "innpilot")

---

## 📋 Verificación Step-by-Step

Ve a: https://github.com/toneill57/muva-chat/settings/secrets/actions

### 1️⃣ VPS_SSH_KEY (Prioridad ALTA)

**Valor actual en GitHub:** [Ver en Secrets]

**❓ Qué verificar:**
- [ ] La clave tiene el formato completo (BEGIN/END lines)
- [ ] No tiene espacios extra al inicio/final
- [ ] Mantiene los saltos de línea originales
- [ ] Es la clave PRIVADA (no la .pub)

**✅ Cómo corregir:**

```bash
# Opción 1: Usar id_ed25519 (encontrada en tu sistema)
cat ~/.ssh/id_ed25519 | pbcopy

# Opción 2: Usar id_embassy (encontrada en tu sistema)
cat ~/.ssh/id_embassy | pbcopy

# Ahora ve a GitHub Secrets y REEMPLAZA VPS_SSH_KEY con el contenido del clipboard
```

**⚠️ IMPORTANTE:** Debes pegar el contenido COMPLETO, incluyendo:
```
-----BEGIN OPENSSH PRIVATE KEY-----
(múltiples líneas de texto codificado)
-----END OPENSSH PRIVATE KEY-----
```

**🧪 Cómo probar cuál clave funciona:**

```bash
# Prueba id_ed25519
ssh -i ~/.ssh/id_ed25519 USER@HOST

# Prueba id_embassy
ssh -i ~/.ssh/id_embassy USER@HOST

# La que NO pida password es la correcta ✅
```

---

### 2️⃣ VPS_HOST

**Valor esperado:** IP del VPS Hostinger o `muva.chat`

**❓ Qué verificar:**
- [ ] Es la IP correcta del VPS
- [ ] O es el hostname correcto (muva.chat)
- [ ] No tiene espacios extra
- [ ] No incluye puerto (eso es opcional)

**✅ Cómo obtener el correcto:**
1. Ve al panel de Hostinger
2. Sección VPS → Tu servidor
3. Copia la IP Address

**🧪 Cómo probar:**
```bash
ping VALOR_DE_VPS_HOST
# Debe responder
```

---

### 3️⃣ VPS_USER

**⚠️ POSIBLE PROBLEMA DE REBRANDING:**

**Valores posibles:**
- ❌ `innpilot` (nombre antiguo)
- ✅ `root` (usuario por defecto Hostinger)
- ✅ `muva` (si creaste un usuario nuevo)
- ✅ Tu usuario actual en Hostinger

**❓ Qué verificar:**
- [ ] NO es "innpilot" (nombre antiguo del proyecto)
- [ ] Es el usuario con el que te conectas por SSH

**🧪 Cómo verificar:**
```bash
# Prueba conectarte con cada posibilidad
ssh root@VPS_HOST
ssh muva@VPS_HOST
ssh innpilot@VPS_HOST  # ❌ Si este funciona, DEBE cambiarse

# El que funcione SIN pedir password (usando tu clave SSH) es el correcto
```

---

### 4️⃣ VPS_APP_PATH

**⚠️ POSIBLE PROBLEMA DE REBRANDING:**

**Valores posibles:**
- ❌ `/var/www/innpilot` (nombre antiguo)
- ❌ `/home/innpilot/innpilot-chat` (nombre antiguo)
- ✅ `/var/www/muva-chat` (nombre nuevo)
- ✅ `/home/USER/muva-chat` (nombre nuevo)

**❓ Qué verificar:**
- [ ] NO tiene referencias a "innpilot"
- [ ] El path existe en el VPS
- [ ] El path contiene un repositorio git válido

**🧪 Cómo verificar:**
```bash
# Conéctate al VPS
ssh USER@HOST

# Busca dónde está la aplicación
find /var/www -name "package.json" -type f 2>/dev/null
find /home -name "package.json" -type f 2>/dev/null | grep -E "(muva|innpilot)"

# Verifica qué path tiene un .git
ls -la /var/www/muva-chat/.git
ls -la /var/www/innpilot/.git

# El path correcto debe:
# 1. Existir
# 2. Tener un .git (repositorio)
# 3. Tener package.json
# 4. NO tener referencias a "innpilot" en el nombre
```

**✅ Cómo corregir si está mal:**

**Opción A: Renombrar el directorio**
```bash
# En el VPS
cd /var/www
sudo mv innpilot muva-chat
```

**Opción B: Cambiar el secret en GitHub**
- Si el path es `/var/www/innpilot` → Cámbialo a `/var/www/muva-chat`
- Si el path es otro, usa el que encontraste con el comando `find` arriba

---

## 🚀 Secrets Adicionales (Menos Probables)

### NEXT_PUBLIC_SUPABASE_URL
**Valor esperado:** `https://ooaumjzaztmutltifhoq.supabase.co`

Debe coincidir con el valor en tu `.env.local`.

### NEXT_PUBLIC_SUPABASE_ANON_KEY
Copia desde `.env.local` → `NEXT_PUBLIC_SUPABASE_ANON_KEY`

### SUPABASE_SERVICE_ROLE_KEY
Copia desde `.env.local` → `SUPABASE_SERVICE_ROLE_KEY`

### OPENAI_API_KEY
Copia desde `.env.local` → `OPENAI_API_KEY`

### ANTHROPIC_API_KEY
Copia desde `.env.local` → `ANTHROPIC_API_KEY`

---

## ✅ Después de Corregir

1. Haz un commit dummy para triggear el workflow:
```bash
touch .github/workflows/.trigger && git add . && git commit -m "chore: test deployment" && git push
```

2. Monitorea el workflow:
https://github.com/toneill57/muva-chat/actions

3. Si falla de nuevo, revisa los logs detallados del step "Deploy to VPS"

---

## 🆘 Debugging Avanzado

Si después de verificar TODO lo anterior sigue fallando:

```bash
# Conéctate manualmente al VPS
ssh -i ~/.ssh/id_ed25519 USER@HOST

# Verifica PM2
pm2 status

# Verifica Nginx
sudo nginx -t
sudo systemctl status nginx

# Verifica el repositorio
cd /var/www/muva-chat
git status
git remote -v

# Verifica permisos
ls -la
whoami
```

---

## 📝 Resumen de Cambios Post-Rebranding

Secrets que probablemente necesitan actualización:

- [ ] **VPS_USER:** ~~`innpilot`~~ → `root` o `muva`
- [ ] **VPS_APP_PATH:** ~~`/var/www/innpilot`~~ → `/var/www/muva-chat`
- [ ] **VPS_SSH_KEY:** Verificar formato completo

Secrets que probablemente están OK:
- ✅ VPS_HOST (no cambia con rebranding)
- ✅ Supabase keys (no cambian con rebranding)
- ✅ API keys (no cambian con rebranding)
