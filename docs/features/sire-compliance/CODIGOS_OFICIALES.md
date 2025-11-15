# Catálogo Oficial de Códigos SIRE

**Sistema**: Sistema de Información y Registro de Extranjeros (SIRE)
**Autoridad**: Gobierno de Colombia - Migración Colombia
**Propósito**: Catálogo oficial de códigos y formatos para reporte de huéspedes extranjeros
**Última Actualización**: Octubre 6, 2025
**Documento Fuente**: `_assets/sire/pasos-para-reportar-al-sire.md`
**Catálogos Oficiales**: `_assets/sire/codigos-pais.json`, `_assets/sire/ciudades-colombia.json`

---

## Tabla de Contenidos

1. [13 Campos Obligatorios SIRE](#13-campos-obligatorios-sire)
2. [Tipos de Documento Válidos](#tipos-de-documento-validos)
3. [Códigos de Nacionalidad](#codigos-de-nacionalidad)
4. [Códigos de Ciudad](#codigos-de-ciudad)
5. [Códigos de Lugar (Procedencia/Destino)](#codigos-de-lugar)
6. [Formatos de Validación](#formatos-de-validacion)
7. [Errores Comunes y Prevención](#errores-comunes-y-prevencion)
8. [Estructura de Archivo TXT](#estructura-de-archivo-txt)
9. [Uso en MUVA](#uso-en-innpilot)

---

## 13 Campos Obligatorios SIRE

Según documento oficial, el reporte SIRE requiere EXACTAMENTE 13 campos en orden estricto:

| # | Campo | Nombre SIRE | Tipo Dato | Formato | Ejemplo |
|---|-------|-------------|-----------|---------|---------|
| 1 | Código del hotel | `codigo_hotel` | Numérico | Solo números | `12345` |
| 2 | Código de ciudad | `codigo_ciudad` | Numérico | Solo números | `88001` |
| 3 | Tipo de documento | `tipo_documento` | Numérico | Código 1-2 dígitos | `3` (Pasaporte) |
| 4 | Número de identificación | `numero_identificacion` | Alfanumérico | Sin guiones ni espacios | `AB123456` |
| 5 | Código nacionalidad | `codigo_nacionalidad` | Numérico | Solo números | `170` (USA) |
| 6 | Primer apellido | `primer_apellido` | Alfabético | Solo letras | `SMITH` |
| 7 | Segundo apellido | `segundo_apellido` | Alfabético | Solo letras, vacío si no tiene | `JOHNSON` o `` |
| 8 | Nombre(s) | `nombres` | Alfabético | Solo letras | `JOHN MICHAEL` |
| 9 | Tipo de movimiento | `tipo_movimiento` | Carácter | `E` (Entrada) o `S` (Salida) | `E` |
| 10 | Fecha del movimiento | `fecha_movimiento` | Fecha | `dd/mm/yyyy` solo números | `15/10/2025` |
| 11 | Lugar de procedencia | `lugar_procedencia` | Numérico | Código país/ciudad | `840` (USA) |
| 12 | Lugar de destino | `lugar_destino` | Numérico | Código país/ciudad | `840` (USA) |
| 13 | Fecha de nacimiento | `fecha_nacimiento` | Fecha | `dd/mm/yyyy` solo números | `25/03/1985` |

**CRÍTICO**: Estos 13 campos deben aparecer en orden estricto, separados por tabulaciones (`\t`), sin eliminar columnas.

---

## Tipos de Documento Válidos

**Fuente**: Sección {#tipos-documento} del documento oficial

El sistema SIRE acepta ÚNICAMENTE 4 códigos de tipo de documento:

| Código | Tipo de Documento | Descripción | Ejemplo Número |
|--------|-------------------|-------------|----------------|
| **3** | Pasaporte | Pasaporte internacional estándar | `AB1234567` |
| **5** | Cédula de extranjería | Documento de identificación para residentes extranjeros en Colombia | `1234567` |
| **46** | Carné diplomático | Pasaporte diplomático para personal diplomático | `D1234567` |
| **10** | Documento extranjero | Para ciudadanos de países miembros de Mercosur y CAN | `V12345678` |

**VALIDACIÓN CRÍTICA**:
- ✅ SOLO estos 4 códigos son aceptados por SIRE
- ❌ Cualquier otro código causará rechazo del registro

**Uso más común**: Código `3` (Pasaporte) - ~95% de casos en hoteles

---

## Códigos de Nacionalidad

**Estado**: ✅ **CATÁLOGO OFICIAL DISPONIBLE**

**Fuente**: Catálogo oficial Migración Colombia / MinCIT
**Archivo**: `_assets/sire/codigos-pais.json` (250 países)

### ⚠️ IMPORTANTE: NO son códigos ISO 3166-1

Los códigos SIRE son **diferentes** al estándar internacional ISO 3166-1 numeric. Por ejemplo:

| País | Código SIRE | Código ISO 3166-1 | Diferencia |
|------|-------------|-------------------|------------|
| Colombia | **169** | 170 | -1 |
| Estados Unidos | **249** | 840 | -591 |
| Brasil | **105** | 076 | +29 |
| España | **245** | 724 | -479 |
| México | **493** | 484 | +9 |
| Argentina | **63** | 032 | +31 |

**CRÍTICO**: Usar **SOLO** códigos del catálogo `codigos-pais.json`. NO usar ISO 3166-1.

### Códigos Más Comunes en Hotelería Colombiana

| Código | País | Uso Estimado |
|--------|------|--------------|
| `169` | COLOMBIA | Alta (residentes temporales) |
| `249` | ESTADOS UNIDOS | Alta (turismo #1) |
| `105` | BRASIL | Alta (turismo) |
| `63` | ARGENTINA | Alta (turismo) |
| `245` | ESPAÑA | Media (turismo) |
| `493` | MEXICO | Media (turismo) |
| `117` | CANADA | Media (turismo) |
| `149` | CHILE | Media (turismo) |
| `23` | ALEMANIA | Media (turismo) |
| `265` | FRANCIA | Media (turismo) |
| `300` | REINO UNIDO | Media (turismo) |
| `369` | ITALIA | Media (turismo) |
| `587` | PERU | Media (vecindad) |
| `239` | ECUADOR | Media (vecindad) |
| `863` | VENEZUELA | Media (vecindad) |

**Total disponible**: 250 países en catálogo oficial.

### Formato de Códigos

- **Tipo**: Numérico
- **Rango**: 1-3 dígitos (13, 63, 105, 249, 493, 921)
- **Validación**: `^\d{1,3}$`
- **NO**: Llevar ceros a la izquierda (usar "63" no "063")

---

## Códigos de Ciudad

**Estado**: ✅ **CATÁLOGO OFICIAL DISPONIBLE**

**Fuente**: Catálogo DIVIPOLA (División Político-Administrativa del DANE)
**Archivo**: `_assets/sire/ciudades-colombia.json` (1,122 ciudades)

### Códigos DIVIPOLA para SIRE

Colombia usa códigos DIVIPOLA oficiales para identificar ciudades en el sistema SIRE:

**Ciudades Turísticas Principales:**

| Código | Ciudad | Departamento | Relevancia Hotelera |
|--------|--------|--------------|---------------------|
| `88001` | San Andrés | San Andrés y Providencia | ⭐ Alta (destino turístico internacional) |
| `13001` | Cartagena | Bolívar | ⭐ Alta (turismo costero e histórico) |
| `47001` | Santa Marta | Magdalena | ⭐ Alta (turismo costero) |
| `11001` | Bogotá D.C. | Cundinamarca | ⭐ Alta (capital, negocios) |
| `5001` | Medellín | Antioquia | ⭐ Alta (turismo urbano) |
| `76001` | Cali | Valle del Cauca | Alta (turismo urbano) |
| `8001` | Barranquilla | Atlántico | Media (turismo urbano) |
| `68001` | Bucaramanga | Santander | Media (turismo) |
| `73001` | Ibagué | Tolima | Media (turismo) |
| `17001` | Manizales | Caldas | Media (eje cafetero) |

**Total disponible**: 1,122 municipios colombianos en catálogo oficial.

### Formato de Códigos

- **Tipo**: Numérico
- **Estructura**: 5 dígitos (código DIVIPOLA estándar)
- **Validación**: `^\d{5}$`
- **Ejemplo**: San Andrés = `88001`, Cartagena = `13001`

**NOTA**: Todos los hoteles deben usar el código DIVIPOLA de la ciudad donde están ubicados físicamente.

---

## Códigos de Lugar (Procedencia/Destino)

**Estado**: ✅ **CATÁLOGOS OFICIALES DISPONIBLES**

**Fuente**: Combinación de códigos SIRE de país + DIVIPOLA de ciudades
**Archivos**: `_assets/sire/codigos-pais.json` + `_assets/sire/ciudades-colombia.json`

### Contexto del Campo

- **Campo 11 - Lugar de procedencia**: De dónde viene el extranjero ANTES de llegar al hotel
- **Campo 12 - Lugar de destino**: A dónde va el extranjero DESPUÉS de salir del hotel

### Sistema de Códigos

**Para procedencia/destino INTERNACIONAL:**
- Usar códigos de `codigos-pais.json`
- Formato: 1-3 dígitos
- Ejemplo: USA = `249`, Brasil = `105`, España = `245`

**Para procedencia/destino NACIONAL (dentro de Colombia):**
- Usar códigos de `ciudades-colombia.json` (DIVIPOLA)
- Formato: 5 dígitos
- Ejemplo: Bogotá = `11001`, Medellín = `5001`, Cartagena = `13001`

### Ejemplos de Uso

**Caso 1: Turista internacional directo**
- Huésped llega de USA → Hotel en San Andrés → Sale hacia USA
- Procedencia: `249` (Estados Unidos)
- Destino: `249` (Estados Unidos)

**Caso 2: Turista con conexión nacional**
- Huésped llega de España → Hotel en San Andrés → Sale hacia Cartagena
- Procedencia: `245` (España)
- Destino: `13001` (Cartagena - ciudad colombiana)

**Caso 3: Turista nacional**
- Huésped llega de Bogotá → Hotel en San Andrés → Sale hacia Medellín
- Procedencia: `11001` (Bogotá)
- Destino: `5001` (Medellín)

### Validación de Códigos

- **Rango permitido**: 1-6 dígitos numéricos
- **Regex**: `^\d{1,6}$`
- **Países**: 1-3 dígitos (13, 63, 105, 249, 493, 921)
- **Ciudades colombianas**: 5 dígitos (11001, 13001, 88001)

---

## Formatos de Validación

Basado en especificaciones oficiales de {#especificaciones-campos}:

### 1. Código del Hotel
```regex
^[0-9]{4,6}$
```
- Solo números
- 4-6 dígitos típicamente
- Asignado por SCH durante inscripción

### 2. Código de Ciudad
```regex
^[0-9]{5,6}$
```
- Solo números
- 5-6 dígitos (formato DIVIPOLA)

### 3. Tipo de Documento
```regex
^(3|5|10|46)$
```
- Solo 4 valores válidos: `3`, `5`, `10`, `46`

### 4. Número de Identificación
```regex
^[A-Z0-9]{6,15}$
```
- Alfanumérico (letras mayúsculas + números)
- Sin guiones, espacios, ni caracteres especiales
- 6-15 caracteres típicamente
- Ejemplos: `AB1234567` (pasaporte), `V12345678` (doc extranjero)

### 5. Código Nacionalidad
```regex
^[0-9]{1,3}$
```
- Solo números
- 1-3 dígitos (ISO 3166-1 numeric usa 3 dígitos)

### 6. Primer Apellido
```regex
^[A-ZÁÉÍÓÚÑ\s]{1,50}$
```
- Solo letras (incluyendo acentos y Ñ)
- Mayúsculas preferido
- Espacios permitidos (apellidos compuestos)
- 1-50 caracteres

### 7. Segundo Apellido
```regex
^[A-ZÁÉÍÓÚÑ\s]{0,50}$
```
- Solo letras (incluyendo acentos y Ñ)
- Mayúsculas preferido
- **PUEDE ESTAR VACÍO** si no tiene segundo apellido
- 0-50 caracteres

### 8. Nombre(s)
```regex
^[A-ZÁÉÍÓÚÑ\s]{1,50}$
```
- Solo letras (incluyendo acentos y Ñ)
- Mayúsculas preferido
- Espacios permitidos (nombres múltiples)
- 1-50 caracteres

### 9. Tipo de Movimiento
```regex
^[ES]$
```
- Solo `E` (Entrada) o `S` (Salida)
- UNA letra mayúscula únicamente

### 10. Fecha del Movimiento
```regex
^(0[1-9]|[12][0-9]|3[01])/(0[1-9]|1[0-2])/[0-9]{4}$
```
- Formato: `dd/mm/yyyy`
- Solo números + `/` separadores
- Ejemplo: `15/10/2025`

### 11. Lugar de Procedencia
```regex
^[0-9]{1,6}$
```
- Solo números
- 1-6 dígitos (código país ISO o ciudad DIVIPOLA)

### 12. Lugar de Destino
```regex
^[0-9]{1,6}$
```
- Solo números
- 1-6 dígitos (código país ISO o ciudad DIVIPOLA)

### 13. Fecha de Nacimiento
```regex
^(0[1-9]|[12][0-9]|3[01])/(0[1-9]|1[0-2])/[0-9]{4}$
```
- Formato: `dd/mm/yyyy`
- Solo números + `/` separadores
- Ejemplo: `25/03/1985`
- **Validación adicional**: Edad ≥18 años, <120 años

---

## Errores Comunes y Prevención

**Fuente**: Sección {#common-issues} del documento oficial

### Error #1: Formato de Archivo Incorrecto (40% failures)

**Causa**: Guardar en formato diferente a TXT delimitado por tabulaciones

**Síntomas**:
- Sistema rechaza completamente el archivo
- Mensaje de error: "Formato de archivo no válido"

**Prevención**:
```typescript
// Generar archivo TXT con tabulaciones
const sireRow = [
  codigoHotel,
  codigoCiudad,
  tipoDocumento,
  numeroIdentificacion,
  codigoNacionalidad,
  primerApellido,
  segundoApellido,
  nombres,
  tipoMovimiento,
  fechaMovimiento,
  lugarProcedencia,
  lugarDestino,
  fechaNacimiento
].join('\t') + '\n'

fs.writeFileSync('reporte.txt', sireRow, 'utf8')
```

**Validación**:
- ✅ Extensión: `.txt`
- ✅ Encoding: UTF-8
- ✅ Separador: Tabulación (`\t` o `\u0009`)
- ✅ Fin de línea: `\n` (LF) o `\r\n` (CRLF)

---

### Error #2: Códigos de Documento Inválidos (25% failures)

**Causa**: Usar códigos diferentes a 3, 5, 46, o 10

**Síntomas**:
- Rechazo del registro individual
- Mensaje: "Tipo de documento no válido"

**Prevención**:
```typescript
const VALID_DOCUMENT_TYPES = [3, 5, 10, 46]

function validateDocumentType(code: number): boolean {
  if (!VALID_DOCUMENT_TYPES.includes(code)) {
    throw new Error(`Código de documento inválido: ${code}. Usar: 3, 5, 10, o 46`)
  }
  return true
}
```

**Validación antes de envío**:
- ✅ Código en lista permitida: `[3, 5, 10, 46]`
- ❌ Rechazar cualquier otro valor

---

### Error #3: Formato de Fecha Incorrecto (20% failures)

**Causa**: No usar formato `dd/mm/yyyy` o incluir caracteres no numéricos

**Síntomas**:
- Error de validación del sistema
- Mensaje: "Formato de fecha inválido"

**Prevención**:
```typescript
function formatSIREDate(date: Date): string {
  const day = String(date.getDate()).padStart(2, '0')
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const year = date.getFullYear()

  return `${day}/${month}/${year}` // dd/mm/yyyy
}

// Validación adicional
function validateSIREDate(dateString: string): boolean {
  const regex = /^(0[1-9]|[12][0-9]|3[01])\/(0[1-9]|1[0-2])\/[0-9]{4}$/
  if (!regex.test(dateString)) {
    throw new Error(`Fecha inválida: ${dateString}. Usar formato dd/mm/yyyy`)
  }
  return true
}
```

**Validación**:
- ✅ Formato: `dd/mm/yyyy`
- ✅ Solo números + `/` separadores
- ❌ NO usar: `yyyy-mm-dd`, `mm/dd/yyyy`, ISO 8601

---

### Error #4: Datos Alfanuméricos en Campos Numéricos (10% failures)

**Causa**: Incluir letras en campos que requieren solo números

**Síntomas**:
- Error de formato en procesamiento
- Mensaje: "Valor no numérico en campo numérico"

**Campos afectados**:
- Campo 1: `codigo_hotel` (solo números)
- Campo 2: `codigo_ciudad` (solo números)
- Campo 3: `tipo_documento` (solo números)
- Campo 5: `codigo_nacionalidad` (solo números)
- Campo 11: `lugar_procedencia` (solo números)
- Campo 12: `lugar_destino` (solo números)

**Prevención**:
```typescript
function validateNumericField(value: string, fieldName: string): boolean {
  if (!/^[0-9]+$/.test(value)) {
    throw new Error(`${fieldName} debe contener solo números. Valor recibido: ${value}`)
  }
  return true
}
```

---

### Error #5: Eliminar Columnas del Formato (5% failures)

**Causa**: Modificar estructura del archivo eliminando columnas obligatorias

**Síntomas**:
- Sistema no puede procesar el archivo
- Mensaje: "Número de columnas incorrecto"

**Prevención**:
```typescript
function validateSIRERow(row: string[]): boolean {
  const EXPECTED_COLUMNS = 13

  if (row.length !== EXPECTED_COLUMNS) {
    throw new Error(
      `Número de columnas incorrecto. Esperado: ${EXPECTED_COLUMNS}, Recibido: ${row.length}`
    )
  }

  return true
}
```

**Validación**:
- ✅ SIEMPRE 13 columnas (ni más, ni menos)
- ✅ Orden estricto según {#13-campos-obligatorios-sire}
- ❌ NO eliminar columnas aunque estén vacías (ej: segundo apellido)

---

## Estructura de Archivo TXT

### Formato Completo

```
<codigo_hotel>\t<codigo_ciudad>\t<tipo_documento>\t<numero_id>\t<codigo_nacionalidad>\t<primer_apellido>\t<segundo_apellido>\t<nombres>\t<tipo_movimiento>\t<fecha_movimiento>\t<lugar_procedencia>\t<lugar_destino>\t<fecha_nacimiento>\n
```

### Ejemplo Real

```
12345	88001	3	AB1234567	840	SMITH	JOHNSON	JOHN MICHAEL	E	15/10/2025	840	840	25/03/1985
```

**Desglose**:
- `12345` - Código hotel (SCH)
- `88001` - San Andrés (DIVIPOLA)
- `3` - Pasaporte
- `AB1234567` - Número de pasaporte
- `840` - Estados Unidos (ISO 3166-1)
- `SMITH` - Primer apellido
- `JOHNSON` - Segundo apellido
- `JOHN MICHAEL` - Nombres
- `E` - Entrada al hotel
- `15/10/2025` - Fecha de entrada (check-in)
- `840` - Procedencia: Estados Unidos
- `840` - Destino: Estados Unidos
- `25/03/1985` - Fecha de nacimiento

### Ejemplo con Segundo Apellido Vacío

```
12345	88001	3	CD9876543	076	SILVA		MARIA CLARA	E	15/10/2025	076	076	10/07/1990
```

**Nota**: Campo 7 (segundo apellido) está vacío pero la tabulación se mantiene.

---

## Uso en MUVA

### Estructura de Datos de Dos Capas

MUVA usa arquitectura de **DOS CAPAS** para separar datos conversacionales de datos formales SIRE:

#### Capa 1: `conversational_data`

Datos extraídos durante conversación con el huésped (formato amigable):

```typescript
interface ConversationalData {
  passport_number: string        // "AB-1234567" (con guiones)
  country_of_origin: string      // "United States" (nombre completo)
  nationality: string            // "American" (gentilicio)
  birth_date: Date               // Date object
  travel_purpose: string         // "Tourism" (propósito viaje)
  full_name: string              // "John Michael Smith Johnson" (nombre completo)
  // ... más campos conversacionales
}
```

#### Capa 2: `sire_data`

13 campos oficiales SIRE formateados correctamente:

```typescript
interface SIREData {
  codigo_hotel: string           // "12345"
  codigo_ciudad: string          // "88001"
  tipo_documento: string         // "3"
  numero_identificacion: string  // "AB1234567" (sin guiones)
  codigo_nacionalidad: string    // "840"
  primer_apellido: string        // "SMITH"
  segundo_apellido: string       // "JOHNSON"
  nombres: string                // "JOHN MICHAEL"
  tipo_movimiento: string        // "E"
  fecha_movimiento: string       // "15/10/2025"
  lugar_procedencia: string      // "840"
  lugar_destino: string          // "840"
  fecha_nacimiento: string       // "25/03/1985"
}
```

### Mapeo Conversacional → SIRE

**File**: `src/lib/sire-field-mappers.ts` (a crear en FASE 0.5.2)

```typescript
export function mapConversationalToSIRE(
  conversational: ConversationalData,
  hotelInfo: HotelInfo
): SIREData {
  // Extraer apellidos del nombre completo
  const nameParts = parseFullName(conversational.full_name)

  // Limpiar número de pasaporte (quitar guiones)
  const cleanPassport = conversational.passport_number.replace(/[-\s]/g, '')

  // Convertir país a código ISO
  const countryCode = countryNameToISO3166(conversational.country_of_origin)

  // Formatear fecha
  const birthDate = formatSIREDate(conversational.birth_date)
  const movementDate = formatSIREDate(new Date()) // Check-in date

  return {
    codigo_hotel: hotelInfo.sire_code,
    codigo_ciudad: hotelInfo.city_code,
    tipo_documento: '3', // Pasaporte (más común)
    numero_identificacion: cleanPassport,
    codigo_nacionalidad: countryCode,
    primer_apellido: nameParts.firstLastName.toUpperCase(),
    segundo_apellido: nameParts.secondLastName?.toUpperCase() || '',
    nombres: nameParts.firstNames.toUpperCase(),
    tipo_movimiento: 'E', // Entrada
    fecha_movimiento: movementDate,
    lugar_procedencia: countryCode,
    lugar_destino: countryCode,
    fecha_nacimiento: birthDate,
  }
}
```

### Generación de Archivo TXT

**File**: `src/lib/sire-file-generator.ts` (a crear en FASE 0.5.3)

```typescript
export function generateSIRETXT(sireData: SIREData): string {
  const row = [
    sireData.codigo_hotel,
    sireData.codigo_ciudad,
    sireData.tipo_documento,
    sireData.numero_identificacion,
    sireData.codigo_nacionalidad,
    sireData.primer_apellido,
    sireData.segundo_apellido,
    sireData.nombres,
    sireData.tipo_movimiento,
    sireData.fecha_movimiento,
    sireData.lugar_procedencia,
    sireData.lugar_destino,
    sireData.fecha_nacimiento,
  ].join('\t')

  return row + '\n'
}
```

---

## ✅ Catálogos Completados (Octubre 6, 2025)

### Catálogos Oficiales Disponibles

1. **✅ Códigos de Nacionalidad - COMPLETO**
   - Fuente: Catálogo oficial Migración Colombia / MinCIT
   - Archivo: `_assets/sire/codigos-pais.json`
   - Total: 250 países
   - Formato: Códigos SIRE propietarios (NO ISO 3166-1)
   - Estado: Listo para producción

2. **✅ Códigos de Ciudad - COMPLETO**
   - Fuente: Catálogo DIVIPOLA oficial (DANE)
   - Archivo: `_assets/sire/ciudades-colombia.json`
   - Total: 1,122 ciudades colombianas
   - Formato: Códigos DIVIPOLA de 5 dígitos
   - Estado: Listo para producción

3. **✅ Códigos de Lugar (Procedencia/Destino) - COMPLETO**
   - Fuente: Combinación de códigos-pais.json + ciudades-colombia.json
   - Formato: Códigos SIRE (1-3 dígitos) para países internacionales, DIVIPOLA (5 dígitos) para ciudades colombianas
   - Estado: Listo para producción

### Archivos de Catálogo Creados

- `_assets/sire/codigos-pais.json` - 250 países con códigos oficiales SIRE
- `_assets/sire/ciudades-colombia.json` - 1,122 ciudades con códigos DIVIPOLA
- `_assets/sire/codigos-sire.ts` - Helper TypeScript con funciones de búsqueda

### Prioridad Media (Mejoras de UX)

4. **Validaciones Adicionales** (Futuro)
   - Edad mínima/máxima permitida
   - Formato específico de número de identificación por tipo de documento
   - Validación de coherencia de fechas (entrada antes de salida)

5. **Mensajes de Error Localizados** (Futuro)
   - Traducción de errores del sistema SIRE
   - Guía de corrección para cada tipo de error

---

## Referencias

### Documentación Oficial

1. **Documento Principal**: `_assets/sire/pasos-para-reportar-al-sire.md`
   - 7 pasos oficiales proceso SIRE
   - 13 campos obligatorios especificados
   - 4 tipos de documento válidos
   - 5 errores comunes documentados

2. **Sistema SIRE (Web)**: URL no disponible actualmente (investigar)

3. **MinCIT - Sistema PMS**: https://pms.mincit.gov.co/

4. **Sistema de Certificación Hotelera (SCH)**: URL no disponible (investigar)

### Estándares Internacionales

1. **ISO 3166-1 Numeric**: Country codes (https://www.iso.org/iso-3166-country-codes.html)
2. **DIVIPOLA (DANE)**: Códigos municipios Colombia (https://www.dane.gov.co/index.php/sistema-estadistico-nacional-sen/normas-y-estandares/codificacion/divipola)

---

## Control de Versiones

| Versión | Fecha | Cambios | Autor |
|---------|-------|---------|-------|
| 1.0 | Oct 5, 2025 | Creación inicial - Catálogo oficial SIRE | @backend-developer |

---

**IMPORTANTE**: Este catálogo es la **ÚNICA fuente de verdad** para campos SIRE en MUVA.

- ✅ SIEMPRE consultar este documento antes de implementar compliance
- ✅ SIEMPRE validar contra los 13 campos oficiales
- ❌ NUNCA usar campos dummy o placeholder

**Próximo paso**: Usar este catálogo en Prompt 0.5.2 para corregir `plan.md` y `guest-portal-compliance-workflow.md`.
