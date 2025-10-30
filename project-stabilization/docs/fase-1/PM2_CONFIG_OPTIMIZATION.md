# PM2_CONFIG_OPTIMIZATION.md

**Fecha:** 2025-10-29
**Autor:** @backend-developer
**Fase:** Project Stabilization - FASE 1
**Tarea:** 1.3 - Optimizar Configuración PM2

---

## 🎯 Objetivo

Crear configuración PM2 optimizada (`ecosystem.config.js`) que prevenga crashes por memoria y restart loops basada en análisis de métricas reales de producción y staging.

---

## 📊 Diagnóstico Previo

### Fuente de Datos
Ver: `project-stabilization/docs/fase-1/PM2_DIAGNOSTIC_REPORT.md`

### Métricas Clave (28 Oct 2025)

#### Production (muva.chat)
```
Heap Usage: 455.91 MB / 479.11 MB (95.15%)
Uptime: 10h
Restarts: 0
Status: DANGER - Heap casi al máximo
```

#### Staging (staging.muva.chat)
```
Heap Usage: 312.78 MB / 480.12 MB (65.14%)
Uptime: 10h
Restarts: 0
Status: HEALTHY
```

### Problemas Identificados

1. **Sin límite de memoria:** Procesos pueden crecer indefinidamente hasta OOM
2. **Sin throttling de restarts:** Riesgo de restart loops infinitos
3. **Logs poco estructurados:** Difícil debugging sin timestamps
4. **Configuración CLI:** PM2 iniciado con comandos individuales, no config file

---

## ✅ Solución Implementada

### Archivo Creado: `ecosystem.config.js`

Configuración declarativa para gestionar ambas instancias (production y staging).

---

## 🔧 Configuración Detallada

### 1. Memory Management

#### Production
```javascript
max_memory_restart: '500M',
node_args: '--max-old-space-size=450'
```

**Justificación:**
- Heap actual: 455.91 MB (95.15% de 479.11 MB)
- Límite `max_memory_restart`: 500M
  - Trigger restart ANTES de OOM
  - Margen de 44 MB sobre uso actual
  - Permite picos temporales sin crash
- `--max-old-space-size`: 450M
  - Límite Node.js heap
  - Aligned con max_memory_restart
  - 50M margen para new space

#### Staging
```javascript
max_memory_restart: '400M',
node_args: '--max-old-space-size=350'
```

**Justificación:**
- Heap actual: 312.78 MB (65.14% de 480.12 MB)
- Límite `max_memory_restart`: 400M
  - Menor que production (menos carga)
  - Margen de 87 MB sobre uso actual
  - Permite crecimiento sin desperdiciar recursos
- `--max-old-space-size`: 350M
  - Acorde a menor carga de staging

### 2. Restart Management

```javascript
autorestart: true,
max_restarts: 10,
min_uptime: '10s',
restart_delay: 4000  // 4 segundos
```

#### Configuración por Parámetro

| Parámetro | Valor | Justificación |
|-----------|-------|---------------|
| `autorestart` | `true` | Restart automático en crashes |
| `max_restarts` | `10` | Máximo 10 restarts en ventana `min_uptime` |
| `min_uptime` | `10s` | Proceso debe vivir 10s para contar como "arriba" |
| `restart_delay` | `4000ms` | Esperar 4s entre restarts para estabilidad |

#### Prevención de Restart Loops

**Escenario sin throttling:**
```
[00:00:00] App crash
[00:00:01] PM2 restart (instant)
[00:00:02] App crash (mismo error)
[00:00:03] PM2 restart (instant)
[00:00:04] App crash (mismo error)
...
```
**Resultado:** Loop infinito, CPU al 100%

**Escenario con throttling:**
```
[00:00:00] App crash
[00:00:04] PM2 restart (4s delay)
[00:00:05] App crash (< 10s uptime, cuenta como restart)
[00:00:09] PM2 restart (4s delay)
[00:00:10] App crash (< 10s uptime)
...
[00:00:40] 10 restarts alcanzados
[00:00:40] PM2 DETIENE proceso (previene loop)
```
**Resultado:** Loop detenido después de 10 intentos

### 3. Logging

