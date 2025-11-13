/**
 * EXAMPLE USAGE:
 *
 * This demonstrates how to use UnitSearchBar with debounced search.
 * Copy this pattern into your page component.
 */

'use client'

import { useState } from 'react'
import { useDebounce } from 'use-debounce'
import { UnitSearchBar } from './UnitSearchBar'

export function UnitSearchExample() {
  const [searchQuery, setSearchQuery] = useState('')
  const [debouncedSearchQuery] = useDebounce(searchQuery, 300)

  // Use debouncedSearchQuery for filtering
  const filteredUnits = units.filter(unit => {
    const search = debouncedSearchQuery.toLowerCase()
    return (
      unit.name.toLowerCase().includes(search) ||
      unit.type.toLowerCase().includes(search) ||
      unit.description?.toLowerCase().includes(search)
    )
  })

  return (
    <div>
      <UnitSearchBar
        value={searchQuery}
        onChange={setSearchQuery}
        placeholder="Buscar por nombre, tipo o descripción..."
      />

      {/* Render filtered units */}
      <div className="mt-4">
        {filteredUnits.map(unit => (
          <div key={unit.id}>{unit.name}</div>
        ))}
      </div>
    </div>
  )
}

// Example units array (replace with actual data)
const units = [
  { id: '1', name: 'Suite Premium', type: 'suite', description: 'Suite de lujo' },
  { id: '2', name: 'Habitación Doble', type: 'room', description: 'Habitación estándar' }
]
