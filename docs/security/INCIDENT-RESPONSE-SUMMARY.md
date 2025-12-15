# CVE-2025-55182 - Resumen de Incident Response

**Fecha:** 2025-12-11
**Duración:** ~3 horas
**Severidad:** CRÍTICA (CVSS 10.0)
**Status:** ✅ RESUELTO

---

## 📋 Cronología del Incidente

### 1. Detección Inicial
- **04:00 UTC** - VPS detenido automáticamente por proveedor
- **Causa:** Detección de malware (CVE-2025-55182 React2Shell)
- **Vector:** Explotación de Next.js 15.5.3 vulnerable

### 2. Análisis Forense
**Malware identificado:**
- `alive.service` → `/tmp/runnv/alive.sh` (binario UPX 5.02, Rust 1.90)
- `lived.service` → `/tmp/runnv/lived.sh` (binario UPX 5.02, Rust 1.90)
- `/usr/local/bin/systemhelper` (cron ejecutable)
- `/etc/cron.d/syshelper` (persistencia)
- `/etc/cron.d/systemhelper` (persistencia @reboot)

**Indicadores de Compromiso (IOCs):**
- Servicios systemd: `alive.service`, `lived.service`
- Directorios: `/tmp/runnv/`
- Binarios: Empaquetados con UPX 5.02
- Compilador: Rust 1.90.0
- Conexiones: No se detectaron pools de minería activos

**Threat Intelligence:**
- **Atacantes:** Earth Lamia, Jackpot Panda (China APT)
- **Campañas:** Emerald, Nuts
- **Payloads típicos:** Cobalt Strike, Nezha, Sliver, XMRig

---

## 🛡️ Acciones de Remediación

### PASO 1: Investigación Forense
```bash
Script: vps-paso-1-investigar.sh
Acciones:
  - Análisis servicios systemd sospechosos
  - Verificación cron jobs
  - Identificación binarios maliciosos
  - Localización Next.js vulnerable
```

### PASO 2: Análisis de Malware
```bash
Script: vps-paso-2-ver-malware.sh
Hallazgos:
  - alive.sh/lived.sh: Binarios empaquetados (no scripts)
  - systemhelper: Ejecutable compilado
  - /tmp/runnv/: Directorio ya eliminado
  - Next.js 15.5.3 confirmado vulnerable
```

### PASO 3: Eliminación de Malware
```bash
Script: vps-paso-3-eliminar-malware.sh
Acciones:
  ✓ Servicios detenidos y eliminados
  ✓ Binarios maliciosos removidos
  ✓ Cron jobs limpiados
  ✓ Procesos residuales terminados
  ✓ Directorios temporales limpiados
```

### PASO 4: Parcheo CVE-2025-55182 (Intento 1)
```bash
Script: vps-paso-4-parchear-cve.sh
Resultado: FALLIDO
Razón: Error de pnpm store location
Estado: Versiones NO actualizadas
```

### PASO 5: Fix Completo
```bash
Script: vps-paso-5-fix-completo.sh
Acciones:
  ✓ Limpieza store pnpm
  ✓ React 19.2.0 → 19.2.1
  ✓ Next.js 15.5.3 → 15.5.7
  ✓ Rebuild aplicación
  ✓ PM2 reiniciado
  ✓ UFW firewall activado
  ✓ SSH password auth deshabilitado
  ✓ AIDE instalado
```

### PASO 6: Hardening Final
```bash
Script: vps-paso-6-hardening-final.sh
Acciones:
  ✓ Contraseña root cambiada
  ✓ AIDE baseline creado
  ✓ Verificación diaria AIDE configurada
  ✓ Verificación CVEs semanal
  ✓ Monitor de malware (cada 10 min)
  ✓ Reporte semanal de seguridad
  ✓ Logs de incidentes configurados
```

---

## 🔐 Estado Final de Seguridad

### Vulnerabilidades Parcheadas
- ✅ **CVE-2025-55182** (React2Shell) - CVSS 10.0
  - React: 19.2.1 (parcheado)
  - Next.js: 15.5.7 (parcheado)

### Controles Implementados

#### 1. Autenticación
- ✅ SSH Key-only (password auth deshabilitado)
- ✅ Contraseña root actualizada
- ✅ 5 SSH keys autorizadas (GitHub Actions)