```javascript
error_file: './logs/pm2-error.log',
out_file: './logs/pm2-out.log',
log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
merge_logs: true
```

#### Configuración por Parámetro

| Parámetro | Valor | Justificación |
|-----------|-------|---------------|
| `error_file` | `./logs/pm2-error.log` | Logs de stderr separados |
| `out_file` | `./logs/pm2-out.log` | Logs de stdout separados |
| `log_date_format` | `YYYY-MM-DD HH:mm:ss Z` | Timestamp con timezone |
| `merge_logs` | `true` | Consolida logs de cluster instances |

#### Ejemplo de Output

**Antes (sin formato):**
```
Error occurred
Next error
Another error
```

**Después (con formato):**
```
2025-10-29 14:35:22 +00 [getTenantBySubdomain] ℹ️  No tenant found for subdomain: admin
2025-10-29 14:35:23 +00 [api/chat] Processing message
2025-10-29 14:35:24 +00 [guest-auth] Token verified
```

### 4. Environment Configuration

```javascript
env: {
  NODE_ENV: 'production',
  PORT: 3000  // or 3001 for staging
}
```

**Notas:**
- `NODE_ENV: 'production'` para ambas instancias
  - Staging también usa 'production' para optimizations
  - Diferenciación por hostname/subdomain, no por NODE_ENV
- Ports separados:
  - Production: 3000
  - Staging: 3001

---

## 📝 Estructura del Archivo

### Formato General

```javascript
module.exports = {
  apps: [
    {
      // App 1: Production
      name: 'muva-chat',
      // ... config
    },
    {
      // App 2: Staging
      name: 'muva-chat-staging',
      // ... config
    }
  ]
};
```

### Ubicación del Archivo
```
/Users/oneill/Sites/apps/muva-chat/ecosystem.config.js
```

**Deployment:**
- Copiar a `/var/www/muva-chat/ecosystem.config.js` en VPS
- PM2 auto-detecta el archivo en el CWD

---

## 🚀 Uso del Archivo

### Comandos PM2

#### Iniciar con configuración
```bash
# Iniciar todas las apps definidas
pm2 start ecosystem.config.js

# Iniciar solo una app específica
pm2 start ecosystem.config.js --only muva-chat
pm2 start ecosystem.config.js --only muva-chat-staging
```

#### Reiniciar con configuración
```bash
# Reiniciar todas las apps
pm2 restart ecosystem.config.js

# Reiniciar solo una app
pm2 restart muva-chat
pm2 restart muva-chat-staging
```

#### Recargar configuración (zero-downtime)
```bash
pm2 reload ecosystem.config.js
```

#### Detener apps
```bash
pm2 stop ecosystem.config.js
pm2 delete ecosystem.config.js  # Stop + remove from PM2
```

### Workflow de Deploy

**Paso 1: Detener instancias actuales**
```bash
pm2 stop all
pm2 delete all
```

**Paso 2: Copiar ecosystem.config.js al VPS**
```bash
# Desde local
scp ecosystem.config.js root@159.89.149.52:/var/www/muva-chat/

# En VPS
cd /var/www/muva-chat
```

**Paso 3: Iniciar con nueva configuración**
```bash
pm2 start ecosystem.config.js

# Verificar estado
pm2 status
pm2 monit  # Monitor en tiempo real
```

**Paso 4: Guardar configuración PM2**
```bash
pm2 save
```

---

## 📊 Impacto Esperado

### Antes de la Optimización

**Problemas:**
- ❌ Procesos crecen sin límite → OOM crashes
- ❌ Restart loops infinitos en caso de error
- ❌ Logs sin timestamps → difícil debugging
- ❌ Configuración CLI → inconsistente entre deploys

### Después de la Optimización

**Beneficios:**
- ✅ Restart graceful antes de OOM (500M limit)
- ✅ Restart loops detenidos después de 10 intentos
- ✅ Logs con timestamps para debugging
- ✅ Configuración declarativa → deploys consistentes

### Métricas de Éxito

| Métrica | Antes | Después |
|---------|-------|---------|
| OOM crashes | Riesgo alto (95% heap) | Prevención (restart a 500M) |
| Restart loops | Sin protección | Máximo 10 restarts |
| Log debugging | Sin timestamps | Timestamps + timezone |
| Deploy consistency | CLI manual | Config file declarativo |

