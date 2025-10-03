# Dual Environment Strategy - Mobile-First Chat Interface

**Proyecto:** Chat Mobile Fullscreen
**Fecha:** 3 Octubre 2025
**Estrategia:** Development → Testing → Validation → Production

---

## 🎯 OVERVIEW

Esta estrategia establece dos ambientes paralelos para el proyecto Mobile-First Chat Interface:

1. **`/chat-mobile-dev`** - Ambiente de desarrollo/testing
2. **`/chat-mobile`** - Ambiente de producción

### ¿Por qué Ambientes Duales?

✅ **Seguridad**: Usuarios nunca ven código en desarrollo
✅ **Calidad**: Testing exhaustivo antes de producción
✅ **Consistencia**: Sigue el patrón de `/dev-chat-demo`
✅ **Workflow claro**: dev → test → validate → prod

---

## 📂 ESTRUCTURA DE ARCHIVOS

### Ambiente de Desarrollo (Primary)
```
src/app/chat-mobile-dev/
└── page.tsx                    # Página con badge "🚧 DEV MODE"

src/components/Dev/
└── DevChatMobileDev.tsx        # Componente donde se desarrolla TODO
```

### Ambiente de Producción (Secondary)
```
src/app/chat-mobile/
└── page.tsx                    # FASE 0: Placeholder → FASE 5: Producción

src/components/Dev/
└── DevChatMobile.tsx           # FASE 5: Copia exacta de DevChatMobileDev.tsx
```

---

## 🔄 WORKFLOW

### FASE 0: Setup (1h)
**Crear ambos ambientes**

1. Crear `/chat-mobile-dev` con badge visible
2. Crear `/chat-mobile` con placeholder "Coming Soon"
3. Crear `DevChatMobileDev.tsx` vacío
4. Documentar estrategia (este archivo)

### FASE 1-4: Desarrollo (8-12h)
**TODO el trabajo ocurre en `/chat-mobile-dev`**

```
FASE 1 → Implementar layout fullscreen en DevChatMobileDev.tsx
FASE 2 → Añadir safe areas, touch, scroll
FASE 3 → Portar features (streaming, markdown, etc)
FASE 4 → Polish, animaciones, a11y
```

**Testing durante FASE 1-4:**
- ✅ Probar SIEMPRE en http://localhost:3000/chat-mobile-dev
- ✅ Badge "🚧 DEV MODE" debe estar visible
- ✅ Lighthouse audit en ambiente dev
- ✅ Manual testing (iPhone, Pixel, Galaxy)

### FASE 5: Production Promotion (30min)
**Copiar código validado a producción**

1. **Validar precondiciones**:
   - [ ] FASE 1-4 completadas
   - [ ] Lighthouse score ≥ 90 en `/chat-mobile-dev`
   - [ ] Todos los tests e2e pasando
   - [ ] No hay issues bloqueantes
   - [ ] Manual testing exitoso

2. **Code Copy**:
   ```bash
   # Copiar DevChatMobileDev.tsx → DevChatMobile.tsx
   cp src/components/Dev/DevChatMobileDev.tsx \
      src/components/Dev/DevChatMobile.tsx
   ```

3. **Actualizar producción**:
   - Modificar `src/app/chat-mobile/page.tsx`
   - Importar `DevChatMobile` (NO DevChatMobileDev)
   - Remover badge "🚧 DEV MODE"
   - Limpiar console.logs

4. **Production Build**:
   ```bash
   npm run build
   npm start
   # Test: http://localhost:3000/chat-mobile
   ```

5. **Validation**:
   - Layout funciona igual que dev
   - Lighthouse ≥ 90
   - No errores en consola
   - Safe areas OK

6. **Documentation**:
   - Crear `PRODUCTION_RELEASE.md`
   - Timestamp, changelog
   - Known issues si los hay

---

## 🔧 DIFERENCIAS ENTRE AMBIENTES

