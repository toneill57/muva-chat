# FASE 2: Migrar Conexión DB

**Agente:** @agent-backend-developer
**Tareas:** 6
**Tiempo estimado:** 3-4h
**Dependencias:** FASE 1 completada

---

## Prompt 2.1: Crear cliente pg con pool

**Agente:** `@agent-backend-developer`

**PREREQUISITO:** FASE 1 completada

**Contexto:**
Vamos a reemplazar el cliente supabase-js con una conexión directa a PostgreSQL usando pg o postgres.js, incluyendo connection pooling para mejor performance.

---

🔽 **COPIAR DESDE AQUÍ (Prompt 2.1)**

**📊 Contexto de Progreso:**

**Progreso General:** 9/38 tareas completadas (24%)

FASE 1 - Setup Database VPS ✅ COMPLETADA
FASE 2 - Migrar Conexión DB (Progreso: 0/6)
- [ ] 2.1: Crear cliente pg con pool ← ESTAMOS AQUÍ
- [ ] 2.2: Crear wrapper de queries
- [ ] 2.3: Actualizar variables de entorno
- [ ] 2.4: Migrar API routes
- [ ] 2.5: Migrar lib functions
- [ ] 2.6: Verificar build completo

**Estado Actual:**
- 3 DBs VPS con schema completo ✓
- Funciones RPC aplicadas ✓
- RLS policies activas ✓
- Listo para crear cliente de conexión

---

**Tareas:**

1. **Instalar dependencias** (5min):
   ```bash
   pnpm add pg @types/pg
   # O alternativamente postgres.js (más moderno, mejor para edge):
   # pnpm add postgres
   ```

2. **Crear pool de conexiones** (20min):
   Crear `src/lib/db/pool.ts`:

   ```typescript
   import { Pool, PoolConfig } from 'pg';

   const getPoolConfig = (): PoolConfig => {
     const env = process.env.NODE_ENV || 'development';

     const configs: Record<string, PoolConfig> = {
       development: {
         host: '195.200.6.216',
         port: 46101,
         database: 'muva_dev',
         user: 'muva_dev_user',
         password: process.env.DATABASE_PASSWORD_DEV,
         ssl: false, // Configurar según necesidad
         max: 20,
         idleTimeoutMillis: 30000,
         connectionTimeoutMillis: 2000,
       },
       test: {
         host: process.env.DATABASE_HOST || '127.0.0.1',
         port: 46101,
         database: 'muva_tst',
         user: 'muva_tst_user',
         password: process.env.DATABASE_PASSWORD_TST,
         max: 10,
       },
       production: {
         host: process.env.DATABASE_HOST || '127.0.0.1',
         port: 46101,
         database: 'muva_prd',
         user: 'muva_prd_user',
         password: process.env.DATABASE_PASSWORD_PRD,
         max: 50,
         idleTimeoutMillis: 30000,
       },
     };

     return configs[env] || configs.development;
   };

   let pool: Pool | null = null;

   export const getPool = (): Pool => {
     if (!pool) {
       pool = new Pool(getPoolConfig());

       pool.on('error', (err) => {
         console.error('Unexpected error on idle client', err);
       });
     }
     return pool;
   };

   export const closePool = async (): Promise<void> => {
     if (pool) {
       await pool.end();
       pool = null;
     }
   };
   ```

3. **Crear función de query con retry** (15min):
   ```typescript
   // En src/lib/db/pool.ts (agregar)

   export const query = async <T = any>(
     text: string,
     params?: any[]
   ): Promise<T[]> => {
     const client = await getPool().connect();
     try {
       const result = await client.query(text, params);
       return result.rows as T[];
     } finally {
       client.release();
     }
   };

   export const queryOne = async <T = any>(
     text: string,
     params?: any[]
   ): Promise<T | null> => {
     const rows = await query<T>(text, params);
     return rows[0] || null;
   };
   ```

4. **Probar conexión** (5min):
   Crear test rápido:
   ```typescript
   // Test temporal
   import { query } from '@/lib/db/pool';

   const result = await query('SELECT NOW()');
   console.log('DB connection OK:', result);
   ```

