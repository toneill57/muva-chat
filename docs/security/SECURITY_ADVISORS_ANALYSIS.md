# Security Advisors Analysis - InnPilot Database

**Date:** October 9, 2025
**Database:** PostgreSQL 17.4.1.075 (Supabase)
**Total Advisors:** 5 (1 ERROR, 4 WARN)

---

## Executive Summary

5 security advisors detectados, **ninguno es crítico bloqueante** para operación actual. Recomendamos atacar **solo 2 de 5** en el corto plazo.

**Prioridades Recomendadas:**
- 🔴 **ALTA (Atacar Ahora):** #1 Security Definer View - Fix simple
- 🟡 **MEDIA (Considerar):** #5 PostgreSQL Upgrade - Patches de seguridad disponibles
- 🟢 **BAJA (Defer):** #2, #3, #4 - No críticos para este proyecto

---

## Advisors Detallados

### 1. 🔴 ERROR: Security Definer View

**Advisor:** `security_definer_view`
**Level:** ERROR
**Affected:** `public.guest_chat_performance_monitor`

**Descripción:**
View definido con `SECURITY DEFINER` ejecuta con permisos del creador (no del usuario que query).

**Riesgo:**
- **Severidad:** Media
- **Exposición:** View de monitoreo con datos limitados
- **Impacto:** Usuario podría ver datos que normalmente no tendría acceso

**Remediación:**
```sql
-- Opción 1: Eliminar SECURITY DEFINER (recomendado)
CREATE OR REPLACE VIEW public.guest_chat_performance_monitor
AS
  SELECT ...
  -- (sin SECURITY DEFINER)

-- Opción 2: Agregar RLS policies específicas al view
ALTER VIEW public.guest_chat_performance_monitor
  SET (security_barrier = true);
```

**Esfuerzo:** 15 minutos
**Prioridad:** 🔴 **ALTA - Atacar ahora**
**Razón:** Fix simple, mejora seguridad, ERROR nivel

**Recomendación:**
- ✅ **SÍ ATACAR** - Fix rápido y mejora seguridad
- Crear migration: `20251009000004_fix_security_definer_view.sql`
- Recrear view sin SECURITY DEFINER
- Verificar que monitoring sigue funcionando

---

### 2. ⚠️ WARN: Extension in Public Schema

**Advisor:** `extension_in_public`
**Level:** WARN
**Affected:** `vector` extension en schema `public`

**Descripción:**
Extension `vector` (pgvector) instalada en `public` schema. Best practice: schema dedicado (`extensions`).

**Riesgo:**
- **Severidad:** Baja
- **Exposición:** Supabase managed, minimal risk
- **Impacto:** Potencial naming collision con tablas user

**Remediación:**
```sql
-- Mover extension a schema dedicado
CREATE SCHEMA IF NOT EXISTS extensions;
ALTER EXTENSION vector SET SCHEMA extensions;
```

**Esfuerzo:** 30 minutos (requiere reindex de 19 HNSW indexes)
**Prioridad:** 🟢 **BAJA - Defer indefinidamente**
**Razón:**
- Supabase managed, bajo riesgo real
- Requiere recrear 19 índices HNSW (1-2h downtime)
- pgvector ya funciona perfectamente

**Recomendación:**
- ❌ **NO ATACAR** - Benefit/effort ratio muy bajo
- Dejar como está hasta upgrade mayor de Supabase
- Monitorear en quarterly reviews

---

### 3. ⚠️ WARN: Leaked Password Protection Disabled

**Advisor:** `auth_leaked_password_protection`
**Level:** WARN
**Affected:** Supabase Auth config

**Descripción:**
Leaked password protection (HaveIBeenPwned.org integration) deshabilitado.

**Riesgo:**
- **Severidad:** Baja (para este proyecto)
- **Exposición:** Usuarios podrían usar passwords comprometidos
- **Impacto:** Limitado - InnPilot usa magic links para guests (no passwords)

**Remediación:**
1. Dashboard Supabase → Authentication → Policies
2. Enable "Leaked Password Protection"
3. Configure minimum strength (opcional)

**Esfuerzo:** 5 minutos (solo config)
**Prioridad:** 🟢 **BAJA - Opcional**
**Razón:**
- Guest auth usa **magic links** (no passwords)
- Staff auth tiene passwords, pero son pocos usuarios (~3-5)
- HaveIBeenPwned agrega latency a signups

**Recomendación:**
- ⚠️ **CONSIDERAR** si staff crece >10 usuarios
- Por ahora: Defer (usuarios limitados, magic links primary)

---

### 4. ⚠️ WARN: Insufficient MFA Options

**Advisor:** `auth_insufficient_mfa_options`
**Level:** WARN
**Affected:** Supabase Auth config

**Descripción:**
Pocas opciones de MFA habilitadas (solo TOTP).

**Riesgo:**
- **Severidad:** Baja
- **Exposición:** Usuarios no tienen MFA diversity (SMS, WebAuthn)
- **Impacto:** Limitado - Solo staff tiene accounts password-based

**Remediación:**
1. Dashboard Supabase → Authentication → MFA
2. Enable additional methods:
   - SMS verification (requiere Twilio)
   - WebAuthn (hardware keys)

