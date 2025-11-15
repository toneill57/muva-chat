# Sistema de Acceso MUVA

## Descripción General

El sistema de acceso MUVA permite a clientes con plan Premium acceder tanto a contenido específico de su negocio como al catálogo turístico de San Andrés (contenido MUVA). Este documento explica cómo funciona el sistema de permisos y la arquitectura de acceso.

## Arquitectura de Permisos

### Base de Datos

El sistema utiliza dos tablas principales para gestionar permisos:

#### 1. `tenant_registry`
Registro de tenants (clientes) en el sistema:
```sql
CREATE TABLE tenant_registry (
  tenant_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nit VARCHAR UNIQUE NOT NULL,
  razon_social VARCHAR NOT NULL,
  nombre_comercial VARCHAR NOT NULL,
  schema_name VARCHAR UNIQUE NOT NULL,
  tenant_type VARCHAR DEFAULT 'hotel',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

#### 2. `user_tenant_permissions`
Permisos específicos de usuarios para cada tenant:
```sql
CREATE TABLE user_tenant_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  tenant_id UUID REFERENCES tenant_registry(tenant_id),
  role VARCHAR DEFAULT 'viewer',
  permissions JSONB DEFAULT '{}',
  granted_by UUID REFERENCES auth.users(id),
  granted_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

### Estructura de Permisos JSON

El campo `permissions` en `user_tenant_permissions` utiliza formato JSON:

```json
{
  "muva_access": true,    // Acceso al contenido turístico MUVA
  "sire_access": true     // Acceso al sistema SIRE (compliance)
}
```

## Tipos de Planes

### Plan Basic
- **Acceso**: Solo contenido específico del tenant
- **Permisos**: `"muva_access": false`
- **Fuentes de datos**:
  - Tabla tenant-específica (ej: `simmerdown.policies`)
  - NO acceso a `muva_content`

### Plan Premium
- **Acceso**: Contenido tenant + contenido MUVA
- **Permisos**: `"muva_access": true`
- **Fuentes de datos**:
  - Tabla tenant-específica (ej: `simmerdown.policies`)
  - Tabla `muva_content` (actividades, restaurantes, etc.)

## Flujo de Verificación de Acceso

### En el Endpoint `/api/chat/listings`

1. **Verificar permisos del cliente**:
```typescript
const { data: permissions } = await supabase
  .from('user_tenant_permissions')
  .select('permissions')
  .eq('tenant_id', client_id)
  .eq('is_active', true)
  .limit(1)
  .maybeSingle()

const hasMuvaAccess = permissions?.permissions?.muva_access || false
```

2. **Búsqueda según permisos**:
   - **Siempre**: Buscar en tabla tenant-específica
   - **Si Premium**: Búsqueda adicional en `muva_content`

3. **Distribución de resultados**:
   - **Plan Basic**: 100% resultados tenant
   - **Plan Premium**: 50% tenant + 50% MUVA

## Ejemplo de Implementación

### Cliente Premium (SimmerDown)
```bash
# Consulta: "quiero hacer surf"
curl -X POST http://localhost:3000/api/chat/listings \
  -H "Content-Type: application/json" \
  -d '{
    "question": "quiero hacer surf en san andrés",
    "client_id": "b5c45f51-a333-4cdf-ba9d-ad0a17bf79bf",
    "business_type": "hotel"
  }'

# Respuesta incluye:
# - Información de SimmerDown (reglas sobre Habibi, etc.)
# - Información MUVA (Banzai Surf School, precios, ubicación)
```

### Logs de Sistema Premium
```
✅ Client has MUVA access (Premium plan)
🔍 Searching tenant-specific content...
✅ Found 2 tenant-specific results
🔍 Searching MUVA tourism content (Premium access)...
✅ Found 2 MUVA tourism results
📊 Sources: Tenant(2), MUVA(2)
```

## Contenido MUVA Disponible

### Tipos de Contenido
- **Actividades**: Escuelas de surf, tours, deportes acuáticos
- **Restaurantes**: Gastronomía local, especialidades
- **Hoteles**: Alojamientos adicionales
- **Transporte**: Opciones de movilidad
- **Cultura**: Sitios históricos, museos
- **Eventos**: Festivales, shows, entretenimiento

### Metadata Enriquecida
Cada documento MUVA incluye:
- **Ubicación**: Zona, subzona, landmarks cercanos
- **Precios**: Tarifas específicas y rangos
- **Contacto**: Teléfonos, redes sociales, websites
- **Horarios**: Disponibilidad y reservas
- **Segmentación**: Público objetivo (mochileros, lujo, familias)
- **Actividades**: Servicios específicos disponibles

## Administración de Acceso

### Otorgar Acceso MUVA
```sql
UPDATE user_tenant_permissions
SET permissions = jsonb_set(permissions, '{muva_access}', 'true')
WHERE tenant_id = 'TENANT_UUID'
  AND user_id = 'USER_UUID';
```

### Revocar Acceso MUVA
```sql
UPDATE user_tenant_permissions
SET permissions = jsonb_set(permissions, '{muva_access}', 'false')
WHERE tenant_id = 'TENANT_UUID'
  AND user_id = 'USER_UUID';
```

### Verificar Permisos Actuales
```sql
SELECT
  tr.nombre_comercial,
  utp.permissions,
  utp.role,
  utp.is_active
FROM user_tenant_permissions utp
JOIN tenant_registry tr ON utp.tenant_id = tr.tenant_id
WHERE utp.user_id = 'USER_UUID';
```

## Troubleshooting

### Cliente no ve contenido MUVA
1. Verificar permisos: `permissions.muva_access = true`
2. Confirmar tenant activo: `is_active = true`
3. Revisar logs de búsqueda en `/api/chat/listings`

### Errores comunes
- **"No MUVA access"**: Cliente tiene plan Basic
- **"No results"**: Threshold de búsqueda muy restrictivo
- **"Permission denied"**: Problema de RLS en Supabase

## Próximas Mejoras

- [ ] Dashboard de administración de permisos
- [ ] Métricas de uso por plan
- [ ] Gestión de renovaciones automáticas
- [ ] API para cambios de plan en tiempo real