| Aspecto | Development | Production |
|---------|-------------|------------|
| **URL** | /chat-mobile-dev | /chat-mobile |
| **Componente** | DevChatMobileDev.tsx | DevChatMobile.tsx |
| **Badge** | "🚧 DEV MODE" visible | Sin badge |
| **Console logs** | Permitidos | Limpios |
| **Comentarios** | "// DEV ONLY" OK | Removidos |
| **Testing** | Continuo | Solo pre-release |
| **Objetivo** | Experimentación | Estabilidad |

---

## ✅ CHECKLIST: ¿Cuándo Promover a Producción?

### Precondiciones
- [ ] FASE 1-4 completadas
- [ ] Todas las tareas en TODO.md marcadas `[x]`
- [ ] Lighthouse mobile score ≥ 90
- [ ] First Contentful Paint < 1.5s
- [ ] Time to Interactive < 3s
- [ ] Cumulative Layout Shift < 0.1

### Funcionalidad
- [ ] Layout fullscreen funcional
- [ ] Safe areas respetadas (notch, home bar)
- [ ] Touch targets ≥ 44px
- [ ] Streaming SSE funcional
- [ ] Markdown rendering completo
- [ ] Typing dots + cursor pulsante
- [ ] Photo carousel OK
- [ ] Follow-up suggestions clickeables

### UX/A11Y
- [ ] Smooth scroll a nuevos mensajes
- [ ] Keyboard no tapa input (iOS/Android)
- [ ] No bounce scroll (iOS)
- [ ] VoiceOver navigation OK
- [ ] TalkBack navigation OK
- [ ] ARIA labels completos
- [ ] Color contrast ≥ 4.5:1

### Compatibilidad
- [ ] iPhone 15/14 funciona
- [ ] Google Pixel 8 funciona
- [ ] Samsung Galaxy S24 funciona
- [ ] Landscape mode OK
- [ ] 360px - 430px width OK

### Documentación
- [ ] Docs de FASE 1-4 completas
- [ ] No hay ISSUES.md bloqueantes
- [ ] TESTS.md muestra todos los tests pasando

---

## 📋 COMANDOS ÚTILES

### Desarrollo
```bash
# Dev server
npm run dev

# Testing desarrollo
open http://localhost:3000/chat-mobile-dev

# Producción local (placeholder)
open http://localhost:3000/chat-mobile
```

### Testing Pre-Promotion
```bash
# Build producción
npm run build
npm start

# Lighthouse audit
# DevTools → Lighthouse → Mobile → Analyze

# Manual testing
# DevTools → Device toolbar (Cmd+Shift+M)
# - iPhone 15 Pro Max (430×932)
# - Google Pixel 8 Pro (412×915)
# - Samsung Galaxy S24 (360×800)
```

### Production Promotion (FASE 5)
```bash
# Copiar componente dev → prod
cp src/components/Dev/DevChatMobileDev.tsx \
   src/components/Dev/DevChatMobile.tsx

# Modificar src/app/chat-mobile/page.tsx
# (Actualizar import: DevChatMobile en vez de DevChatMobileDev)

# Build final
npm run build
npm start

# Validar producción
open http://localhost:3000/chat-mobile

# Lighthouse final audit
# Target: Performance ≥ 90, Accessibility ≥ 95
```

---

## 🚀 RESULTADO FINAL

Al completar FASE 5:

### `/chat-mobile-dev` (Development)
- ✅ Sigue disponible para futuras iteraciones
- ✅ Badge "🚧 DEV MODE" visible
- ✅ Ambiente seguro para experimentar
- ✅ Base para próximas mejoras

### `/chat-mobile` (Production)
- ✅ Versión estable para usuarios finales
- ✅ Sin badge de desarrollo
- ✅ Código limpio y optimizado
- ✅ Lighthouse ≥ 90
- ✅ Todos los criterios de éxito cumplidos

---

## 📚 REFERENCIAS

- **Plan completo**: `plan.md`
- **Tareas detalladas**: `TODO.md`
- **Prompts ejecutables**: `mobile-first-prompt-workflow.md`
- **Configuración agente**: `.claude/agents/ux-interface.md`

---

**Última actualización**: 3 Octubre 2025
**Estrategia**: Development → Testing → Validation → Production
**Filosofía**: "Nunca promover código no validado"
