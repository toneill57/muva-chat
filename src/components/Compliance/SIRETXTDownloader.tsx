/**
 * SIRE TXT Downloader Component
 *
 * UI component for generating and downloading SIRE TXT files.
 * Connects to /api/sire/generate-txt endpoint.
 *
 * Usage:
 *   <SIRETXTDownloader tenantId="hotelsanandres" />
 *
 * Features:
 *   - Date range picker
 *   - Movement type filter
 *   - Loading state
 *   - Error handling
 *   - Automatic file download
 *   - Exclusion report display
 */

'use client';

import React, { useState } from 'react';

interface SIRETXTDownloaderProps {
  tenantId: string;
  className?: string;
}

interface GenerateTXTResponse {
  success: boolean;
  txt_content: string;
  filename: string;
  guest_count: number;
  excluded_count: number;
  excluded: Array<{
    reservation_id: string;
    guest_name: string;
    reason: string;
  }>;
  generated_at: string;
  message?: string;
}

export default function SIRETXTDownloader({ tenantId, className }: SIRETXTDownloaderProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<GenerateTXTResponse | null>(null);

  // Form state
  const [filterType, setFilterType] = useState<'all' | 'single' | 'range'>('all');
  const [singleDate, setSingleDate] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [movementType, setMovementType] = useState<'E' | 'S' | 'both'>('both');

  const handleGenerate = async () => {
    setLoading(true);
    setError(null);
    setLastResult(null);

    try {
      // Build request payload
      const payload: any = {
        tenant_id: tenantId,
        movement_type: movementType,
      };

      if (filterType === 'single' && singleDate) {
        payload.date = singleDate;
      } else if (filterType === 'range') {
        if (dateFrom) payload.date_from = dateFrom;
        if (dateTo) payload.date_to = dateTo;
      }

      // Call API
      const response = await fetch('/api/sire/generate-txt', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data: GenerateTXTResponse = await response.json();

      if (!response.ok) {
        throw new Error((data as any).error || 'Failed to generate TXT');
      }

      setLastResult(data);

      // Auto-download if content exists
      if (data.guest_count > 0 && data.txt_content) {
        downloadTXT(data.txt_content, data.filename);
      }

    } catch (err) {
      console.error('[SIRETXTDownloader] Error:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const downloadTXT = (content: string, filename: string) => {
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

  return (
    <div className={`space-y-6 p-6 bg-white rounded-lg shadow ${className || ''}`}>
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Generate SIRE TXT File</h2>
        <p className="mt-1 text-sm text-gray-600">
          Export foreign guest data for Migración Colombia reporting
        </p>
      </div>

      {/* Date Filter Type */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Date Filter
        </label>
        <div className="space-y-2">
          <label className="flex items-center">
            <input
              type="radio"
              value="all"
              checked={filterType === 'all'}
              onChange={(e) => setFilterType(e.target.value as any)}
              className="mr-2"
            />
            All dates
          </label>
          <label className="flex items-center">
            <input
              type="radio"
              value="single"
              checked={filterType === 'single'}
              onChange={(e) => setFilterType(e.target.value as any)}
              className="mr-2"
            />
            Single date
          </label>
          <label className="flex items-center">
            <input
              type="radio"
              value="range"
              checked={filterType === 'range'}
              onChange={(e) => setFilterType(e.target.value as any)}
              className="mr-2"
            />
            Date range
          </label>
        </div>
      </div>

      {/* Single Date Input */}
      {filterType === 'single' && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Movement Date
          </label>
          <input
            type="date"
            value={singleDate}
            onChange={(e) => setSingleDate(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
      )}

      {/* Date Range Inputs */}
      {filterType === 'range' && (
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              From Date
            </label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              To Date
            </label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>
      )}

      {/* Movement Type Filter */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Movement Type
        </label>
        <div className="space-y-2">
          <label className="flex items-center">
            <input
              type="radio"
              value="both"
              checked={movementType === 'both'}
              onChange={(e) => setMovementType(e.target.value as any)}
              className="mr-2"
            />
            Both (Check-ins and Check-outs)
          </label>
          <label className="flex items-center">
            <input
              type="radio"
              value="E"
              checked={movementType === 'E'}
              onChange={(e) => setMovementType(e.target.value as any)}
              className="mr-2"
            />
            Check-ins only (E)
          </label>
          <label className="flex items-center">
            <input
              type="radio"
              value="S"
              checked={movementType === 'S'}
              onChange={(e) => setMovementType(e.target.value as any)}
              className="mr-2"
            />
            Check-outs only (S)
          </label>
        </div>
      </div>

      {/* Generate Button */}
      <button
        onClick={handleGenerate}
        disabled={loading}
        className="w-full bg-blue-600 text-white py-3 px-6 rounded-md font-medium hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition"
      >
        {loading ? 'Generating...' : 'Generate and Download TXT'}
      </button>

      {/* Error Display */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-md">
          <p className="text-sm text-red-800">
            <strong>Error:</strong> {error}
          </p>
        </div>
      )}

      {/* Success Display */}
      {lastResult && (
        <div className="space-y-4">
          {lastResult.guest_count === 0 ? (
            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-md">
              <p className="text-sm text-yellow-800">
                {lastResult.message || 'No guests found matching the criteria'}
              </p>
            </div>
          ) : (
            <div className="p-4 bg-green-50 border border-green-200 rounded-md">
              <p className="text-sm text-green-800">
                <strong>Success!</strong> Downloaded {lastResult.filename}
              </p>
              <div className="mt-2 text-sm text-green-700">
                <p>Guests included: {lastResult.guest_count}</p>
                <p>Guests excluded: {lastResult.excluded_count}</p>
                <p>Generated at: {new Date(lastResult.generated_at).toLocaleString()}</p>
              </div>
            </div>
          )}

          {/* Exclusion Report */}
          {lastResult.excluded_count > 0 && (
            <div className="p-4 bg-orange-50 border border-orange-200 rounded-md">
              <p className="text-sm font-medium text-orange-900 mb-2">
                Excluded Guests ({lastResult.excluded_count})
              </p>
              <ul className="text-sm text-orange-800 space-y-1">
                {lastResult.excluded.map((exc, idx) => (
                  <li key={idx}>
                    <strong>{exc.guest_name}</strong> - {exc.reason}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
