# Smoke Test Checklist - Post Dependency Updates

**Objetivo:** Verificar que todas las actualizaciones de dependencias no introdujeron regresiones visuales o funcionales.

## Pre-requisitos

```bash
# 1. Asegurarse de estar en rama dev
git branch --show-current
# Expected: dev

# 2. Verificar que build pasó
npm run build
# Expected: ✅ Sin errores

# 3. Iniciar servidor local
./scripts/dev-with-keys.sh
# Expected: Server corriendo en http://localhost:3000
```

## Tests Manuales Requeridos

### 1. Home Page (Public)
- [ ] Abrir: http://simmerdown.localhost:3000
- [ ] Verificar:
  - [ ] Página carga sin errores console
  - [ ] Estilos Tailwind renderizando correctamente
  - [ ] Branding/logo visible
  - [ ] Botones interactivos

**Paquetes verificados:** tailwindcss, @tailwindcss/postcss, react, react-dom

---

### 2. Staff Login
- [ ] Abrir: http://simmerdown.localhost:3000/staff/login
- [ ] Verificar:
  - [ ] Form renderiza correctamente
  - [ ] Icons de lucide-react visibles (eye icon, etc)
  - [ ] Validación de campos funciona
  - [ ] Login exitoso redirige a dashboard

**Credenciales test:**
```
Username: admin_ceo
Password: (ver .env.local)
```

**Paquetes verificados:** lucide-react, react, framer-motion

---

### 3. Dashboard (Staff Area)
- [ ] Abrir: http://simmerdown.localhost:3000/dashboard
- [ ] Verificar:
  - [ ] Dashboard carga con autenticación
  - [ ] Gráficos (recharts) renderizando
  - [ ] Estadísticas mostrando datos
  - [ ] Navegación entre secciones funciona
  - [ ] Icons en sidebar (lucide-react)

**Paquetes verificados:** recharts, lucide-react, framer-motion, @supabase/supabase-js

---

### 4. Chat Interface (Guest)
- [ ] Obtener guest token (usar API o DB)
- [ ] Abrir: http://simmerdown.localhost:3000/guest-chat/[tenant_id]
- [ ] Verificar:
  - [ ] Chat interface renderiza
  - [ ] TipTap editor funciona (si usado)
  - [ ] Mensajes envían correctamente
  - [ ] Streaming responses funcionan
  - [ ] File upload funciona (pdfjs-dist)

**Paquetes verificados:** @tiptap/react, @tiptap/starter-kit, @anthropic-ai/sdk, pdfjs-dist

---

### 5. Accommodations Management
- [ ] Abrir: http://simmerdown.localhost:3000/accommodations/units
- [ ] Verificar:
  - [ ] Lista de unidades carga
  - [ ] Supabase queries funcionan
  - [ ] Filtros/búsqueda operativos
  - [ ] CRUD operations funcionan

**Paquetes verificados:** @supabase/supabase-js, react, lucide-react

---

### 6. Calendar View
- [ ] Abrir: http://simmerdown.localhost:3000/accommodations/calendar
- [ ] Verificar:
  - [ ] Calendario renderiza
  - [ ] Eventos/reservas visibles
  - [ ] Navegación entre meses funciona
  - [ ] Interacciones funcionan (click, hover)

**Paquetes verificados:** react, framer-motion, @supabase/supabase-js

---

### 7. Analytics
- [ ] Abrir: http://simmerdown.localhost:3000/analytics
- [ ] Verificar:
  - [ ] Gráficos (recharts) renderizando correctamente
  - [ ] Tooltips funcionan
  - [ ] Datos cargan desde Supabase
  - [ ] Filtros de fecha funcionan
  - [ ] Export funciona (si habilitado)

**Paquetes verificados:** recharts, @supabase/supabase-js, react

---

### 8. PDF Processing (if applicable)
- [ ] Subir documento PDF en Knowledge Base
- [ ] Verificar:
  - [ ] PDF preview renderiza (pdfjs-dist)
  - [ ] Texto extractable
  - [ ] Procesamiento completa sin errores

**Paquetes verificados:** pdfjs-dist, react-pdf

---

### 9. Console Errors
Durante TODOS los tests anteriores, mantener DevTools abierto:

- [ ] ❌ NO errores críticos en console
- [ ] ⚠️ Warnings esperados:
  - Deprecated APIs (documentar si nuevos)
  - Third-party libraries (documentar si nuevos)
- [ ] ❌ NO errores de TypeScript
- [ ] ❌ NO errores de red (500s, 404s inesperados)

---

## Tests de Regresión Específicos

### Supabase Client (@supabase/supabase-js)
```bash
# Verificar que queries funcionan
curl -X POST http://simmerdown.localhost:3000/api/tenant/list \
  -H "Content-Type: application/json"
# Expected: Lista de tenants
```

### Anthropic SDK (@anthropic-ai/sdk)
```bash
# Verificar que chat funciona
curl -X POST http://simmerdown.localhost:3000/api/guest/chat \
  -H "Authorization: Bearer [token]" \
  -H "Content-Type: application/json" \
  -d '{"message": "Test message"}'
# Expected: Streaming response
```

### TypeScript Compilation
```bash
npm run type-check
# Expected: ✅ Sin errores
```

---

## Checklist de Finalización

### Pre-Commit
- [ ] Todos los tests manuales pasados
- [ ] NO errores críticos en console
- [ ] Build exitoso
- [ ] Tests unitarios pasando (161/183)
- [ ] Documentación creada:
  - [ ] DEPENDENCY_UPDATE_PLAN.md
  - [ ] GRUPO_1_RESUMEN.md
  - [ ] SMOKE_TEST_CHECKLIST.md (este archivo)

### Commit
```bash
git status
# Verificar archivos modificados:
# - package.json
# - package-lock.json
# - project-stabilization/docs/fase-3/*

git add package.json package-lock.json
git add project-stabilization/docs/fase-3/

git commit -m "chore(deps): update 23 safe dependencies (GRUPO 1)

- Update @anthropic-ai/sdk 0.63.0 → 0.68.0
- Update @supabase/supabase-js 2.57.4 → 2.77.0
- Update React 19.1.0 → 19.2.0
- Update TypeScript 5.9.2 → 5.9.3
- Update 19 other packages (patches & minors)

All builds passing, no regressions detected.
See: project-stabilization/docs/fase-3/DEPENDENCY_UPDATE_PLAN.md"
```

### Post-Commit
- [ ] Push a dev branch (NO a main)
- [ ] Monitorear CI/CD (si existe)
- [ ] Notificar equipo de actualización
- [ ] Proceder con GRUPO 2

---

## Troubleshooting

### Si hay errores en console nuevos
1. Identificar paquete responsable
2. Revisar CHANGELOG del paquete
3. Buscar breaking changes no documentados
4. Considerar rollback del paquete específico:
   ```bash
   npm install [package]@[version-anterior]
   ```

### Si build falla después de smoke test
1. Verificar que .env.local tiene todas las keys
2. Limpiar cache:
   ```bash
   rm -rf .next
   npm run build
   ```

### Si Supabase queries fallan
1. Verificar compatibilidad de @supabase/supabase-js 2.77.0
2. Revisar breaking changes: https://github.com/supabase/supabase-js/releases
3. Considerar downgrade temporal si necesario

---

**Tiempo estimado:** 15-20 minutos
**Prioridad:** 🔴 CRÍTICO antes de commit
**Responsable:** Developer que ejecuta el update
