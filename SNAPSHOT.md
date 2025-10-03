---
title: "InnPilot Project SNAPSHOT - Mobile-First Chat Interface"
description: "Estado actual del proyecto InnPilot - Octubre 2025. Desarrollo de interfaz mobile-first fullscreen para chat conversacional."
category: architecture-snapshot
status: PLANNING_COMPLETE
version: "1.0-MOBILE-FIRST-CHAT"
last_updated: "2025-10-03"
tags: [mobile_first, chat_interface, fullscreen, planning_complete, fase_1_ready]
keywords: ["mobile_first", "chat_interface", "fullscreen", "ux_interface", "safe_areas", "streaming_sse"]
---

# 🏗️ InnPilot Project SNAPSHOT - Mobile-First Chat Interface

**Última actualización**: 3 Octubre 2025
**Estado**: Planning Complete → FASE 1 Ready
**Agente Principal**: ux-interface

---

## 🎯 PROYECTO ACTUAL: Mobile-First Chat Interface (Oct 2025)

### Objetivo
Crear una interfaz de chat **fullscreen mobile-first** que elimina toda decoración/marketing y se enfoca 100% en la conversación. El chat debe ocupar toda la pantalla y estar optimizado para dispositivos móviles de alta gama.

### ¿Por qué?
- **Mobile-First App**: Mayoría de usuarios accederán desde celular
- **UX Limpia**: Eliminar distracciones, enfoque total en chat
- **Conversión**: Interacción intuitiva sin explicaciones
- **Performance**: Aprovechar enhancements actuales (streaming, markdown, typing dots)

### Alcance
- Nueva ruta `/chat-mobile` con interfaz fullscreen
- Soporte: iPhone 15/14, Google Pixel 8, Samsung Galaxy S24
- Mantener TODA la funcionalidad actual (streaming, markdown, photos, suggestions)
- Safe areas para notches, home bars, status bars

---

## 📊 ESTADO DEL PROYECTO

### Planificación
✅ **COMPLETADA** (3 Octubre 2025)

**Archivos creados:**
- 📄 `plan.md` (412 líneas) - Arquitectura completa, 4 fases
- 📋 `TODO.md` (300+ líneas) - Tareas detalladas por fase
- 🎯 `mobile-first-prompt-workflow.md` (750+ líneas) - Prompts ejecutables
- 🤖 `.claude/agents/ux-interface.md` (510 líneas) - Agent config actualizado
- 📖 `CLAUDE.md` (147 líneas) - Guía para Claude Code

### Fases de Desarrollo

#### FASE 1: Estructura Base (2-3h) - 🔜 READY TO START
- [ ] Crear página `/chat-mobile` (30min)
- [ ] Crear componente `DevChatMobile.tsx` (1.5h)
- [ ] Implementar layout móvil básico (1h)
- [ ] Testing visual en DevTools (30min)

#### FASE 2: Mobile Optimizations (3-4h) - Pending
- [ ] Safe areas (notch + home bar) (2h)
- [ ] Touch optimization (30min)
- [ ] Scroll behavior (1h)
- [ ] Keyboard handling (1h)

#### FASE 3: Feature Parity (2-3h) - Pending
- [ ] Streaming SSE (1h)
- [ ] Markdown + typing dots (1h)
- [ ] Photos carousel (30min)
- [ ] Suggestions (30min)

#### FASE 4: Polish & Performance (1-2h) - Pending
- [ ] Animaciones smooth (30min)
- [ ] Error handling (30min)
- [ ] Accessibility (1h)
- [ ] Lighthouse audit (30min)

**Timeline Total**: 8-12 horas de desarrollo

---

## 📐 ESPECIFICACIONES TÉCNICAS

### Layout Fullscreen
```
┌─────────────────────────────┐
│ Header (60px)               │ ← Fixed top, gradient teal
├─────────────────────────────┤
│                             │
│ Messages Area               │ ← Flex-1, scrollable
│ (flex-1, scroll)            │
│                             │
├─────────────────────────────┤
│ Input (80px)                │ ← Fixed bottom
└─────────────────────────────┘
```

### Mobile Viewport Targets
| Dispositivo | Width | Height | Safe Areas |
|-------------|-------|--------|------------|
| iPhone 15 Pro Max | 430px | 932px | Top: 59px, Bottom: 34px |
| iPhone 14 Pro | 393px | 852px | Top: 54px, Bottom: 34px |
| Google Pixel 8 Pro | 412px | 915px | Top: 48px, Bottom: 0px |
| Samsung Galaxy S24 | 360px | 800px | Top: 0px, Bottom: 0px |

### CSS Key Features
```css
/* Safe areas para notch y home bar */
padding-top: env(safe-area-inset-top);
padding-bottom: env(safe-area-inset-bottom);

/* Viewport dinámico para keyboard */
height: 100dvh;  /* NOT 100vh */

/* Touch optimization */
touch-action: manipulation;
min-width: 44px;  /* Touch targets */
min-height: 44px;

/* Smooth scroll */
scroll-behavior: smooth;
overscroll-behavior: contain;  /* No bounce */
```

