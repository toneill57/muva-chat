# FASE 6: Mejoras UX y Validación

**Agente:** Mixto (@agent-ux-interface + @agent-backend-developer)
**Tareas:** 5
**Tiempo estimado:** 2h 30min
**Dependencias:** FASE 5 completada

---

## Objetivo

Agregar mejoras de experiencia de usuario y validaciones de negocio:
1. Mostrar progreso "X/Y huéspedes registrados" en tarjetas
2. Ofrecer copiar datos del titular para acompañantes
3. Mejorar historial de exports SIRE con estados visuales

---

## Prompt 6.1: API - Agregar expected_guests y registered_guests

**Agente:** `@agent-backend-developer`

**PREREQUISITO:** FASE 4 completada (API /reservations/list existe)

**Contexto:**
Modificar la API de lista de reservaciones para incluir el número esperado de huéspedes (adults + children) y el número de huéspedes ya registrados en reservation_guests.

---

🔽 **COPIAR DESDE AQUÍ (Prompt 6.1)**

**📊 Contexto de Progreso:**

**Progreso General:** 14/19 tareas completadas (74%)

FASE 1-5 ✅ COMPLETADAS
FASE 6 - Mejoras UX (Progreso: 0/5)
- [ ] 6.1: API - expected_guests y registered_guests ← ESTAMOS AQUÍ
- [ ] 6.2: UI - Badge progreso huéspedes
- [ ] 6.3: Chat - Copiar datos del titular
- [ ] 6.4: SIRE - Estados visuales en historial
- [ ] 6.5: SIRE - Acciones marcar uploaded/confirmed

**Estado Actual:**
- API /reservations/list devuelve array `guests` con acompañantes ✓
- Tabla guest_reservations tiene columnas `adults` y `children` ✓
- Falta calcular y devolver progreso de registro

---

**Tareas:**

1. **Agregar campos al response** (20min):

   En `src/app/api/reservations/list/route.ts`, modificar la interface y query:

   ```typescript
   interface ReservationListItem {
     // ... campos existentes ...

     // Guest progress (nuevo)
     expected_guests: number;      // adults + children from reservation
     registered_guests: number;    // count from reservation_guests
     guests: Guest[];              // ya existe
   }
   ```

2. **Calcular expected_guests** (10min):

   En el mapeo de resultados:

   ```typescript
   const mappedReservations = reservations.map(res => {
     // Calcular huéspedes esperados (mínimo 1)
     const expectedGuests = Math.max(1, (res.adults || 1) + (res.children || 0));

     // Contar huéspedes registrados
     const registeredGuests = res.guests?.length || 0;

     return {
       ...existingMapping,
       expected_guests: expectedGuests,
       registered_guests: registeredGuests,
     };
   });
   ```

3. **Agregar indicador de completitud** (5min):

   ```typescript
   // En el mapeo
   const guestProgressComplete = registeredGuests >= expectedGuests;

   return {
     ...existingMapping,
     expected_guests: expectedGuests,
     registered_guests: registeredGuests,
     guest_progress_complete: guestProgressComplete,
   };
   ```

**Entregables:**
- Response incluye expected_guests (de adults + children)
- Response incluye registered_guests (count de reservation_guests)
- Response incluye guest_progress_complete (boolean)

**Criterios de Éxito:**
- ✅ Reserva con 2 adults + 1 child → expected_guests: 3
- ✅ 2 registrados en reservation_guests → registered_guests: 2
- ✅ guest_progress_complete: false (2 < 3)

**Estimado:** 35min

---

**🔍 Verificación Post-Ejecución:**

Una vez completadas todas las tareas anteriores, pregúntame:

"¿Consideras satisfactoria la ejecución del Prompt 6.1 (expected_guests)?
- Campo expected_guests calculado ✓
- Campo registered_guests calculado ✓
- Campo guest_progress_complete incluido ✓"

**Si mi respuesta es "Sí" o "Aprobado":**

1. **Actualizar TODO.md** - Marcar tarea 6.1 como completada

