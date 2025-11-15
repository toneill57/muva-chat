# FASE 3.1: Compliance Chat Engine - Especificaciones Corregidas

**Proyecto:** Guest Portal Multi-Conversation + Compliance Module
**Fecha Corrección:** Octubre 5, 2025
**FASE 0.5:** Corrección de Campos SIRE (CRÍTICA)

---

## CONTEXTO CRÍTICO

**PROBLEMA DESCUBIERTO:**
- Los campos compliance originales en `plan.md` eran dummy/placeholder
- Estructura original: `{nombre, pasaporte, pais, proposito_viaje}` (NO oficial)
- Campos REALES SIRE: **13 campos obligatorios** según documento oficial

**SOLUCIÓN IMPLEMENTADA:**
- Arquitectura de **DOS CAPAS** (conversational_data + sire_data)
- Mapeo automático conversational → SIRE usando `field-mappers.ts`
- Validaciones estrictas según especificaciones SIRE oficiales

**DOCUMENTOS OFICIALES:**
- `_assets/sire/pasos-para-reportar-al-sire.md` - Procedimiento oficial SIRE
- `docs/features/sire-compliance/CODIGOS_OFICIALES.md` - Catálogo de 13 campos, tipos documento, códigos país

---

## ARQUITECTURA DE DOS CAPAS

### Capa 1: `conversational_data` (User-Friendly)

Datos extraídos durante la conversación con el huésped en formato natural:

```typescript
interface ConversationalData {
  nombre_completo: string           // Ej: "Juan Pablo García Pérez"
  numero_pasaporte: string          // Ej: "AB-1234567" (con guiones como usuario escribe)
  pais_texto: string                // Ej: "Estados Unidos" (texto libre)
  proposito_viaje: string           // Ej: "turismo" (conversacional)
  fecha_nacimiento: Date            // Date object
}
```

**Características:**
- Formato amigable para el usuario
- Extraído directamente del chat (entity extraction con Claude)
- Permite guiones, espacios, texto libre
- NO requiere códigos numéricos

---

### Capa 2: `sire_data` (13 Campos Oficiales)

13 campos obligatorios SIRE formateados según especificaciones oficiales:

```typescript
interface SIREData {
  codigo_hotel: string              // Ej: "7706" (de tenant_compliance_credentials)
  codigo_ciudad: string             // Ej: "88001" (San Andrés - código DANE/DIVIPOLA)
  tipo_documento: '3'|'5'|'46'|'10' // 3=Pasaporte, 5=Cédula, 46=Diplomático, 10=PEP
  numero_identificacion: string     // Solo alfanumérico, sin guiones (Ej: "AB1234567")
  codigo_nacionalidad: string       // Código país DANE (Ej: "840" = USA, "170" = COL)
  primer_apellido: string           // Solo letras, hasta 45 chars (Ej: "GARCÍA")
  segundo_apellido: string          // Solo letras, hasta 45 chars, opcional (Ej: "PÉREZ" o "")
  nombres: string                   // Solo letras, hasta 60 chars (Ej: "JUAN PABLO")
  tipo_movimiento: 'E'|'S'          // E=Entrada, S=Salida
  fecha_movimiento: string          // DD/MM/YYYY (Ej: "15/10/2025")
  lugar_procedencia: string         // Código numérico país/ciudad (Ej: "840")
  lugar_destino: string             // Código numérico país/ciudad (Ej: "840")
  fecha_nacimiento: string          // DD/MM/YYYY (Ej: "25/03/1985")
}
```

**Características:**
- Formato EXACTO requerido por sistema SIRE
- Auto-generado desde `conversational_data`
- Validaciones estrictas (solo letras en apellidos, solo números en códigos)
- Uso de catálogo oficial de códigos

---

## MAPEO AUTOMÁTICO conversational → SIRE

**Archivo:** `src/lib/sire/field-mappers.ts` ✅ CREADO

### Funciones de Mapeo

