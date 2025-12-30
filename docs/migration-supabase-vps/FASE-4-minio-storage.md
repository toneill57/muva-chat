# FASE 4: MinIO Storage

**Agente:** @agent-backend-developer + @agent-infrastructure-monitor
**Tareas:** 5
**Tiempo estimado:** 2h
**Dependencias:** FASE 1 completada
**Puede paralelizar con:** FASE 2, FASE 3

---

## Prompt 4.1: Instalar y configurar MinIO

**Agente:** `@agent-infrastructure-monitor` (o manual via SSH)

**PREREQUISITO:** FASE 1 completada

**Contexto:**
MinIO es un servidor de storage compatible con S3. Lo usaremos para reemplazar Supabase Storage y almacenar documentos SIRE (pasaportes, visas, etc).

---

🔽 **COPIAR DESDE AQUÍ (Prompt 4.1)**

**📊 Contexto de Progreso:**

**Progreso General:** 9/38 tareas completadas (24%)

FASE 1 - Setup Database VPS ✅ COMPLETADA
FASE 4 - MinIO Storage (Progreso: 0/5)
- [ ] 4.1: Instalar y configurar MinIO ← ESTAMOS AQUÍ
- [ ] 4.2: Crear cliente MinIO
- [ ] 4.3: Migrar archivos existentes
- [ ] 4.4: Actualizar extract-document route
- [ ] 4.5: Configurar CORS y acceso público

**Estado Actual:**
- Supabase Storage tiene bucket sire-documents ✓
- Archivos de documentos almacenados ✓
- Listo para configurar MinIO en VPS

---

**Tareas:**

1. **Instalar MinIO en VPS** (15min):

   **Opción A: Docker (recomendado)**
   ```bash
   # En VPS via SSH o GitHub Actions vps-exec
   mkdir -p /data/minio

   docker run -d \
     --name minio \
     -p 9000:9000 \
     -p 9001:9001 \
     -v /data/minio:/data \
     -e "MINIO_ROOT_USER=minioadmin" \
     -e "MINIO_ROOT_PASSWORD=minioadmin-secure-password" \
     quay.io/minio/minio server /data --console-address ":9001"
   ```

   **Opción B: Binario directo**
   ```bash
   wget https://dl.min.io/server/minio/release/linux-amd64/minio
   chmod +x minio
   MINIO_ROOT_USER=minioadmin MINIO_ROOT_PASSWORD=minioadmin-secure-password ./minio server /data
   ```