**Entregables:**
- `src/lib/db/pool.ts` creado
- Connection pooling configurado
- Funciones query() y queryOne() disponibles

**Criterios de Éxito:**
- ✅ Pool se conecta sin errores
- ✅ Queries ejecutan correctamente
- ✅ Pool maneja reconexiones

**Estimado:** 45min

---

**🔍 Verificación Post-Ejecución:**

Pregúntame: "¿Consideras satisfactoria la ejecución del Prompt 2.1?"

🔼 **COPIAR HASTA AQUÍ (Prompt 2.1)**

---

## Prompt 2.2: Crear wrapper de queries

**Agente:** `@agent-backend-developer`

**PREREQUISITO:** Prompt 2.1 completado

---

🔽 **COPIAR DESDE AQUÍ (Prompt 2.2)**

**📊 Contexto de Progreso:**

**Progreso General:** 10/38 tareas completadas (26%)

FASE 2 - Migrar Conexión DB (Progreso: 1/6)
- [x] 2.1: Crear cliente pg con pool ✓
- [ ] 2.2: Crear wrapper de queries ← ESTAMOS AQUÍ
- [ ] 2.3: Actualizar variables de entorno
- [ ] 2.4: Migrar API routes
- [ ] 2.5: Migrar lib functions
- [ ] 2.6: Verificar build completo

---

**Tareas:**

1. **Crear cliente con tenant context** (30min):
   Crear `src/lib/db/client.ts`:

   ```typescript
   import { getPool, query as rawQuery } from './pool';

   export interface DbClient {
     query: <T = any>(text: string, params?: any[]) => Promise<T[]>;
     queryOne: <T = any>(text: string, params?: any[]) => Promise<T | null>;
     rpc: <T = any>(functionName: string, params?: Record<string, any>) => Promise<T>;
     setTenantId: (tenantId: string) => Promise<void>;
   }

   export const createClient = async (tenantId?: string): Promise<DbClient> => {
     const pool = getPool();

     const client: DbClient = {
       query: async <T = any>(text: string, params?: any[]): Promise<T[]> => {
         const conn = await pool.connect();
         try {
           if (tenantId) {
             await conn.query(`SELECT set_config('app.tenant_id', $1, true)`, [tenantId]);
           }
           const result = await conn.query(text, params);
           return result.rows as T[];
         } finally {
           conn.release();
         }
       },

       queryOne: async <T = any>(text: string, params?: any[]): Promise<T | null> => {
         const rows = await client.query<T>(text, params);
         return rows[0] || null;
       },

       rpc: async <T = any>(functionName: string, params?: Record<string, any>): Promise<T> => {
         // Construir llamada a función RPC
         const paramNames = params ? Object.keys(params) : [];
         const paramValues = params ? Object.values(params) : [];
         const placeholders = paramNames.map((_, i) => `${paramNames[i]} := $${i + 1}`).join(', ');

         const sql = paramNames.length > 0
           ? `SELECT * FROM ${functionName}(${placeholders})`
           : `SELECT * FROM ${functionName}()`;

         const rows = await client.query<T>(sql, paramValues);
         return rows as unknown as T;
       },

       setTenantId: async (id: string): Promise<void> => {
         tenantId = id;
       },
     };

     return client;
   };

   // Cliente singleton para queries sin tenant context
   export const db = {
     query: rawQuery,
     queryOne: async <T = any>(text: string, params?: any[]): Promise<T | null> => {
       const rows = await rawQuery<T>(text, params);
       return rows[0] || null;
     },
   };
   ```

