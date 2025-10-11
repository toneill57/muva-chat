# TODO - InnPilot → MUVA Chat Rebrand

**Proyecto:** InnPilot to MUVA Chat Rebrand
**Fecha:** 2025-10-11
**Plan:** Ver `plan.md` para contexto completo

---

## FASE 1: Core Branding 🎯

### 1.1 Actualizar README.md
- [ ] Rebrandear README.md completo (estimate: 30min)
  - Título: "InnPilot" → "MUVA Chat - Multi-Tenant Tourism Platform"
  - Descripción: Destacar multi-tenant + turismo + SIRE como feature
  - Actualizar todas las secciones manteniendo estructura
  - Preservar ejemplos técnicos (solo cambiar branding)
  - Files: `README.md`
  - Agent: **@agent-backend-developer**
  - Test: Leer README completo, verificar coherencia

### 1.2 Actualizar package.json
- [ ] Cambiar name y description (estimate: 15min)
  - `"name": "innpilot"` → `"name": "muva-chat"`
  - `"description"` → "Multi-tenant chat platform with SIRE compliance"
  - Verificar que no rompa imports
  - Files: `package.json`
  - Agent: **@agent-backend-developer**
  - Test: `npm run build` debe pasar sin errores

### 1.3 Actualizar CLAUDE.md
- [ ] Actualizar contexto del proyecto (estimate: 30min)
  - Cambiar referencias "InnPilot" → "MUVA Chat"
  - Actualizar descripción del proyecto
  - Mantener reglas técnicas intactas
  - Actualizar ejemplos de URLs si necesario
  - Files: `CLAUDE.md`
  - Agent: **@agent-backend-developer**
  - Test: Leer CLAUDE.md completo, verificar coherencia

### 1.4 Actualizar Metadata en layout.tsx
- [ ] Cambiar browser title y description (estimate: 15min)
  - metadata.title: "MUVA Chat"
  - metadata.description: Describir multi-tenant platform
  - Verificar que se renderiza correctamente
  - Files: `src/app/layout.tsx`
  - Agent: **@agent-ux-interface**
  - Test: Abrir https://muva.chat en browser, verificar tab title

---

## FASE 2: Documentation Restructure ⚙️

### 2.1 Crear nueva estructura /docs
- [ ] Crear carpetas features/ (estimate: 15min)
  - Crear `docs/features/`
  - Crear `docs/features/sire-compliance/`
  - Crear `docs/features/multi-tenant-chat/`
  - Crear `docs/features/tourism-content/`
  - Files: Estructura de carpetas
  - Agent: **@agent-backend-developer**
  - Test: Verificar carpetas existen con `ls -la docs/features/`