**Esfuerzo:** 1-2 horas (setup + testing)
**Prioridad:** 🟢 **BAJA - Defer**
**Razón:**
- Solo ~3-5 staff users
- TOTP (Authenticator apps) es suficiente para tamaño actual
- SMS MFA agrega costos (Twilio)

**Recomendación:**
- ❌ **NO ATACAR** por ahora
- Reconsiderar si staff >20 usuarios
- TOTP suficiente para operación actual

---

### 5. ⚠️ WARN: Vulnerable Postgres Version

**Advisor:** `vulnerable_postgres_version`
**Level:** WARN
**Affected:** PostgreSQL 17.4.1.075

**Descripción:**
Versión actual tiene security patches disponibles. Supabase recomienda upgrade.

**Riesgo:**
- **Severidad:** Media
- **Exposición:** CVEs conocidos en PostgreSQL 17.4.1
- **Impacto:** Depende de CVEs específicos (no listados)

**Remediación:**
1. Dashboard Supabase → Settings → Infrastructure
2. Schedule upgrade to latest 17.x.x
3. Verify compatibility (pgvector 0.8.0 compatible)
4. Schedule maintenance window (downtime ~5-10 min)

**Esfuerzo:** 30 minutos (scheduled upgrade)
**Prioridad:** 🟡 **MEDIA - Considerar en corto plazo**
**Razón:**
- Security patches disponibles
- Supabase maneja upgrade automáticamente
- Downtime mínimo (~5-10 min)
- pgvector 0.8.0 compatible con PostgreSQL 17.x

**Recomendación:**
- ✅ **SÍ CONSIDERAR** - Seguridad real
- Schedule upgrade en maintenance window
- Verificar release notes de patches
- Backup antes de upgrade (Supabase auto-backup existe)

**Documentación:** https://supabase.com/docs/guides/platform/upgrading

---

## Resumen de Recomendaciones

| # | Advisor | Prioridad | Atacar? | Esfuerzo | Razón |
|---|---------|-----------|---------|----------|-------|
| 1 | Security Definer View | 🔴 ALTA | ✅ **SÍ** | 15 min | Fix simple, mejora seguridad, ERROR nivel |
| 2 | Extension in Public | 🟢 BAJA | ❌ NO | 30 min | Supabase managed, bajo riesgo, requiere reindex |
| 3 | Leaked Password Protection | 🟢 BAJA | ⚠️ Opcional | 5 min | Magic links primary, pocos usuarios password |
| 4 | Insufficient MFA | 🟢 BAJA | ❌ NO | 1-2h | Solo ~5 staff, TOTP suficiente |
| 5 | PostgreSQL Upgrade | 🟡 MEDIA | ✅ **CONSIDERAR** | 30 min | Security patches reales, downtime mínimo |

---

## Plan de Acción Recomendado

### ✅ Atacar Ahora (PROMPT 11.8)

**Task:** Fix Security Definer View
**Agent:** @agent-database-agent
**Esfuerzo:** 15 minutos
**Archivos:**
- `supabase/migrations/20251009000004_fix_security_definer_view.sql` (NUEVO)

**Steps:**
1. Leer definición actual del view `guest_chat_performance_monitor`
2. Recrear view SIN `SECURITY DEFINER`
3. Aplicar migration
4. Verificar que monitoring sigue funcionando
5. Re-run advisors (debe desaparecer ERROR)

---

### ⚠️ Considerar en Maintenance Window (Próximas 2 semanas)

**Task:** PostgreSQL Upgrade
**Agent:** Usuario (Supabase Dashboard)
**Esfuerzo:** 30 minutos (scheduled)
**Downtime:** 5-10 minutos

**Steps:**
1. Dashboard Supabase → Settings → Infrastructure
2. Review latest PostgreSQL 17.x.x release notes
3. Schedule upgrade en horario de bajo tráfico (3-5 AM)
4. Verify backup exists (auto-backup Supabase)
5. Execute upgrade
6. Verify database health post-upgrade
7. Re-run advisors (debe desaparecer WARN)

---

### ❌ Defer Indefinidamente

- **#2:** Extension in Public - Dejar como está (Supabase managed)
- **#3:** Leaked Password Protection - Reconsiderar si staff >10 usuarios
- **#4:** Insufficient MFA - Reconsiderar si staff >20 usuarios

---

## Próximos Pasos

**Inmediato (Hoy):**
1. ✅ Crear migration para fix Security Definer View
2. ✅ Aplicar migration en database
3. ✅ Verificar advisors (ERROR debe desaparecer)

**Esta Semana:**
1. ⚠️ Revisar release notes PostgreSQL 17.x.x
2. ⚠️ Schedule upgrade en maintenance window
3. ⚠️ Documentar upgrade process

**Quarterly Review (Enero 2026):**
1. Re-evaluar advisors #2, #3, #4
2. Verificar si staff creció (reconsiderar MFA)
3. Verificar si hay nuevos advisors

---

**Created:** October 9, 2025
**Next Review:** January 2026
**Maintained By:** @agent-database-agent