2. **Crear helpers comunes** (20min):
   Crear `src/lib/db/queries.ts`:

   ```typescript
   import { createClient } from './client';

   // Helper para obtener tenant por subdomain
   export const getTenantBySubdomain = async (subdomain: string) => {
     const client = await createClient();
     return client.queryOne(`
       SELECT * FROM tenant_registry WHERE subdomain = $1
     `, [subdomain]);
   };

   // Helper para reservaciones con tenant context
   export const getReservationsByTenant = async (tenantId: string) => {
     const client = await createClient(tenantId);
     return client.query(`
       SELECT * FROM guest_reservations
       WHERE tenant_id = $1
       ORDER BY check_in DESC
     `, [tenantId]);
   };

   // Helper para búsqueda vectorial
   export const matchDocuments = async (
     tenantId: string,
     embedding: number[],
     threshold: number = 0.5,
     limit: number = 5
   ) => {
     const client = await createClient(tenantId);
     return client.rpc('match_documents', {
       query_embedding: `[${embedding.join(',')}]`,
       match_threshold: threshold,
       match_count: limit,
     });
   };
   ```

3. **Crear transacciones** (10min):
   ```typescript
   // Agregar a src/lib/db/client.ts

   export const withTransaction = async <T>(
     callback: (client: any) => Promise<T>
   ): Promise<T> => {
     const pool = getPool();
     const conn = await pool.connect();

     try {
       await conn.query('BEGIN');
       const result = await callback(conn);
       await conn.query('COMMIT');
       return result;
     } catch (error) {
       await conn.query('ROLLBACK');
       throw error;
     } finally {
       conn.release();
     }
   };
   ```

**Entregables:**
- `src/lib/db/client.ts` con createClient()
- `src/lib/db/queries.ts` con helpers comunes
- Soporte para RPC calls
- Soporte para transacciones

**Criterios de Éxito:**
- ✅ createClient() funciona con tenant context
- ✅ RPC calls ejecutan funciones PostgreSQL
- ✅ Transacciones funcionan correctamente

**Estimado:** 1h

---

🔼 **COPIAR HASTA AQUÍ (Prompt 2.2)**

---

## Prompt 2.3: Actualizar variables de entorno

**Agente:** `@agent-backend-developer`

**PREREQUISITO:** Prompt 2.2 completado

---

🔽 **COPIAR DESDE AQUÍ (Prompt 2.3)**

**📊 Contexto de Progreso:**

FASE 2 - Migrar Conexión DB (Progreso: 2/6)
- [x] 2.1-2.2 completados ✓
- [ ] 2.3: Actualizar variables de entorno ← ESTAMOS AQUÍ
- [ ] 2.4-2.6 pendientes

---

**Tareas:**

1. **Agregar variables de DB a .env.local** (5min):
   ```bash
   # PostgreSQL VPS
   DATABASE_HOST_DEV=195.200.6.216
   DATABASE_PORT=46101
   DATABASE_NAME_DEV=muva_dev
   DATABASE_USER_DEV=muva_dev_user
   DATABASE_PASSWORD_DEV=wKvsH0f9O!pACByk!2

   # Para TST y PRD (usados desde VPS)
   DATABASE_HOST_TST=127.0.0.1
   DATABASE_NAME_TST=muva_tst
   DATABASE_USER_TST=muva_tst_user
   DATABASE_PASSWORD_TST=s4Uc!OL7J1rGOdKaLx!p4

   DATABASE_HOST_PRD=127.0.0.1
   DATABASE_NAME_PRD=muva_prd
   DATABASE_USER_PRD=muva_prd_user
   DATABASE_PASSWORD_PRD=C!R0t1SJq2!pKIeL1aI!7a2
   ```

2. **Actualizar .env.example** (5min):
   ```bash
   # PostgreSQL VPS (replace Supabase)
   DATABASE_HOST_DEV=
   DATABASE_PORT=46101
   DATABASE_NAME_DEV=muva_dev
   DATABASE_USER_DEV=muva_dev_user
   DATABASE_PASSWORD_DEV=

   # TST and PRD use 127.0.0.1 when running on VPS
   ```

3. **Mantener vars de Supabase temporalmente** (3min):
   No eliminar aún las variables SUPABASE_* para permitir rollback.
   Agregar comentario:
   ```bash
   # DEPRECATED - Supabase (mantener para rollback)
   # NEXT_PUBLIC_SUPABASE_URL=...
   # NEXT_PUBLIC_SUPABASE_ANON_KEY=...
   ```