2. **Informarme del progreso:**
   "✅ Tarea 6.1 completada

   **Progreso FASE 6:** 1/5 tareas completadas (20%)
   - [x] 6.1: API - expected_guests y registered_guests ✓
   - [ ] 6.2: UI - Badge progreso huéspedes
   - [ ] 6.3: Chat - Copiar datos del titular
   - [ ] 6.4: SIRE - Estados visuales en historial
   - [ ] 6.5: SIRE - Acciones marcar uploaded/confirmed

   **Siguiente paso:** Prompt 6.2 - Badge progreso huéspedes (20min)"

🔼 **COPIAR HASTA AQUÍ (Prompt 6.1)**

---

## Prompt 6.2: UI - Badge Progreso de Huéspedes

**Agente:** `@agent-ux-interface`

**PREREQUISITO:** Prompt 6.1 completado

**Contexto:**
Agregar badge visual en las tarjetas de reservación que muestre "2/4 huéspedes registrados" con colores según completitud.

---

🔽 **COPIAR DESDE AQUÍ (Prompt 6.2)**

**📊 Contexto de Progreso:**

**Progreso General:** 15/19 tareas completadas (79%)

FASE 6 - Mejoras UX (Progreso: 1/5)
- [x] 6.1: API - expected_guests y registered_guests ✓
- [ ] 6.2: UI - Badge progreso huéspedes ← ESTAMOS AQUÍ
- [ ] 6.3: Chat - Copiar datos del titular
- [ ] 6.4: SIRE - Estados visuales en historial
- [ ] 6.5: SIRE - Acciones marcar uploaded/confirmed

**Estado Actual:**
- API devuelve expected_guests, registered_guests, guest_progress_complete ✓
- Tarjetas muestran lista de acompañantes ✓
- Falta indicador visual de progreso

---

**Tareas:**

1. **Actualizar interface en UnifiedReservationCard** (5min):

   En `src/components/reservations/UnifiedReservationCard.tsx`:

   ```typescript
   interface UnifiedReservation {
     // ... campos existentes ...
     expected_guests: number;
     registered_guests: number;
     guest_progress_complete: boolean;
   }
   ```

