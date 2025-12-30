# FASE 3: Staff Auth JWT

**Agente:** @agent-backend-developer + @agent-database-agent
**Tareas:** 6
**Tiempo estimado:** 2-3h
**Dependencias:** FASE 1 completada
**Puede paralelizar con:** FASE 2, FASE 4

---

## Prompt 3.1: Crear tabla staff_auth_users

**Agente:** `@agent-database-agent`

**PREREQUISITO:** FASE 1 completada

**Contexto:**
Actualmente los usuarios staff usan Supabase Auth (GoTrue). Vamos a crear nuestra propia tabla de usuarios y sistema JWT, siguiendo el patrón exitoso de guest-auth.ts.

---

🔽 **COPIAR DESDE AQUÍ (Prompt 3.1)**

**📊 Contexto de Progreso:**

**Progreso General:** 9/38 tareas completadas (24%)

FASE 1 - Setup Database VPS ✅ COMPLETADA
FASE 3 - Staff Auth JWT (Progreso: 0/6)
- [ ] 3.1: Crear tabla staff_auth_users ← ESTAMOS AQUÍ
- [ ] 3.2: Exportar usuarios de Supabase Auth
- [ ] 3.3: Crear sistema JWT staff
- [ ] 3.4: Crear endpoints de auth
- [ ] 3.5: Actualizar middleware
- [ ] 3.6: Migrar user_tenant_permissions

**Estado Actual:**
- guest-auth.ts ya funciona con JWT propio ✓
- super-admin-auth.ts ya funciona con JWT propio ✓
- Staff auth usa Supabase GoTrue ❌
- Listo para crear sistema propio

---

**Tareas:**

1. **Crear migración para staff_auth_users** (15min):
   Crear `migrations/20251230_staff_auth_users.sql`:

   ```sql
   -- Migration: Create staff_auth_users table
   -- Replaces Supabase Auth for staff authentication

   CREATE TABLE IF NOT EXISTS staff_auth_users (
       id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
       email TEXT UNIQUE NOT NULL,
       password_hash TEXT NOT NULL,
       name TEXT,
       role TEXT DEFAULT 'staff' CHECK (role IN ('staff', 'admin', 'manager')),
       tenant_id UUID REFERENCES tenant_registry(id),
       email_verified BOOLEAN DEFAULT FALSE,
       is_active BOOLEAN DEFAULT TRUE,
       last_login TIMESTAMPTZ,
       failed_login_attempts INTEGER DEFAULT 0,
       locked_until TIMESTAMPTZ,
       created_at TIMESTAMPTZ DEFAULT NOW(),
       updated_at TIMESTAMPTZ DEFAULT NOW()
   );

   -- Indexes
   CREATE INDEX idx_staff_auth_users_email ON staff_auth_users(email);
   CREATE INDEX idx_staff_auth_users_tenant ON staff_auth_users(tenant_id);

   -- Updated_at trigger
   CREATE OR REPLACE FUNCTION update_staff_auth_users_updated_at()
   RETURNS TRIGGER AS $$
   BEGIN
       NEW.updated_at = NOW();
       RETURN NEW;
   END;
   $$ LANGUAGE plpgsql;

   CREATE TRIGGER trigger_staff_auth_users_updated_at
       BEFORE UPDATE ON staff_auth_users
       FOR EACH ROW
       EXECUTE FUNCTION update_staff_auth_users_updated_at();

   -- RLS
   ALTER TABLE staff_auth_users ENABLE ROW LEVEL SECURITY;

   -- Policy: Service role can do everything
   CREATE POLICY "service_role_all" ON staff_auth_users
       FOR ALL TO public
       USING (current_setting('role', true) = 'service_role')
       WITH CHECK (current_setting('role', true) = 'service_role');

   -- Policy: Users can read their own record
   CREATE POLICY "users_read_own" ON staff_auth_users
       FOR SELECT TO public
       USING (id = (SELECT current_setting('app.user_id', true))::uuid);
   ```

2. **Aplicar migración a los 3 ambientes** (10min):
   ```bash
   # DEV
   PGPASSWORD='wKvsH0f9O!pACByk!2' psql \
     -h 195.200.6.216 -p 46101 \
     -U muva_dev_user -d muva_dev \
     -f migrations/20251230_staff_auth_users.sql

   # TST y PRD similar (desde VPS)
   ```

3. **Verificar tabla creada** (5min):
   ```sql
   SELECT column_name, data_type
   FROM information_schema.columns
   WHERE table_name = 'staff_auth_users'
   ORDER BY ordinal_position;
   ```

