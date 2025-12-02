# Quick Test Reference - GET Endpoint

**Última actualización:** 2025-11-09  
**Status:** ✅ GET endpoint implementado y testeado

---

## Test rápido

```bash
# Listar manuales de una unidad
curl http://localhost:3001/api/accommodation-manuals/dfe8772e-93ee-5949-8768-b45ec1b04f8a \
  -H "x-tenant-subdomain: simmerdown" | jq '.'
```

**Response esperado:**
```json
{
  "success": true,
  "data": [
    {
      "id": "fed16d3a-45d3-4a59-b625-4c8fca2eccba",
      "filename": "test-manual.md",
      "file_type": "md",
      "chunk_count": 3,
      "status": "completed",
      "processed_at": "2025-11-09T16:06:01.425+00:00"
    }
  ]
}
```

---

## Documentación completa

Ver `API_ENDPOINT_DOCUMENTATION.md` para:
- Especificación completa de endpoints POST y GET
- Arquitectura técnica
- Troubleshooting
- Testing checklist

---

## Test validado ✅

- [x] GET con unitId válido → 200 OK
- [x] GET retorna array de manuales
- [x] Chunks verificados en DB (3/3 con embeddings)
- [x] Upload completo funcionando (POST + embeddings)
