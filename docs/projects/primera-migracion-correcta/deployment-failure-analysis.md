# Deployment Failure Analysis - Primera Migración Correcta

**Fecha:** 2025-10-11 05:11:18
**Status:** ❌ FAILED (Rollback Exitoso)
**Commit Intentado:** 69cedac - feat(migration): Primera migración correcta post-rebrand InnPilot → MUVA
**GitHub Actions:** Deploy to VPS workflow

---

## 🔴 Errores Detectados

### 1. npm ci - Package.json Not Found
```
npm error syscall open
npm error path /***/package.json
npm error errno -2
npm error enoent Could not read package.json: Error: ENOENT: no such file or directory
```

**Causa:** El comando `npm ci` se ejecutó en un directorio que no contiene `package.json`

**Implicación:** El `cd ${{ secrets.VPS_APP_PATH }}` en el workflow no está funcionando correctamente, o el secret apunta a un directorio incorrecto.

---

### 2. Archivos de Configuración No Encontrados
```
cp: cannot stat 'docs/deployment/nginx-subdomain.conf': No such file or directory
[PM2][ERROR] File docs/deployment/ecosystem.config.cjs not found
```

**Causa:** Los archivos de configuración no están presentes en el directorio de trabajo del VPS

**Implicación:**
- El `git pull origin dev` falló silenciosamente
- O los archivos no están en el branch correcto
- O el directorio de trabajo es incorrecto

---

### 3. Nginx Warning (No Crítico)
```
nginx: [warn] conflicting server name "saigents.com" on 0.0.0.0:443, ignored
```

**Causa:** Configuración duplicada de server_name en Nginx

**Implicación:** No bloqueante, pero debe limpiarse. Probablemente configuración legacy de otro proyecto.

---

## ✅ Rollback Exitoso

```
Rolled back to previous version
✅ Successfully executed commands to all host.
```

El sistema se recuperó automáticamente. El sitio sigue funcionando en la versión anterior.

---

## 🔍 Root Cause Analysis

### Hipótesis Principal: VPS_APP_PATH Incorrecto o Directorio Inexistente

**Secuencia de ejecución del workflow:**
1. GitHub Actions hace checkout del código ✅
2. Build en runner de GitHub ✅
3. SSH a VPS ✅
4. `cd ${{ secrets.VPS_APP_PATH }}` ❓ (probablemente falla aquí)
5. `git pull origin dev` ❌ (ejecuta en directorio incorrecto)
6. `npm ci` ❌ (no encuentra package.json)
7. `sudo cp docs/deployment/nginx-subdomain.conf` ❌ (archivos no presentes)
8. `pm2 reload docs/deployment/ecosystem.config.cjs` ❌ (archivo no presente)

**Punto de falla:** Step 4 o 5

---

## 🛠️ Diagnóstico Requerido

### Verificar GitHub Secrets (MANUAL)

1. Ir a: https://github.com/[username]/muva-chat/settings/secrets/actions

2. Verificar que existan estos secrets:
   - `VPS_HOST` = `195.200.6.216` o `muva.chat`
   - `VPS_USER` = `oneill`
   - `VPS_SSH_KEY` = (Private SSH key válida)
   - `VPS_APP_PATH` = `/var/www/muva-chat` ⚠️ **CRÍTICO**

3. Si `VPS_APP_PATH` está mal o no existe → Crearlo/Corregirlo

---

### Verificar Estado del VPS (MANUAL - Requiere SSH)

```bash
# 1. Conectar a VPS
ssh oneill@muva.chat

# 2. Verificar que el directorio existe
ls -la /var/www/muva-chat

# 3. Verificar estado de git
cd /var/www/muva-chat
git status
git log -1 --oneline
git remote -v

# 4. Verificar que los archivos de deployment existen
ls -la /var/www/muva-chat/docs/deployment/

# 5. Verificar que package.json existe
ls -la /var/www/muva-chat/package.json

# 6. Verificar PM2
pm2 status
pm2 logs muva-chat --lines 50 --nostream
```

**Resultados esperados:**
- Directorio `/var/www/muva-chat` existe
- Git repo está clean
- Archivos `ecosystem.config.cjs` y `nginx-subdomain.conf` existen
- `package.json` existe en el root
- PM2 proceso "muva-chat" está online (versión anterior después del rollback)

---

## 🔧 Soluciones Propuestas

### Solución 1: Verificar y Corregir VPS_APP_PATH Secret

**Si el secret está mal:**
1. Ir a GitHub repo → Settings → Secrets and variables → Actions
2. Editar `VPS_APP_PATH`
3. Valor correcto: `/var/www/muva-chat`
4. Save
5. Retry deployment con nuevo push

---

### Solución 2: Hacer el Workflow Más Robusto

**Problema actual:** El workflow no valida que los comandos tengan éxito antes de continuar.

**Fix propuesto:** Modificar `.github/workflows/deploy.yml` línea 43-50:

```yaml
script: |
  set -e  # Exit on any error

  # Validate directory exists
  if [ ! -d "${{ secrets.VPS_APP_PATH }}" ]; then
    echo "❌ ERROR: VPS_APP_PATH directory does not exist: ${{ secrets.VPS_APP_PATH }}"
    exit 1
  fi

  cd ${{ secrets.VPS_APP_PATH }}
  echo "✅ Current directory: $(pwd)"

  # Validate it's a git repo
  if [ ! -d ".git" ]; then
    echo "❌ ERROR: Not a git repository"
    exit 1
  fi

  # Pull latest changes
  echo "Pulling latest changes from dev branch..."
  git pull origin dev

  # Validate package.json exists
  if [ ! -f "package.json" ]; then
    echo "❌ ERROR: package.json not found"
    exit 1
  fi

  # Install dependencies
  echo "Installing dependencies..."
  npm ci --legacy-peer-deps

  # Build
  echo "Building application..."
  npm run build

  # Validate deployment files exist
  if [ ! -f "docs/deployment/nginx-subdomain.conf" ]; then
    echo "❌ ERROR: nginx-subdomain.conf not found"
    exit 1
  fi

  if [ ! -f "docs/deployment/ecosystem.config.cjs" ]; then
    echo "❌ ERROR: ecosystem.config.cjs not found"
    exit 1
  fi

  # Update Nginx config
  echo "Updating Nginx configuration..."
  sudo cp docs/deployment/nginx-subdomain.conf /etc/nginx/sites-available/muva
  sudo nginx -t && sudo systemctl reload nginx

  # Reload PM2
  echo "Reloading PM2 process..."
  pm2 reload docs/deployment/ecosystem.config.cjs --update-env

  echo "✅ Deployment completed successfully"
```

**Beneficios:**
- `set -e` hace que el script falle inmediatamente en cualquier error
- Validaciones explícitas antes de cada paso crítico
- Output claro para debugging
- Rollback automático se activa en el primer error

---

### Solución 3: Verificar Directorio en VPS (Si No Existe)

**Si el directorio no existe en VPS:**

```bash
# SSH a VPS
ssh oneill@muva.chat

# Crear directorio
sudo mkdir -p /var/www/muva-chat

# Cambiar ownership
sudo chown -R oneill:oneill /var/www/muva-chat

# Clonar repo (primera vez)
cd /var/www
git clone https://github.com/[username]/muva-chat.git

# Setup
cd muva-chat
git checkout dev
npm ci --legacy-peer-deps

# Copiar .env
# (Necesitas crear .env con las variables correctas)

# Build
npm run build

# Setup PM2
pm2 start docs/deployment/ecosystem.config.cjs
pm2 save
pm2 startup  # Seguir instrucciones

# Setup Nginx
sudo cp docs/deployment/nginx-subdomain.conf /etc/nginx/sites-available/muva
sudo ln -s /etc/nginx/sites-available/muva /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

---

## 📊 Estado Actual del Sistema

| Componente | Estado | Notas |
|------------|--------|-------|
| **Sitio Principal** | ✅ ONLINE | https://muva.chat responde 200 OK |
| **Health Check** | ✅ HEALTHY | Versión anterior funcionando |
| **Tenant Subdomain** | ✅ ONLINE | simmerdown.muva.chat responde 200 OK |
| **PM2 Process** | ✅ RUNNING | Versión anterior (pre-rollback) |
| **GitHub Actions** | ❌ FAILED | Último run falló, rollback exitoso |
| **Commit 69cedac** | ❌ NOT DEPLOYED | Cambios no aplicados en VPS |

**Conclusión:** El sistema está estable en la versión anterior. El deployment falló pero el rollback automático funcionó perfectamente.

---

## 🚀 Próximos Pasos Recomendados

### Paso 1: Diagnóstico Manual (REQUERIDO)
- [ ] Usuario verifica GitHub Secrets (especialmente VPS_APP_PATH)
- [ ] Usuario hace SSH a VPS y verifica estado del directorio
- [ ] Usuario reporta findings

### Paso 2: Aplicar Fix (Según Diagnóstico)
- [ ] Opción A: Corregir VPS_APP_PATH secret
- [ ] Opción B: Crear/reparar directorio en VPS
- [ ] Opción C: Mejorar workflow con validaciones (recomendado siempre)

### Paso 3: Retry Deployment
- [ ] Hacer nuevo commit trivial (para trigger workflow)
- [ ] O usar GitHub Actions UI: "Re-run all jobs"
- [ ] Monitorear logs en tiempo real

### Paso 4: Verificación Post-Fix
- [ ] Health check pasa
- [ ] Commit 69cedac deployed
- [ ] Logs sin errores
- [ ] Documentar resolución

---

## 🔐 Información de Seguridad

**Archivos sensibles verificados:**
- ✅ Workflow no expone secrets en logs
- ✅ Rollback no dejó sistema en estado inseguro
- ✅ SSH key funciona (conexión exitosa, comandos fallaron por directorio)

**Nginx warning sobre saigents.com:**
- ⚠️ Limpiar configuración duplicada cuando sea posible
- No es crítico pero debe resolverse

---

## 📝 Lecciones Aprendidas

1. **Workflow necesita más validaciones:**
   - Validar que directorio existe antes de operar
   - Usar `set -e` para fail-fast
   - Validar cada prerrequisito explícitamente

2. **Monitoreo del deployment:**
   - Implementar logging más verboso
   - Capturar outputs críticos
   - Mejor detección de errores early

3. **Documentación de secrets:**
   - Documentar qué secrets se requieren
   - Incluir valores esperados (sin exponer valores reales)
   - Validar secrets durante el workflow

4. **Testing local antes de push:**
   - Crear script que simula el deployment localmente
   - Validar archivos de configuración antes de push

---

**Última actualización:** 2025-10-11
**Autor:** @agent-deploy-agent (análisis post-mortem)
**Estado:** Esperando diagnóstico manual del usuario
**Prioridad:** 🔴 ALTA (bloquea deployments futuros)