---

## 🧪 Testing Requerido

### Test 1: Sintaxis del Archivo
```bash
# Verificar sintaxis JavaScript
node -c ecosystem.config.js
```
✅ **Esperado:** Sin errores de sintaxis

### Test 2: Validación PM2 (local)
```bash
# Validar configuración
pm2 start ecosystem.config.js --dry-run
```
✅ **Esperado:** PM2 acepta la configuración

### Test 3: Memory Restart Simulation
```bash
# Simular alto uso de memoria
# (requiere código de test que aloque memoria)
```
✅ **Esperado:** Restart graceful al llegar a 500M

### Test 4: Restart Loop Prevention
```bash
# Simular crash repetido
# (requiere introducir error que causa crash)
```
✅ **Esperado:** PM2 detiene proceso después de 10 restarts

---

## 📚 Referencias

### PM2 Documentation
- [Ecosystem File](https://pm2.keymetrics.io/docs/usage/application-declaration/)
- [Memory Restart](https://pm2.keymetrics.io/docs/usage/memory-limit/)
- [Restart Strategies](https://pm2.keymetrics.io/docs/usage/restart-strategies/)

### Project Documentation
- **Diagnostic Report:** `project-stabilization/docs/fase-1/PM2_DIAGNOSTIC_REPORT.md`
- **Baseline Metrics:** `project-stabilization/docs/fase-1/PM2_BASELINE_POST_SYNC.md`

---

## 🔍 Alternativas Consideradas

### Opción 1: Múltiples Instancias (Cluster Mode)
```javascript
instances: 2,  // o "max" para usar todos los cores
exec_mode: 'cluster'
```

**Razón para NO usar:**
- Server actual: 1 core CPU
- Overhead de cluster mode sin beneficio
- Next.js ya maneja concurrencia internamente

**Conclusión:** Mantener `instances: 1`

### Opción 2: Mayor Memory Limit
```javascript
max_memory_restart: '1G'  // En vez de 500M
```

**Razón para NO usar:**
- Server tiene 2GB RAM total
- Otras apps/servicios también usan RAM
- 500M es suficiente para carga actual

**Conclusión:** Mantener `max_memory_restart: '500M'`

### Opción 3: Restart Delay más Largo
```javascript
restart_delay: 10000  // 10s en vez de 4s
```

**Razón para NO usar:**
- 4s es suficiente para evitar loops
- Delay más largo = downtime más largo
- Balance entre estabilidad y availability

**Conclusión:** Mantener `restart_delay: 4000`

---

## ✅ Criterios de Éxito

- [x] `ecosystem.config.js` creado
- [x] Configuración production optimizada (500M memory limit)
- [x] Configuración staging optimizada (400M memory limit)
- [x] Restart throttling implementado (max 10 restarts)
- [x] Logging estructurado con timestamps
- [x] Documentación completa
- [ ] Sintaxis validada con `node -c`
- [ ] Testing en VPS (pendiente deploy)

---

## 🚀 Próximos Pasos

### Deploy a VPS (requiere autorización)

1. **Backup de configuración actual:**
   ```bash
   pm2 save --force  # Guardar estado actual
   ```

2. **Copy ecosystem.config.js a VPS:**
   ```bash
   scp ecosystem.config.js root@159.89.149.52:/var/www/muva-chat/
   ```

3. **Aplicar nueva configuración:**
   ```bash
   ssh root@159.89.149.52
   cd /var/www/muva-chat
   pm2 stop all
   pm2 delete all
   pm2 start ecosystem.config.js
   pm2 save
   ```

4. **Monitorear métricas:**
   ```bash
   pm2 monit
   # Observar heap usage durante 1 hora
   ```

5. **Validar restart prevention:**
   ```bash
   # Simular crash (introducir error temporal)
   # Verificar que PM2 detiene después de 10 restarts
   ```

---

**Estado:** ✅ CONFIGURACIÓN CREADA
**Archivo:** `ecosystem.config.js`
**Testing:** Pendiente de deploy a VPS
**Deploy:** Requiere autorización explícita del usuario
