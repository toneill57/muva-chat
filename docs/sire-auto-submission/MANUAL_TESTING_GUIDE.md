# SIRE - Guía de Testing Manual UI

**Fecha:** Diciembre 18, 2025
**Build:** Dev server @ http://localhost:3000
**Objetivo:** Validar flujo completo de captura conversacional SIRE

---

## ✅ Pre-requisitos

- [x] Dev server corriendo: `pnpm run dev`
- [x] Tests automatizados pasando (4/4)
- [x] Build limpio (0 errores TypeScript)
- [x] Fixes implementados (FIX-1, FIX-LOOP, 1.6, 1.7)

---

## 🎯 Escenarios de Testing

### Escenario 1: Usuario Estadounidense (Pasaporte)

**URL:** http://localhost:3000/my-stay

**Credenciales de prueba:**
- Check-in date: `2025-01-15`
- Phone last 4 digits: `1234`

**Pasos:**

1. **Login**
   - Ir a http://localhost:3000/my-stay
   - Ingresar check-in date y teléfono
   - Click "Continuar"
   - ✅ **Esperar:** Ingreso exitoso al chat

2. **Iniciar SIRE**
   - Verificar banner azul "Registro SIRE" visible
   - Badge debe decir "No iniciado"
   - Click botón "Iniciar registro"
   - ✅ **Esperar:**
     - Nueva conversación "📋 Registro SIRE" en sidebar
     - Progress bar aparece en header
     - Mensaje de bienvenida SIRE

3. **Captura Conversacional**

   **Campo 1: Tipo de documento**
   - Escribir: "Tengo pasaporte"
   - Enviar
   - ✅ **Esperar:** Progress bar actualiza (1/9)

   **Campo 2: Número de documento**
   - Escribir: "AB123456"
   - Enviar
   - ✅ **Esperar:** Progress bar actualiza (2/9)

   **Campo 3: Primer apellido**
   - Escribir: "Smith"
   - Enviar
   - ✅ **Esperar:** Progress bar actualiza (3/9)

   **Campo 4: Segundo apellido (skip)**
   - Bot pregunta: "¿Tienes segundo apellido?"
   - Escribir: "No tengo"
   - Enviar
   - ✅ **Esperar:**
     - Bot confirma skip del segundo apellido
     - Progress bar actualiza (4/9)
     - **NO infinite loop**

   **Campo 5: Nombres**
   - Escribir: "John Michael"
   - Enviar
   - ✅ **Esperar:** Progress bar actualiza (5/9)

   **Campo 6: Nacionalidad**
   - Escribir: "Estados Unidos"
   - Enviar
   - ✅ **Esperar:**
     - Bot reconoce "Estados Unidos" → código SIRE 249
     - Progress bar actualiza (6/9)

   **Campo 7: Fecha de nacimiento**
   - Escribir: "15 de mayo de 1990"
   - Enviar
   - ✅ **Esperar:** Progress bar actualiza (7/9)

   **Campo 8: Ciudad de origen**
   - Escribir: "Nueva York"
   - Enviar
   - ✅ **Esperar:** Progress bar actualiza (8/9)

   **Campo 9: Ciudad de destino**
   - Escribir: "San Andrés"
   - Enviar
   - ✅ **Esperar:** Progress bar completa (9/9)

4. **Confirmación Final**
   - Bot muestra resumen de datos capturados
   - Verificar que TODOS los campos estén correctos:
     - Tipo de documento: Pasaporte (código 3)
     - Número: AB123456
     - Primer apellido: SMITH
     - Segundo apellido: (vacío, NO "null")
     - Nombres: JOHN MICHAEL
     - Nacionalidad: Estados Unidos (código 249)
     - Fecha de nacimiento: 15/05/1990
     - Origen: Nueva York
     - Destino: San Andrés
   - ✅ **Esperar:** Mensaje legible y formateado

---

### Escenario 2: Usuario Colombiano (Sin segundo apellido)

**Pasos:**