### Features a Implementar
- **Streaming SSE**: Server-Sent Events para respuestas en tiempo real
- **Markdown**: react-markdown v9 + remark-gfm
- **Typing dots**: 3 puntos animados mientras espera
- **Cursor pulsante**: Cursor al final del texto mientras streamea
- **Photo carousel**: Galería de fotos de accommodations
- **Suggestions**: Botones de follow-up clickeables

### Performance Targets
- **Lighthouse Mobile**: ≥ 90
- **First Contentful Paint**: < 1.5s
- **Time to Interactive**: < 3s
- **Cumulative Layout Shift**: < 0.1
- **Animations**: 60fps consistente

---

## 🤖 AGENTES Y WORKFLOW

### Agente Principal: ux-interface
**Responsabilidad**: Implementación completa del UI mobile-first

**Tareas por fase:**
- FASE 1: Crear estructura base (page.tsx + DevChatMobile.tsx)
- FASE 2: Mobile optimizations (safe areas, touch targets)
- FASE 3: Feature parity (streaming, markdown, photos, suggestions)
- FASE 4: Polish & performance (animaciones, a11y, lighthouse)

**Configuración**: `.claude/agents/ux-interface.md` (510 líneas actualizadas)

### Workflow de Desarrollo
1. **Leer planificación**: plan.md → TODO.md → workflow.md
2. **Identificar fase**: Buscar próxima tarea `[ ]` en TODO.md
3. **Usar prompt**: Copiar de mobile-first-prompt-workflow.md
4. **Implementar**: Seguir specs de plan.md
5. **Testing**: Chrome DevTools (iPhone 15, Pixel 8, Galaxy S24)
6. **Documentar**: Crear docs/chat-mobile/fase-{N}/

---

## 🛠️ DESARROLLO - SETUP

### Development Server
```bash
# Iniciar con script recomendado (cleanup automático + API keys)
./scripts/dev-with-keys.sh

# Alternativamente (si .env.local configurado)
npm run dev

# URL del proyecto
http://localhost:3000/chat-mobile
```

### Scripts Disponibles
```bash
# Desarrollo
npm run dev                    # Dev server (port 3000)
npm run build                  # Production build
npm start                      # Run production build

# Testing
npm test                       # Jest tests
npm run lint                   # ESLint
```

### Variables de Entorno Requeridas
```bash
# .env.local
NEXT_PUBLIC_SUPABASE_URL=https://ooaumjzaztmutltifhoq.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=[your-key]
SUPABASE_SERVICE_ROLE_KEY=[your-key]
OPENAI_API_KEY=[your-key]
ANTHROPIC_API_KEY=[your-key]
```

---

## 📂 ESTRUCTURA DE ARCHIVOS

### Archivos de Planificación
```
/Users/oneill/Sites/apps/InnPilot/
├── plan.md                           # 🎯 Plan completo (412 líneas)
├── TODO.md                           # 📋 Tareas por fase (300+ líneas)
├── mobile-first-prompt-workflow.md   # 🚀 Prompts ejecutables (750+ líneas)
├── CLAUDE.md                         # 📖 Guía para Claude Code (147 líneas)
├── SNAPSHOT.md                       # 📸 Este archivo
└── .claude/
    └── agents/
        └── ux-interface.md           # 🤖 Agent config (510 líneas)
```

### Archivos a Crear (FASE 1)
```
src/
├── app/
│   └── chat-mobile/
│       └── page.tsx              # [TO CREATE] Página fullscreen
└── components/
    └── Dev/
        ├── DevChatInterface.tsx  # [REFERENCE] Base code
        └── DevChatMobile.tsx     # [TO CREATE] Mobile version
```

### Documentación a Generar
```
docs/
└── chat-mobile/
    ├── fase-1/
    │   ├── IMPLEMENTATION.md     # Qué se hizo
    │   ├── CHANGES.md            # Archivos modificados
    │   ├── TESTS.md              # Resultados tests
    │   └── ISSUES.md             # Problemas (si hay)
    ├── fase-2/
    ├── fase-3/
    └── fase-4/
```

---

## 📋 REFERENCIAS RÁPIDAS

### Archivos Clave
- **Plan completo**: `/Users/oneill/Sites/apps/InnPilot/plan.md`
- **Tareas**: `/Users/oneill/Sites/apps/InnPilot/TODO.md`
- **Prompts**: `/Users/oneill/Sites/apps/InnPilot/mobile-first-prompt-workflow.md`
- **Base code**: `/Users/oneill/Sites/apps/InnPilot/src/components/Dev/DevChatInterface.tsx`

