# Super Admin Content Management APIs

APIs para gestión de contenido turístico (.md files) y embeddings.

## Endpoints

### Upload Content
**POST** `/api/super-admin/content/upload`

Sube archivo .md y procesa embeddings automáticamente.

```bash
curl -X POST http://localhost:3000/api/super-admin/content/upload \
  -F "file=@archivo.md" \
  -F "category=actividades"
```

### List Content
**GET** `/api/super-admin/content/list`

Lista contenido con paginación y filtros.

```bash
curl "http://localhost:3000/api/super-admin/content/list?category=actividades&page=1&limit=50"
```

### Statistics
**GET** `/api/super-admin/content/stats`

Estadísticas agregadas por categoría.

```bash
curl http://localhost:3000/api/super-admin/content/stats
```

### Delete Content
**DELETE** `/api/super-admin/content/delete?id={uuid}`

Elimina contenido de DB y filesystem.

```bash
curl -X DELETE "http://localhost:3000/api/super-admin/content/delete?id=abc-123"
```

## Categorías Válidas

- `actividades` - Tours, experiencias
- `accommodations` - Hoteles, alojamientos
- `restaurants` - Restaurantes, gastronomía
- `rentals` - Alquiler de vehículos
- `spots` - Lugares de interés
- `culture` - Museos, eventos culturales

## Arquitectura

1. Usuario sube .md → API guarda en `_assets/muva/listings/{category}/`
2. API ejecuta `scripts/database/populate-embeddings.js`
3. Script genera embeddings (1024d, 1536d, 3072d)
4. Script inserta en `public.muva_content`
5. API retorna resultado

## Testing

```bash
./scripts/test-content-apis.sh
```

## Documentación Completa

Ver: `/docs/super-admin/content-management-apis.md`

**Estado:** ✅ Implementado (November 26, 2025)
