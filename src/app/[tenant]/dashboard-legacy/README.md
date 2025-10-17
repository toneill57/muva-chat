# Dashboard Legacy (Deprecated)

⚠️ **DEPRECATED**: Esta es la versión antigua del dashboard con tenant ID en la URL.

## URLs

**Legacy (esta versión):**
```
http://localhost:3000/b5c45f51-a333-4cdf-ba9d-ad0a17bf79bf/dashboard-legacy
```

**Nueva (recomendada):**
```
http://simmerdown.localhost:3000/dashboard
```

## Por qué existe esta versión

Esta versión se mantiene temporalmente para:
1. ✅ Referencia de funcionalidades que aún no están en el dashboard nuevo
2. ✅ Testing y comparación durante la migración
3. ✅ Backup de código que puede ser útil

## Diferencias con el Dashboard Nuevo

| Feature | Legacy | Nuevo |
|---------|--------|-------|
| **URL** | `/[tenant_id]/dashboard-legacy` | `/dashboard` |
| **Multi-tenant** | UUID en URL | Subdomain |
| **Routing** | `[tenant]` dynamic segment | Middleware + subdomain |
| **Estado** | Deprecated | Activo ✅ |

## Migración

Cuando el dashboard nuevo tenga **todas las funcionalidades** de este, se puede eliminar esta carpeta completamente.

### Checklist de Migración

- [ ] Todas las páginas migradas
- [ ] Todas las funcionalidades migradas
- [ ] Testing completo en producción
- [ ] Documentación actualizada
- [ ] **Entonces eliminar esta carpeta**

---

**Ubicación del Dashboard Nuevo:** `/src/app/dashboard/`