#### 1. `splitFullName(nombre_completo)`
```typescript
// Entrada (conversational):
"Juan Pablo García Pérez"

// Salida (SIRE):
{
  primer_apellido: "GARCÍA",
  segundo_apellido: "PÉREZ",
  nombres: "JUAN PABLO"
}
```

**Lógica:**
- Detecta formato "Apellidos, Nombres" o "Nombres Apellidos"
- Split inteligente considerando apellidos compuestos
- Validación: Solo letras (incluyendo acentos y Ñ)
- Conversión automática a MAYÚSCULAS

---

#### 2. `mapCountryToCode(pais_texto)`
```typescript
// Entrada (conversational):
"Estados Unidos"

// Salida (SIRE):
"840"
```

**Lógica:**
- Normalización (lowercase, sin acentos, trim)
- Lookup en catálogo ISO 3166-1 numeric (PROVISIONAL)
- Fuzzy matching: "USA", "EEUU", "Estados Unidos" → "840"
- **TODO:** Verificar con catálogo oficial MinCIT

**Códigos Principales:**
| País | Código DANE | Uso en Hotelería |
|------|-------------|------------------|
| Colombia | 170 | Alta (residentes temporales) |
| Estados Unidos | 840 | Alta (turismo) |
| Argentina | 032 | Alta (turismo) |
| Brasil | 076 | Alta (turismo) |
| España | 724 | Media (turismo) |
| México | 484 | Media (turismo) |

---

#### 3. `detectDocumentType(numero_pasaporte)`
```typescript
// Entrada (conversational):
"AB-1234567"

// Salida (SIRE):
"3" // Pasaporte
```

**Lógica:**
- Si contiene letras → Pasaporte (código 3)
- Si solo números y length < 11 → Cédula (código 5)
- Default → Pasaporte (3) - Caso más común (~95%)

**Tipos Documento SIRE Oficiales:**
| Código | Tipo | Descripción | Uso |
|--------|------|-------------|-----|
| 3 | Pasaporte | Pasaporte internacional estándar | 95% casos |
| 5 | Cédula extranjería | Residentes extranjeros en Colombia | 3% casos |
| 46 | Carné diplomático | Personal diplomático | < 1% casos |
| 10 | Documento extranjero | Ciudadanos Mercosur/CAN | 1% casos |

---

#### 4. `cleanPassportNumber(numero_pasaporte)`
```typescript
// Entrada (conversational):
"AB-1234567"

// Salida (SIRE):
"AB1234567"
```

**Lógica:**
- Quitar guiones, espacios, caracteres especiales
- Convertir a MAYÚSCULAS
- Validar longitud: 6-15 caracteres alfanuméricos

---

#### 5. `formatDateForSIRE(fecha_nacimiento)`
```typescript
// Entrada (conversational):
Date(1985, 2, 25) // Date object

// Salida (SIRE):
"25/03/1985" // DD/MM/YYYY
```

**CRÍTICO:** SIRE requiere formato **DD/MM/YYYY** estricto.
- ❌ NO usar: `yyyy-mm-dd`, `mm/dd/yyyy`, ISO 8601
- ✅ SIEMPRE: `dd/mm/yyyy` con ceros a la izquierda

---

## VALIDACIONES SIRE OFICIALES

**Archivo:** `src/lib/sire/field-mappers.ts` - Función `validateComplianceData()`

### Validaciones Capa 1 (conversational_data)

```typescript
// REQUIRED fields conversacionales:
- nombre_completo: string (no vacío)
- numero_pasaporte: string (no vacío)
- pais_texto: string (no vacío)
- fecha_nacimiento: Date (válida)
```

---

### Validaciones Capa 2 (sire_data - 13 campos)

#### Campo 1: `codigo_hotel`
```typescript
// Formato: Solo números (4-6 dígitos)
// Fuente: tenant_compliance_credentials.sire_hotel_code
// Validación: Requerido, no vacío
```

