# Reporte de Referencias al Proyecto Obsoleto

**Fecha:** 2025-11-28
**Proyecto Obsoleto ID:** `ooaumjzaztmutltifhoq`
**Migración Completada:** 2025-11-16

## Resumen Ejecutivo

Durante la auditoría del codebase se encontraron **111 archivos** con referencias al proyecto MUVA original (`ooaumjzaztmutltifhoq`) que fue reemplazado por la arquitectura three-tier en Noviembre 2025.

### Proyectos Actuales (Three-Tier)
- **DEV:** `zpyxgkvonrxbhvmkuzlt` (rama dev) - ✅ ACTIVO
- **TST:** `bddcvjoeoiekzfetvxoe` (rama tst/staging) - ✅ ACTIVO
- **PRD:** `kprqghwdnaykxhostivv` (rama prd/production) - ✅ ACTIVO

## Distribución de Referencias

### 1. Archive (Esperado - No Requiere Acción)
**Total: 70 archivos** en `/archive/`

Estos archivos están correctamente archivados y contienen referencias históricas que NO necesitan actualización:

- `archive/projects/` - 20 archivos de proyectos de migración
- `archive/legacy/` - 1 snapshot histórico
- `archive/scripts-uncategorized/` - 13 scripts de sincronización obsoletos
- `migrations/backup-2025-10-31/` - 11 migraciones históricas
- `migrations/fresh-2025-11-01/` - 7 migraciones actualizadas
- `_assets/fixes/` - 1 reporte de fixes

**Acción**: ✅ Ninguna. Archivos históricos preservados correctamente.

---

### 2. Documentación (Revisión Recomendada)
**Total: 3 archivos**

#### `CLAUDE.md` ✅ ACTUALIZADO
- **Estado**: Ya actualizado con advertencia sobre proyecto obsoleto
- **Línea relevante**: "Limpieza de Referencias Obsoletas" sección
- **Acción**: ✅ Completo

#### `docs/super-admin/MIGRATIONS_COMPLETE.md`
- **Ubicación**: Línea ~50-100 (aproximado)
- **Contexto**: Documentación de migración de super admin
- **Riesgo**: BAJO - Documento histórico
- **Acción Recomendada**: ⚠️ Agregar nota al inicio indicando proyecto obsoleto

---

### 3. Scripts Activos (REQUIERE ACTUALIZACIÓN)
**Total: 1 archivo crítico**

#### `scripts/database/execute-ddl-via-api.ts` ✅ ACTUALIZADO
- **Estado**: Ya actualizado a `zpyxgkvonrxbhvmkuzlt`
- **Commit**: Commit #4 de la sesión actual
- **Acción**: ✅ Completo

---

### 4. Scripts en Database (Revisión Pendiente)
**Total: ~35 archivos** en `/scripts/database/`

Archivos de sincronización que probablemente ya no se usan:

#### Scripts de Sincronización Obsoletos:
```
sync-with-mcp.ts
sync-staff-to-staging.ts
sync-prod-to-staging-*.ts (múltiples versiones)
sync-missing-tables.ts
sync-migrations.ts
sync-dev-to-staging-quick.ts
sync-database-master*.ts
sync-chat-tables.ts
sync-all-data-to-staging.ts
```

#### Scripts de Copia (Copy) Obsoletos:
```
copy-tables-via-mcp.ts
copy-sire-content.ts
copy-remaining-tables.ts
copy-prod-to-staging*.ts (múltiples versiones)
copy-missing-tables.ts
copy-manual-chunks-to-staging.ts
copy-hotels-*.ts (múltiples scripts)
copy-dev-to-staging*.ts
copy-auth-users.ts
copy-all-*.ts
```

#### Scripts de Fix/Apply Obsoletos:
```
apply-migrations-production.ts
apply-hotels-schema-fix.ts
apply-function-search-path-fix.ts
apply-current-setting-fix.ts
apply-auth-rls-fix-chunks.ts
rollback-production.ts
fix-missing-tables-staging.ts
execute-phase2-vacuums.ts
```

