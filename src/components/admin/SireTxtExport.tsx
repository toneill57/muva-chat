'use client';

/**
 * SIRE TXT Export Component
 *
 * Admin UI for generating and downloading SIRE compliance TXT files.
 * Allows date range selection, movement type filtering, and preview
 * of included/excluded guests before export.
 */

import { useState } from 'react';
import { Download, FileText, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';

// ============================================================================
// Types
// ============================================================================

interface ExportStatistics {
  reservation_count: number;
  guest_count: number;
  line_count: number;
  excluded_count: number;
  error_count: number;
}

interface ExcludedGuest {
  guest_name: string;
  reason: string;
  missing_fields: string[];
}

interface ExportResponse {
  success: boolean;
  txt_content?: string;
  filename?: string;
  statistics?: ExportStatistics;
  excluded?: ExcludedGuest[];
  export_id?: string;
  processing_time_ms?: number;
  error?: string;
  code?: string;
}

interface SireTxtExportProps {
  tenantId: string;
  className?: string;
}

// ============================================================================
// Component
// ============================================================================

export function SireTxtExport({ tenantId, className = '' }: SireTxtExportProps) {
  // Form state
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [movementType, setMovementType] = useState<'E' | 'S' | ''>('');
  const [includeColombianos, setIncludeColombianos] = useState(false);

  // Export state
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ExportResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  // ============================================================================
  // Handlers
  // ============================================================================

  const handleGenerate = async () => {
    if (!dateFrom) {
      setError('Por favor selecciona al menos la fecha inicial');
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch('/api/sire/generate-txt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenant_id: tenantId,
          date_from: dateFrom,
          date_to: dateTo || dateFrom,
          movement_type: movementType || undefined,
          include_colombians: includeColombianos,
        }),
      });

      const data: ExportResponse = await response.json();

      if (!data.success) {
        setError(data.error || 'Error al generar el archivo');
        return;
      }

      setResult(data);
    } catch (err) {
      setError('Error de conexión. Por favor intenta de nuevo.');
      console.error('[SireTxtExport] Error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = () => {
    if (!result?.txt_content || !result?.filename) return;

    // Create blob and download
    const blob = new Blob([result.txt_content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = result.filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleReset = () => {
    setResult(null);
    setError(null);
  };

  // ============================================================================
  // Render
  // ============================================================================

  return (
    <div className={`bg-white rounded-lg shadow-sm border p-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <FileText className="w-6 h-6 text-blue-600" />
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Exportar TXT SIRE</h2>
          <p className="text-sm text-gray-500">
            Genera archivo TXT para reporte de huéspedes extranjeros a Migración Colombia
          </p>
        </div>
      </div>

      {/* Form */}
      {!result && (
        <div className="space-y-4">
          {/* Date Range */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Fecha desde *
              </label>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Fecha hasta
              </label>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                min={dateFrom}
                className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          {/* Movement Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tipo de movimiento
            </label>
            <select
              value={movementType}
              onChange={(e) => setMovementType(e.target.value as 'E' | 'S' | '')}
              className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Ambos (Entrada y Salida)</option>
              <option value="E">Solo Entradas (Check-in)</option>
              <option value="S">Solo Salidas (Check-out)</option>
            </select>
          </div>

          {/* Include Colombians */}
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="includeColombianos"
              checked={includeColombianos}
              onChange={(e) => setIncludeColombianos(e.target.checked)}
              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <label htmlFor="includeColombianos" className="text-sm text-gray-600">
              Incluir colombianos (normalmente SIRE solo requiere extranjeros)
            </label>
          </div>

          {/* Error Message */}
          {error && (
            <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-md">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {/* Generate Button */}
          <button
            onClick={handleGenerate}
            disabled={loading || !dateFrom}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Generando...
              </>
            ) : (
              <>
                <FileText className="w-5 h-5" />
                Generar TXT
              </>
            )}
          </button>
        </div>
      )}

      {/* Results */}
      {result && result.success && (
        <div className="space-y-4">
          {/* Success Header */}
          <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-md">
            <CheckCircle className="w-5 h-5 text-green-600" />
            <span className="text-sm text-green-700 font-medium">
              Archivo generado exitosamente
            </span>
          </div>

          {/* Statistics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatCard
              label="Reservaciones"
              value={result.statistics?.reservation_count || 0}
            />
            <StatCard
              label="Huéspedes"
              value={result.statistics?.guest_count || 0}
            />
            <StatCard
              label="Líneas TXT"
              value={result.statistics?.line_count || 0}
            />
            <StatCard
              label="Excluidos"
              value={result.statistics?.excluded_count || 0}
              warning={result.statistics?.excluded_count ? true : false}
            />
          </div>

          {/* Excluded Guests */}
          {result.excluded && result.excluded.length > 0 && (
            <div className="border rounded-md overflow-hidden">
              <div className="bg-yellow-50 px-4 py-2 border-b">
                <h3 className="text-sm font-medium text-yellow-800">
                  Huéspedes excluidos ({result.excluded.length})
                </h3>
              </div>
              <div className="max-h-40 overflow-y-auto">
                {result.excluded.map((ex, i) => (
                  <div
                    key={i}
                    className="px-4 py-2 border-b last:border-b-0 text-sm"
                  >
                    <p className="font-medium text-gray-900">{ex.guest_name}</p>
                    <p className="text-gray-500 text-xs">{ex.reason}</p>
                    {ex.missing_fields.length > 0 && (
                      <p className="text-red-500 text-xs mt-1">
                        Campos faltantes: {ex.missing_fields.join(', ')}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Preview */}
          <div className="border rounded-md overflow-hidden">
            <div className="bg-gray-50 px-4 py-2 border-b">
              <h3 className="text-sm font-medium text-gray-700">
                Vista previa ({result.filename})
              </h3>
            </div>
            <pre className="p-3 text-xs font-mono bg-gray-900 text-green-400 overflow-x-auto max-h-32">
              {result.txt_content?.split('\n').slice(0, 5).join('\n')}
              {(result.statistics?.line_count || 0) > 5 && '\n...'}
            </pre>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={handleDownload}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
            >
              <Download className="w-5 h-5" />
              Descargar TXT
            </button>
            <button
              onClick={handleReset}
              className="px-4 py-2.5 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
            >
              Nueva exportación
            </button>
          </div>

          {/* Processing Info */}
          <p className="text-xs text-gray-400 text-center">
            Export ID: {result.export_id} | Tiempo: {result.processing_time_ms}ms
          </p>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Sub-components
// ============================================================================

function StatCard({
  label,
  value,
  warning = false,
}: {
  label: string;
  value: number;
  warning?: boolean;
}) {
  return (
    <div
      className={`p-3 rounded-md ${
        warning ? 'bg-yellow-50 border border-yellow-200' : 'bg-gray-50'
      }`}
    >
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      <p className={`text-xs ${warning ? 'text-yellow-700' : 'text-gray-500'}`}>
        {label}
      </p>
    </div>
  );
}

export default SireTxtExport;
