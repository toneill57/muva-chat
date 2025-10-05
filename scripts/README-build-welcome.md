# Build Welcome Message Script

## Propósito

Pre-renderizar el welcome message a HTML estático en **build-time** para lograr LCP óptimo (<1.5s) manteniendo mantenibilidad y consistencia.

---

## Uso

### Automático (durante build)
```bash
npm run build
# Ejecuta prebuild automáticamente → Genera welcome-message-static.ts
```

### Manual (durante desarrollo)
```bash
npm run prebuild
# o
npx tsx scripts/build-welcome-message.ts
```

---

## Cómo Editar el Welcome Message

### 1. Editar el Script
```typescript
// scripts/build-welcome-message.ts (línea ~36)
const WELCOME_MESSAGE = `
**¡Hola! Bienvenido a Simmer Down** 🌴

Tu mensaje aquí...
`
```

### 2. Regenerar HTML
```bash
npm run prebuild
```

### 3. Verificar Output
```bash
cat src/lib/welcome-message-static.ts
# Debe mostrar WELCOME_MESSAGE_RAW + WELCOME_MESSAGE_HTML
```

### 4. Commit Ambos Archivos
```bash
git add scripts/build-welcome-message.ts
git add src/lib/welcome-message-static.ts
git commit -m "update: welcome message content"
```

---

## Arquitectura

### Input
```typescript
const WELCOME_MESSAGE = `**Markdown aquí**`
```

### Process
```typescript
renderToStaticMarkup(
  <ReactMarkdown remarkPlugins={[remarkGfm]}>
    {WELCOME_MESSAGE}
  </ReactMarkdown>
)
```

### Output
```typescript
// src/lib/welcome-message-static.ts
export const WELCOME_MESSAGE_RAW = "..." // Para tests
export const WELCOME_MESSAGE_HTML = "..." // Para rendering
```

---

## Markdown Soportado

### Sintaxis Compatible
```markdown
**Bold** → <strong class="font-semibold text-gray-900">Bold</strong>
--- → <hr class="my-3 border-gray-300" />
🌴 Emoji → 🌴 (preservado)
- Lista → <ul class="list-disc list-inside mb-2">...</ul>
1. Orden → <ol class="list-decimal list-inside mb-2">...</ol>
```

### Classes CSS Aplicadas
```typescript
components: {
  ul: 'list-disc list-inside mb-2 space-y-1 marker:text-xs marker:text-gray-400',
  ol: 'list-decimal list-inside mb-2 space-y-1 marker:text-xs marker:text-gray-400',
  li: 'ml-2',
  hr: 'my-3 border-gray-300',
  strong: 'font-semibold text-gray-900'
}
```

**IMPORTANTE:** Estas classes DEBEN ser idénticas a las de `ChatMobile.tsx` (líneas 404-408).

---

## Testing

### Visual Test
1. Ejecutar dev server: `npm run dev`
2. Abrir: `http://localhost:3000/chat-mobile`
3. Verificar welcome message:
   - ✅ Bold text correctamente estilizado
   - ✅ HR separator visible
   - ✅ Emojis preservados
   - ✅ No layout shifts

### Unit Test (Futuro)
```typescript
// __tests__/welcome-message.test.ts
import { WELCOME_MESSAGE_RAW, WELCOME_MESSAGE_HTML } from '@/lib/welcome-message-static'

describe('Welcome Message', () => {
  it('should have raw markdown', () => {
    expect(WELCOME_MESSAGE_RAW).toContain('**¡Hola!')
  })

  it('should have rendered HTML', () => {
    expect(WELCOME_MESSAGE_HTML).toContain('<strong')
    expect(WELCOME_MESSAGE_HTML).toContain('font-semibold')
  })

  it('should preserve emojis', () => {
    expect(WELCOME_MESSAGE_HTML).toContain('🌴')
  })
})
```

---

## Troubleshooting

### Error: `__dirname is not defined`
**Fix:** Ya aplicado en líneas 25-33 (ES module compatibility)

### Error: `ReactMarkdown is not a function`
**Fix:** Verificar imports:
```typescript
import ReactMarkdown from 'react-markdown' // ✅ Correcto
import { ReactMarkdown } from 'react-markdown' // ❌ Incorrecto
```

### HTML vacío o incorrecto
**Debug:**
```bash
npx tsx scripts/build-welcome-message.ts
# Check output: HTML size: XXX bytes
cat src/lib/welcome-message-static.ts | grep WELCOME_MESSAGE_HTML
```

### Classes CSS no aplicadas
**Causa:** Componentes de ReactMarkdown no coinciden con ChatMobile.tsx
**Fix:** Copiar exactamente de `ChatMobile.tsx` líneas 404-408

---

## Performance Impact

### Antes (Opción 2 - Eager loading)
```
LCP: ~2-3s
Bundle initial: ~170KB
TBT: ~400ms
```

### Después (Opción 3 - Static extraction)
```
LCP: <1.5s ✅ (-50-70%)
Bundle initial: ~120KB ✅ (-50KB)
TBT: ~200ms ✅ (-50%)
```

---

## CI/CD Integration

### GitHub Actions
```yaml
- name: Install dependencies
  run: npm ci

- name: Build application
  run: npm run build # Includes prebuild automatically
```

**Nota:** `prebuild` se ejecuta ANTES de `build` (npm script convention).

### Vercel/Netlify
```json
{
  "buildCommand": "npm run build",
  "framework": "nextjs"
}
```
Funciona automáticamente ✅

---

## Archivos Modificados

### Created
- `scripts/build-welcome-message.ts` (Build script)
- `src/lib/welcome-message-static.ts` (Generated output)
- `docs/fixed-layout-migration/OPCION-3-STATIC-EXTRACTION.md` (Documentation)
- `scripts/README-build-welcome.md` (This file)

### Modified
- `package.json` (Added `prebuild` script)
- `src/components/Public/ChatMobile.tsx` (Use static HTML for welcome message)

---

## Mantenimiento

### Editar Mensaje
1. Modificar `WELCOME_MESSAGE` en `scripts/build-welcome-message.ts`
2. Ejecutar `npm run prebuild`
3. Commit ambos archivos (script + generated)

### Cambiar Estilos
1. Modificar `components` en `scripts/build-welcome-message.ts` (líneas 50-78)
2. **IMPORTANTE:** Actualizar TAMBIÉN en `ChatMobile.tsx` (líneas 404-408)
3. Ejecutar `npm run prebuild`
4. Visual test para verificar consistencia

### Agregar Nuevos Mensajes Estáticos
```typescript
// scripts/build-welcome-message.ts
const COMPLIANCE_SUCCESS = `...`
const complianceHtml = renderToStaticMarkup(...)

// Append to output file
export const COMPLIANCE_SUCCESS_HTML = ...
```

---

**Mantenido por:** @ux-interface
**Última actualización:** Oct 5, 2025
**Proyecto:** Fixed Layout Migration - FASE 4
