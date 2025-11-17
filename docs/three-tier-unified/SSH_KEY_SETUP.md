# SSH Key Setup para GitHub Secrets

**Fecha:** 2025-11-16
**Propósito:** Configurar `TST_VPS_SSH_KEY` y `PRD_VPS_SSH_KEY` en GitHub Actions

---

## 📋 Contenido de la SSH Key

Copia el siguiente contenido **COMPLETO** (incluyendo las líneas `-----BEGIN` y `-----END`):

```
-----BEGIN OPENSSH PRIVATE KEY-----
b3BlbnNzaC1rZXktdjEAAAAABG5vbmUAAAAEbm9uZQAAAAAAAAABAAAAMwAAAAtzc2gtZW
QyNTUxOQAAACBhVoUFRoDPEhX11sFTJPezaSMXMKRCjT/HbIDqhyjhtAAAAKB0nFlidJxZ
YgAAAAtzc2gtZWQyNTUxOQAAACBhVoUFRoDPEhX11sFTJPezaSMXMKRCjT/HbIDqhyjhtA
AAAEBGcdx2ssKniH8A9KC6i/RN8mbOQi8unu7PfqUbU5tVNmFWhQVGgM8SFfXWwVMk97Np
IxcwpEKNP8dsgOqHKOG0AAAAGGdpdGh1Yi1hY3Rpb25zQG11dmEuY2hhdAECAwQF
-----END OPENSSH PRIVATE KEY-----
```

---

## 🔐 Pasos para Configurar en GitHub

### 1. Ir a GitHub Secrets

**URL:** https://github.com/oneill-platform/muva-chat/settings/secrets/actions

### 2. Crear Secret: TST_VPS_SSH_KEY

1. Click en **"New repository secret"**
2. **Name:** `TST_VPS_SSH_KEY`
3. **Value:** Pega el contenido completo de arriba (desde `-----BEGIN` hasta `-----END`)
4. Click **"Add secret"**

### 3. Crear Secret: PRD_VPS_SSH_KEY

1. Click en **"New repository secret"**
2. **Name:** `PRD_VPS_SSH_KEY`
3. **Value:** Pega el **mismo** contenido (es la misma key para ambos ambientes)
4. Click **"Add secret"**

---

## ✅ Verificación

Después de agregar los secrets, deberías ver:

- `TST_VPS_SSH_KEY` ✓
- `PRD_VPS_SSH_KEY` ✓

Ambos secrets tendrán el mismo valor (la misma SSH key se usa para acceder al VPS en ambos ambientes).

---

## 📝 Notas Importantes

- ⚠️ **NO compartas esta key públicamente** (ya está en .gitignore)
- ✅ La key permite acceso SSH al VPS (195.200.6.216)
- ✅ Mismo key para TST y PRD (mismo servidor, diferentes directorios)
- ✅ GitHub Actions la usará para deployments automáticos vía SSH

---

## 🔍 Contexto

Esta SSH key está configurada en el VPS para el usuario `root` y permite que GitHub Actions se conecte vía SSH para:

1. Pull código desde Git
2. Build de la aplicación
3. Restart de PM2
4. Rollback en caso de fallo

**Archivo local:** `~/.ssh/muva_deploy`

---

## ✅ Estado Final

Una vez agregados estos 2 secrets, tendrás los **26 secrets completos**:

- DEV: 5 secrets ✓
- TST: 9 secrets ✓ (incluyendo TST_VPS_SSH_KEY)
- PRD: 9 secrets ✓ (incluyendo PRD_VPS_SSH_KEY)
- Shared: 3 secrets ✓

**Total: 26/26 secrets configurados** 🎉