#### Campo 2: `codigo_ciudad`
```typescript
// Formato: Solo números (5-6 dígitos)
// Ej: "88001" (San Andrés - código DANE/DIVIPOLA)
// Validación: /^\d{5,6}$/
```

#### Campo 3: `tipo_documento`
```typescript
// Formato: Numérico (1-2 dígitos)
// Valores permitidos: SOLO ['3', '5', '46', '10']
// Validación: Enum estricto
```

#### Campo 4: `numero_identificacion`
```typescript
// Formato: Alfanumérico, SIN guiones ni espacios
// Longitud: 6-15 caracteres
// Validación: /^[A-Z0-9]{6,15}$/
```

#### Campo 5: `codigo_nacionalidad`
```typescript
// Formato: Solo números (1-3 dígitos)
// Ej: "840" (Estados Unidos), "170" (Colombia)
// Validación: /^\d{1,3}$/ + lookup en catálogo oficial
```

#### Campo 6: `primer_apellido`
```typescript
// Formato: Solo letras (incluyendo acentos y Ñ)
// Longitud: 1-45 caracteres
// Validación: /^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]{1,45}$/
// Conversión: MAYÚSCULAS
```

#### Campo 7: `segundo_apellido`
```typescript
// Formato: Solo letras (incluyendo acentos y Ñ)
// Longitud: 0-45 caracteres (PUEDE ESTAR VACÍO)
// Validación: /^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]{0,45}$/
// Conversión: MAYÚSCULAS
```

#### Campo 8: `nombres`
```typescript
// Formato: Solo letras (incluyendo acentos y Ñ)
// Longitud: 1-60 caracteres
// Validación: /^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]{1,60}$/
// Conversión: MAYÚSCULAS
```

#### Campo 9: `tipo_movimiento`
```typescript
// Formato: Carácter único
// Valores permitidos: SOLO ['E', 'S']
// E = Entrada al hotel
// S = Salida del hotel
// Validación: Enum estricto
```

#### Campo 10: `fecha_movimiento`
```typescript
// Formato: DD/MM/YYYY (solo números + '/' separadores)
// Ej: "15/10/2025"
// Validación: /^(0[1-9]|[12][0-9]|3[01])\/(0[1-9]|1[0-2])\/[0-9]{4}$/
// Validación adicional: Fecha válida (días por mes)
```

#### Campo 11: `lugar_procedencia`
```typescript
// Formato: Solo números (1-6 dígitos)
// Código país ISO 3166-1 o ciudad DIVIPOLA
// Ej: "840" (USA), "11001" (Bogotá)
// Validación: /^\d{1,6}$/
```

#### Campo 12: `lugar_destino`
```typescript
// Formato: Solo números (1-6 dígitos)
// Código país ISO 3166-1 o ciudad DIVIPOLA
// Ej: "840" (USA), "13001" (Cartagena)
// Validación: /^\d{1,6}$/
```

#### Campo 13: `fecha_nacimiento`
```typescript
// Formato: DD/MM/YYYY (solo números + '/' separadores)
// Ej: "25/03/1985"
// Validación: /^(0[1-9]|[12][0-9]|3[01])\/(0[1-9]|1[0-2])\/[0-9]{4}$/
// Validación adicional: Edad ≥18 años, <120 años
```

---

## ESTADO COMPLIANCE (State Machine)

```typescript
interface ComplianceContext {
  mode: 'normal' | 'compliance_active' | 'compliance_confirm' | 'compliance_processing'

  // DOS CAPAS: conversational + SIRE
  conversational_data: {
    nombre_completo?: string      // Extraído del chat
    numero_pasaporte?: string     // Extraído del chat (con guiones si usuario los pone)
    pais_texto?: string           // Extraído del chat (texto libre)
    proposito_viaje?: string      // Extraído del chat
    fecha_nacimiento?: Date       // Extraído del chat
  }

  sire_data: {
    // 13 campos oficiales SIRE (auto-generados desde conversational_data)
    codigo_hotel?: string
    codigo_ciudad?: string
    tipo_documento?: '3'|'5'|'46'|'10'
    numero_identificacion?: string
    codigo_nacionalidad?: string
    primer_apellido?: string
    segundo_apellido?: string
    nombres?: string
    tipo_movimiento?: 'E'|'S'
    fecha_movimiento?: string         // DD/MM/YYYY
    lugar_procedencia?: string
    lugar_destino?: string
    fecha_nacimiento?: string         // DD/MM/YYYY
  }

  fields_collected: string[]          // Campos conversacionales recolectados
  fields_remaining: string[]          // Campos conversacionales faltantes
  confirmation_pending: boolean
  validation_errors: string[]         // Errores de validación SIRE
}
```