### Comandos Útiles
```bash
# Testing responsive
# 1. Abrir DevTools (Cmd+Option+I)
# 2. Toggle device toolbar (Cmd+Shift+M)
# 3. Seleccionar: iPhone 15 Pro Max, Pixel 8, Galaxy S24
# 4. Reload (Cmd+R)

# Hard refresh (sin caché)
# Chrome/Edge: Cmd+Shift+R
# Safari: Cmd+Option+R
# DevTools: Right-click reload → Empty Cache and Hard Reload

# Lighthouse audit
# 1. npm run build && npm start
# 2. DevTools → Lighthouse tab
# 3. Device: Mobile
# 4. Click "Analyze page load"
```

### Quick Start para Nuevas Conversaciones
```
CONTEXTO: Mobile-First Chat Interface

Estoy en el proyecto "Mobile-First Chat Interface".
- Plan: plan.md
- Tareas: TODO.md
- Prompts: mobile-first-prompt-workflow.md

Próxima fase: FASE 1 (Estructura Base)
Agente: @ux-interface

Por favor lee los archivos y ejecuta Prompt 1.1
```

---

## 🎯 CRITERIOS DE ÉXITO

### Funcionalidad Core
- [ ] Ruta `/chat-mobile` accesible
- [ ] Chat fullscreen sin decoración marketing
- [ ] Streaming SSE funcional
- [ ] Markdown rendering completo
- [ ] Typing dots + cursor pulsante
- [ ] Photo carousel
- [ ] Follow-up suggestions

### Mobile UX
- [ ] Safe areas respetadas (notch, home bar)
- [ ] Touch targets ≥ 44px
- [ ] Keyboard no tapa input (iOS/Android)
- [ ] Smooth scroll a nuevos mensajes
- [ ] Landscape mode funcional
- [ ] No bounce scroll (iOS)

### Performance
- [ ] Lighthouse mobile ≥ 90
- [ ] FCP < 1.5s
- [ ] TTI < 3s
- [ ] CLS < 0.1

### Accesibilidad
- [ ] VoiceOver navigation OK
- [ ] TalkBack navigation OK (Android)
- [ ] ARIA labels completos
- [ ] Color contrast ≥ 4.5:1

### Compatibilidad
- [ ] iPhone 15/14 (Safari iOS 17+)
- [ ] Pixel 8 (Chrome Android 14+)
- [ ] Galaxy S24 (Samsung Internet)
- [ ] Funciona en 360px - 430px width

---

## 🚀 PRÓXIMOS PASOS INMEDIATOS

### 1. Ejecutar FASE 1 con @ux-interface
**Usar prompt 1.1** de `mobile-first-prompt-workflow.md`:
```
@ux-interface

TAREA: Crear página mobile-first en /chat-mobile
...
```

### 2. Validar Layout Básico
- Header fijo (60px)
- Messages área scrollable
- Input fijo (80px)
- Chrome DevTools testing

### 3. Continuar con FASE 2
- Safe areas implementation
- Touch optimization
- Scroll behavior

### 4. Completar FASE 3 y 4
- Feature parity
- Polish & performance

---

## 💡 NOTAS IMPORTANTES

### Reutilización de Código
- **DevChatInterface.tsx** es la fuente de verdad
- **DevChatMobile.tsx** copia toda la lógica de chat
- **Diferencia principal**: Layout (fullscreen vs bubble)

### Consideraciones Mobile
- **iOS Safari**: Viewport height cambia con keyboard (`100vh` → `100dvh`)
- **Android Chrome**: Address bar colapsa (usar `min-height: 100dvh`)
- **Safe Areas**: Solo iOS tiene notch/home bar, Android varía

### Performance Tips
- Lazy load photo carousel si hay muchas imágenes
- Debounce textarea auto-resize (reduce reflows)
- Use `will-change: transform` para animaciones smooth
- Evitar `box-shadow` en scroll (usar `border`)

---

## 📈 TRACKING DE PROGRESO

### Estado por Fase
- **FASE 1**: 0% (0/4 tareas) - 🔜 Ready to start
- **FASE 2**: 0% (0/5 tareas) - Pending
- **FASE 3**: 0% (0/5 tareas) - Pending
- **FASE 4**: 0% (0/5 tareas) - Pending

**Total Progress**: 0/19 tareas completadas (0%)

### Timeline Estimado
- **Inicio**: 3 Octubre 2025
- **FASE 1**: 3-4 Octubre (2-3h)
- **FASE 2**: 4-5 Octubre (3-4h)
- **FASE 3**: 5-6 Octubre (2-3h)
- **FASE 4**: 6-7 Octubre (1-2h)
- **Completado estimado**: 7 Octubre 2025

---

**🎨 Mobile-First Chat Interface**: Interfaz limpia, fullscreen, optimizada para móviles de alta gama. Planning completo, FASE 1 ready to start.

**✨ Next Action**: Ejecutar Prompt 1.1 con `@ux-interface` para crear página `/chat-mobile`