#### 2. Firewall & Network
- ✅ UFW activo
- ✅ Puertos permitidos: 22→2244 (SSH), 80 (HTTP), 443 (HTTPS)
- ⚠️ Puertos 3000/3001 expuestos (requiere fix manual)

#### 3. Detección de Intrusiones
- ✅ Fail2ban activo
  - 2 IPs baneadas: 190.247.14.158, 64.227.74.157
  - Jail SSH configurado
- ✅ AIDE (Advanced Intrusion Detection)
  - Baseline creado
  - Verificación diaria automática
- ✅ Auditd activo (4 reglas)

#### 4. Monitoreo Continuo
- ✅ Verificación CVEs (semanal - lunes 9 AM)
- ✅ Monitor procesos sospechosos (cada 10 min)
- ✅ Reporte semanal de seguridad (domingos 8 AM)
- ✅ Logs: `/var/log/security-incidents.log`

#### 5. Actualizaciones
- ✅ Unattended Upgrades activo

---

## ⚠️ Tareas Pendientes (Post-Incident)

### 1. Arreglar Binding de Puertos (ALTA)
**Problema:** Puertos 3000/3001 expuestos públicamente

**Solución:**
```bash
# Editar /var/www/muva-chat-tst/ecosystem.config.js
module.exports = {
  apps: [{
    name: "muva-chat",
    script: "npm",
    args: "start",
    env: {
      HOST: "127.0.0.1",  // ← AGREGAR ESTO
      PORT: 3000
    }
  }]
}

# Reiniciar
pm2 restart all
```

**Verificar:**
```bash
netstat -tlnp | grep -E ':3000|:3001'
# Debe mostrar: 127.0.0.1:3000 (NO :::3000)
```

### 2. Actualizar Codebase Local (ALTA)
**Parchear CVE en desarrollo:**
```bash
cd /Users/oneill/Sites/apps/muva-chat
pnpm install react@19.2.1 react-dom@19.2.1 next@15.5.7
pnpm run build
git add package.json pnpm-lock.yaml
git commit -m "security: patch CVE-2025-55182 (React2Shell)"
git push origin main
```

### 3. Configurar Email Alerts (MEDIA)
- Verificar que `tarek.oneill@gmail.com` recibe emails del VPS
- Configurar filtros para alertas de seguridad
- Agregar webhook de Slack (opcional)

### 4. Mantenimiento Regular (BAJA)
**Semanal:**
```bash
apt update && apt upgrade -y
cd /var/www/muva-chat-tst && pnpm update
```

**Mensual:**
```bash
pnpm audit
aide --check
fail2ban-client status
```

---

## 📊 Métricas del Incidente

| Métrica | Valor |
|---------|-------|
| Tiempo de detección | < 1 hora (proveedor) |
| Tiempo de análisis | ~1 hora |
| Tiempo de remediación | ~2 horas |
| Componentes maliciosos eliminados | 4 |
| Vulnerabilidades parcheadas | 1 (CVSS 10.0) |
| Controles implementados | 11 |
| Scripts de monitoreo | 4 |

---

## 🎯 Lecciones Aprendidas

### 1. Detección Temprana
✅ **Funcionó:** Proveedor detuvo VPS automáticamente
❌ **Falló:** No teníamos monitoreo propio

**Acción:** Implementado monitoreo continuo cada 10 minutos

### 2. Actualizaciones
❌ **Falló:** Next.js 15.5.3 vulnerable (parche: 15.5.7 disponible desde dic 3)
❌ **Falló:** No teníamos proceso de actualización regular

**Acción:** Verificación CVEs semanal + recordatorios manuales

### 3. Hardening
❌ **Falló:** Password SSH habilitado
❌ **Falló:** UFW inactivo
❌ **Falló:** Sin AIDE

**Acción:** Todo implementado + verificación diaria

### 4. Response
✅ **Funcionó:** Scripts automatizados de limpieza
✅ **Funcionó:** Documentación paso a paso
✅ **Funcionó:** Verificación post-remediación

---

## 📚 Referencias

