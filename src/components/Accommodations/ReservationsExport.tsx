'use client'

import { useState } from 'react'
import { Download } from 'lucide-react'

interface ReservationsExportProps {
  reservations: any[]
  hotelSlug: string
}

export function ReservationsExport({ reservations, hotelSlug }: ReservationsExportProps) {
  const [isExporting, setIsExporting] = useState(false)

  const formatDate = (dateStr: string): string => {
    if (!dateStr) return ''
    const [year, month, day] = dateStr.split('-').map(Number)
    const date = new Date(year, month - 1, day)
    return `${String(date.getDate()).padStart(2, '0')}-${String(date.getMonth() + 1).padStart(2, '0')}-${date.getFullYear()}`
  }

  const exportToExcel = async () => {
    try {
      setIsExporting(true)

      // Dynamic import to reduce bundle size
      const XLSX = await import('xlsx')

      // Prepare data
      const data = reservations.map((r) => ({
        'Código': r.reservation_code || '',
        'Huésped': r.guest_name,
        'Email': r.guest_email || '',
        'Teléfono': r.phone_full || `***-${r.phone_last_4}`,
        'País': r.guest_country || '',
        'Check-in': formatDate(r.check_in_date),
        'Check-out': formatDate(r.check_out_date),
        'Hora Check-in': r.check_in_time || '',
        'Hora Check-out': r.check_out_time || '',
        'Unidad': r.accommodation_unit?.name || 'Sin asignar',
        'Adultos': r.adults || 0,
        'Niños': r.children || 0,
        'Precio': r.total_price || 0,
        'Moneda': r.currency || 'COP',
        'Estado': r.status === 'active' ? 'Confirmada' : r.status,
        'Fuente': r.booking_source === 'motopress' ? 'MotoPress' : r.booking_source === 'airbnb' ? 'Airbnb' : 'Manual',
        'ID Externo': r.external_booking_id || '',
        'Notas': r.booking_notes || ''
      }))

      // Create workbook
      const worksheet = XLSX.utils.json_to_sheet(data)
      const workbook = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Reservas')

      // Auto-size columns
      const maxWidth = 50
      const wscols = Object.keys(data[0] || {}).map((key) => {
        const maxLength = Math.max(
          key.length,
          ...data.map((row: any) => String(row[key] || '').length)
        )
        return { wch: Math.min(maxLength + 2, maxWidth) }
      })
      worksheet['!cols'] = wscols

      // Generate filename
      const today = new Date().toISOString().split('T')[0]
      const filename = `reservas-${hotelSlug}-${today}.xlsx`

      // Download
      XLSX.writeFile(workbook, filename)

      console.log(`✅ Exported ${reservations.length} reservations to ${filename}`)
    } catch (error) {
      console.error('Export failed:', error)
      alert('Error al exportar: ' + (error instanceof Error ? error.message : 'Unknown error'))
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <button
      onClick={exportToExcel}
      disabled={isExporting || reservations.length === 0}
      className="flex items-center gap-2 px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      title={reservations.length === 0 ? 'No hay reservas para exportar' : 'Exportar a Excel'}
    >
      <Download className={`w-4 h-4 ${isExporting ? 'animate-bounce' : ''}`} />
      <span className="text-sm font-medium">
        {isExporting ? 'Exportando...' : 'Exportar Excel'}
      </span>
    </button>
  )
}
