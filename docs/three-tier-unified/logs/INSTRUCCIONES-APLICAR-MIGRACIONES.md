# 📋 INSTRUCCIONES: Aplicar Migraciones a PRD

**Archivo SQL:** `migrations-prd-consolidated.sql` (en esta misma carpeta)
**Proyecto:** MUVA v1.0 (kprqghwdnaykxhostivv)
**Tiempo estimado:** 2-3 minutos

---

## ✅ Pasos a Seguir:

### 1. Abre el archivo SQL
```
docs/three-tier-unified/logs/migrations-prd-consolidated.sql
```

### 2. Copia TODO el contenido
- Usa `Cmd+A` (Mac) o `Ctrl+A` (Windows) para seleccionar todo
- Usa `Cmd+C` (Mac) o `Ctrl+C` (Windows) para copiar

### 3. Abre el SQL Editor de Supabase
Ve a esta URL (abrirá directamente en el proyecto correcto):
```
https://supabase.com/dashboard/project/kprqghwdnaykxhostivv/sql/new
```

### 4. Pega el SQL
- Click en el área del editor
- Usa `Cmd+V` (Mac) o `Ctrl+V` (Windows) para pegar

### 5. Ejecuta
- Click en el botón **"RUN"** (verde, esquina superior derecha)
- Espera ~30-60 segundos (es un archivo grande)

### 6. Verifica el Resultado

**✅ Si ves "Success":**
- ¡Perfecto! Las migraciones se aplicaron correctamente
- Cierra la pestaña y confirma aquí en Claude Code

**❌ Si ves un error:**
- Copia el mensaje de error completo
- Pégalo aquí en Claude Code
- Yo te ayudaré a resolverlo

---

## 🔍 Qué Hace Este SQL:

Este archivo consolida las **18 migraciones** en orden cronológico:

1. ✅ Crea schemas (`hotels`, `muva_activities`)
2. ✅ Instala extensiones (Vector, UUID, etc.)
3. ✅ Crea 43 tablas (tenant_registry, guest_reservations, etc.)
4. ✅ Crea funciones RPC (~80 funciones)
5. ✅ Configura RLS policies (seguridad)
6. ✅ Crea índices de performance
7. ✅ Configura triggers y constraints

**Total:** ~12,300 líneas de SQL, 492KB

---

## ⚠️ Importante:

- **NO cierres** la ventana mientras se ejecuta
- **NO interrumpas** el proceso
- **NO edites** el SQL (pégalo tal cual)

---

## 📞 Si Necesitas Ayuda:

1. Toma screenshot del error
2. Copia el mensaje de error
3. Pégalo aquí en Claude Code
4. Yo te ayudaré inmediatamente

---

**Una vez que termines, avísame aquí y yo validaré que todo esté correcto!** ✅