---

## INTENT DETECTION (Actualizado)

**Archivo a modificar:** `src/lib/conversational-chat-engine.ts`

### Nuevos Intents

```typescript
// Compliance-specific intents (agregar a enum existente)
export enum Intent {
  // ... existing intents ...

  // Compliance intents (nuevos)
  COMPLIANCE_START = 'COMPLIANCE_START',
  COMPLIANCE_CONFIRM = 'COMPLIANCE_CONFIRM',
  COMPLIANCE_CANCEL = 'COMPLIANCE_CANCEL',
}

// Intent detection patterns
const intentPatterns = {
  // ... existing patterns ...

  COMPLIANCE_START: [
    'registro',
    'sire',
    'tra',
    'documentos',
    'compliance',
    'reportar',
    'registrarme',
    'necesito registrar',
  ],

  COMPLIANCE_CONFIRM: [
    'sí',
    'si',
    'confirmar',
    'correcto',
    'enviar',
    'ok',
    'afirmativo',
    'exacto',
  ],

  COMPLIANCE_CANCEL: [
    'no',
    'cancelar',
    'cambiar',
    'error',
    'corregir',
    'modificar',
    'incorrecto',
  ],
}

// Priority order:
// 1. COMPLIANCE_CONFIRM (if confirmation_pending)
// 2. COMPLIANCE_CANCEL (if in compliance mode)
// 3. COMPLIANCE_START
// 4. Normal tourism query intents
```

---

## PRE-FILL DATA FROM RESERVATION

**Archivo:** `src/lib/compliance-chat-engine.ts` (a crear en FASE 3.1)

```typescript
// Auto-fill conversational_data desde guest session
function prefillFromReservation(session: GuestSession): Partial<ConversationalData> {
  return {
    nombre_completo: session.guest_name,                // Ej: "Juan García"
    fecha_nacimiento: undefined,                        // Usuario debe proporcionar
    numero_pasaporte: undefined,                        // Usuario debe proporcionar
    pais_texto: undefined,                              // Usuario debe proporcionar
    proposito_viaje: 'turismo',                         // Default: turismo
  }
}

// Auto-fill sire_data desde tenant config + reservation
async function prefillSIREData(
  session: GuestSession,
  tenantId: string
): Promise<Partial<SIREData>> {
  // Fetch tenant compliance credentials
  const credentials = await getTenantComplianceCredentials(tenantId)

  return {
    codigo_hotel: credentials.sire_hotel_code,         // Ej: "7706"
    codigo_ciudad: credentials.sire_city_code,         // Ej: "88001"
    tipo_movimiento: 'E',                              // Default: Entrada
    fecha_movimiento: formatDateForSIRE(session.check_in), // Check-in date
    lugar_procedencia: undefined,                      // Se genera de pais_texto
    lugar_destino: undefined,                          // Se genera de pais_texto
    // Resto de campos se generan desde conversational_data
  }
}
```

---

## CONFIRMATION MESSAGE (Actualizado)

**Archivo:** `src/lib/compliance-chat-engine.ts` (a crear en FASE 3.1)

```typescript
function generateConfirmationMessage(context: ComplianceContext): string {
  const { conversational_data, sire_data } = context

  return `
📋 **Confirmación de Datos para Compliance SIRE/TRA**