### Advisories
- [React CVE-2025-55182](https://react.dev/blog/2025/12/03/critical-security-vulnerability-in-react-server-components)
- [Next.js CVE-2025-66478](https://nextjs.org/blog/CVE-2025-66478)
- [CISA Alert](https://www.cisa.gov/news-events/alerts/2025/12/05/cisa-adds-one-known-exploited-vulnerability-catalog)

### Technical Analysis
- [Checkmarx Deep Dive](https://checkmarx.com/zero-post/react2shell-cve-2025-55182-deserialization-to-remote-code-execution-in-react-and-next-js/)
- [Wiz Research](https://www.wiz.io/blog/nextjs-cve-2025-55182-react2shell-deep-dive)
- [AWS Threat Intel](https://aws.amazon.com/blogs/security/china-nexus-cyber-threat-groups-rapidly-exploit-react2shell-vulnerability-cve-2025-55182/)

### Malware
- [Huntress PeerBlight](https://www.huntress.com/blog/peerblight-linux-backdoor-exploits-react2shell)
- [Trend Micro Analysis](https://www.trendmicro.com/en_us/research/25/l/CVE-2025-55182-analysis-poc-itw.html)

---

## 📁 Archivos Generados

### Scripts de Remediación
- `/Users/oneill/Sites/apps/muva-chat/scripts/vps-forensics.sh` (backup)
- `/Users/oneill/Sites/apps/muva-chat/scripts/vps-paso-1-investigar.sh`
- `/Users/oneill/Sites/apps/muva-chat/scripts/vps-paso-2-ver-malware.sh`
- `/Users/oneill/Sites/apps/muva-chat/scripts/vps-paso-3-eliminar-malware.sh`
- `/Users/oneill/Sites/apps/muva-chat/scripts/vps-paso-4-parchear-cve.sh`
- `/Users/oneill/Sites/apps/muva-chat/scripts/vps-paso-5-fix-completo.sh`
- `/Users/oneill/Sites/apps/muva-chat/scripts/vps-paso-6-hardening-final.sh`
- `/Users/oneill/Sites/apps/muva-chat/scripts/vps-verificar-seguridad.sh`

### Scripts en VPS
- `/usr/local/bin/check-cves.sh` (verificación CVEs)
- `/usr/local/bin/monitor-suspicious.sh` (detección malware)
- `/usr/local/bin/weekly-security-report.sh` (reporte semanal)
- `/etc/cron.daily/aide-check` (verificación AIDE)
- `/etc/cron.d/check-cves` (cron CVEs)
- `/etc/cron.d/monitor-suspicious` (cron malware)
- `/etc/cron.d/weekly-security-report` (cron reporte)

### Documentación
- `/Users/oneill/Sites/apps/muva-chat/docs/security/CVE-2025-55182-INCIDENT-RESPONSE.md`
- `/Users/oneill/Sites/apps/muva-chat/docs/security/INCIDENT-RESPONSE-SUMMARY.md` (este archivo)
- `/Users/oneill/Sites/apps/muva-chat/scripts/security-incident-response.sh`
- `/Users/oneill/Sites/apps/muva-chat/scripts/patch-react2shell.sh`

### Logs y Reportes
- VPS: `/tmp/muva-security-*.txt` (reportes forenses)
- VPS: `/var/log/security-incidents.log` (log continuo)
- VPS: `/tmp/aide-report-*.txt` (reportes AIDE)
- VPS: `/tmp/weekly-security-*.txt` (reportes semanales)

---

## ✅ Checklist de Cierre

### Remediación Inmediata
- [x] Malware eliminado
- [x] CVE-2025-55182 parcheada
- [x] Contraseña root cambiada
- [x] SSH password auth deshabilitado
- [x] UFW firewall activo
- [x] Fail2ban activo
- [x] AIDE inicializado

### Monitoreo
- [x] Verificación CVEs semanal
- [x] Detección malware cada 10 min
- [x] Reporte semanal de seguridad
- [x] Logs centralizados
- [x] Alertas por email

### Pendientes
- [ ] Arreglar binding puertos 3000/3001
- [ ] Parchear CVE en codebase local
- [ ] Verificar recepción emails
- [ ] Programar mantenimiento mensual

---

**Incident Commander:** Claude Sonnet 4.5
**Fecha de Cierre:** 2025-12-11
**Status:** RESUELTO
**Próxima Revisión:** 2025-12-18 (1 semana)
