# GitHub Environment Setup - Production

**Proyecto:** Three Environments CI/CD - MUVA Chat
**Fecha:** Noviembre 2, 2025

---

## Objetivo

Configurar el GitHub Environment "production" con approval manual obligatorio antes de deployments a producción.

---

## Pasos de Configuración

### 1. Crear Environment "production"

1. Ve a tu repositorio en GitHub
2. Click en `Settings` (tab superior)
3. En el menú lateral, click en `Environments`
4. Click en `New environment`
5. Nombre: `production` (exactamente, minúsculas)
6. Click en `Configure environment`

### 2. Configurar Required Reviewers

En la página de configuración del environment:

1. Marca la checkbox `Required reviewers`
2. Agrega los reviewers que DEBEN aprobar antes de deploy:
   - CEO GitHub username
   - CTO GitHub username
   - O cualquier persona autorizada para aprobar deploys a producción
3. **Mínimo requerido:** 1 approval
4. Click en `Save protection rules`

### 3. Configurar Wait Timer (Opcional)

Si deseas un delay adicional antes de deployment:

1. Marca la checkbox `Wait timer`
2. Configura minutos de espera (ej: 5 minutos)
3. **Recomendado:** 0 minutos (approval manual es suficiente)

### 4. Configurar Environment Secrets

Los siguientes secrets deben agregarse ESPECÍFICAMENTE al environment "production":

#### 4.1 VPS Production Access

```
VPS_HOST_PRODUCTION
Value: [IP o hostname del VPS producción]
```

```
VPS_USER_PRODUCTION
Value: [Usuario SSH del VPS, ej: u123456789]
```

```
VPS_PASSWORD_PRODUCTION
Value: [Password del VPS o SSH key privado]
```

#### 4.2 Supabase Production Database

```
SUPABASE_URL_PRODUCTION
Value: https://iyeueszchbvlutlcmvcb.supabase.co
```

```
SUPABASE_SERVICE_ROLE_KEY_PRODUCTION
Value: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9vYXVtanphenRtdXRsdGlmaG9xIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Njg1NDIwOSwiZXhwIjoyMDcyNDMwMjA5fQ.ngQSR4E9UHWLcbDAhi0QJy3ffriuV2bi4rGxyHy8Eoc
```

```
SUPABASE_ANON_KEY_PRODUCTION
Value: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9vYXVtanphenRtdXRsdGlmaG9xIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY4NTQyMDksImV4cCI6MjA3MjQzMDIwOX0.HapBSfCjxBuUijFQvQIgu8Y44YI3OPL6Gr45RKTw-Fk
```

```
SUPABASE_DB_PASSWORD_PRODUCTION
Value: [Obtener de Supabase Dashboard → Settings → Database]
```

```
SUPABASE_PRODUCTION_PROJECT_ID
Value: iyeueszchbvlutlcmvcb
```

#### 4.3 API Keys (Shared)

Estos pueden estar en Repository Secrets (compartidos) o duplicados en environment:

```
OPENAI_API_KEY
Value: [Tu OpenAI API key]
```

```
ANTHROPIC_API_KEY
Value: [Tu Anthropic API key]
```

```
JWT_SECRET_KEY_PRODUCTION
Value: [Generar nuevo JWT secret para producción]
```

### 5. Verificar Configuración

Una vez configurado, la página del environment debería mostrar:

- **Required reviewers:** [Lista de usernames configurados]
- **Wait timer:** 0 minutes (o el valor configurado)
- **Environment secrets:** 9 secrets configurados

---

## Deployment Protection Rules

### Protection Rules Recomendadas

El environment "production" ya tiene las siguientes protecciones:

1. **Manual Approval Required**
   - Al menos 1 reviewer debe aprobar
   - No se puede hacer deploy sin approval
   - Approval caduca después de 30 días

2. **Deployment Branches** (Opcional)
   - Limitar deployment solo desde branch `main`
   - Configurar en: `Deployment branches` → `Selected branches` → `main`

### Cómo Funciona el Approval

Cuando un workflow intenta deployar a production:

1. GitHub Actions ejecuta hasta el job que requiere el environment
2. Workflow se PAUSA automáticamente
3. Reviewers reciben notificación (email + GitHub notification)
4. Reviewer debe:
   - Ir a Actions tab
   - Ver el workflow en espera
   - Click en `Review deployments`
   - Aprobar o rechazar con comentario
5. Si aprobado: workflow continúa
6. Si rechazado: workflow se cancela

---

## Testing del Environment

### Test 1: Verificar Approval Requerido

```bash
# En local
git checkout main
git merge staging
git push origin main

# En GitHub:
# → Ve a Actions tab
# → Workflow debe estar en estado "Waiting"
# → Debe mostrar "Waiting for approval"
```

### Test 2: Aprobar Deployment

1. Como reviewer, ve a Actions tab
2. Click en el workflow en espera
3. Click en `Review deployments`
4. Marca checkbox `production`
5. Agrega comentario: "Approved - tested in staging"
6. Click en `Approve and deploy`

**Resultado esperado:** Workflow continúa y deploya a producción

### Test 3: Rechazar Deployment

1. Como reviewer, ve a Actions tab
2. Click en el workflow en espera
3. Click en `Review deployments`
4. Marca checkbox `production`
5. Agrega comentario: "Rejected - found issue in staging"
6. Click en `Reject`

**Resultado esperado:** Workflow se cancela

---

## Troubleshooting

### Error: "Environment protection rules not met"

**Causa:** Ningún reviewer aprobó el deployment

**Solución:** Espera a que un reviewer apruebe o cancela el workflow

### Error: "No reviewers configured"

**Causa:** Environment no tiene reviewers configurados

**Solución:**
1. Ve a Settings → Environments → production
2. Configura required reviewers
3. Retry el workflow

### Error: "Secrets not found"

**Causa:** Secrets no están configurados en el environment

**Solución:**
1. Ve a Settings → Environments → production → Environment secrets
2. Agrega todos los secrets listados arriba
3. Retry el workflow

### Pregunta: ¿Puedo hacer bypass del approval en emergencias?

**Respuesta:** Sí, pero NO recomendado.

**Opciones:**
1. **Temporal bypass:** Settings → Environments → production → Desmarcar "Required reviewers"
2. **Self-approval:** Si eres reviewer, puedes aprobarte a ti mismo
3. **Emergency deploy:** Deploy manual via SSH (sin GitHub Actions)

**IMPORTANTE:** Después de emergencia, SIEMPRE reactivar required reviewers.

---

## Security Best Practices

### DO ✅

- Configurar mínimo 2 reviewers diferentes
- Usar SSH keys en lugar de passwords para VPS
- Rotar secrets cada 90 días
- Auditar deployments aprobados mensualmente
- Documentar razón de cada deployment en approval comment

### DON'T ❌

- No hacer self-approval routine (solo emergencias)
- No compartir SSH keys entre ambientes
- No usar mismo JWT secret en staging y production
- No hacer bypass de approval sin documentar
- No agregar reviewers que no entienden el sistema

---

## Audit Trail

Todos los deployments quedan registrados en:

1. **GitHub Actions logs:**
   - Actions tab → Deploy Production workflow
   - Muestra quién aprobó, cuándo, comentario

2. **Environment deployment history:**
   - Settings → Environments → production
   - Ver historial completo de deployments

3. **Git history:**
   - `git log main`
   - Ver commits deployados

---

**Última actualización:** Noviembre 2, 2025
**Creado por:** @agent-deploy-agent
**Status:** Ready for production
