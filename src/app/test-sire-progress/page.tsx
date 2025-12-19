import { SireProgressBarDemo } from '@/components/Compliance/SireProgressBarDemo';

/**
 * PÁGINA DE TEST - SIRE Progress Bar Component
 *
 * Ruta: /test-sire-progress
 *
 * Esta página es temporal para testing visual del componente SireProgressBar.
 * Eliminar antes de deploy a producción.
 */
export default function TestSireProgressPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-8">
      <SireProgressBarDemo />
    </div>
  );
}