**Información Personal (conversacional):**
- Nombre completo: ${conversational_data.nombre_completo}
- Número de pasaporte: ${conversational_data.numero_pasaporte}
- País de origen: ${conversational_data.pais_texto}
- Propósito del viaje: ${conversational_data.proposito_viaje}
- Fecha de nacimiento: ${conversational_data.fecha_nacimiento?.toLocaleDateString('es-CO')}

**Datos SIRE (auto-generados):**
- Tipo de documento: ${getTipoDocumentoLabel(sire_data.tipo_documento)}
- Código nacionalidad: ${sire_data.codigo_nacionalidad}
- Nombres oficiales: ${sire_data.nombres}
- Apellidos: ${sire_data.primer_apellido} ${sire_data.segundo_apellido}
- Fecha movimiento: ${sire_data.fecha_movimiento}

¿Confirmas que toda la información es correcta? (Responde **SÍ** para enviar o **NO** para corregir)
  `.trim()
}

function getTipoDocumentoLabel(tipo: string | undefined): string {
  const labels: Record<string, string> = {
    '3': 'Pasaporte',
    '5': 'Cédula de Extranjería',
    '46': 'Carné Diplomático',
    '10': 'Documento Extranjero (Mercosur/CAN)',
  }
  return labels[tipo || '3'] || 'Pasaporte'
}
```

---

## TESTING COMPLIANCE CHAT ENGINE

### Test Cases Capa 1 (conversational_data)

```typescript
// Test 1: Entity Extraction - Nombre Completo
{
  input: "Mi nombre es Juan Pablo García Pérez",
  expected: {
    conversational_data: {
      nombre_completo: "Juan Pablo García Pérez"
    }
  }
}

// Test 2: Entity Extraction - Pasaporte
{
  input: "Mi pasaporte es AB-1234567",
  expected: {
    conversational_data: {
      numero_pasaporte: "AB-1234567"
    }
  }
}

// Test 3: Entity Extraction - País
{
  input: "Soy de Estados Unidos",
  expected: {
    conversational_data: {
      pais_texto: "Estados Unidos"
    }
  }
}
```

---

### Test Cases Capa 2 (sire_data mapping)

```typescript
// Test 4: Mapeo Nombre Completo → SIRE
{
  input: {
    nombre_completo: "Juan Pablo García Pérez"
  },
  expected: {
    sire_data: {
      primer_apellido: "GARCÍA",
      segundo_apellido: "PÉREZ",
      nombres: "JUAN PABLO"
    }
  }
}

// Test 5: Mapeo País → Código DANE
{
  input: {
    pais_texto: "Estados Unidos"
  },
  expected: {
    sire_data: {
      codigo_nacionalidad: "840",
      lugar_procedencia: "840",
      lugar_destino: "840"
    }
  }
}

// Test 6: Mapeo Pasaporte → SIRE
{
  input: {
    numero_pasaporte: "AB-1234567"
  },
  expected: {
    sire_data: {
      tipo_documento: "3",
      numero_identificacion: "AB1234567"
    }
  }
}

// Test 7: Formato Fecha → SIRE
{
  input: {
    fecha_nacimiento: new Date(1985, 2, 25)
  },
  expected: {
    sire_data: {
      fecha_nacimiento: "25/03/1985"
    }
  }
}
```

---

### Test Cases Validaciones

```typescript
// Test 8: Validación tipo_documento inválido
{
  input: {
    sire_data: { tipo_documento: "99" }
  },
  expected: {
    valid: false,
    errors: ["Tipo documento inválido (usar: 3, 5, 10, o 46)"]
  }
}

// Test 9: Validación primer_apellido con números
{
  input: {
    sire_data: { primer_apellido: "García123" }
  },
  expected: {
    valid: false,
    errors: ["Primer apellido solo debe contener letras"]
  }
}

// Test 10: Validación fecha_movimiento formato incorrecto
{
  input: {
    sire_data: { fecha_movimiento: "2025-10-15" }
  },
  expected: {
    valid: false,
    errors: ["Fecha movimiento inválida (usar formato DD/MM/YYYY)"]
  }
}
```

