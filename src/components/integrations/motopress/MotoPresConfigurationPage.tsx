'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  ArrowLeft,
  Shield,
  CheckCircle,
  AlertCircle,
  Loader2,
  ExternalLink,
  Settings,
  RefreshCw,
  Database,
  Clock
} from "lucide-react"
import { ConfigurationForm } from './ConfigurationForm'
import { AccommodationPreview } from './AccommodationPreview'
import { SyncStatusIndicator } from './SyncStatusIndicator'

interface MotoPresConfigurationPageProps {
  tenant: string
  onBack: () => void
  onComplete: () => void
}

type ConfigStep = 'setup' | 'test' | 'preview' | 'sync' | 'complete'

interface ConfigStatus {
  isConfigured: boolean
  isConnected: boolean
  lastSync?: Date
  accommodationsCount: number
  error?: string
}

export function MotoPresConfigurationPage({ tenant, onBack, onComplete }: MotoPresConfigurationPageProps) {
  const [currentStep, setCurrentStep] = useState<ConfigStep>('setup')
  const [configStatus, setConfigStatus] = useState<ConfigStatus>({
    isConfigured: false,
    isConnected: false,
    accommodationsCount: 0
  })
  const [isLoading, setIsLoading] = useState(false)
  const [accommodations, setAccommodations] = useState([])

  useEffect(() => {
    checkCurrentStatus()
  }, [tenant])

  const checkCurrentStatus = async () => {
    setIsLoading(true)
    try {
      // Check if MotoPress is already configured
      const statusResponse = await fetch(`/api/integrations/motopress/status?tenant_id=${tenant}`)
      if (statusResponse.ok) {
        const statusData = await statusResponse.json()

        setConfigStatus({
          isConfigured: statusData.is_configured,
          isConnected: statusData.is_active && statusData.is_configured,
          lastSync: statusData.last_sync_at ? new Date(statusData.last_sync_at) : undefined,
          accommodationsCount: statusData.accommodations_count
        })

        if (statusData.is_configured) {
          setCurrentStep(statusData.is_active ? 'complete' : 'test')
        }
      }
    } catch (error) {
      console.error('Error checking config status:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleConfigurationSaved = async () => {
    setCurrentStep('test')
    await checkCurrentStatus()
  }

  const handleConnectionTested = async () => {
    setCurrentStep('preview')
    await loadAccommodationsPreview()
  }

  const loadAccommodationsPreview = async () => {
    setIsLoading(true)
    try {
      const response = await fetch(`/api/integrations/motopress/accommodations?tenant_id=${tenant}`)
      if (response.ok) {
        const data = await response.json()
        setAccommodations(data.accommodations || [])
        setIsLoading(false)
      }
    } catch (error) {
      console.error('Error loading accommodations preview:', error)
      setIsLoading(false)
    }
  }

  const handleImportComplete = async () => {
    setCurrentStep('complete')
    await checkCurrentStatus()
  }

  const getStepStatus = (step: ConfigStep) => {
    const steps: ConfigStep[] = ['setup', 'test', 'preview', 'sync', 'complete']
    const currentIndex = steps.indexOf(currentStep)
    const stepIndex = steps.indexOf(step)

    if (stepIndex < currentIndex) return 'completed'
    if (stepIndex === currentIndex) return 'current'
    return 'pending'
  }

  const steps = [
    {
      id: 'setup' as ConfigStep,
      title: 'Configuración',
      description: 'Conectar con MotoPress'
    },
    {
      id: 'test' as ConfigStep,
      title: 'Verificación',
      description: 'Probar conexión'
    },
    {
      id: 'preview' as ConfigStep,
      title: 'Vista previa',
      description: 'Revisar datos a importar'
    },
    {
      id: 'sync' as ConfigStep,
      title: 'Sincronización',
      description: 'Importar alojamientos'
    },
    {
      id: 'complete' as ConfigStep,
      title: 'Completado',
      description: 'Integración activa'
    }
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50/30">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-sm border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-6">
            <div className="flex items-center">
              <Button
                variant="ghost"
                size="sm"
                onClick={onBack}
                className="mr-4 hover:bg-gray-100"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Volver al Dashboard
              </Button>
              <div className="flex items-center">
                <Settings className="h-8 w-8 text-blue-600 mr-3" />
                <div>
                  <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-700 to-purple-700 bg-clip-text text-transparent">
                    Configuración MotoPress
                  </h1>
                  <p className="text-sm text-gray-500 font-medium">
                    {tenant} • Integración de alojamientos
                  </p>
                </div>
              </div>
            </div>

            {configStatus.isConnected && (
              <Badge variant="secondary" className="bg-green-100 text-green-800">
                <CheckCircle className="h-3 w-3 mr-1" />
                Conectado
              </Badge>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Progress Steps */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Shield className="h-5 w-5 mr-2" />
              Progreso de Configuración
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              {steps.map((step, index) => {
                const status = getStepStatus(step.id)
                return (
                  <div key={step.id} className="flex items-center">
                    <div className="flex flex-col items-center">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        status === 'completed'
                          ? 'bg-green-500 text-white'
                          : status === 'current'
                          ? 'bg-blue-500 text-white'
                          : 'bg-gray-200 text-gray-500'
                      }`}>
                        {status === 'completed' ? (
                          <CheckCircle className="h-5 w-5" />
                        ) : (
                          <span className="text-sm font-medium">{index + 1}</span>
                        )}
                      </div>
                      <div className="mt-2 text-center">
                        <p className="text-xs font-medium text-gray-900">{step.title}</p>
                        <p className="text-xs text-gray-500">{step.description}</p>
                      </div>
                    </div>
                    {index < steps.length - 1 && (
                      <div className={`flex-1 h-px mx-4 ${
                        getStepStatus(steps[index + 1].id) === 'completed'
                          ? 'bg-green-500'
                          : 'bg-gray-200'
                      }`} />
                    )}
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>

        {/* Step Content */}
        <div className="space-y-6">
          {currentStep === 'setup' && (
            <ConfigurationForm
              tenantId={tenant}
              onConfigured={handleConfigurationSaved}
              onCancel={() => {}}
            />
          )}

          {currentStep === 'test' && (
            <Card>
              <CardHeader>
                <CardTitle>Verificar Conexión</CardTitle>
              </CardHeader>
              <CardContent>
                <SyncStatusIndicator
                  tenantId={tenant}
                  onConnectionVerified={handleConnectionTested}
                  onConnectionFailed={() => setCurrentStep('setup')}
                />
              </CardContent>
            </Card>
          )}

          {currentStep === 'preview' && (
            <AccommodationPreview
              tenantId={tenant}
              accommodations={accommodations}
              isLoading={isLoading}
              onImport={handleImportComplete}
              onBack={() => setCurrentStep('test')}
            />
          )}

          {currentStep === 'sync' && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                  Sincronizando Datos
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
                  <p className="text-gray-600">Importando alojamientos desde MotoPress...</p>
                </div>
              </CardContent>
            </Card>
          )}

          {currentStep === 'complete' && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center text-green-700">
                  <CheckCircle className="h-5 w-5 mr-2" />
                  Integración Completada
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-center">
                    <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
                    <div>
                      <p className="font-medium text-green-800">¡Configuración exitosa!</p>
                      <p className="text-sm text-green-600">
                        MotoPress está conectado y sincronizando datos automáticamente.
                      </p>
                    </div>
                  </div>
                </div>

                {configStatus.accommodationsCount > 0 && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <div className="flex items-center">
                        <Database className="h-5 w-5 text-blue-500 mr-2" />
                        <div>
                          <p className="font-medium text-blue-800">
                            {configStatus.accommodationsCount} Alojamientos
                          </p>
                          <p className="text-sm text-blue-600">Importados y disponibles</p>
                        </div>
                      </div>
                    </div>

                    {configStatus.lastSync && (
                      <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                        <div className="flex items-center">
                          <Clock className="h-5 w-5 text-purple-500 mr-2" />
                          <div>
                            <p className="font-medium text-purple-800">Última Sync</p>
                            <p className="text-sm text-purple-600">
                              {configStatus.lastSync.toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                <div className="flex justify-between">
                  <Button variant="outline" onClick={onBack}>
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Volver al Dashboard
                  </Button>
                  <Button onClick={onComplete}>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Finalizar Configuración
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}