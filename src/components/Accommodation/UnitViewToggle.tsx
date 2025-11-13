'use client'

import { LayoutGrid, Table2 } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface Props {
  value: 'grid' | 'table'
  onChange: (view: 'grid' | 'table') => void
}

export function UnitViewToggle({ value, onChange }: Props) {
  return (
    <div className="inline-flex rounded-md shadow-sm" role="group">
      <Button
        variant={value === 'grid' ? 'default' : 'outline'}
        onClick={() => onChange('grid')}
        aria-label="Vista de grilla"
        className="rounded-r-none"
      >
        <LayoutGrid className="h-4 w-4" />
      </Button>
      <Button
        variant={value === 'table' ? 'default' : 'outline'}
        onClick={() => onChange('table')}
        aria-label="Vista de tabla"
        className="rounded-l-none"
      >
        <Table2 className="h-4 w-4" />
      </Button>
    </div>
  )
}
