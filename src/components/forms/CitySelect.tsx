'use client'

/**
 * CitySelect Component
 *
 * Searchable dropdown for Colombian cities (1,122 entries)
 * Uses the SIRE/DIVIPOLA city catalog for compliance.
 */

import { useState, useRef, useEffect, useMemo } from 'react'
import { ChevronDown, Check, Search, X } from 'lucide-react'
import { cn } from '@/lib/utils'

// Import the cities catalog directly (statically bundled)
import citiesCatalog from '@/../_assets/sire/ciudades-colombia.json'

interface City {
  codigo: string
  ciudad: string
  habilitada_sire: boolean
}

interface CitySelectProps {
  value: string // DIVIPOLA code
  onChange: (code: string, name: string) => void
  error?: string
  disabled?: boolean
  placeholder?: string
}

// Top cities for initial display (most common hotel locations)
const TOP_CITY_CODES = [
  '11001', // Bogotá
  '5001',  // Medellín
  '76001', // Cali
  '8001',  // Barranquilla
  '13001', // Cartagena
  '88001', // San Andrés Isla
  '88564', // Providencia y Santa Catalina Islas
  '68001', // Bucaramanga
  '54001', // Cúcuta
  '17001', // Manizales
  '66001', // Pereira
]

export function CitySelect({
  value,
  onChange,
  error,
  disabled = false,
  placeholder = 'Selecciona una ciudad...'
}: CitySelectProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Special name overrides for disambiguation
  const NAME_OVERRIDES: Record<string, string> = {
    '88001': 'SAN ANDRÉS ISLA',  // Distinguish from San Andrés (Santander) 68669
    '88564': 'PROVIDENCIA Y SANTA CATALINA ISLAS'  // Archipelago municipality
  }

  // Cast, apply overrides, and sort cities
  const cities = useMemo(() => {
    return (citiesCatalog as City[])
      .map(city => ({
        ...city,
        ciudad: NAME_OVERRIDES[city.codigo] || city.ciudad
      }))
      .sort((a, b) => a.ciudad.localeCompare(b.ciudad, 'es'))
  }, [])

  // Find selected city name
  const selectedCity = useMemo(() => {
    return cities.find(c => c.codigo === value)
  }, [cities, value])

  // Filter cities based on search
  const filteredCities = useMemo(() => {
    if (!searchTerm) {
      // Show top cities first when no search
      const topCities = TOP_CITY_CODES
        .map(code => cities.find(c => c.codigo === code))
        .filter((c): c is City => c !== undefined)

      const otherCities = cities.filter(
        c => !TOP_CITY_CODES.includes(c.codigo)
      )

      return [...topCities, ...otherCities]
    }

    const normalizedSearch = searchTerm
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Remove accents

    return cities.filter(city => {
      const normalizedCity = city.ciudad
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')

      return normalizedCity.includes(normalizedSearch)
    })
  }, [cities, searchTerm])

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
        setSearchTerm('')
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Focus input when opening
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus()
    }
  }, [isOpen])

  const handleSelect = (city: City) => {
    onChange(city.codigo, city.ciudad)
    setIsOpen(false)
    setSearchTerm('')
  }

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation()
    onChange('', '')
  }

  return (
    <div ref={containerRef} className="relative">
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={cn(
          "flex h-10 w-full items-center justify-between rounded-md border bg-background px-3 py-2 text-sm ring-offset-background",
          "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
          "disabled:cursor-not-allowed disabled:opacity-50",
          error ? "border-red-500" : "border-input",
          isOpen && "ring-2 ring-ring ring-offset-2"
        )}
      >
        <span className={cn(
          "truncate",
          !selectedCity && "text-muted-foreground"
        )}>
          {selectedCity ? selectedCity.ciudad : placeholder}
        </span>
        <div className="flex items-center gap-1">
          {selectedCity && (
            <X
              className="h-4 w-4 opacity-50 hover:opacity-100 cursor-pointer"
              onClick={handleClear}
            />
          )}
          <ChevronDown className={cn(
            "h-4 w-4 opacity-50 transition-transform",
            isOpen && "rotate-180"
          )} />
        </div>
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute z-50 mt-1 w-full rounded-md border bg-white shadow-lg">
          {/* Search Input */}
          <div className="flex items-center border-b px-3 py-2 bg-white">
            <Search className="h-4 w-4 text-gray-400 mr-2" />
            <input
              ref={inputRef}
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar ciudad..."
              className="flex-1 bg-white text-sm outline-none placeholder:text-gray-400"
            />
            {searchTerm && (
              <X
                className="h-4 w-4 text-muted-foreground cursor-pointer hover:text-foreground"
                onClick={() => setSearchTerm('')}
              />
            )}
          </div>

          {/* Cities List */}
          <div className="max-h-60 overflow-y-auto p-1 bg-white">
            {filteredCities.length === 0 ? (
              <div className="py-4 text-center text-sm text-muted-foreground">
                No se encontraron ciudades
              </div>
            ) : (
              filteredCities.slice(0, 100).map((city) => (
                <button
                  key={city.codigo}
                  type="button"
                  onClick={() => handleSelect(city)}
                  className={cn(
                    "relative flex w-full items-center rounded-sm py-2 pl-8 pr-2 text-sm outline-none",
                    "hover:bg-accent hover:text-accent-foreground cursor-pointer",
                    value === city.codigo && "bg-accent"
                  )}
                >
                  <span className="absolute left-2 flex h-4 w-4 items-center justify-center">
                    {value === city.codigo && <Check className="h-4 w-4" />}
                  </span>
                  <span className="truncate">{city.ciudad}</span>
                  <span className="ml-auto text-xs text-muted-foreground">
                    {city.codigo}
                  </span>
                </button>
              ))
            )}
            {filteredCities.length > 100 && (
              <div className="py-2 text-center text-xs text-muted-foreground">
                Mostrando 100 de {filteredCities.length} resultados. Escribe para filtrar.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
