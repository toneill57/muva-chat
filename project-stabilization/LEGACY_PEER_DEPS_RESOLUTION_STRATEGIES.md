# Estrategias para Remover --legacy-peer-deps

**Fecha:** 30 Octubre 2025
**Contexto:** FASE 3 completada, peer dependency conflict bloqueado por @browserbasehq/stagehand

---

## 🔍 Análisis del Conflicto

### Cadena de Dependencias

```
nuestra app
  └─ @langchain/community@1.0.0
      └─ peerDependency: @browserbasehq/stagehand@^1.0.0
          └─ dependency: openai@^4.87.1
              ⚠️ CONFLICTO con nuestro openai@6.7.0
```

### Conflicto Detallado

```
npm ERR! While resolving: @langchain/community@1.0.0
npm ERR! Found: openai@6.7.0
npm ERR!
npm ERR! Conflicting peer dependency: openai@4.104.0
npm ERR!   peer openai@"^4.62.1" from @browserbasehq/stagehand@1.14.0
```

### ¿Usamos Stagehand?

**NO.** Búsqueda en código:
```bash
grep -r "stagehand\|@browserbasehq" src/
# Result: (empty) ✅
```

**Conclusión:** Stagehand es una dependencia **opcional** (peer dependency) de LangChain que NO usamos.

---

## 🎯 Estrategias de Resolución

### ⭐ **ESTRATEGIA 1: Usar npm overrides (RECOMENDADA)**

**Descripción:** Forzar que stagehand use nuestro openai@6.x

**Implementación:**
```json
// package.json
{
  "overrides": {
    "@browserbasehq/stagehand": {
      "openai": "^6.7.0"
    }
  }
}
```

**Pros:**
- ✅ Elimina --legacy-peer-deps
- ✅ No requiere modificar dependencias
- ✅ Funcionalidad intacta (no usamos stagehand)
- ✅ Solución oficial de npm

**Cons:**
- ⚠️ Si algún día usamos stagehand, puede romper
- ⚠️ Requiere npm 8.3.0+ (tenemos 10.9.2 ✅)

**Riesgo:** 🟢 **MUY BAJO** (no usamos stagehand)

**Testing:**
```bash
# Agregar override a package.json
npm install  # SIN --legacy-peer-deps
npm run build
npm run test
```

---

### 🔧 **ESTRATEGIA 2: Usar pnpm en vez de npm**

**Descripción:** pnpm maneja peer dependencies de forma más flexible

**Implementación:**
```bash
# Instalar pnpm
npm install -g pnpm

# Configurar
echo "auto-install-peers=true" > .npmrc
echo "strict-peer-dependencies=false" >> .npmrc

# Usar pnpm
pnpm install
pnpm run build
```

**Pros:**
- ✅ Mejor manejo de monorepos
- ✅ Más rápido que npm
- ✅ Menos espacio en disco (symlinks)
- ✅ Auto-instala peer dependencies

**Cons:**
- ❌ Cambio de package manager (CI/CD)
- ❌ Curva de aprendizaje
- ❌ Lock file diferente (pnpm-lock.yaml)
- ❌ VPS requiere pnpm instalado

**Riesgo:** 🟡 **MEDIO** (infraestructura completa)

---

### 📦 **ESTRATEGIA 3: .npmrc con configuración permisiva**

**Descripción:** Configurar npm para ser más flexible con peer deps

**Implementación:**
```bash
# .npmrc
legacy-peer-deps=true
```

**Pros:**
- ✅ Fácil de implementar
- ✅ No requiere cambios en package.json

**Cons:**
- ❌ Solo oculta el problema
- ❌ NO elimina --legacy-peer-deps del flujo
- ❌ Warnings siguen apareciendo

**Riesgo:** 🟢 **BAJO** pero NO resuelve el problema

**Veredicto:** ❌ **NO RECOMENDADA** (equivalente a status quo)

---

### 🎭 **ESTRATEGIA 4: Fork @langchain/community sin stagehand**

**Descripción:** Crear fork de LangChain sin la peer dependency de stagehand

**Implementación:**
```bash
# 1. Fork @langchain/community
# 2. Remover stagehand de peerDependencies
# 3. Publicar como @muva/langchain-community
# 4. Usar nuestro fork
```

**Pros:**
- ✅ Control total sobre dependencias
- ✅ Elimina conflicto completamente

**Cons:**
- ❌ Mantenimiento manual
- ❌ No recibimos updates de LangChain
- ❌ Complejidad adicional
- ❌ Requiere publicar a npm registry

**Riesgo:** 🔴 **ALTO** (mantenimiento)

**Veredicto:** ❌ **NO RECOMENDADA** (overkill)

---

### 🎯 **ESTRATEGIA 5: Esperar actualización upstream**

**Descripción:** Esperar que LangChain o Stagehand actualicen

**Tracking:**
- LangChain Community: https://github.com/langchain-ai/langchainjs/issues
- Stagehand: https://github.com/browserbase/stagehand/issues

**Pros:**
- ✅ Sin esfuerzo de nuestra parte
- ✅ Solución oficial