**Entregables:**
- Migración SQL creada
- Tabla staff_auth_users en 3 ambientes
- Índices y RLS configurados

**Criterios de Éxito:**
- ✅ Tabla creada sin errores
- ✅ Índices aplicados
- ✅ RLS habilitado

**Estimado:** 30min

---

🔼 **COPIAR HASTA AQUÍ (Prompt 3.1)**

---

## Prompt 3.2: Exportar usuarios de Supabase Auth

**Agente:** `@agent-database-agent`

**PREREQUISITO:** Prompt 3.1 completado

---

🔽 **COPIAR DESDE AQUÍ (Prompt 3.2)**

**📊 Contexto de Progreso:**

FASE 3 - Staff Auth JWT (Progreso: 1/6)
- [x] 3.1: Crear tabla staff_auth_users ✓
- [ ] 3.2: Exportar usuarios de Supabase Auth ← ESTAMOS AQUÍ
- [ ] 3.3-3.6 pendientes

---

**Tareas:**

1. **Listar usuarios de auth.users en Supabase** (10min):
   ```bash
   # Usando el helper de query
   node .claude/db-query.js "
   SELECT
     au.id,
     au.email,
     au.encrypted_password,
     au.email_confirmed_at,
     au.created_at,
     au.last_sign_in_at
   FROM auth.users au
   JOIN user_tenant_permissions utp ON utp.user_id = au.id
   GROUP BY au.id
   "
   ```

   **Nota:** Si no tienes acceso a auth.users, necesitarás usar Supabase Dashboard > Authentication > Users para exportar manualmente.

2. **Mapear con user_tenant_permissions** (5min):
   ```sql
   SELECT
     au.id as supabase_id,
     au.email,
     utp.tenant_id,
     utp.role
   FROM auth.users au
   JOIN user_tenant_permissions utp ON utp.user_id = au.id
   ```

3. **Generar INSERT statements** (10min):
   Los passwords de Supabase usan bcrypt, que es compatible.

   ```sql
   -- Ejemplo de INSERT (el password_hash viene de Supabase)
   INSERT INTO staff_auth_users (id, email, password_hash, tenant_id, role, email_verified, created_at)
   VALUES
     ('uuid-from-supabase', 'user@email.com', '$2a$10$...', 'tenant-uuid', 'staff', true, '2024-01-01'),
     ...;
   ```

4. **Documentar usuarios migrados** (5min):
   Crear lista de usuarios migrados para verificación.

**Importante:** Si no hay usuarios staff en Supabase Auth (porque todos usan otro método), podemos crear usuarios de prueba.

**Entregables:**
- Lista de usuarios de Supabase Auth
- Mapeo con tenant_permissions
- INSERT statements generados

**Criterios de Éxito:**
- ✅ Usuarios identificados
- ✅ Passwords compatibles (bcrypt)
- ✅ INSERTs listos

**Estimado:** 30min

---

🔼 **COPIAR HASTA AQUÍ (Prompt 3.2)**

---

## Prompt 3.3: Crear sistema JWT staff

**Agente:** `@agent-backend-developer`

**PREREQUISITO:** Prompt 3.2 completado

---

🔽 **COPIAR DESDE AQUÍ (Prompt 3.3)**

**📊 Contexto de Progreso:**

FASE 3 - Staff Auth JWT (Progreso: 2/6)
- [x] 3.1-3.2 completados ✓
- [ ] 3.3: Crear sistema JWT staff ← ESTAMOS AQUÍ
- [ ] 3.4-3.6 pendientes

---

**Tareas:**