1. Login con credenciales de prueba
2. Click "Iniciar registro"
3. **Captura:**
   - Tipo de documento: "Cédula de extranjería"
   - Número: "1234567890"
   - Primer apellido: "García"
   - Segundo apellido: "No tengo"
   - Nombres: "María"
   - Nacionalidad: "Colombia"
   - Fecha de nacimiento: "20 de marzo de 1985"
   - Origen: "Bogotá"
   - Destino: "San Andrés"
4. ✅ **Esperar:**
   - Progress bar completa (9/9)
   - Nacionalidad: Colombia (código SIRE 169)
   - Segundo apellido: (vacío, NO "null")

---

### Escenario 3: Fuzzy Match Nacionalidad

**Pasos:**

1. Login → Iniciar SIRE
2. Llegar al campo "Nacionalidad"
3. **Probar variaciones:**
   - "Alemán" → debe reconocer código 23 (Alemania)
   - "francés" → debe reconocer código 275 (Francia)
   - "colombiano" → debe reconocer código 169 (Colombia)
4. ✅ **Esperar:** Bot confirma nacionalidad correcta

---

### Escenario 4: Código Numérico SIRE Directo

**Pasos:**

1. Login → Iniciar SIRE
2. Llegar al campo "Nacionalidad"
3. Escribir: "275"
4. ✅ **Esperar:** Bot reconoce Francia (código SIRE 275)

---

## 🔍 Checklist de Validación

### UI/UX
- [ ] Progress bar visible en modo SIRE
- [ ] Progress bar actualiza correctamente (1/9 → 9/9)
- [ ] Mensajes del bot son naturales y en español
- [ ] Campos completados persisten (no se pierden)
- [ ] Sidebar muestra "📋 Registro SIRE" como nueva conversación

### Lógica de Progressive Disclosure
- [ ] Bot pregunta campos en orden correcto
- [ ] Skip de segundo apellido NO causa infinite loop
- [ ] Bot NO re-pregunta campos ya capturados
- [ ] Validación de cada campo antes de continuar

### Normalización de Datos
- [ ] Nombres en MAYÚSCULAS
- [ ] Segundo apellido vacío = `''` (NO `"null"` o `null`)
- [ ] Fechas en formato DD/MM/YYYY
- [ ] Códigos SIRE correctos (USA = 249, Colombia = 169, Alemania = 23, Francia = 275)

### Entity Extraction
- [ ] Fuzzy match nacionalidad funciona
- [ ] Código numérico SIRE directo funciona
- [ ] Nombres compuestos se capturan completos
- [ ] Fechas en español se parsean correctamente

### Confirmación Final
- [ ] Mensaje de confirmación legible
- [ ] Todos los campos presentes
- [ ] Formato profesional (NO dumps JSON crudos)
- [ ] Segundo apellido vacío NO muestra "null"

---

## 🚨 Errores Conocidos (Ya Solucionados)

### ✅ FIX-1: Pérdida de empty strings
**Status:** FIXED (usamos `??` en vez de `||`)
**Verificar:** Segundo apellido vacío se preserva como `''`

### ✅ FIX-LOOP: Infinite loop en second_surname
**Status:** FIXED (caso especial en `getNextFieldToAsk()`)
**Verificar:** Bot NO re-pregunta segundo apellido después de skip

---

## 📝 Notas de Testing

**Tiempo estimado:** 30 minutos
**Navegador recomendado:** Chrome/Safari
**Responsive:** Probar en mobile (opcional)

**Si encuentras errores:**
1. Anotar mensaje de error exacto
2. Anotar en qué campo ocurrió
3. Screenshot si es visual
4. Reportar antes de commitear

---

## ✅ Criterios de Aceptación

- [ ] Todos los escenarios completan exitosamente
- [ ] Progress bar funciona correctamente
- [ ] NO infinite loops
- [ ] Datos normalizados correctamente
- [ ] Confirmación final legible

**Si todos los criterios pasan:** ✅ Listo para commit y PR a TST

---

**Última actualización:** Diciembre 18, 2025
