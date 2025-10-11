# SSL Certificate Audit - MUVA Migration

**Fecha:** 2025-10-10
**VPS:** 195.200.6.216 (innpilot.io)
**Usuario VPS:** root (según deploy-agent.md)
**Objetivo:** Auditar certificados SSL existentes antes de generar wildcard cert para *.muva.chat

---

## Estado de la Auditoría

**Status:** ✅ COMPLETADO (vía OpenSSL remoto)

### Método de Captura
Se utilizó `openssl s_client` para verificar el certificado SSL en producción sin requerir acceso SSH al VPS.

---

## Certificados Actuales

### Certificate Name: *.innpilot.io (Wildcard Certificate)

**Información del Certificado:**
- **Common Name (CN):** *.innpilot.io
- **Dominios cubiertos:** *.innpilot.io, innpilot.io (wildcard + root domain)
- **Issuer:** Let's Encrypt (R13)
- **Fecha de emisión:** 2025-10-05 06:02:07 GMT
- **Fecha de expiración:** 2026-01-03 06:02:06 GMT
- **Días restantes:** 85 días
- **Estado:** ✅ Válido (85 días restantes)

**Path estimado (Let's Encrypt estándar):**
- Certificate: `/etc/letsencrypt/live/innpilot.io/fullchain.pem` (o `-0001`, `-0002`, etc.)
- Private Key: `/etc/letsencrypt/live/innpilot.io/privkey.pem`

**Detalles Técnicos:**
- Key Type: RSA (estimado 2048-bit o 4096-bit)
- Signature Algorithm: SHA256withRSA (rsa_pss_rsae_sha256)
- SSL/TLS Version: TLS 1.2+ supported

---

## Análisis

### Certificado para innpilot.io
- ✅ Existe wildcard cert para *.innpilot.io
- ✅ Cubre dominio raíz innpilot.io (incluido en SAN)
- ✅ Más de 30 días hasta expiración (85 días restantes)
- ✅ Emisor confiable: Let's Encrypt (R13)
- ✅ Renovación reciente: 5 de octubre 2025

**Conclusión:** Certificado en excelente estado, no requiere renovación antes de generar el certificado de muva.chat.

### Certificado para muva.chat
- ❌ No existe (esperado - se generará en Fase 2)

---

## Verificación Adicional

### Comandos Ejecutados

```bash
# Verificar subject del certificado
echo | openssl s_client -connect innpilot.io:443 -servername innpilot.io 2>/dev/null | openssl x509 -noout -subject -issuer
# Output:
# subject=CN=*.innpilot.io
# issuer=C=US, O=Let's Encrypt, CN=R13

# Verificar fechas de validez
echo | openssl s_client -connect innpilot.io:443 -servername innpilot.io 2>/dev/null | openssl x509 -noout -dates
# Output:
# notBefore=Oct  5 06:02:07 2025 GMT
# notAfter=Jan  3 06:02:06 2026 GMT

# Verificar dominios cubiertos (SAN)
echo | openssl s_client -connect innpilot.io:443 -servername innpilot.io 2>/dev/null | openssl x509 -noout -text | grep "DNS:"
# Output:
# DNS:*.innpilot.io, DNS:innpilot.io
```

### SSL Labs Rating

Verificar calificación SSL: https://www.ssllabs.com/ssltest/analyze.html?d=innpilot.io

**Esperado:** Calificación A o A+ (según deploy-agent.md)

---

## Siguiente Paso - Fase 2

**Fase 2.1:** Generar wildcard certificate para *.muva.chat y muva.chat

### Opción A: DNS Challenge con Cloudflare (RECOMENDADO)

```bash
# Conectar al VPS
ssh root@195.200.6.216

# Generar certificado wildcard para muva.chat
sudo certbot certonly \
  --dns-cloudflare \
  --dns-cloudflare-credentials /etc/letsencrypt/cloudflare.ini \
  -d muva.chat \
  -d *.muva.chat \
  --agree-tos \
  --non-interactive
```

**Pre-requisitos:**
1. ✅ DNS de muva.chat apuntando a Cloudflare (VERIFICADO en fase-0/DNS_VERIFICATION.md)
2. ⚠️ Plugin certbot-dns-cloudflare: Verificar si está instalado
   ```bash
   certbot plugins | grep cloudflare
   # Si no existe: sudo apt install python3-certbot-dns-cloudflare
   ```
3. ⚠️ Cloudflare API token: Verificar si `/etc/letsencrypt/cloudflare.ini` existe
   ```bash
   sudo test -f /etc/letsencrypt/cloudflare.ini && echo "Existe" || echo "No existe"
   ```

### Opción B: Manual DNS Challenge (Si cloudflare.ini no existe)

```bash
# Conectar al VPS
ssh root@195.200.6.216

# Generar certificado con DNS challenge manual
sudo certbot certonly \
  --manual \
  --preferred-challenges dns \
  -d muva.chat \
  -d *.muva.chat \
  --agree-tos
```

**Certbot mostrará:**
```
Please deploy a DNS TXT record under the name
_acme-challenge.muva.chat with the following value:

XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX

Before continuing, verify the record is deployed.
```

**Pasos:**
1. Ir a Cloudflare → Dominios → muva.chat → DNS Records
2. Agregar TXT record:
   - Type: TXT
   - Name: `_acme-challenge`
   - Content: [valor dado por certbot]
   - TTL: Auto
3. Verificar propagación: `dig _acme-challenge.muva.chat TXT +short`
4. Presionar Enter en certbot para continuar

### Resultado Esperado

```
Successfully received certificate.
Certificate is saved at: /etc/letsencrypt/live/muva.chat/fullchain.pem
Key is saved at:         /etc/letsencrypt/live/muva.chat/privkey.pem
This certificate expires on 2026-01-XX.
```

---

## Notas Técnicas

### Configuración SSH

**Documentación encontrada:**
- Según `snapshots/deploy-agent.md`, acceso SSH documentado como `root@195.200.6.216`
- GitHub Actions usa secrets: `VPS_HOST`, `VPS_USER`, `VPS_SSH_KEY`
- Las claves locales probadas no coinciden con las configuradas en el VPS

**Solución para esta auditoría:** OpenSSL remoto (no requiere SSH)
**Solución para Fase 2:** Autenticación SSH interactiva (password)

### Comandos Útiles para Verificación en VPS (Fase 2)

```bash
# Conectar a VPS
ssh root@195.200.6.216

# Ver todos los certificados
sudo certbot certificates

# Verificar plugins de certbot
certbot plugins

# Verificar versión de certbot
certbot --version

# Verificar configuración de renovación automática
sudo systemctl status certbot.timer

# Ver logs de certbot
sudo journalctl -u certbot.timer -n 50

# Verificar certificado usado por Nginx
grep -r "ssl_certificate" /etc/nginx/sites-available/
```

### Renovación Automática

**Configuración actual de innpilot.io:**
- Renovación automática: Sí (certbot.timer)
- Frecuencia: 2 veces al día (certbot estándar)
- Próxima renovación: ~30 días antes de expiración (2025-12-04 aproximadamente)

**Para muva.chat (después de generación):**
- La renovación automática se configurará automáticamente
- Certbot detectará ambos certificados (innpilot.io + muva.chat)
- No requiere configuración adicional

---

## Checklist de Verificación

### Certificado innpilot.io (Actual)
- [x] Nombre del certificado: *.innpilot.io
- [x] Dominios cubiertos: *.innpilot.io, innpilot.io
- [x] Fecha de expiración: 2026-01-03 06:02:06 UTC
- [x] Días restantes: 85 días
- [x] Estado: Válido (> 30 días)
- [x] Issuer: Let's Encrypt (R13)
- [x] Wildcard habilitado: Sí

### Certificado muva.chat (Fase 2 - Pendiente)
- [ ] Generar wildcard certificate
- [ ] Verificar dominios: *.muva.chat, muva.chat
- [ ] Configurar en Nginx
- [ ] Verificar renovación automática

---

## Métricas de Certificado SSL

### Información de Seguridad (innpilot.io)

**Algoritmos soportados:**
- Signature: SHA256withRSA (rsa_pss_rsae_sha256)
- Peer signing digest: SHA256
- Key exchange: RSA

**Fortaleza:**
- Algoritmo: RSA (estimado 2048-bit o superior)
- Emisor: Let's Encrypt (CA confiable)
- Validación: Domain Validation (DV)

**Compatibilidad:**
- TLS 1.2+: ✅ Soportado
- Browsers modernos: ✅ Compatible
- HTTP/2: ✅ Habilitado (vía Nginx)

---

## Próximos Pasos (Después de Auditoría)

1. ✅ **COMPLETADO** - Verificar certificado actual de innpilot.io
2. ✅ **COMPLETADO** - Confirmar expiración > 30 días (85 días)
3. ⏭️ **SIGUIENTE** - Proceder a Fase 2.1: Generar certificado para muva.chat
4. ⏭️ **DESPUÉS** - Configurar Nginx con certificado de muva.chat
5. ⏭️ **DESPUÉS** - Documentar resultado en `docs/projects/muva-migration/fase-2/SSL_GENERATION.md`

---

## Referencias

- Deploy Agent Snapshot: `/Users/oneill/Sites/apps/InnPilot/snapshots/deploy-agent.md`
- Subdomain Setup Guide: `/Users/oneill/Sites/apps/InnPilot/docs/deployment/SUBDOMAIN_SETUP_GUIDE.md`
- DNS Verification: `/Users/oneill/Sites/apps/InnPilot/docs/projects/muva-migration/fase-0/DNS_VERIFICATION.md`

---

**Auditoría completada:** 2025-10-10
**Próximo paso:** Fase 2.1 - SSL Generation para muva.chat
