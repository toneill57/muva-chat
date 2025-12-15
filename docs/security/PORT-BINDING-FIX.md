# Port Binding Security Fix

**Status:** ⚠️ PENDING (Script ready, needs execution)
**Priority:** HIGH
**Risk:** Puertos 3000/3001 expuestos públicamente

---

## Problema

Actualmente los puertos 3000 y 3001 están escuchando en `:::3000` y `:::3001` (todas las interfaces), lo que los hace accesibles desde internet. Deben estar en `127.0.0.1:3000` (localhost only).

```bash
# Estado actual (INSEGURO)
tcp6  0  0  :::3000  :::*  LISTEN  12345/node
tcp6  0  0  :::3001  :::*  LISTEN  12346/node

# Estado deseado (SEGURO)
tcp   0  0  127.0.0.1:3000  0.0.0.0:*  LISTEN  12345/node
tcp   0  0  127.0.0.1:3001  0.0.0.0:*  LISTEN  12346/node
```

**Por qué es importante:**
- Nginx debe ser el único punto de entrada (proxy reverso)
- Exponer Node.js directamente bypasea rate limiting, SSL, y logging
- Aumenta superficie de ataque

---

## Solución Preparada

Scripts separados por ambiente para máxima seguridad:

**Staging:** `scripts/vps-fix-port-binding-tst.sh`
**Production:** `scripts/vps-fix-port-binding-prd.sh`

Cada script hace:
1. ✅ Backup timestamped de ecosystem.config.js
2. ✅ Agrega `HOSTNAME: '127.0.0.1'` solo a su ambiente
3. ✅ Reinicia solo su proceso PM2
4. ✅ Verifica que el binding esté correcto

---

## Opción 1: Ejecución vía GitHub Actions (RECOMENDADO)

### Pasos:

1. **Push los commits locales:**
   ```bash
   git push origin main
   ```

2. **Ir a GitHub Actions:**
   - Ir a: https://github.com/[tu-usuario]/muva-chat/actions
   - Seleccionar workflow: "VPS Remote Command Executor (TEMPORAL)"
   - Click en "Run workflow"

3. **Configurar el workflow:**
   ```
   Environment: tst (staging primero para probar)
   Command: bash scripts/vps-fix-port-binding-tst.sh
   Working Directory: /var/www/muva-chat-tst
   ```

4. **Verificar resultados:**
   - El workflow mostrará el output del script
   - Verificar que diga: "✅ Puerto 3000 vinculado a localhost (SEGURO)"

5. **Repetir para producción:**
   ```
   Environment: prd
   Command: bash scripts/vps-fix-port-binding-prd.sh
   Working Directory: /var/www/muva-chat-prd
   ```

---

## Opción 2: Ejecución Manual vía SSH

Si tienes acceso SSH directo al VPS:

```bash
# Conectar al VPS (puerto 2244)
ssh -p 2244 root@195.200.6.216

# Staging
cd /var/www/muva-chat-tst
bash scripts/vps-fix-port-binding-tst.sh

# Production (después de verificar staging)
cd /var/www/muva-chat-prd
bash scripts/vps-fix-port-binding-prd.sh

# Verificar
netstat -tlnp | grep -E ':3000|:3001'
# Debe mostrar 127.0.0.1:3000 y 127.0.0.1:3001
```

---

## Verificación Post-Fix

Después de ejecutar el script, verificar:

1. **Port binding correcto:**
   ```bash
   netstat -tlnp | grep -E ':3000|:3001'
   # Esperado: 127.0.0.1:3000 y 127.0.0.1:3001
   ```

2. **Sitios funcionando:**
   ```bash
   curl -I https://muva.chat
   curl -I https://staging.muva.chat
   # Ambos deben responder 200 OK
   ```

3. **PM2 status:**
   ```bash
   pm2 status
   # Ambas apps deben estar 'online'
   ```

4. **Acceso directo bloqueado:**
   ```bash
   curl http://195.200.6.216:3000
   # Esperado: Connection refused (CORRECTO - bloqueado por firewall)
   ```

---

## Troubleshooting

### Apps no inician después del fix

```bash
# Ver logs de PM2
pm2 logs --lines 50

# Verificar que Next.js soporte HOSTNAME
# Next.js 15+ usa HOSTNAME en lugar de HOST
```

### Port binding aún en :::3000

Posibles causas:
1. Next.js no está respetando HOSTNAME (verificar versión)
2. Variable de entorno no se propagó (reiniciar PM2)
3. Otro proceso ocupando el puerto

Solución alternativa (editar next.config.js):
```javascript
// next.config.js
module.exports = {
  // ...
  server: {
    host: '127.0.0.1',
    port: process.env.PORT || 3000
  }
}
```

---

## Referencias

- Script Staging: `scripts/vps-fix-port-binding-tst.sh`
- Script Production: `scripts/vps-fix-port-binding-prd.sh`
- Incident Response: `docs/security/INCIDENT-RESPONSE-SUMMARY.md`
- VPS Workflow: `.github/workflows/vps-exec.yml`

**Próxima Revisión:** Después de ejecutar el fix

---

## Changelog

**2025-12-15:** Split script into environment-specific versions
- Safer execution (no accidental cross-environment changes)
- Independent PM2 restarts
- Clearer logging
