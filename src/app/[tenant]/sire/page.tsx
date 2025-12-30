/**
 * SIRE Export Management Page
 *
 * Staff-only page for generating and managing SIRE TXT exports.
 * Allows downloading foreign guest data for Migración Colombia reporting.
 */

'use client';

import { useState, useEffect } from 'react';
import { useTenant } from '@/contexts/TenantContext';
import SIRETXTDownloader from '@/components/Compliance/SIRETXTDownloader';
import { createClient } from '@supabase/supabase-js';
import { FileDown, Calendar, Users, Clock, Upload, CheckCircle, AlertCircle } from 'lucide-react';

interface SIREExport {
  id: string;
  export_date: string;
  date_range_from: string | null;
  date_range_to: string | null;
  movement_type: 'E' | 'S' | null;
  guest_count: number;
  excluded_count: number;
  txt_filename: string;
  txt_content: string | null;
  file_size_bytes: number;
  status: string;
  uploaded_at: string | null;
  confirmed_at: string | null;
  sire_reference: string | null;
  created_at: string;
}

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

export default function SIREPage() {
  const { tenant } = useTenant();
  const [exports, setExports] = useState<SIREExport[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal states for confirmation
  const [showReferenceModal, setShowReferenceModal] = useState(false);
  const [pendingConfirmId, setPendingConfirmId] = useState<string | null>(null);
  const [sireReference, setSireReference] = useState('');

  useEffect(() => {
    loadExports();
  }, [tenant]);

  const loadExports = async () => {
    if (!tenant) return;

    setLoading(true);
    setError(null);

    try {
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );

      const { data, error: fetchError } = await supabase
        .from('sire_exports')
        .select('*')
        .eq('tenant_id', tenant.tenant_id)
        .order('created_at', { ascending: false })
        .limit(20);

      if (fetchError) throw fetchError;
      setExports(data || []);
    } catch (err) {
      console.error('[SIRE] Error loading exports:', err);
      setError(err instanceof Error ? err.message : 'Error loading exports');
    } finally {
      setLoading(false);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatDate = (dateStr: string): string => {
    return new Date(dateStr).toLocaleDateString('es-CO', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatDateTime = (dateStr: string): string => {
    return new Date(dateStr).toLocaleString('es-CO', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getMovementTypeLabel = (type: 'E' | 'S' | null): string => {
    if (!type) return 'Both';
    return type === 'E' ? 'Check-ins (E)' : 'Check-outs (S)';
  };

  const downloadExistingTXT = (content: string, filename: string) => {
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const updateExportStatus = async (
    exportId: string,
    action: 'uploaded' | 'confirmed',
    sireRef?: string
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
        if (sireRef) {
          updateData.sire_reference = sireRef;
        }
      }

      const { error: updateError } = await supabase
        .from('sire_exports')
        .update(updateData)
        .eq('id', exportId);

      if (updateError) throw updateError;

      // Reload exports list
      await loadExports();
    } catch (err) {
      console.error('[SIRE] Error updating status:', err);
      alert('Error al actualizar estado');
    }
  };

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

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">SIRE Exports</h1>
        <p className="mt-2 text-gray-600">
          Generate and manage TXT files for Migración Colombia reporting
        </p>
      </div>

      {/* TXT Generator */}
      <SIRETXTDownloader tenantId={tenant?.tenant_id || ''} />

      {/* Export History */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Export History</h2>
          <p className="mt-1 text-sm text-gray-600">
            Recent SIRE TXT file generations
          </p>
        </div>

        <div className="p-6">
          {loading ? (
            <div className="text-center py-8">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <p className="mt-2 text-sm text-gray-600">Loading exports...</p>
            </div>
          ) : error ? (
            <div className="p-4 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-800">
                <strong>Error:</strong> {error}
              </p>
            </div>
          ) : exports.length === 0 ? (
            <div className="text-center py-8">
              <FileDown className="mx-auto h-12 w-12 text-gray-400" />
              <p className="mt-2 text-sm text-gray-600">No exports yet</p>
              <p className="text-xs text-gray-500">Generate your first TXT file above</p>
            </div>
          ) : (
            <div className="space-y-4">
              {exports.map((exp) => (
                <div
                  key={exp.id}
                  className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    {/* Left: Export Info */}
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2">
                        <FileDown className="h-5 w-5 text-blue-600" />
                        <span className="font-medium text-gray-900">
                          {exp.txt_filename}
                        </span>
                        <span className="text-xs text-gray-500">
                          ({formatFileSize(exp.file_size_bytes)})
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-4 text-sm">
                        {/* Date Range */}
                        <div className="flex items-center gap-2 text-gray-600">
                          <Calendar className="h-4 w-4" />
                          <span>
                            {exp.date_range_from && exp.date_range_to
                              ? `${formatDate(exp.date_range_from)} - ${formatDate(exp.date_range_to)}`
                              : exp.date_range_from
                              ? formatDate(exp.date_range_from)
                              : 'All dates'}
                          </span>
                        </div>

                        {/* Guest Count */}
                        <div className="flex items-center gap-2 text-gray-600">
                          <Users className="h-4 w-4" />
                          <span>
                            {exp.guest_count} guests
                            {exp.excluded_count > 0 && (
                              <span className="text-orange-600 ml-1">
                                ({exp.excluded_count} excluded)
                              </span>
                            )}
                          </span>
                        </div>

                        {/* Movement Type */}
                        <div className="text-gray-600">
                          <span className="font-medium">Type:</span> {getMovementTypeLabel(exp.movement_type)}
                        </div>

                        {/* Created At */}
                        <div className="flex items-center gap-2 text-gray-500 text-xs">
                          <Clock className="h-3 w-3" />
                          <span>{formatDateTime(exp.created_at)}</span>
                        </div>
                      </div>
                    </div>

                    {/* Right: Actions and Status */}
                    <div className="ml-4 flex flex-col items-end gap-2">
                      <ExportStatusBadge
                        status={exp.status}
                        uploadedAt={exp.uploaded_at}
                        confirmedAt={exp.confirmed_at}
                      />
                      {exp.sire_reference && (
                        <div className="text-xs text-gray-600">
                          <span className="font-medium">Ref:</span> {exp.sire_reference}
                        </div>
                      )}

                      {/* Action Buttons */}
                      <div className="flex items-center gap-2">
                        {/* Download TXT */}
                        {exp.txt_content && (
                          <button
                            onClick={() => downloadExistingTXT(exp.txt_content!, exp.txt_filename)}
                            className="p-1.5 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded transition-colors"
                            title="Descargar TXT"
                          >
                            <FileDown className="w-4 h-4" />
                          </button>
                        )}

                        {/* Mark as Uploaded - show only if generated and not uploaded yet */}
                        {exp.status === 'generated' && !exp.uploaded_at && (
                          <button
                            onClick={() => updateExportStatus(exp.id, 'uploaded')}
                            className="p-1.5 text-yellow-600 hover:text-yellow-800 hover:bg-yellow-50 rounded transition-colors"
                            title="Marcar como subido a SIRE"
                          >
                            <Upload className="w-4 h-4" />
                          </button>
                        )}

                        {/* Mark as Confirmed - show only if uploaded and not confirmed yet */}
                        {exp.uploaded_at && !exp.confirmed_at && (
                          <button
                            onClick={() => handleConfirmClick(exp.id)}
                            className="p-1.5 text-green-600 hover:text-green-800 hover:bg-green-50 rounded transition-colors"
                            title="Marcar como confirmado"
                          >
                            <CheckCircle className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Modal for SIRE Reference */}
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
              className="w-full px-3 py-2 border border-gray-300 rounded-lg mb-4 focus:outline-none focus:ring-2 focus:ring-green-500"
              autoFocus
            />
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowReferenceModal(false)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={submitConfirmation}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