**Cons:**
- ❌ Sin timeline definido
- ❌ Puede tomar semanas/meses
- ❌ Mantenemos --legacy-peer-deps mientras tanto

**Riesgo:** 🟡 **MEDIO** (tiempo indefinido)

**Veredicto:** ⏳ **OPCIÓN DE RESPALDO**

---

### 🔍 **ESTRATEGIA 6: Usar resolutions (Yarn/pnpm style)**

**Descripción:** Forzar resolución de paquetes (requiere yarn o pnpm)

**Implementación (requiere Yarn):**
```json
// package.json
{
  "resolutions": {
    "@browserbasehq/stagehand/openai": "^6.7.0"
  }
}
```

**Pros:**
- ✅ Similar a overrides de npm
- ✅ Funciona bien con Yarn

**Cons:**
- ❌ npm no soporta `resolutions` nativamente
- ❌ Requiere cambiar a Yarn
- ❌ Infraestructura completa

**Riesgo:** 🟡 **MEDIO** (cambio de tooling)

**Veredicto:** 🤔 **Considerar solo si migramos a Yarn**

---

## 🏆 Recomendación Final

### **ESTRATEGIA 1: npm overrides** ⭐

**Razones:**
1. ✅ **Solución oficial de npm** (npm 8.3+)
2. ✅ **Cero riesgo** - no usamos stagehand
3. ✅ **Elimina --legacy-peer-deps** completamente
4. ✅ **Sin cambio de infraestructura**
5. ✅ **Fácil rollback** (remover override)

### Plan de Implementación

#### Paso 1: Agregar Override
```json
// package.json
{
  "name": "muva-chat",
  "version": "0.1.0",
  "overrides": {
    "@browserbasehq/stagehand": {
      "openai": "^6.7.0"
    }
  },
  "dependencies": {
    // ... existing
  }
}
```

#### Paso 2: Testing Local
```bash
# Limpiar
rm -rf node_modules package-lock.json

# Instalar SIN --legacy-peer-deps
npm install

# Verificar
npm run build
npm run test

# Smoke test
./scripts/dev-with-keys.sh
# Test AI features (chat, embeddings)
```

#### Paso 3: Deploy a Staging
```bash
git add package.json package-lock.json
git commit -m "fix(deps): use npm overrides to resolve stagehand conflict"
git push origin dev

# Deploy staging
./scripts/deploy-staging.sh

# Validar staging
# - Build exitoso
# - PM2 online
# - AI features funcionando
```

#### Paso 4: Deploy a Production
```bash
# Si staging OK
./scripts/deploy-dev.sh

# Monitor 24h
```

#### Paso 5: Actualizar Docs
```bash
# Actualizar CLAUDE.md
# Remover menciones de --legacy-peer-deps

# Actualizar scripts si es necesario
# package.json scripts ya no necesitan flag
```

---

## 📊 Comparación de Estrategias

| Estrategia | Riesgo | Esfuerzo | Tiempo | Elimina Flag | Mantenible |
|------------|--------|----------|--------|--------------|------------|
| 1. npm overrides | 🟢 Bajo | 🟢 Bajo | 30 min | ✅ | ✅ |
| 2. pnpm | 🟡 Medio | 🔴 Alto | 4h | ✅ | ✅ |
| 3. .npmrc | 🟢 Bajo | 🟢 Bajo | 5 min | ❌ | ❌ |
| 4. Fork LangChain | 🔴 Alto | 🔴 Alto | 8h+ | ✅ | ❌ |
| 5. Esperar upstream | 🟡 Medio | 🟢 Ninguno | ∞ | ⏳ | ✅ |
| 6. resolutions (Yarn) | 🟡 Medio | 🟡 Medio | 2h | ✅ | ✅ |

---

## ✅ Criterios de Éxito

### Must Have
- ✅ Eliminar --legacy-peer-deps de todos los comandos
- ✅ `npm install` funciona sin flags
- ✅ Build exitoso
- ✅ Tests pasando
- ✅ AI features funcionales

### Should Have
- ✅ Sin warnings de peer dependencies
- ✅ CI/CD funciona sin cambios
- ✅ VPS deploy sin cambios en workflow

### Nice to Have
- ✅ Documentación actualizada
- ✅ Scripts simplificados

---

## 🚀 Siguiente Paso

**Recomendación:** Implementar **Estrategia 1 (npm overrides)** en FASE 3.5 (opcional)

**Timeline:**
- Implementación: 30 minutos
- Testing: 1 hora
- Deploy: 1 hora
- **Total: 2.5 horas**

**Alternativa:** Postponer hasta después de FASE 6 (menor prioridad)

---

## 📚 Referencias

- npm overrides: https://docs.npmjs.com/cli/v9/configuring-npm/package-json#overrides
- pnpm peer deps: https://pnpm.io/faq#how-to-handle-peer-dependencies
- LangChain Community: https://github.com/langchain-ai/langchainjs
- Stagehand: https://github.com/browserbase/stagehand

---

**Creado:** 30 Octubre 2025
**Estado:** Ready for Implementation
**Prioridad:** MEDIA (nice to have, no bloqueante)