### 2.2 Migrar SIRE docs
- [ ] Mover docs/features/sire-compliance/* a features/sire-compliance/ (estimate: 30min)
  - Mover todos los archivos .md de `docs/features/sire-compliance/`
  - Actualizar links internos si es necesario
  - Crear `docs/features/sire-compliance/README.md` destacando value proposition
  - Files: `docs/features/sire-compliance/*` → `docs/features/sire-compliance/*`
  - Agent: **@agent-backend-developer**
  - Test: Verificar archivos movidos, links funcionan

### 2.3 Crear docs/README.md nuevo
- [ ] Escribir overview de MUVA Chat platform (estimate: 45min)
  - Sección: Overview de MUVA Chat
  - Sección: Features principales (Multi-tenant, SIRE, Tourism)
  - Sección: Quick links a features/
  - Sección: Getting Started
  - Files: `docs/README.md` (crear nuevo)
  - Agent: **@agent-backend-developer**
  - Test: Leer README.md, verificar links funcionan

### 2.4 Batch replacement en docs/
- [ ] Reemplazar "InnPilot" → "MUVA" en ~200 archivos (estimate: 45min)
  - Ejecutar: `find docs/ -name "*.md" -type f ! -path "*/archive/*" ! -path "*/muva-migration/*" -exec sed -i.bak 's/InnPilot/MUVA/g' {} +`
  - Reemplazar frases comunes: "Plataforma de Gestión SIRE" → "Multi-Tenant Chat Platform"
  - Verificar que no se rompieron links
  - Limpiar archivos .bak: `find docs/ -name "*.bak" -delete`
  - Files: ~200 archivos en `docs/`
  - Agent: **@agent-backend-developer**
  - Test: `grep -r "InnPilot" docs/ | grep -v muva-migration | grep -v archive` → debe retornar 0 results

### 2.5 Crear docs de multi-tenant chat
- [ ] Crear documentación de multi-tenant feature (estimate: 45min)
  - Crear `docs/features/multi-tenant-chat/README.md`
  - Contenido: Subdomain routing, tenant isolation, admin dashboard
  - Cross-references a docs existentes (tenant-subdomain-chat/)
  - Files: `docs/features/multi-tenant-chat/README.md`
  - Agent: **@agent-backend-developer**
  - Test: Leer documento, verificar cross-references funcionan

---

## FASE 3: VPS Infrastructure ✨

### 3.1 Rename PM2 process
- [ ] Cambiar process name de "innpilot" → "muva-chat" (estimate: 30min)
  - SSH a VPS: `ssh oneill@muva.chat`
  - Stop process: `pm2 stop innpilot`
  - Delete process: `pm2 delete innpilot`
  - Start new: `pm2 start npm --name "muva-chat" -- start`
  - Save: `pm2 save`
  - Files: VPS PM2 config
  - Agent: **@agent-deploy-agent**
  - Test: `pm2 status` debe mostrar "muva-chat" online

### 3.2 Actualizar Nginx config
- [ ] Update Nginx comments y opcional rename (estimate: 30min)
  - Opción A (rename): `sudo mv /etc/nginx/sites-available/innpilot.conf /etc/nginx/sites-available/muva.conf`
  - Opción B (keep): Solo actualizar comentarios internos en innpilot.conf
  - Actualizar comentarios: "InnPilot subdomain routing" → "MUVA Chat subdomain routing"
  - Test config: `sudo nginx -t`
  - Reload: `sudo systemctl reload nginx`
  - Files: VPS Nginx config
  - Agent: **@agent-deploy-agent**
  - Test: `sudo nginx -t` pasa, `https://muva.chat` carga correctamente

### 3.3 Verificar deployment
- [ ] Health check post-cambios (estimate: 30min)
  - Verificar: https://muva.chat/api/health
  - Verificar: https://simmerdown.muva.chat/chat
  - Verificar: PM2 logs sin errores
  - Verificar: Nginx logs sin errores
  - Files: N/A (verificación)
  - Agent: **@agent-deploy-agent**
  - Test: Todos los endpoints responden 200 OK

### 3.4 Actualizar deployment scripts
- [ ] Update scripts con nuevo naming (estimate: 20min)
  - Buscar scripts con "innpilot" en nombres o comentarios
  - Actualizar references a PM2 process name
  - Actualizar docs de deployment
  - Files: `scripts/*`, `docs/deployment/*`
  - Agent: **@agent-deploy-agent**
  - Test: Leer scripts, verificar coherencia

---

## FASE 4: Source Code 🎨

### 4.1 Actualizar UI strings
- [ ] Buscar y actualizar strings visibles (estimate: 30min)
  - Buscar: `grep -r "InnPilot" src/components/ --include="*.tsx"`
  - Actualizar solo strings visibles al usuario
  - NO cambiar nombres técnicos (funciones, variables)
  - Files: `src/components/**/*.tsx`
  - Agent: **@agent-ux-interface**
  - Test: Visual check en browser, verificar strings actualizados

### 4.2 Actualizar comentarios en código
- [ ] Revisar comentarios en source (estimate: 20min)
  - Buscar: `grep -r "InnPilot" src/ --include="*.ts" --include="*.tsx"`
  - Actualizar comentarios descriptivos (~23 archivos)
  - Mantener referencias técnicas si necesario
  - Files: `src/**/*.ts`, `src/**/*.tsx`
  - Agent: **@agent-backend-developer**
  - Test: `npm run lint` pasa sin errores

### 4.3 Verificar imports
- [ ] Asegurar que no se rompieron imports (estimate: 10min)
  - npm run build completo
  - Verificar TypeScript compilation
  - Revisar console por errores
  - Files: All source files
  - Agent: **@agent-backend-developer**
  - Test: `npm run build` pasa, `npm run lint` pasa

---

## FASE 5: Final Verification 🚀

### 5.1 Testing completo
- [ ] Ejecutar suite de tests (estimate: 30min)
  - npm run build
  - npm run lint
  - npm test (si hay tests)
  - Manual testing: Chat, SIRE, Admin
  - Manual testing: 2 tenants diferentes
  - Files: N/A (testing)
  - Agent: **@agent-infrastructure-monitor**
  - Test: Todos los tests pasan, funcionalidad intacta

### 5.2 Búsqueda final de referencias
- [ ] Verificar que no quedan referencias InnPilot (estimate: 15min)
  - Ejecutar: `grep -r "InnPilot" docs/ | grep -v muva-migration | grep -v archive`
  - Ejecutar: `grep -r "InnPilot" src/`
  - Ejecutar: `grep -r "innpilot" package.json`
  - Documentar resultados
  - Files: N/A (verification)
  - Agent: **@agent-backend-developer**
  - Test: Solo resultados esperados (técnicos ok, branding 0)

### 5.3 Git commit + tag
- [ ] Crear commit descriptivo y tag (estimate: 15min)
  - git status (review changes)
  - git add .
  - git commit con mensaje: "feat(rebrand): Complete InnPilot → MUVA Chat rebranding"
  - Incluir BREAKING CHANGE note en commit body
  - git tag -a v2.0-muva-rebrand -m "Complete rebranding to MUVA Chat"
  - git push origin dev
  - git push origin --tags
  - Files: Git commit
  - Agent: **@agent-deploy-agent**
  - Test: `git log` muestra commit, `git tag` muestra v2.0-muva-rebrand

---

## 📊 PROGRESO

**Total Tasks:** 18
**Completed:** 0/18 (0%)

**Por Fase:**
- FASE 1 (Core Branding): 0/4 tareas (0%)
- FASE 2 (Documentation): 0/5 tareas (0%)
- FASE 3 (VPS Infrastructure): 0/4 tareas (0%)
- FASE 4 (Source Code): 0/3 tareas (0%)
- FASE 5 (Verification): 0/2 tareas (0%)

**Tiempo Estimado Total:**
- FASE 1: ~2 horas
- FASE 2: ~3 horas
- FASE 3: ~2 horas
- FASE 4: ~1 hora
- FASE 5: ~1 hora
- **Total: ~9 horas**

---

## 🎯 CHECKLIST FINAL (Pre-Merge)

### Funcionalidad
- [ ] `npm run build` pasa sin errores
- [ ] `npm run lint` pasa sin warnings
- [ ] https://muva.chat carga correctamente
- [ ] Chat multi-tenant funciona (test 2 tenants)
- [ ] SIRE module funcional
- [ ] Admin dashboards accesibles

### Branding
- [ ] package.json "name": "muva-chat"
- [ ] PM2 process: "muva-chat"
- [ ] Browser title: "MUVA Chat"
- [ ] grep "InnPilot" docs/ → 0 (excepto archive/muva-migration)
- [ ] README.md title: "MUVA Chat"

### Documentación
- [ ] docs/README.md refleja MUVA Chat
- [ ] SIRE docs en features/sire-compliance/
- [ ] Links internos funcionan
- [ ] Estructura navegable

### Infrastructure
- [ ] PM2 status: "muva-chat" online
- [ ] Nginx funcionando sin errores
- [ ] HTTPS certificates válidos
- [ ] No 404s/500s en production

---

**Última actualización:** 2025-10-11
**Estado:** Listo para ejecutar FASE 1
**Próximo paso:** Usar prompts de `innpilot-to-muva-rebrand-prompt-workflow.md` para ejecutar cada tarea