**Total Scripts Database**: ~35 archivos
**Riesgo**: MEDIO - Pueden causar confusión
**Acción Recomendada**: 🔄 Mover a `/archive/scripts-migration-nov16-2025/`

---

### 5. Migraciones Históricas (Conservar)
**Total: 18 archivos** en `migrations/backup-*/` y `migrations/fresh-*/`

Estas migraciones contienen el ID obsoleto pero son archivos históricos importantes:

- `migrations/backup-2025-10-31/` - 11 archivos SQL + READMEs
- `migrations/fresh-2025-11-01/` - 7 archivos SQL
- `migrations/fixes/` - 1 archivo
- `migrations/archive/` - 1 archivo

**Acción**: ✅ Conservar como históricos. NO modificar.

---

## Plan de Acción Recomendado

### Prioridad ALTA ✅ COMPLETO
- [x] Actualizar `scripts/database/execute-ddl-via-api.ts` → ✅ Ya actualizado
- [x] Verificar `CLAUDE.md` → ✅ Ya contiene advertencia

### Prioridad MEDIA 🔄 PENDIENTE
- [ ] Archivar scripts de database obsoletos (~35 archivos)
  ```bash
  mkdir -p archive/scripts-migration-nov16-2025
  mv scripts/database/sync-*.ts archive/scripts-migration-nov16-2025/
  mv scripts/database/copy-*.ts archive/scripts-migration-nov16-2025/
  mv scripts/database/apply-*.ts archive/scripts-migration-nov16-2025/
  mv scripts/database/rollback-*.ts archive/scripts-migration-nov16-2025/
  mv scripts/database/fix-*.ts archive/scripts-migration-nov16-2025/
  ```

- [ ] Agregar nota en `docs/super-admin/MIGRATIONS_COMPLETE.md`
  ```markdown
  > **NOTA HISTÓRICA**: Este documento hace referencia al proyecto
  > `ooaumjzaztmutltifhoq` que fue reemplazado por la arquitectura
  > three-tier el 16 de Noviembre 2025. Ver CLAUDE.md para detalles.
  ```

### Prioridad BAJA ✅ NO REQUIERE ACCIÓN
- [x] Archive (70 archivos) → Correctamente archivados
- [x] Migraciones históricas (18 archivos) → Conservar como referencia

---

## Verificación Post-Limpieza

Después de implementar el plan de acción, ejecutar:

```bash
# Verificar que NO quedan referencias fuera de /archive
grep -r "ooaumjzaztmutltifhoq" \
  --exclude-dir=archive \
  --exclude-dir=node_modules \
  --exclude-dir=.next \
  --exclude-dir=.git \
  .
```

**Resultado Esperado**:
- Solo coincidencias en `CLAUDE.md` (advertencia)
- Solo coincidencias en `docs/` (notas históricas)
- Cero coincidencias en `/scripts` activos
- Cero coincidencias en `/src` código fuente

---

## Lecciones Aprendidas

1. **Prefijo de Ambiente**: En proyectos futuros, usar variables de entorno con prefijos claros:
   ```bash
   DEV_PROJECT_ID=...
   TST_PROJECT_ID=...
   PRD_PROJECT_ID=...
   ```

2. **Scripts Temporales**: Archivar scripts one-off inmediatamente después de uso exitoso

3. **Migraciones**: Mantener migraciones antiguas en `/migrations/archive` con fecha

4. **Documentación**: Agregar notas "HISTÓRICO" en documentos que referencien proyectos obsoletos

---

## Referencias

- CLAUDE.md - Sección "Limpieza de Referencias Obsoletas"
- docs/three-tier-unified/README.md - Arquitectura actual
- archive/scripts-nov2025/README.md - Scripts archivados recientemente

---

**Generado automáticamente**: 2025-11-28
**Última Actualización**: 2025-11-28
**Próxima Revisión**: 2025-12-28 (1 mes)