1. **Crear staff-auth.ts** (30min):
   Basado en el patrón de `guest-auth.ts`:

   ```typescript
   // src/lib/staff-auth.ts
   import { SignJWT, jwtVerify } from 'jose';
   import bcrypt from 'bcryptjs';
   import { db } from '@/lib/db/client';

   const JWT_SECRET = new TextEncoder().encode(
     process.env.STAFF_JWT_SECRET || 'your-secret-key-min-32-chars'
   );

   export interface StaffUser {
     id: string;
     email: string;
     name: string | null;
     role: string;
     tenantId: string | null;
   }

   export interface StaffTokenPayload {
     sub: string;        // user id
     email: string;
     role: string;
     tenantId: string | null;
     type: 'staff';
   }

   // Verificar credenciales
   export async function verifyCredentials(
     email: string,
     password: string
   ): Promise<StaffUser | null> {
     const user = await db.queryOne<{
       id: string;
       email: string;
       password_hash: string;
       name: string | null;
       role: string;
       tenant_id: string | null;
       is_active: boolean;
       locked_until: Date | null;
     }>(`
       SELECT id, email, password_hash, name, role, tenant_id, is_active, locked_until
       FROM staff_auth_users
       WHERE email = $1
     `, [email]);

     if (!user) return null;
     if (!user.is_active) return null;
     if (user.locked_until && user.locked_until > new Date()) return null;

     const isValid = await bcrypt.compare(password, user.password_hash);
     if (!isValid) {
       // Incrementar intentos fallidos
       await db.query(`
         UPDATE staff_auth_users
         SET failed_login_attempts = failed_login_attempts + 1,
             locked_until = CASE
               WHEN failed_login_attempts >= 5 THEN NOW() + INTERVAL '15 minutes'
               ELSE NULL
             END
         WHERE id = $1
       `, [user.id]);
       return null;
     }

     // Reset intentos fallidos y actualizar last_login
     await db.query(`
       UPDATE staff_auth_users
       SET failed_login_attempts = 0, locked_until = NULL, last_login = NOW()
       WHERE id = $1
     `, [user.id]);

     return {
       id: user.id,
       email: user.email,
       name: user.name,
       role: user.role,
       tenantId: user.tenant_id,
     };
   }

   // Crear token JWT
   export async function createStaffToken(user: StaffUser): Promise<string> {
     const payload: StaffTokenPayload = {
       sub: user.id,
       email: user.email,
       role: user.role,
       tenantId: user.tenantId,
       type: 'staff',
     };

     const token = await new SignJWT(payload)
       .setProtectedHeader({ alg: 'HS256' })
       .setIssuedAt()
       .setExpirationTime(process.env.STAFF_JWT_EXPIRY || '7d')
       .sign(JWT_SECRET);

     return token;
   }

   // Verificar token JWT
   export async function verifyStaffToken(
     token: string
   ): Promise<StaffTokenPayload | null> {
     try {
       const { payload } = await jwtVerify(token, JWT_SECRET);

       if (payload.type !== 'staff') return null;

       return payload as unknown as StaffTokenPayload;
     } catch {
       return null;
     }
   }

   // Hash password (para crear usuarios)
   export async function hashPassword(password: string): Promise<string> {
     return bcrypt.hash(password, 10);
   }
   ```

2. **Agregar variable de entorno** (5min):
   En `.env.local`:
   ```bash
   # Staff Auth JWT
   STAFF_JWT_SECRET=your-super-secure-secret-key-min-32-characters
   STAFF_JWT_EXPIRY=7d
   ```

3. **Instalar bcryptjs si no existe** (2min):
   ```bash
   pnpm add bcryptjs @types/bcryptjs
   ```

**Entregables:**
- `src/lib/staff-auth.ts` completo
- Funciones: verifyCredentials, createStaffToken, verifyStaffToken
- Variable STAFF_JWT_SECRET configurada

**Criterios de Éxito:**
- ✅ Auth funciona con email/password
- ✅ Tokens JWT se generan correctamente
- ✅ Verificación de tokens funciona

**Estimado:** 1h

---

🔼 **COPIAR HASTA AQUÍ (Prompt 3.3)**

---

## Prompt 3.4: Crear endpoints de auth

**Agente:** `@agent-backend-developer`

**PREREQUISITO:** Prompt 3.3 completado

---

🔽 **COPIAR DESDE AQUÍ (Prompt 3.4)**

**📊 Contexto de Progreso:**

FASE 3 - Staff Auth JWT (Progreso: 3/6)
- [x] 3.1-3.3 completados ✓
- [ ] 3.4: Crear endpoints de auth ← ESTAMOS AQUÍ
- [ ] 3.5-3.6 pendientes

---

**Tareas:**

1. **Crear POST /api/auth/staff/login** (20min):
   `src/app/api/auth/staff/login/route.ts`:

   ```typescript
   import { NextRequest, NextResponse } from 'next/server';
   import { verifyCredentials, createStaffToken } from '@/lib/staff-auth';
   import { cookies } from 'next/headers';

   export async function POST(request: NextRequest) {
     try {
       const { email, password } = await request.json();

       if (!email || !password) {
         return NextResponse.json(
           { error: 'Email and password required' },
           { status: 400 }
         );
       }

       const user = await verifyCredentials(email, password);

       if (!user) {
         return NextResponse.json(
           { error: 'Invalid credentials' },
           { status: 401 }
         );
       }

       const token = await createStaffToken(user);

       // Set HTTP-only cookie
       const cookieStore = await cookies();
       cookieStore.set('staff-token', token, {
         httpOnly: true,
         secure: process.env.NODE_ENV === 'production',
         sameSite: 'lax',
         maxAge: 60 * 60 * 24 * 7, // 7 days
         path: '/',
       });

       return NextResponse.json({
         user: {
           id: user.id,
           email: user.email,
           name: user.name,
           role: user.role,
         },
       });
     } catch (error) {
       console.error('Staff login error:', error);
       return NextResponse.json(
         { error: 'Internal server error' },
         { status: 500 }
       );
     }
   }
   ```

