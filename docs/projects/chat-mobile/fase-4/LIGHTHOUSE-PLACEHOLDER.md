# Lighthouse Screenshot Placeholder

**Archivo esperado:** `LIGHTHOUSE.png`

---

## 📸 Instrucciones para Capturar Screenshot

### PASO 1: Ejecutar Lighthouse Audit

1. Abre Chrome en: http://localhost:3000/chat-mobile-dev
2. DevTools → Tab "Lighthouse"
3. Configuración:
   - Device: **Mobile**
   - Categories: Performance, Accessibility, Best Practices, SEO
4. Click **"Analyze page load"**
5. Esperar ~60 segundos

### PASO 2: Capturar Screenshot

#### En Mac:
```
Cmd + Shift + 4
```
- Click y arrastra sobre el summary de Lighthouse
- Incluir: Scores principales (Performance, Accessibility, Best Practices, SEO)
- Guardar como: `LIGHTHOUSE.png` en este directorio

#### En Windows:
```
Windows + Shift + S
```
- Selecciona área del Lighthouse summary
- Guardar como: `LIGHTHOUSE.png` en este directorio

### PASO 3: Validar Scores

Asegúrate de que el screenshot muestre:
- ✅ Performance ≥ 90
- ✅ Accessibility ≥ 95
- ✅ Best Practices ≥ 90
- ✅ SEO ≥ 80

Si algún score es menor:
1. Revisar recomendaciones de Lighthouse
2. Aplicar optimizaciones sugeridas
3. Re-build: `npm run build`
4. Re-start: `PORT=3000 npm start`
5. Re-correr audit

---

## ✅ Una vez que tengas el screenshot:

1. Renombrar este archivo a `LIGHTHOUSE-PLACEHOLDER-OLD.md`
2. Guardar screenshot como `LIGHTHOUSE.png`
3. Marcar FASE 4 como completada en TODO.md
4. Proceder a FASE 5

---

**Última actualización:** 3 Oct 2025
**Status:** ⏳ Esperando screenshot manual