---

## ARCHIVOS A CREAR EN FASE 3.1

### 1. `src/lib/compliance-chat-engine.ts`
**Responsabilidades:**
- Implementar state machine (normal → compliance_active → compliance_confirm → compliance_processing)
- Entity extraction conversacional (nombre, pasaporte, país, fecha, propósito)
- Auto-mapeo conversational → SIRE usando `field-mappers.ts`
- Generación de mensajes de confirmación
- Pre-fill desde reservation y tenant config

---

### 2. Modificar `src/lib/conversational-chat-engine.ts`
**Cambios:**
- Agregar intents: COMPLIANCE_START, COMPLIANCE_CONFIRM, COMPLIANCE_CANCEL
- Priority detection: Compliance intents > Normal tourism
- Delegar a `compliance-chat-engine.ts` cuando intent = COMPLIANCE_*

---

### 3. Modificar `src/app/api/guest/chat/route.ts`
**Cambios:**
- Detectar compliance mode desde session metadata
- Route messages a `compliance-chat-engine.ts` si en compliance mode
- Guardar compliance_context en conversation metadata

---

## ARCHIVOS YA CREADOS ✅

### 1. `src/lib/sire/field-mappers.ts` ✅ CREADO
**Contenido:**
- 7 funciones de mapeo conversational → SIRE
- Validaciones SIRE oficiales
- Catálogo códigos país (ISO 3166-1 PROVISIONAL)
- 520 líneas de código completo

---

### 2. `docs/features/sire-compliance/CODIGOS_OFICIALES.md` ✅ CREADO
**Contenido:**
- 13 campos obligatorios SIRE documentados
- 4 tipos de documento válidos
- Catálogo códigos nacionalidad (PROVISIONAL)
- Formatos de validación con regex
- 5 errores comunes SIRE
- Estructura archivo TXT (tab-delimited)

---

### 3. `AUDITORIA_FASES_1_2.md` ✅ CREADO
**Contenido:**
- Verificación FASE 1: 0 referencias compliance ✅ LIMPIO
- Verificación FASE 2.2: 0 referencias compliance ✅ LIMPIO
- Conclusión: No se requieren correcciones en código existente

---

## SUCCESS CRITERIA FASE 3.1

**Implementación:**
- ✅ `compliance-chat-engine.ts` creado con state machine
- ✅ Entity extraction con > 95% accuracy
- ✅ Auto-mapeo conversational → SIRE funciona
- ✅ Pre-fill desde reservation funciona
- ✅ Validaciones SIRE estrictas implementadas

**Testing:**
- ✅ 10+ test cases pasan (entity extraction + mapping + validación)
- ✅ Confirmation message muestra DOS CAPAS correctamente
- ✅ Validation errors claros y útiles
- ✅ Intent detection preciso (COMPLIANCE_START, CONFIRM, CANCEL)

**Documentación:**
- ✅ `docs/features/sire-compliance/CODIGOS_OFICIALES.md` completo
- ✅ `src/lib/sire/field-mappers.ts` con JSDoc detallado
- ✅ Este documento (FASE_3.1_ESPECIFICACIONES_CORREGIDAS.md)

---

## PRÓXIMOS PASOS (POST FASE 3.1)

### FASE 3.2: SIRE Push (Puppeteer)
- Usar `sire_data` (13 campos) para generar archivo TXT
- Submit a SIRE.gov.co con Puppeteer
- Capturar confirmation number

### FASE 3.3: TRA API Integration
- Submit `sire_data` a TRA MinCIT REST API
- Validar RNT (Registro Nacional de Turismo)

### FASE 3.4: Testing E2E Compliance Flow
- Test completo: Chat → Entity extraction → Confirmation → SIRE/TRA submit

---

**Última actualización:** Octubre 5, 2025
**Estado:** ✅ ESPECIFICACIONES CORREGIDAS - READY FOR IMPLEMENTATION
**Agente:** @backend-developer
