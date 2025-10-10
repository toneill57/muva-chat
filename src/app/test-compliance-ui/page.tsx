'use client';

import { useState } from 'react';
import ComplianceConfirmation from '@/components/Compliance/ComplianceConfirmation';
import ComplianceSuccess from '@/components/Compliance/ComplianceSuccess';

export default function TestComplianceUI() {
  const [step, setStep] = useState<'confirmation' | 'success'>('confirmation');

  // Mock data - Escenario REALISTA: American tourist traveling Bogotá → San Andrés (hotel) → Medellín
  // ⚠️ CRITICAL: See docs/sire/DATABASE_SCHEMA_CLARIFICATION.md for geographic field explanation
  //
  // 3 INDEPENDENT GEOGRAPHIC FIELDS:
  // 1. nationality_code (Field 5): CITIZENSHIP country (SIRE country code)
  // 2. origin_city_code (Field 11): City/country came FROM before arriving (DIVIPOLA or SIRE)
  // 3. destination_city_code (Field 12): City/country going TO after checkout (DIVIPOLA or SIRE)
  const mockComplianceData = {
    // Datos del Hotel (2 campos)
    hotel_sire_code: '12345',
    hotel_city_code: '88001', // San Andrés (DIVIPOLA) - Hotel location

    // Datos del Huésped (6 campos)
    document_type: '3',
    document_number: 'US123456789',
    nationality_code: '249', // ✅ USA (SIRE country 1-3 digits) - Guest's CITIZENSHIP
    first_surname: 'SMITH',
    second_surname: undefined, // Sin segundo apellido
    given_names: 'JOHN',

    // Datos del Movimiento (3 campos)
    movement_type: 'E',
    movement_date: '2025-10-09',

    // Datos Geográficos (2 campos) - ⚠️ INDEPENDENT from nationality!
    // Travel route: Bogotá (FROM) → San Andrés (hotel) → Medellín (TO)
    origin_city_code: '11001', // ✅ Bogotá (DIVIPOLA 5 digits) - Colombian CITY traveling FROM
    destination_city_code: '05001', // ✅ Medellín (DIVIPOLA 5 digits) - Colombian CITY traveling TO

    // ⚠️ ALL 4 CODES ARE DIFFERENT:
    // hotel_city_code: 88001 (San Andrés - hotel location)
    // nationality_code: 249 (USA - citizenship)
    // origin_city_code: 11001 (Bogotá - came from)
    // destination_city_code: 05001 (Medellín - going to)

    // Additional
    birth_date: '1985-03-25',
  };

  const handleConfirm = () => {
    console.log('✅ Datos confirmados:', mockComplianceData);
    setStep('success');
  };

  const handleCancel = () => {
    console.log('❌ Cancelado');
    alert('Modal cancelado (en producción cerraría el modal)');
  };

  const handleClose = () => {
    console.log('🔄 Cerrando modal de éxito');
    setStep('confirmation'); // Reset para testing
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <div className="bg-white rounded-lg shadow p-6">
          <h1 className="text-2xl font-bold mb-2">🧪 Test: Compliance UI Components</h1>
          <p className="text-gray-600">
            Testing manual de ComplianceConfirmation y ComplianceSuccess
          </p>
        </div>

        {/* Controls */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex gap-4 items-center">
            <span className="font-semibold">Vista actual:</span>
            <button
              onClick={() => setStep('confirmation')}
              className={`px-4 py-2 rounded ${
                step === 'confirmation'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white border border-blue-300 text-blue-700'
              }`}
            >
              Confirmation Modal
            </button>
            <button
              onClick={() => setStep('success')}
              className={`px-4 py-2 rounded ${
                step === 'success'
                  ? 'bg-green-600 text-white'
                  : 'bg-white border border-green-300 text-green-700'
              }`}
            >
              Success Screen
            </button>
          </div>
        </div>

        {/* Test Data Info */}
        <div className="bg-gray-100 rounded-lg p-4 font-mono text-sm">
          <div className="font-bold mb-2">📋 Mock Data (Escenario REALISTA: American FROM Bogotá)</div>
          <div className="text-xs text-gray-600 mb-2">
            ⚠️ Nationality (249=USA country) ≠ Procedencia (11001=Bogotá CITY) ≠ Destino (88001=San Andrés CITY)
          </div>
          <pre className="whitespace-pre-wrap">
            {JSON.stringify(mockComplianceData, null, 2)}
          </pre>
        </div>

        {/* Component Preview */}
        <div className="bg-white rounded-lg shadow-lg p-8">
          <div className="max-w-2xl mx-auto">
            {step === 'confirmation' ? (
              <ComplianceConfirmation
                complianceData={mockComplianceData}
                onConfirm={handleConfirm}
                onCancel={handleCancel}
              />
            ) : (
              <ComplianceSuccess
                submissionData={{
                  submission_id: 'test-submission-id-123',
                  reservation_id: 'test-reservation-id-456',
                  sire_reference: 'SIRE-TEST-2025-10-09-ABC123',
                }}
                onClose={handleClose}
              />
            )}
          </div>
        </div>

        {/* Testing Checklist */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
          <h2 className="font-bold text-lg mb-4">✅ Checklist de Verificación</h2>

          <div className="space-y-4">
            <div>
              <h3 className="font-semibold mb-2">ComplianceConfirmation (13 campos):</h3>
              <ul className="space-y-1 ml-4">
                <li>□ <strong>Sección Hotel (2 campos):</strong></li>
                <li className="ml-4">□ Código SCH: "12345"</li>
                <li className="ml-4">□ Ciudad: "88001 - San Andrés"</li>

                <li>□ <strong>Sección Huésped (6 campos):</strong></li>
                <li className="ml-4">□ Tipo documento: "3 - Pasaporte"</li>
                <li className="ml-4">□ Número: "US123456789"</li>
                <li className="ml-4">□ Nacionalidad: "249 - Estados Unidos" (CITIZENSHIP)</li>
                <li className="ml-4">□ Primer apellido: "SMITH"</li>
                <li className="ml-4">□ Segundo apellido: "(Ninguno)" - ✅ SIEMPRE VISIBLE</li>
                <li className="ml-4">□ Nombres: "JOHN"</li>

                <li>□ <strong>Sección Movimiento (3 campos):</strong></li>
                <li className="ml-4">□ Tipo: "Entrada (Check-in)"</li>
                <li className="ml-4">□ Fecha movimiento: "09/10/2025"</li>
                <li className="ml-4">□ Fecha nacimiento: "25/03/1985"</li>

                <li>□ <strong>Sección Geográfica (2 campos - CIUDAD O PAÍS):</strong></li>
                <li className="ml-4">□ Procedencia: "11001 - Bogotá, D.C." (CITY - DIVIPOLA)</li>
                <li className="ml-4">□ Destino: "88001 - San Andrés" (CITY - DIVIPOLA)</li>
                <li className="ml-4 text-yellow-600">💡 Pueden ser ciudad (5 dígitos) O país (1-3 dígitos)</li>

                <li>□ Botones "Cancelar" y "Confirmar datos" funcionan</li>
                <li>□ Loading skeletons durante fetch de catálogos</li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold mb-2">ComplianceSuccess:</h3>
              <ul className="space-y-1 ml-4">
                <li>□ Muestra confetti animation</li>
                <li>□ Título "¡Registro SIRE completado!"</li>
                <li>□ Muestra referencia SIRE</li>
                <li>□ Botón "Volver al chat" funciona</li>
                <li>□ Auto-close después de 8 segundos</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Console Logs */}
        <div className="bg-gray-900 text-green-400 rounded-lg p-4 font-mono text-sm">
          <div className="font-bold mb-2">💻 Console Output:</div>
          <div>Abre DevTools (F12) para ver logs de confirmación/cancelación</div>
        </div>
      </div>
    </div>
  );
}