4. **Actualizar GitHub Secrets** (documentar):
   Documentar que se deben agregar en GitHub:
   - DATABASE_PASSWORD_DEV
   - DATABASE_PASSWORD_TST
   - DATABASE_PASSWORD_PRD

**Entregables:**
- .env.local actualizado
- .env.example actualizado
- Documentación de secrets para GitHub

**Criterios de Éxito:**
- ✅ Variables de DB configuradas
- ✅ Supabase vars comentadas (no eliminadas)

**Estimado:** 15min

---

🔼 **COPIAR HASTA AQUÍ (Prompt 2.3)**

---

## Prompt 2.4: Migrar API routes

**Agente:** `@agent-backend-developer`

**PREREQUISITO:** Prompt 2.3 completado

---

🔽 **COPIAR DESDE AQUÍ (Prompt 2.4)**

**📊 Contexto de Progreso:**

FASE 2 - Migrar Conexión DB (Progreso: 3/6)
- [x] 2.1-2.3 completados ✓
- [ ] 2.4: Migrar API routes ← ESTAMOS AQUÍ
- [ ] 2.5-2.6 pendientes

---

**Tareas:**

1. **Identificar rutas que usan Supabase** (15min):
   ```bash
   grep -r "createClient" src/app/api --include="*.ts" | wc -l
   grep -r "supabase" src/app/api --include="*.ts" | wc -l
   ```

   Rutas principales a migrar:
   - `/api/guest/chat/route.ts`
   - `/api/guest/reservation-sire-data/route.ts`
   - `/api/reservations/*`
   - `/api/sire/*`
   - `/api/integrations/*`

2. **Crear patrón de migración** (10min):

   **Antes (Supabase):**
   ```typescript
   import { createClient } from '@/lib/supabase/server';

   const supabase = createClient();
   const { data, error } = await supabase
     .from('guest_reservations')
     .select('*')
     .eq('tenant_id', tenantId);
   ```

   **Después (pg):**
   ```typescript
   import { createClient } from '@/lib/db/client';

   const db = await createClient(tenantId);
   const data = await db.query(`
     SELECT * FROM guest_reservations
     WHERE tenant_id = $1
   `, [tenantId]);
   ```

3. **Migrar rutas una por una** (1.5h):
   Prioridad:
   1. `/api/guest/chat/route.ts` (crítico)
   2. `/api/reservations/list/route.ts`
   3. `/api/sire/generate-txt/route.ts`
   4. Resto de rutas

   Para cada ruta:
   - Reemplazar import de supabase
   - Convertir queries de Supabase SDK a SQL
   - Mantener misma lógica de negocio
   - Probar endpoint

4. **Crear index de exports** (5min):
   `src/lib/db/index.ts`:
   ```typescript
   export { getPool, query, closePool } from './pool';
   export { createClient, db, withTransaction } from './client';
   export * from './queries';
   ```

**Entregables:**
- Todas las API routes usando nuevo cliente pg
- Queries SQL equivalentes a Supabase SDK
- Endpoints funcionando

**Criterios de Éxito:**
- ✅ Todas las rutas migradas
- ✅ Sin errores de importación
- ✅ Endpoints responden correctamente

**Estimado:** 2h

---

🔼 **COPIAR HASTA AQUÍ (Prompt 2.4)**

---

## Prompt 2.5: Migrar lib functions

**Agente:** `@agent-backend-developer`

**PREREQUISITO:** Prompt 2.4 completado

---

🔽 **COPIAR DESDE AQUÍ (Prompt 2.5)**

**📊 Contexto de Progreso:**

FASE 2 - Migrar Conexión DB (Progreso: 4/6)
- [x] 2.1-2.4 completados ✓
- [ ] 2.5: Migrar lib functions ← ESTAMOS AQUÍ
- [ ] 2.6: Verificar build completo

---

**Tareas:**

1. **Identificar libs que usan Supabase** (10min):
   ```bash
   grep -r "createClient" src/lib --include="*.ts" | grep -v "db/"
   grep -r "supabase" src/lib --include="*.ts" | grep -v "supabase/"
   ```

   Archivos principales:
   - `src/lib/conversational-chat-engine.ts`
   - `src/lib/integrations/motopress/*`
   - `src/lib/sire/*.ts`