2. **Crear POST /api/auth/staff/logout** (10min):
   `src/app/api/auth/staff/logout/route.ts`:

   ```typescript
   import { NextResponse } from 'next/server';
   import { cookies } from 'next/headers';

   export async function POST() {
     const cookieStore = await cookies();
     cookieStore.delete('staff-token');

     return NextResponse.json({ success: true });
   }
   ```

3. **Crear GET /api/auth/staff/me** (15min):
   `src/app/api/auth/staff/me/route.ts`:

   ```typescript
   import { NextRequest, NextResponse } from 'next/server';
   import { verifyStaffToken } from '@/lib/staff-auth';
   import { cookies } from 'next/headers';
   import { db } from '@/lib/db/client';

   export async function GET(request: NextRequest) {
     try {
       const cookieStore = await cookies();
       const token = cookieStore.get('staff-token')?.value;

       if (!token) {
         return NextResponse.json(
           { error: 'Not authenticated' },
           { status: 401 }
         );
       }

       const payload = await verifyStaffToken(token);

       if (!payload) {
         return NextResponse.json(
           { error: 'Invalid token' },
           { status: 401 }
         );
       }

       // Get fresh user data
       const user = await db.queryOne(`
         SELECT id, email, name, role, tenant_id
         FROM staff_auth_users
         WHERE id = $1 AND is_active = true
       `, [payload.sub]);

       if (!user) {
         return NextResponse.json(
           { error: 'User not found' },
           { status: 404 }
         );
       }

       return NextResponse.json({ user });
     } catch (error) {
       console.error('Staff me error:', error);
       return NextResponse.json(
         { error: 'Internal server error' },
         { status: 500 }
       );
     }
   }
   ```

4. **Probar endpoints** (15min):
   ```bash
   # Login
   curl -X POST http://localhost:3000/api/auth/staff/login \
     -H "Content-Type: application/json" \
     -d '{"email":"test@example.com","password":"test123"}'

   # Me (con cookie)
   curl http://localhost:3000/api/auth/staff/me \
     -H "Cookie: staff-token=..."
   ```

**Entregables:**
- POST /api/auth/staff/login
- POST /api/auth/staff/logout
- GET /api/auth/staff/me
- Cookies HTTP-only configuradas

**Criterios de Éxito:**
- ✅ Login retorna token en cookie
- ✅ Me retorna usuario actual
- ✅ Logout elimina cookie

**Estimado:** 1h

---

🔼 **COPIAR HASTA AQUÍ (Prompt 3.4)**

---

## Prompt 3.5: Actualizar middleware

**Agente:** `@agent-backend-developer`

**PREREQUISITO:** Prompt 3.4 completado

---

🔽 **COPIAR DESDE AQUÍ (Prompt 3.5)**

**📊 Contexto de Progreso:**

FASE 3 - Staff Auth JWT (Progreso: 4/6)
- [x] 3.1-3.4 completados ✓
- [ ] 3.5: Actualizar middleware ← ESTAMOS AQUÍ
- [ ] 3.6: Migrar user_tenant_permissions

---

**Tareas:**

1. **Revisar middleware existente** (10min):
   Buscar `middleware.ts` o lógica de protección de rutas.

2. **Crear helper para verificar staff auth** (15min):
   ```typescript
   // src/lib/staff-auth.ts (agregar)

   import { cookies } from 'next/headers';

   export async function getStaffUser(): Promise<StaffTokenPayload | null> {
     const cookieStore = await cookies();
     const token = cookieStore.get('staff-token')?.value;

     if (!token) return null;

     return verifyStaffToken(token);
   }

   export async function requireStaffAuth(): Promise<StaffTokenPayload> {
     const user = await getStaffUser();
     if (!user) {
       throw new Error('Unauthorized');
     }
     return user;
   }
   ```

3. **Actualizar rutas protegidas** (15min):
   En rutas que requieren staff auth:

   ```typescript
   import { requireStaffAuth } from '@/lib/staff-auth';

   export async function GET(request: NextRequest) {
     try {
       const staffUser = await requireStaffAuth();
       // ... lógica con staffUser.tenantId, etc.
     } catch {
       return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
     }
   }
   ```

4. **Actualizar páginas que usan auth** (si aplica):
   Componentes que verifican sesión de staff.