2. **Crear bucket sire-documents** (5min):
   Via MinIO Console (http://vps-ip:9001) o mc CLI:
   ```bash
   # Instalar mc (MinIO Client)
   wget https://dl.min.io/client/mc/release/linux-amd64/mc
   chmod +x mc

   # Configurar alias
   ./mc alias set myminio http://localhost:9000 minioadmin minioadmin-secure-password

   # Crear bucket
   ./mc mb myminio/sire-documents
   ```

3. **Configurar access policy** (5min):
   Para documentos que necesitan ser accesibles:
   ```bash
   # Hacer bucket público para lectura (o usar presigned URLs)
   ./mc anonymous set download myminio/sire-documents
   ```

4. **Verificar acceso** (5min):
   ```bash
   # Subir archivo de prueba
   echo "test" > test.txt
   ./mc cp test.txt myminio/sire-documents/

   # Verificar acceso
   curl http://localhost:9000/sire-documents/test.txt
   ```

5. **Configurar como servicio** (10min):
   Para que MinIO inicie automáticamente:
   ```bash
   # Crear systemd service
   sudo cat > /etc/systemd/system/minio.service << EOF
   [Unit]
   Description=MinIO
   After=network.target

   [Service]
   User=minio-user
   Group=minio-user
   Environment="MINIO_ROOT_USER=minioadmin"
   Environment="MINIO_ROOT_PASSWORD=minioadmin-secure-password"
   ExecStart=/usr/local/bin/minio server /data --console-address ":9001"
   Restart=always

   [Install]
   WantedBy=multi-user.target
   EOF

   sudo systemctl daemon-reload
   sudo systemctl enable minio
   sudo systemctl start minio
   ```

**Entregables:**
- MinIO corriendo en VPS
- Bucket sire-documents creado
- Console accesible en puerto 9001
- Servicio configurado para auto-start

**Criterios de Éxito:**
- ✅ MinIO responde en puerto 9000
- ✅ Console accesible en puerto 9001
- ✅ Bucket sire-documents existe

**Estimado:** 30min

---

🔼 **COPIAR HASTA AQUÍ (Prompt 4.1)**

---

## Prompt 4.2: Crear cliente MinIO

**Agente:** `@agent-backend-developer`

**PREREQUISITO:** Prompt 4.1 completado

---

🔽 **COPIAR DESDE AQUÍ (Prompt 4.2)**

**📊 Contexto de Progreso:**

FASE 4 - MinIO Storage (Progreso: 1/5)
- [x] 4.1: Instalar y configurar MinIO ✓
- [ ] 4.2: Crear cliente MinIO ← ESTAMOS AQUÍ
- [ ] 4.3-4.5 pendientes

---

**Tareas:**

1. **Instalar AWS SDK S3** (3min):
   MinIO es compatible con S3 API, usamos el SDK oficial:
   ```bash
   pnpm add @aws-sdk/client-s3 @aws-sdk/s3-request-presigner
   ```

2. **Crear cliente MinIO** (20min):
   Crear `src/lib/storage/minio-client.ts`:

   ```typescript
   import {
     S3Client,
     PutObjectCommand,
     GetObjectCommand,
     DeleteObjectCommand,
     HeadObjectCommand,
   } from '@aws-sdk/client-s3';
   import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

   // Configuración MinIO
   const s3Client = new S3Client({
     endpoint: process.env.MINIO_ENDPOINT || 'http://localhost:9000',
     region: 'us-east-1', // MinIO ignora esto pero S3 client lo requiere
     credentials: {
       accessKeyId: process.env.MINIO_ACCESS_KEY || 'minioadmin',
       secretAccessKey: process.env.MINIO_SECRET_KEY || 'minioadmin',
     },
     forcePathStyle: true, // Necesario para MinIO
   });

   const BUCKET = process.env.MINIO_BUCKET || 'sire-documents';

   export interface UploadResult {
     key: string;
     url: string;
   }

   // Subir archivo
   export async function uploadFile(
     key: string,
     body: Buffer | Uint8Array,
     contentType: string
   ): Promise<UploadResult> {
     const command = new PutObjectCommand({
       Bucket: BUCKET,
       Key: key,
       Body: body,
       ContentType: contentType,
     });

     await s3Client.send(command);

     const url = `${process.env.MINIO_ENDPOINT}/${BUCKET}/${key}`;

     return { key, url };
   }

   // Obtener URL firmada (para acceso temporal)
   export async function getSignedFileUrl(
     key: string,
     expiresIn: number = 3600 // 1 hora
   ): Promise<string> {
     const command = new GetObjectCommand({
       Bucket: BUCKET,
       Key: key,
     });

     return getSignedUrl(s3Client, command, { expiresIn });
   }

   // Obtener archivo
   export async function getFile(key: string): Promise<Buffer> {
     const command = new GetObjectCommand({
       Bucket: BUCKET,
       Key: key,
     });

     const response = await s3Client.send(command);
     const stream = response.Body as any;

     // Convertir stream a buffer
     const chunks: Uint8Array[] = [];
     for await (const chunk of stream) {
       chunks.push(chunk);
     }
     return Buffer.concat(chunks);
   }

   // Eliminar archivo
   export async function deleteFile(key: string): Promise<void> {
     const command = new DeleteObjectCommand({
       Bucket: BUCKET,
       Key: key,
     });

     await s3Client.send(command);
   }

   // Verificar si archivo existe
   export async function fileExists(key: string): Promise<boolean> {
     try {
       const command = new HeadObjectCommand({
         Bucket: BUCKET,
         Key: key,
       });
       await s3Client.send(command);
       return true;
     } catch {
       return false;
     }
   }

   // Generar key único para archivo
   export function generateFileKey(
     tenantId: string,
     documentType: string,
     originalName: string
   ): string {
     const timestamp = Date.now();
     const random = Math.random().toString(36).substring(7);
     const ext = originalName.split('.').pop() || 'bin';
     return `${tenantId}/${documentType}/${timestamp}-${random}.${ext}`;
   }
   ```

3. **Agregar variables de entorno** (5min):
   ```bash
   # MinIO Storage
   MINIO_ENDPOINT=http://localhost:9000
   MINIO_ACCESS_KEY=minioadmin
   MINIO_SECRET_KEY=minioadmin-secure-password
   MINIO_BUCKET=sire-documents
   ```

4. **Probar cliente** (5min):
   ```typescript
   // Test temporal
   import { uploadFile, getSignedFileUrl } from '@/lib/storage/minio-client';

   const result = await uploadFile(
     'test/hello.txt',
     Buffer.from('Hello World'),
     'text/plain'
   );
   console.log('Uploaded:', result);

   const signedUrl = await getSignedFileUrl('test/hello.txt');
   console.log('Signed URL:', signedUrl);
   ```

**Entregables:**
- `src/lib/storage/minio-client.ts` creado
- Funciones: uploadFile, getFile, deleteFile, getSignedFileUrl
- Variables de entorno configuradas

**Criterios de Éxito:**
- ✅ Upload funciona
- ✅ Download funciona
- ✅ Signed URLs funcionan

**Estimado:** 30min

---

🔼 **COPIAR HASTA AQUÍ (Prompt 4.2)**

---

## Prompt 4.3: Migrar archivos existentes

**Agente:** `@agent-backend-developer`

**PREREQUISITO:** Prompt 4.2 completado

---

🔽 **COPIAR DESDE AQUÍ (Prompt 4.3)**

**📊 Contexto de Progreso:**

FASE 4 - MinIO Storage (Progreso: 2/5)
- [x] 4.1-4.2 completados ✓
- [ ] 4.3: Migrar archivos existentes ← ESTAMOS AQUÍ
- [ ] 4.4-4.5 pendientes

---

**Tareas:**

1. **Listar archivos en Supabase Storage** (10min):
   ```typescript
   // Script de migración
   import { createClient } from '@supabase/supabase-js';

   const supabase = createClient(
     process.env.NEXT_PUBLIC_SUPABASE_URL!,
     process.env.SUPABASE_SERVICE_ROLE_KEY!
   );

   const { data: files, error } = await supabase.storage
     .from('sire-documents')
     .list('', { limit: 1000 });

   console.log('Files to migrate:', files?.length);
   ```

2. **Crear script de migración** (15min):
   Crear `scripts/migration/migrate-storage.ts`:

   ```typescript
   import { createClient } from '@supabase/supabase-js';
   import { uploadFile } from '@/lib/storage/minio-client';
   import { db } from '@/lib/db/client';

   async function migrateStorage() {
     const supabase = createClient(
       process.env.NEXT_PUBLIC_SUPABASE_URL!,
       process.env.SUPABASE_SERVICE_ROLE_KEY!
     );

     // Listar todos los archivos
     const { data: files, error } = await supabase.storage
       .from('sire-documents')
       .list('', { limit: 1000 });

     if (error) {
       console.error('Error listing files:', error);
       return;
     }

     console.log(`Found ${files?.length || 0} files to migrate`);

     for (const file of files || []) {
       try {
         // Descargar de Supabase
         const { data: blob, error: downloadError } = await supabase.storage
           .from('sire-documents')
           .download(file.name);

         if (downloadError || !blob) {
           console.error(`Error downloading ${file.name}:`, downloadError);
           continue;
         }

         // Subir a MinIO
         const buffer = Buffer.from(await blob.arrayBuffer());
         const result = await uploadFile(
           file.name,
           buffer,
           file.metadata?.mimetype || 'application/octet-stream'
         );

         console.log(`Migrated: ${file.name} -> ${result.url}`);

         // Actualizar URL en base de datos
         await db.query(`
           UPDATE sire_document_uploads
           SET file_url = $1
           WHERE file_url LIKE $2
         `, [result.url, `%${file.name}%`]);

       } catch (err) {
         console.error(`Error migrating ${file.name}:`, err);
       }
     }

     console.log('Migration complete!');
   }

   migrateStorage();
   ```

3. **Ejecutar migración** (5min):
   ```bash
   npx tsx scripts/migration/migrate-storage.ts
   ```

4. **Verificar migración** (5min):
   ```sql
   -- Verificar que URLs fueron actualizadas
   SELECT id, file_url
   FROM sire_document_uploads
   WHERE file_url LIKE '%supabase%';
   -- Debería retornar 0 registros

   SELECT id, file_url
   FROM sire_document_uploads
   WHERE file_url LIKE '%minio%' OR file_url LIKE '%localhost:9000%';
   -- Debería retornar todos los registros migrados
   ```

**Nota:** Si no hay archivos en Supabase Storage, este paso se puede saltar.

**Entregables:**
- Script de migración creado
- Archivos copiados a MinIO
- URLs actualizadas en DB

**Criterios de Éxito:**
- ✅ Todos los archivos migrados
- ✅ URLs en DB actualizadas
- ✅ Sin referencias a Supabase Storage

**Estimado:** 30min

---

🔼 **COPIAR HASTA AQUÍ (Prompt 4.3)**

---

## Prompt 4.4: Actualizar extract-document route

**Agente:** `@agent-backend-developer`

**PREREQUISITO:** Prompt 4.3 completado

---

🔽 **COPIAR DESDE AQUÍ (Prompt 4.4)**

**📊 Contexto de Progreso:**

FASE 4 - MinIO Storage (Progreso: 3/5)
- [x] 4.1-4.3 completados ✓
- [ ] 4.4: Actualizar extract-document route ← ESTAMOS AQUÍ
- [ ] 4.5: Configurar CORS y acceso público

---

**Tareas:**

1. **Identificar ruta de upload** (5min):
   Buscar `src/app/api/sire/extract-document/route.ts`

2. **Reemplazar Supabase Storage con MinIO** (20min):
   **Antes (Supabase):**
   ```typescript
   const { data, error } = await supabase.storage
     .from('sire-documents')
     .upload(path, file);
   ```

   **Después (MinIO):**
   ```typescript
   import { uploadFile, generateFileKey } from '@/lib/storage/minio-client';

   // En el handler POST:
   const formData = await request.formData();
   const file = formData.get('file') as File;

   if (!file) {
     return NextResponse.json({ error: 'No file provided' }, { status: 400 });
   }

   // Generar key único
   const key = generateFileKey(tenantId, 'identity-document', file.name);

   // Convertir File a Buffer
   const buffer = Buffer.from(await file.arrayBuffer());

   // Subir a MinIO
   const { url } = await uploadFile(key, buffer, file.type);

   // Guardar URL en base de datos
   await db.query(`
     INSERT INTO sire_document_uploads (tenant_id, file_url, document_type, ...)
     VALUES ($1, $2, $3, ...)
   `, [tenantId, url, documentType, ...]);
   ```

3. **Actualizar lectura de archivos** (si aplica) (5min):
   Si hay rutas que leen archivos para mostrarlos:
   ```typescript
   import { getSignedFileUrl } from '@/lib/storage/minio-client';

   // Para mostrar imagen al usuario
   const signedUrl = await getSignedFileUrl(key, 3600); // 1 hora
   ```

4. **Probar upload** (10min):
   - Subir documento de prueba
   - Verificar que se guarda en MinIO
   - Verificar que URL se guarda en DB
   - Verificar que OCR funciona con nueva URL

**Entregables:**
- extract-document route usando MinIO
- Upload funcional
- URL correcta en DB

**Criterios de Éxito:**
- ✅ Upload guarda en MinIO
- ✅ URL correcta en sire_document_uploads
- ✅ OCR sigue funcionando

**Estimado:** 30min

---

🔼 **COPIAR HASTA AQUÍ (Prompt 4.4)**

---

## Prompt 4.5: Configurar CORS y acceso público

**Agente:** `@agent-backend-developer` + @agent-infrastructure-monitor

**PREREQUISITO:** Prompt 4.4 completado

---

🔽 **COPIAR DESDE AQUÍ (Prompt 4.5)**

**📊 Contexto de Progreso:**

FASE 4 - MinIO Storage (Progreso: 4/5)
- [x] 4.1-4.4 completados ✓
- [ ] 4.5: Configurar CORS y acceso público ← ESTAMOS AQUÍ

---

**Tareas:**

1. **Configurar CORS en MinIO** (10min):
   Via MinIO Console o mc CLI:
   ```bash
   # Crear archivo cors.json
   cat > cors.json << EOF
   {
     "CORSRules": [
       {
         "AllowedHeaders": ["*"],
         "AllowedMethods": ["GET", "PUT", "POST", "DELETE"],
         "AllowedOrigins": ["http://localhost:3000", "https://muva.chat", "https://staging.muva.chat"],
         "ExposeHeaders": ["ETag"],
         "MaxAgeSeconds": 3000
       }
     ]
   }
   EOF

   # Aplicar configuración
   ./mc cors set myminio/sire-documents cors.json
   ```

2. **Decidir política de acceso** (5min):
   **Opción A: Presigned URLs (más seguro)**
   - Archivos privados
   - Generar URL firmada para cada acceso
   - URL expira después de tiempo configurado

   **Opción B: Acceso público (más simple)**
   - Archivos accesibles directamente
   - Menos seguro pero más simple
   - Útil si archivos no son muy sensibles

   **Recomendación:** Usar presigned URLs para documentos SIRE (son documentos de identidad).

3. **Implementar proxy de archivos** (si presigned URLs) (10min):
   Crear ruta que genera URL firmada:
   ```typescript
   // src/app/api/storage/[...path]/route.ts
   import { getSignedFileUrl } from '@/lib/storage/minio-client';
   import { requireStaffAuth } from '@/lib/staff-auth';

   export async function GET(
     request: NextRequest,
     { params }: { params: { path: string[] } }
   ) {
     // Verificar autenticación
     await requireStaffAuth();

     const key = params.path.join('/');
     const signedUrl = await getSignedFileUrl(key, 3600);

     // Redirigir a URL firmada
     return NextResponse.redirect(signedUrl);
   }
   ```

4. **Verificar acceso desde browser** (5min):
   - Abrir imagen de documento en browser
   - Verificar que carga correctamente
   - Verificar que CORS no bloquea

**Entregables:**
- CORS configurado para dominios de la app
- Política de acceso definida (presigned o público)
- Archivos accesibles desde browser

**Criterios de Éxito:**
- ✅ Sin errores CORS en browser
- ✅ Imágenes cargan correctamente
- ✅ Acceso controlado (si presigned)

**Estimado:** 15min

---

**🔍 Verificación Post-Ejecución FASE 4 COMPLETA:**

"¿Consideras satisfactoria la ejecución de FASE 4 completa?

Resumen:
- MinIO instalado y corriendo ✓
- Bucket sire-documents creado ✓
- Cliente MinIO implementado ✓
- Archivos migrados (si había) ✓
- extract-document actualizado ✓
- CORS configurado ✓"

**Si aprobado:**
"✅ FASE 4 COMPLETADA

**Progreso FASE 4:** 5/5 tareas completadas (100%) ✅ COMPLETADA
**Progreso General:** 26/38 tareas completadas (68%)

**Siguiente:** FASE 5 - Testing Integral
Ver: `FASE-5-testing.md`"

🔼 **COPIAR HASTA AQUÍ (Prompt 4.5)**

---

## Checklist FASE 4

- [ ] 4.1 Instalar y configurar MinIO
- [ ] 4.2 Crear cliente MinIO
- [ ] 4.3 Migrar archivos existentes
- [ ] 4.4 Actualizar extract-document route
- [ ] 4.5 Configurar CORS y acceso público

**Anterior:** `FASE-3-staff-auth.md`
**Siguiente:** `FASE-5-testing.md`
