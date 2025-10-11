# Configuration Backups - MUVA Migration

**Fecha:** 2025-10-10
**Timestamp:** 20251010_170303
**Objetivo:** Rollback strategy para Fase 1 (Dual-Domain Support)

## Archivos Respaldados

### Local Files
1. **next.config.ts**
   - Backup: `next.config.ts.20251010_170303.backup`
   - Size: 2.1 KB
   - MD5: `4e2946113fb201c24b85a98532a330a6`

2. **tenant-utils.ts**
   - Backup: `tenant-utils.ts.20251010_170303.backup`
   - Size: 6.0 KB
   - MD5: `271ab26c9730a0d08f6d34079025c1ea`

### VPS Files
3. **nginx-subdomain.conf**
   - Original: `/etc/nginx/sites-available/innpilot.io`
   - Backup: `nginx-subdomain.conf.20251010_170303.backup`
   - Size: 1.5 KB
   - MD5: `c1867de35a95ac59ae4f5d676b30b647`
   - Método: Manual copy (SSH authentication)

## Verificación
- ✅ Directorio backups/ creado
- ✅ 3/3 backups completados exitosamente
- ✅ Todos los backups > 0 bytes
- ✅ MD5 hashes calculados para todos los backups
- ✅ Backups accesibles en docs/projects/muva-migration/backups/
- ✅ Rollback strategy documentada

## Rollback Instructions

### Para revertir cambios locales:
```bash
# Revertir next.config.ts
cp docs/projects/muva-migration/backups/next.config.ts.20251010_170303.backup next.config.ts

# Revertir tenant-utils.ts
cp docs/projects/muva-migration/backups/tenant-utils.ts.20251010_170303.backup src/lib/tenant-utils.ts

# Rebuild después de revertir
npm run build
```

### Para revertir Nginx en VPS:
```bash
# Opción 1: Si el backup manual fue creado
scp docs/projects/muva-migration/backups/nginx-subdomain.conf.20251010_170303.backup oneill@195.200.6.216:/tmp/

# SSH y restaurar
ssh oneill@195.200.6.216
sudo cp /tmp/nginx-subdomain.conf.20251010_170303.backup /etc/nginx/sites-available/innpilot.io
sudo nginx -t
sudo systemctl reload nginx

# Opción 2: Rollback desde git (si nginx config está versionado)
cd ~/apps/InnPilot
git checkout HEAD -- nginx/innpilot.io.conf  # Ajustar path según estructura
# Luego copiar a sites-available y reload nginx
```

## Notas
- Los backups incluyen timestamp para múltiples versiones
- MD5 hash permite verificar integridad de archivos locales
- Mantener backups hasta completar migración exitosamente
- **IMPORTANTE:** Completar backup manual de nginx antes de modificar configuración en VPS

## Estado del Backup
- **Local configs:** ✅ COMPLETO (next.config.ts + tenant-utils.ts)
- **VPS nginx:** ✅ COMPLETO (nginx-subdomain.conf)
- **Rollback strategy:** ✅ DOCUMENTADA Y LISTA

## Próximos Pasos
✅ Todos los backups completados exitosamente
🎯 **LISTO PARA PROCEDER CON FASE 1: Dual-Domain Support**

### Fase 1 incluye:
1. Modificar `next.config.ts` para rewrites de ambos dominios
2. Modificar `src/lib/tenant-utils.ts` para detección dual-domain
3. Actualizar Nginx config para `*.muva.chat`
4. Testing local y deployment