**Entregables:**
- Helper getStaffUser() disponible
- Rutas staff protegidas con nuevo auth
- Compatible con sistema existente

**Criterios de Éxito:**
- ✅ Rutas protegidas funcionan
- ✅ Redirección a login si no autenticado

**Estimado:** 30min

---

🔼 **COPIAR HASTA AQUÍ (Prompt 3.5)**

---

## Prompt 3.6: Migrar user_tenant_permissions

**Agente:** `@agent-database-agent`

**PREREQUISITO:** Prompt 3.5 completado

---

🔽 **COPIAR DESDE AQUÍ (Prompt 3.6)**

**📊 Contexto de Progreso:**

FASE 3 - Staff Auth JWT (Progreso: 5/6)
- [x] 3.1-3.5 completados ✓
- [ ] 3.6: Migrar user_tenant_permissions ← ESTAMOS AQUÍ

---

**Tareas:**

1. **Revisar estructura actual de user_tenant_permissions** (5min):
   ```sql
   SELECT column_name, data_type
   FROM information_schema.columns
   WHERE table_name = 'user_tenant_permissions';

   -- Ver FK actual
   SELECT
     tc.constraint_name,
     kcu.column_name,
     ccu.table_name AS foreign_table_name
   FROM information_schema.table_constraints AS tc
   JOIN information_schema.key_column_usage AS kcu
     ON tc.constraint_name = kcu.constraint_name
   JOIN information_schema.constraint_column_usage AS ccu
     ON ccu.constraint_name = tc.constraint_name
   WHERE tc.table_name = 'user_tenant_permissions'
     AND tc.constraint_type = 'FOREIGN KEY';
   ```

2. **Crear migración para actualizar FK** (10min):
   ```sql
   -- migrations/20251230_update_user_tenant_permissions_fk.sql

   -- Opción A: Si user_id apunta a auth.users (de Supabase)
   -- Necesitamos cambiar a staff_auth_users

   -- Primero, verificar que los user_ids existen en staff_auth_users
   -- (deben haberse migrado en paso 3.2)

   -- Eliminar FK existente (si apunta a auth.users)
   ALTER TABLE user_tenant_permissions
       DROP CONSTRAINT IF EXISTS user_tenant_permissions_user_id_fkey;

   -- Agregar nueva FK a staff_auth_users
   ALTER TABLE user_tenant_permissions
       ADD CONSTRAINT user_tenant_permissions_user_id_fkey
       FOREIGN KEY (user_id) REFERENCES staff_auth_users(id);
   ```

3. **Aplicar migración** (5min):
   ```bash
   # Aplicar a los 3 ambientes
   ```

4. **Verificar integridad** (5min):
   ```sql
   -- Verificar que no hay huérfanos
   SELECT * FROM user_tenant_permissions
   WHERE user_id NOT IN (SELECT id FROM staff_auth_users);
   ```

5. **Probar RLS con nuevo auth** (5min):
   Verificar que las policies que usan user_id siguen funcionando.

**Entregables:**
- FK actualizado a staff_auth_users
- Sin registros huérfanos
- RLS funcionando

**Criterios de Éxito:**
- ✅ FK apunta a staff_auth_users
- ✅ Permisos funcionan correctamente

**Estimado:** 30min

---

**🔍 Verificación Post-Ejecución FASE 3 COMPLETA:**

"¿Consideras satisfactoria la ejecución de FASE 3 completa?

Resumen:
- Tabla staff_auth_users creada ✓
- Usuarios migrados de Supabase Auth ✓
- Sistema JWT staff implementado ✓
- Endpoints login/logout/me funcionando ✓
- Middleware actualizado ✓
- user_tenant_permissions migrado ✓"

**Si aprobado:**
"✅ FASE 3 COMPLETADA

**Progreso FASE 3:** 6/6 tareas completadas (100%) ✅ COMPLETADA
**Progreso General:** 21/38 tareas completadas (55%)

**Siguiente:** FASE 4 - MinIO Storage
Ver: `FASE-4-minio-storage.md`"

🔼 **COPIAR HASTA AQUÍ (Prompt 3.6)**

---

## Checklist FASE 3

- [ ] 3.1 Crear tabla staff_auth_users
- [ ] 3.2 Exportar usuarios de Supabase Auth
- [ ] 3.3 Crear sistema JWT staff
- [ ] 3.4 Crear endpoints de auth
- [ ] 3.5 Actualizar middleware
- [ ] 3.6 Migrar user_tenant_permissions

**Anterior:** `FASE-2-conexion-pg.md`
**Siguiente:** `FASE-4-minio-storage.md`
