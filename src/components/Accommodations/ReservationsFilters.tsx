'use client'

import { useState, useEffect } from 'react'
import { Search, X, Filter } from 'lucide-react'

export interface ReservationFilters {
  dateFrom?: string
  dateTo?: string
  unitId?: string
  status?: string
  source?: string
  searchQuery?: string
}

interface ReservationsFiltersProps {
  onFilterChange: (filters: ReservationFilters) => void
  onClear: () => void
}

export function ReservationsFilters({ onFilterChange, onClear }: ReservationsFiltersProps) {
  const [units, setUnits] = useState<any[]>([])
  const [filters, setFilters] = useState<ReservationFilters>({})
  const [isExpanded, setIsExpanded] = useState(false)

  useEffect(() => {
    loadUnits()
  }, [])

  const loadUnits = async () => {
    try {
      const response = await fetch('/api/accommodations/units')
      if (response.ok) {
        const data = await response.json()
        setUnits(data.data || [])
      }
    } catch (error) {
      console.error('Failed to load units:', error)
    }
  }

  const handleFilterChange = (key: keyof ReservationFilters, value: string) => {
    const newFilters = { ...filters, [key]: value || undefined }
    setFilters(newFilters)
    onFilterChange(newFilters)
  }

  const handleClear = () => {
    setFilters({})
    onClear()
  }

  const hasActiveFilters = Object.values(filters).some(v => v)

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-2 text-gray-700 hover:text-gray-900 font-medium"
        >
          <Filter className="w-4 h-4" />
          <span>Filtros Avanzados</span>
          {hasActiveFilters && (
            <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full font-semibold">
              {Object.values(filters).filter(v => v).length}
            </span>
          )}
        </button>
        {hasActiveFilters && (
          <button
            onClick={handleClear}
            className="flex items-center gap-1 text-sm text-gray-600 hover:text-red-600 transition-colors"
          >
            <X className="w-4 h-4" />
            Limpiar
          </button>
        )}
      </div>

      {/* Filters Grid */}
      {isExpanded && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-4 border-t border-gray-200">
          {/* Search */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Buscar
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Nombre o email del huésped"
                value={filters.searchQuery || ''}
                onChange={(e) => handleFilterChange('searchQuery', e.target.value)}
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Date From */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Check-in desde
            </label>
            <input
              type="date"
              value={filters.dateFrom || ''}
              onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Date To */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Check-in hasta
            </label>
            <input
              type="date"
              value={filters.dateTo || ''}
              onChange={(e) => handleFilterChange('dateTo', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Unit */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Unidad
            </label>
            <select
              value={filters.unitId || ''}
              onChange={(e) => handleFilterChange('unitId', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Todas las unidades</option>
              {units.map((unit) => (
                <option key={unit.id} value={unit.id}>
                  {unit.name}
                </option>
              ))}
            </select>
          </div>

          {/* Status */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Estado
            </label>
            <select
              value={filters.status || ''}
              onChange={(e) => handleFilterChange('status', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Todos los estados</option>
              <option value="active">Confirmada</option>
              <option value="cancelled">Cancelada</option>
              <option value="completed">Completada</option>
            </select>
          </div>

          {/* Booking Source */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Fuente
            </label>
            <select
              value={filters.source || ''}
              onChange={(e) => handleFilterChange('source', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Todas las fuentes</option>
              <option value="motopress">MotoPress</option>
              <option value="airbnb">Airbnb</option>
              <option value="manual">Manual</option>
            </select>
          </div>
        </div>
      )}
    </div>
  )
}