2. **Migrar conversational-chat-engine.ts** (30min):
   Este es el archivo más crítico - maneja el chat con AI.

   Buscar queries de Supabase y convertir a SQL:
   - Búsqueda vectorial → usar función RPC
   - Inserción de mensajes → INSERT SQL
   - Lectura de contexto → SELECT SQL

3. **Migrar integraciones Motopress** (20min):
   - `src/lib/integrations/motopress/bookings-mapper.ts`
   - Sync de reservaciones

4. **Migrar funciones SIRE** (15min):
   - `src/lib/sire/sire-txt-generator.ts`
   - Queries de datos SIRE

**Entregables:**
- Todas las libs usando nuevo cliente pg
- Chat engine funcionando
- Integraciones funcionando

**Criterios de Éxito:**
- ✅ Chat AI responde correctamente
- ✅ Sync Motopress funciona
- ✅ Export SIRE funciona

**Estimado:** 1h

---

🔼 **COPIAR HASTA AQUÍ (Prompt 2.5)**

---

## Prompt 2.6: Verificar build completo

**Agente:** `@agent-backend-developer`

**PREREQUISITO:** Prompt 2.5 completado

---

🔽 **COPIAR DESDE AQUÍ (Prompt 2.6)**

**📊 Contexto de Progreso:**

FASE 2 - Migrar Conexión DB (Progreso: 5/6)
- [x] 2.1-2.5 completados ✓
- [ ] 2.6: Verificar build completo ← ESTAMOS AQUÍ

---

**Tareas:**

1. **Ejecutar TypeScript check** (5min):
   ```bash
   pnpm run type-check
   # o
   npx tsc --noEmit
   ```

   Resolver cualquier error de tipos.

2. **Ejecutar build** (10min):
   ```bash
   pnpm run build
   ```

   Verificar que compila sin errores.

3. **Verificar no hay imports de Supabase** (5min):
   ```bash
   grep -r "from '@supabase" src/ --include="*.ts" --include="*.tsx"
   grep -r "from 'supabase" src/ --include="*.ts" --include="*.tsx"
   ```

   Debería retornar vacío (excepto archivos en src/lib/supabase/ que aún mantenemos para rollback).

4. **Probar localmente** (10min):
   ```bash
   pnpm run dev
   ```

   Verificar:
   - App inicia sin errores
   - Página principal carga
   - API health check responde

**Entregables:**
- Build exitoso
- Sin imports activos de Supabase (fuera de lib/supabase/)
- App funcionando localmente

**Criterios de Éxito:**
- ✅ `pnpm run build` sin errores
- ✅ App inicia correctamente
- ✅ Health check OK

**Estimado:** 30min

---

**🔍 Verificación Post-Ejecución FASE 2 COMPLETA:**

"¿Consideras satisfactoria la ejecución de FASE 2 completa?

Resumen:
- Cliente pg con pooling creado ✓
- Wrapper de queries con tenant context ✓
- Variables de entorno actualizadas ✓
- API routes migradas ✓
- Lib functions migradas ✓
- Build exitoso ✓"

**Si aprobado:**
"✅ FASE 2 COMPLETADA

**Progreso FASE 2:** 6/6 tareas completadas (100%) ✅ COMPLETADA
**Progreso General:** 15/38 tareas completadas (39%)

**Siguiente:** FASE 3 - Staff Auth JWT
Ver: `FASE-3-staff-auth.md`"

🔼 **COPIAR HASTA AQUÍ (Prompt 2.6)**

---

## Checklist FASE 2

- [ ] 2.1 Crear cliente pg con pool
- [ ] 2.2 Crear wrapper de queries
- [ ] 2.3 Actualizar variables de entorno
- [ ] 2.4 Migrar API routes
- [ ] 2.5 Migrar lib functions
- [ ] 2.6 Verificar build completo

**Anterior:** `FASE-1-setup-db-vps.md`
**Siguiente:** `FASE-3-staff-auth.md`