2. **Crear componente GuestProgressBadge** (10min):

   ```tsx
   const GuestProgressBadge = ({
     registered,
     expected,
     complete
   }: {
     registered: number;
     expected: number;
     complete: boolean;
   }) => {
     const percentage = expected > 0 ? Math.round((registered / expected) * 100) : 0;

     // Colores según estado
     const bgColor = complete
       ? 'bg-green-100 text-green-800'
       : registered > 0
         ? 'bg-yellow-100 text-yellow-800'
         : 'bg-gray-100 text-gray-600';

     const Icon = complete ? CheckCircle : Users;

     return (
       <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${bgColor}`}>
         <Icon className="w-3 h-3" />
         {registered}/{expected} huéspedes
         {!complete && expected > registered && (
           <span className="text-xs opacity-75">({percentage}%)</span>
         )}
       </span>
     );
   };
   ```

3. **Agregar badge al header de tarjeta** (5min):

   En el JSX del header de la tarjeta:

   ```tsx
   <div className="flex items-center justify-between">
     <h3 className="font-semibold text-lg">{reservation.guest_name}</h3>
     <div className="flex items-center gap-2">
       <GuestProgressBadge
         registered={reservation.registered_guests}
         expected={reservation.expected_guests}
         complete={reservation.guest_progress_complete}
       />
       {/* Otros badges existentes */}
     </div>
   </div>
   ```

**Entregables:**
- Badge muestra "X/Y huéspedes"
- Verde si completo (X >= Y)
- Amarillo si parcial (X > 0 pero X < Y)
- Gris si ninguno registrado (X = 0)

**Criterios de Éxito:**
- ✅ 2/4 huéspedes → Badge amarillo "2/4 huéspedes (50%)"
- ✅ 4/4 huéspedes → Badge verde "4/4 huéspedes ✓"
- ✅ 0/2 huéspedes → Badge gris "0/2 huéspedes"

**Estimado:** 20min

---

**🔍 Verificación Post-Ejecución:**

Pregúntame: "¿Consideras satisfactoria la ejecución del Prompt 6.2 (Badge progreso)?"

**Si mi respuesta es "Sí" o "Aprobado":**

Actualizar TODO.md y continuar con Prompt 6.3.

🔼 **COPIAR HASTA AQUÍ (Prompt 6.2)**

---

## Prompt 6.3: Chat - Copiar Datos del Titular

**Agente:** `@agent-ux-interface`

**PREREQUISITO:** FASE 2 completada (flujo multi-huésped funciona)

**Contexto:**
Cuando el huésped inicia el registro de un acompañante (guest_order > 1), ofrecer copiar datos comunes del titular para agilizar el proceso.

---

🔽 **COPIAR DESDE AQUÍ (Prompt 6.3)**

**📊 Contexto de Progreso:**

**Progreso General:** 16/19 tareas completadas (84%)

FASE 6 - Mejoras UX (Progreso: 2/5)
- [x] 6.1-6.2 completados ✓
- [ ] 6.3: Chat - Copiar datos del titular ← ESTAMOS AQUÍ
- [ ] 6.4: SIRE - Estados visuales en historial
- [ ] 6.5: SIRE - Acciones marcar uploaded/confirmed

**Estado Actual:**
- Flujo multi-huésped funciona ✓
- Al cambiar de huésped, se resetean todos los campos
- Oportunidad: Copiar nationality_code, origin_city_code, destination_city_code

---

**Tareas:**

1. **Guardar datos del titular en ref** (10min):

   En `src/components/Chat/GuestChatInterface.tsx`:

   ```typescript
   // Después de otros useRef
   const primaryGuestDataRef = useRef<{
     nationality_code?: string;
     origin_city_code?: string;
     destination_city_code?: string;
   }>({});
   ```

2. **Capturar datos al completar titular** (10min):

   Cuando guest_order=1 completa su registro (línea ~815):

   ```typescript
   if (guestOrder === 1 && isComplete) {
     // Guardar datos para copiar a acompañantes
     primaryGuestDataRef.current = {
       nationality_code: sireDisclosure.sireData.nationality_code,
       origin_city_code: sireDisclosure.sireData.origin_place,
       destination_city_code: sireDisclosure.sireData.destination_place,
     };
     console.log('[SIRE] Saved primary guest data for copying:', primaryGuestDataRef.current);
   }
   ```

3. **Agregar estado para pregunta de copia** (5min):

   ```typescript
   const [awaitingCopyDataResponse, setAwaitingCopyDataResponse] = useState(false);
   const awaitingCopyDataRef = useRef(false);
   ```

4. **Preguntar si copiar al iniciar acompañante** (15min):

   Cuando usuario confirma registrar otro huésped (línea ~790):

   ```typescript
   if (isAffirmative) {
     awaitingAdditionalGuestRef.current = false;
     setAwaitingAdditionalGuestResponse(false);
     const newGuestOrder = guestOrder + 1;
     setGuestOrder(newGuestOrder);

     // Si hay datos del titular para copiar, preguntar
     const hasDataToCopy = primaryGuestDataRef.current.nationality_code;

     if (hasDataToCopy) {
       awaitingCopyDataRef.current = true;
       setAwaitingCopyDataResponse(true);

       const copyQuestion = `¡Perfecto! Vamos a registrar al huésped #${newGuestOrder}.\n\n` +
         `El huésped anterior tiene nacionalidad ${getNationalityName(primaryGuestDataRef.current.nationality_code)}. ` +
         `¿El huésped #${newGuestOrder} tiene la misma nacionalidad y lugar de origen?\n\n` +
         `Responde **"Sí"** para copiar estos datos, o **"No"** para ingresar datos diferentes.`;

       addAssistantMessage(copyQuestion);
       return;
     }

     // Si no hay datos, continuar normal
     // ... código existente ...
   }
   ```

5. **Manejar respuesta de copia** (15min):

   Al inicio de handleSendMessage, después de otras validaciones:

   ```typescript
   // Handle copy data response
   if (awaitingCopyDataRef.current) {
     const isAffirmative = /^(s[ií]|yes|ok|claro|dale|correcto)/i.test(message.trim());

     awaitingCopyDataRef.current = false;
     setAwaitingCopyDataResponse(false);

     // Reset para nuevo huésped
     sireDisclosure.reset({
       hotel_code: sireDisclosure.sireData.hotel_code,
       city_code: sireDisclosure.sireData.city_code,
       movement_type: sireDisclosure.sireData.movement_type,
       movement_date: sireDisclosure.sireData.movement_date,
     });

     if (isAffirmative) {
       // Copiar datos del titular
       sireDisclosure.setAllFields({
         ...sireDisclosure.sireData,
         nationality_code: primaryGuestDataRef.current.nationality_code,
         origin_place: primaryGuestDataRef.current.origin_city_code,
         destination_place: primaryGuestDataRef.current.destination_city_code,
       });

       const copiedMsg = `✓ Datos copiados. Ahora solo necesito los datos personales del huésped #${guestOrder}.`;
       addAssistantMessage(copiedMsg);
     }

     // Continuar con primera pregunta (documento)
     const nextField = getNextFieldToAsk(sireDisclosure.sireData);
     if (nextField) {
       const question = getQuestionForField(nextField);
       addAssistantMessage(question);
     }
     return;
   }
   ```

**Entregables:**
- Al completar titular, se guardan datos copiables
- Al iniciar huésped #2+, pregunta si copiar
- Si dice "sí", copia nationality_code, origin_city_code, destination_city_code
- Reduce 3 preguntas para acompañantes de la misma familia

**Criterios de Éxito:**
- ✅ Titular completa registro → datos guardados en ref
- ✅ Inicia huésped #2 → pregunta "¿mismo origen?"
- ✅ Dice "sí" → 3 campos pre-poblados, salta a documento
- ✅ Dice "no" → flujo normal desde inicio

**Estimado:** 55min

---

**🔍 Verificación Post-Ejecución:**

Pregúntame: "¿Consideras satisfactoria la ejecución del Prompt 6.3 (Copiar datos)?"

**Si mi respuesta es "Sí" o "Aprobado":**

Actualizar TODO.md y continuar con Prompt 6.4.

🔼 **COPIAR HASTA AQUÍ (Prompt 6.3)**

---

## Prompt 6.4: SIRE - Estados Visuales en Historial

**Agente:** `@agent-ux-interface`

**PREREQUISITO:** Página /sire existe

**Contexto:**
Mejorar la visualización del historial de exports en la página /sire con badges de estado claros y colores distintivos.

---

🔽 **COPIAR DESDE AQUÍ (Prompt 6.4)**

**📊 Contexto de Progreso:**

**Progreso General:** 17/19 tareas completadas (89%)

FASE 6 - Mejoras UX (Progreso: 3/5)
- [x] 6.1-6.3 completados ✓
- [ ] 6.4: SIRE - Estados visuales en historial ← ESTAMOS AQUÍ
- [ ] 6.5: SIRE - Acciones marcar uploaded/confirmed

**Estado Actual:**
- Página /sire muestra lista de exports ✓
- Tabla sire_exports tiene campos status, uploaded_at, confirmed_at ✓
- Falta visualización clara de estados

---

**Tareas:**

1. **Crear componente ExportStatusBadge** (15min):

   En `src/app/[tenant]/sire/page.tsx`:

   ```tsx
   type ExportStatus = 'generated' | 'uploaded' | 'confirmed' | 'error';

   const ExportStatusBadge = ({ status, uploadedAt, confirmedAt }: {
     status: string;
     uploadedAt?: string | null;
     confirmedAt?: string | null;
   }) => {
     // Determinar estado real basado en campos
     let displayStatus: ExportStatus = status as ExportStatus;
     if (confirmedAt) displayStatus = 'confirmed';
     else if (uploadedAt) displayStatus = 'uploaded';

     const config: Record<ExportStatus, {
       label: string;
       bg: string;
       icon: React.ReactNode;
     }> = {
       generated: {
         label: 'Generado',
         bg: 'bg-blue-100 text-blue-800',
         icon: <FileDown className="w-3 h-3" />,
       },
       uploaded: {
         label: 'Subido a SIRE',
         bg: 'bg-yellow-100 text-yellow-800',
         icon: <Upload className="w-3 h-3" />,
       },
       confirmed: {
         label: 'Confirmado',
         bg: 'bg-green-100 text-green-800',
         icon: <CheckCircle className="w-3 h-3" />,
       },
       error: {
         label: 'Error',
         bg: 'bg-red-100 text-red-800',
         icon: <AlertCircle className="w-3 h-3" />,
       },
     };

     const { label, bg, icon } = config[displayStatus] || config.generated;

     return (
       <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${bg}`}>
         {icon}
         {label}
       </span>
     );
   };
   ```

2. **Agregar imports necesarios** (2min):

   ```typescript
   import { FileDown, Calendar, Users, Clock, Upload, CheckCircle, AlertCircle } from 'lucide-react';
   ```

3. **Actualizar interface SIREExport** (3min):

   ```typescript
   interface SIREExport {
     // ... campos existentes ...
     uploaded_at: string | null;
     confirmed_at: string | null;
     sire_reference: string | null;
   }
   ```

4. **Modificar renderizado de tabla** (10min):

   En el mapeo de exports:

   ```tsx
   {exports.map((exp) => (
     <tr key={exp.id} className="hover:bg-gray-50">
       <td className="px-4 py-3">
         <ExportStatusBadge
           status={exp.status}
           uploadedAt={exp.uploaded_at}
           confirmedAt={exp.confirmed_at}
         />
       </td>
       <td className="px-4 py-3">{formatDate(exp.export_date)}</td>
       <td className="px-4 py-3">
         {exp.date_range_from && exp.date_range_to
           ? `${formatDate(exp.date_range_from)} - ${formatDate(exp.date_range_to)}`
           : exp.date_range_from || '-'
         }
       </td>
       <td className="px-4 py-3 text-center">{exp.guest_count}</td>
       <td className="px-4 py-3 text-center">{exp.line_count || exp.guest_count * 2}</td>
       <td className="px-4 py-3 text-center text-gray-500">
         {exp.excluded_count > 0 ? exp.excluded_count : '-'}
       </td>
       <td className="px-4 py-3">
         {exp.sire_reference && (
           <span className="text-xs text-gray-500">Ref: {exp.sire_reference}</span>
         )}
       </td>
       <td className="px-4 py-3">
         <div className="flex items-center gap-2">
           {exp.txt_content && (
             <button
               onClick={() => downloadExistingTXT(exp.txt_content!, exp.txt_filename)}
               className="text-blue-600 hover:text-blue-800"
               title="Descargar TXT"
             >
               <FileDown className="w-4 h-4" />
             </button>
           )}
         </div>
       </td>
     </tr>
   ))}
   ```

**Entregables:**
- Badge de estado con colores distintivos
- Azul = Generado, Amarillo = Subido, Verde = Confirmado, Rojo = Error
- Tabla muestra más información útil

**Criterios de Éxito:**
- ✅ Exports generados muestran badge azul "Generado"
- ✅ Exports con uploaded_at muestran badge amarillo "Subido a SIRE"
- ✅ Exports con confirmed_at muestran badge verde "Confirmado"

**Estimado:** 30min

---

**🔍 Verificación Post-Ejecución:**

Pregúntame: "¿Consideras satisfactoria la ejecución del Prompt 6.4 (Estados visuales)?"

🔼 **COPIAR HASTA AQUÍ (Prompt 6.4)**

---

## Prompt 6.5: SIRE - Acciones Marcar Uploaded/Confirmed

**Agente:** `@agent-ux-interface` + `@agent-backend-developer`

**PREREQUISITO:** Prompt 6.4 completado

**Contexto:**
Agregar botones para que el staff pueda marcar un export como "subido a SIRE" y "confirmado", actualizando los campos uploaded_at y confirmed_at.

---

🔽 **COPIAR DESDE AQUÍ (Prompt 6.5)**

**📊 Contexto de Progreso:**

**Progreso General:** 18/19 tareas completadas (95%)

FASE 6 - Mejoras UX (Progreso: 4/5)
- [x] 6.1-6.4 completados ✓
- [ ] 6.5: SIRE - Acciones marcar uploaded/confirmed ← ESTAMOS AQUÍ

**Estado Actual:**
- Badges de estado visuales funcionan ✓
- Falta permitir al staff actualizar estados

---

**Tareas:**

1. **Crear función updateExportStatus** (15min):

   En `src/app/[tenant]/sire/page.tsx`:

   ```typescript
   const updateExportStatus = async (
     exportId: string,
     action: 'uploaded' | 'confirmed',
     sireReference?: string
   ) => {
     try {
       const supabase = createClient(
         process.env.NEXT_PUBLIC_SUPABASE_URL!,
         process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
       );

       const updateData: Record<string, any> = {
         status: action,
         updated_at: new Date().toISOString(),
       };

       if (action === 'uploaded') {
         updateData.uploaded_at = new Date().toISOString();
       } else if (action === 'confirmed') {
         updateData.confirmed_at = new Date().toISOString();
         if (sireReference) {
           updateData.sire_reference = sireReference;
         }
       }

       const { error } = await supabase
         .from('sire_exports')
         .update(updateData)
         .eq('id', exportId);

       if (error) throw error;

       // Recargar lista
       await loadExports();
     } catch (err) {
       console.error('[SIRE] Error updating status:', err);
       alert('Error al actualizar estado');
     }
   };
   ```

2. **Agregar modal para referencia SIRE** (15min):

   ```typescript
   const [showReferenceModal, setShowReferenceModal] = useState(false);
   const [pendingConfirmId, setPendingConfirmId] = useState<string | null>(null);
   const [sireReference, setSireReference] = useState('');

   const handleConfirmClick = (exportId: string) => {
     setPendingConfirmId(exportId);
     setSireReference('');
     setShowReferenceModal(true);
   };

   const submitConfirmation = async () => {
     if (pendingConfirmId) {
       await updateExportStatus(pendingConfirmId, 'confirmed', sireReference || undefined);
       setShowReferenceModal(false);
       setPendingConfirmId(null);
     }
   };
   ```

3. **Agregar botones de acción en tabla** (10min):

   En la columna de acciones:

   ```tsx
   <td className="px-4 py-3">
     <div className="flex items-center gap-2">
       {/* Descargar TXT */}
       {exp.txt_content && (
         <button
           onClick={() => downloadExistingTXT(exp.txt_content!, exp.txt_filename)}
           className="p-1 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded"
           title="Descargar TXT"
         >
           <FileDown className="w-4 h-4" />
         </button>
       )}

       {/* Marcar como subido (solo si está en generated) */}
       {exp.status === 'generated' && !exp.uploaded_at && (
         <button
           onClick={() => updateExportStatus(exp.id, 'uploaded')}
           className="p-1 text-yellow-600 hover:text-yellow-800 hover:bg-yellow-50 rounded"
           title="Marcar como subido a SIRE"
         >
           <Upload className="w-4 h-4" />
         </button>
       )}

       {/* Marcar como confirmado (solo si está uploaded) */}
       {exp.uploaded_at && !exp.confirmed_at && (
         <button
           onClick={() => handleConfirmClick(exp.id)}
           className="p-1 text-green-600 hover:text-green-800 hover:bg-green-50 rounded"
           title="Marcar como confirmado"
         >
           <CheckCircle className="w-4 h-4" />
         </button>
       )}
     </div>
   </td>
   ```

4. **Renderizar modal** (10min):

   Al final del JSX:

   ```tsx
   {/* Modal para referencia SIRE */}
   {showReferenceModal && (
     <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
       <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
         <h3 className="text-lg font-semibold mb-4">Confirmar Export SIRE</h3>
         <p className="text-gray-600 mb-4">
           Ingresa el número de referencia que SIRE asignó al archivo (opcional):
         </p>
         <input
           type="text"
           value={sireReference}
           onChange={(e) => setSireReference(e.target.value)}
           placeholder="Ej: SIRE-2025-123456"
           className="w-full px-3 py-2 border rounded-lg mb-4"
         />
         <div className="flex justify-end gap-3">
           <button
             onClick={() => setShowReferenceModal(false)}
             className="px-4 py-2 text-gray-600 hover:text-gray-800"
           >
             Cancelar
           </button>
           <button
             onClick={submitConfirmation}
             className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
           >
             Confirmar
           </button>
         </div>
       </div>
     </div>
   )}
   ```

**Entregables:**
- Botón para marcar "Subido a SIRE" (actualiza uploaded_at)
- Botón para marcar "Confirmado" con modal para referencia
- Flujo: Generado → Subido → Confirmado
- Estados se reflejan inmediatamente en la UI

**Criterios de Éxito:**
- ✅ Click en Upload → status cambia a uploaded, badge amarillo
- ✅ Click en Confirm → modal aparece
- ✅ Submit con referencia → status=confirmed, badge verde, referencia guardada
- ✅ Lista se actualiza automáticamente

**Estimado:** 50min

---

**🔍 Verificación Post-Ejecución:**

Una vez completadas todas las tareas anteriores, pregúntame:

"¿Consideras satisfactoria la ejecución del Prompt 6.5 (Acciones estados)?"

**Si mi respuesta es "Sí" o "Aprobado":**

1. **Actualizar TODO.md** - Marcar FASE 6 como completada

2. **Actualizar "📍 CONTEXTO ACTUAL"**:
   ```markdown
   ### Estado del Sistema
   - ✅ FASE 1-5 completadas
   - ✅ Badge progreso "X/Y huéspedes" en tarjetas
   - ✅ Copiar datos del titular para acompañantes
   - ✅ Historial SIRE con estados visuales
   - ✅ Flujo Generado → Subido → Confirmado

   **Proyecto:** ✅ COMPLETADO (19/19 tareas)
   ```

3. **Informarme del progreso:**
   "🎉 FASE 6 COMPLETADA - Mejoras UX y Validación

   **Logros FASE 6:**
   - Badge "2/4 huéspedes registrados" en tarjetas
   - Copiar datos del titular acelera registro de acompañantes
   - Historial de exports con estados visuales claros
   - Flujo completo: Generado → Subido → Confirmado

   **Proyecto Final:** 19/19 tareas (100%)

   **Mejoras implementadas:**
   - Staff ve progreso de registro en cada reserva
   - Familias registran acompañantes 50% más rápido
   - Tracking completo de archivos SIRE subidos"

🔼 **COPIAR HASTA AQUÍ (Prompt 6.5)**

---

## Checklist FASE 6

- [ ] 6.1 API - Agregar expected_guests y registered_guests
- [ ] 6.2 UI - Badge progreso de huéspedes
- [ ] 6.3 Chat - Copiar datos del titular
- [ ] 6.4 SIRE - Estados visuales en historial
- [ ] 6.5 SIRE - Acciones marcar uploaded/confirmed

**Anterior:** `FASE-5-sire-export-multi.md`

---

## Resumen de Mejoras

| Sugerencia | Tarea | Beneficio |
|------------|-------|-----------|
| #6 Validación huéspedes | 6.1, 6.2 | Staff sabe cuántos faltan registrar |
| #7 Copiar datos titular | 6.3 | 50% menos preguntas para familias |
| #9 Historial exports | 6.4, 6.5 | Tracking completo de archivos SIRE |
