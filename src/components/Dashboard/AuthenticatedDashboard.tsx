'use client'

import { useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { FileUploader } from "@/components/FileUploader/FileUploader"
import { ListingsChatAssistant } from "@/components/ChatAssistant/ListingsChatAssistant"
import { AccommodationSystemDashboard } from "@/components/Accommodation/AccommodationSystemDashboard"
import { PremiumChatInterface } from "@/components/Chat/PremiumChatInterface"
import { PremiumChatInterfaceDev } from "@/components/Chat/PremiumChatInterface.dev"
import { PremiumChatInterfaceSemantic } from "@/components/Chat/PremiumChatInterface.semantic"
import { FileCheck, MessageCircle, Upload, BarChart3, Shield, Users, LogOut, Building2, Home, Bot, FlaskConical, ToggleLeft, ToggleRight, Brain } from "lucide-react"

export function AuthenticatedDashboard() {
  const { user, activeClient, signOut } = useAuth()
  const [activeTab, setActiveTab] = useState<'chat' | 'upload' | 'sire' | 'accommodation' | 'reports' | 'premium-chat' | 'semantic-chat'>('chat')
  const [isDevMode, setIsDevMode] = useState(false)

  if (!user || !activeClient) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Cargando información del cliente...</p>
        </div>
      </div>
    )
  }

  const handleSignOut = async () => {
    await signOut()
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-purple-50/20">
      {/* Enhanced Header */}
      <header className="bg-white/80 backdrop-blur-sm border-b border-gray-200 shadow-sm sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row justify-between items-center py-4 sm:py-6 space-y-4 sm:space-y-0">
            <div className="flex items-center animate-slideInLeft">
              <div className="relative">
                <Shield className="h-8 w-8 text-blue-600 mr-3 animate-pulse" />
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-blue-400 rounded-full animate-ping"></div>
              </div>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-700 to-purple-700 bg-clip-text text-transparent">MUVA</h1>
                <p className="text-sm text-gray-600 font-medium">
                  {activeClient.business_name} • {activeClient.business_type}
                </p>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row items-center space-y-2 sm:space-y-0 sm:space-x-4 animate-slideInRight">
              <div className="text-center sm:text-right">
                <p className="text-sm font-medium text-gray-900">{user.email}</p>
                <p className="text-xs text-gray-500 flex flex-wrap justify-center sm:justify-end gap-1">
                  <span>{activeClient.client_name}</span>
                  {activeClient.has_sire_access && (
                    <span className="px-2 py-0.5 bg-gradient-to-r from-blue-100 to-blue-200 text-blue-800 text-xs rounded-full font-semibold shadow-sm">
                      SIRE Access
                    </span>
                  )}
                  {activeClient.has_muva_access && (
                    <span className="px-2 py-0.5 bg-gradient-to-r from-purple-100 to-purple-200 text-purple-800 text-xs rounded-full font-semibold shadow-sm animate-pulse">
                      Plan Premium
                    </span>
                  )}
                  {!activeClient.has_muva_access && (
                    <span className="px-2 py-0.5 bg-gradient-to-r from-gray-100 to-gray-200 text-gray-700 text-xs rounded-full font-semibold shadow-sm">
                      Plan Basic
                    </span>
                  )}
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleSignOut}
                className="flex items-center space-x-2 hover:bg-red-50 hover:border-red-300 hover:text-red-700 transition-all duration-300 enhanced-button"
              >
                <LogOut className="h-4 w-4" />
                <span className="hidden sm:inline">Salir</span>
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Enhanced Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-8 animate-fadeIn">
          <Card className="hover:shadow-lg transition-all duration-300 hover:scale-105 bg-gradient-to-br from-white to-blue-50/30">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-700">Tu Negocio</CardTitle>
              <Building2 className="h-5 w-5 text-blue-500 animate-pulse" />
            </CardHeader>
            <CardContent>
              <div className="text-lg font-bold text-blue-700">{activeClient.business_type}</div>
              <p className="text-xs text-gray-600 font-medium truncate">{activeClient.business_name}</p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-all duration-300 hover:scale-105 bg-gradient-to-br from-white to-green-50/30">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-700">Consultas</CardTitle>
              <MessageCircle className="h-5 w-5 text-green-500 animate-bounce" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-700">∞</div>
              <p className="text-xs text-gray-600 font-medium">Chat unificado disponible</p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-all duration-300 hover:scale-105 bg-gradient-to-br from-white to-purple-50/30">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-700">Información</CardTitle>
              <FileCheck className="h-5 w-5 text-purple-500 animate-pulse" />
            </CardHeader>
            <CardContent>
              <div className="text-lg font-bold text-purple-700">MUVA + Negocio</div>
              <p className="text-xs text-gray-600 font-medium">Datos combinados</p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-all duration-300 hover:scale-105 bg-gradient-to-br from-white to-green-50/30 status-active">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-700">Estado</CardTitle>
              <Shield className="h-5 w-5 text-green-500 animate-glowPulse" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600 flex items-center">
                Activo
                <div className="ml-2 w-3 h-3 bg-green-500 rounded-full animate-ping"></div>
              </div>
              <p className="text-xs text-gray-600 font-medium">Sistema operativo</p>
            </CardContent>
          </Card>
        </div>

        {/* Enhanced Navigation Tabs */}
        <div className="mb-8">
          <nav className="flex flex-wrap gap-2 sm:gap-4 lg:space-x-4 bg-white/70 backdrop-blur-sm rounded-xl p-2 shadow-sm overflow-x-auto">
            <button
              onClick={() => setActiveTab('chat')}
              className={`py-3 px-4 font-medium text-sm whitespace-nowrap flex items-center rounded-lg transition-all duration-300 group enhanced-button ${
                activeTab === 'chat'
                  ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/30 scale-105'
                  : 'text-gray-600 hover:text-blue-600 hover:bg-blue-50 hover:shadow-md'
              }`}
            >
              <MessageCircle className={`h-4 w-4 mr-2 transition-transform duration-300 ${
                activeTab === 'chat' ? 'animate-bounce' : 'group-hover:scale-110'
              }`} />
              <span className="font-semibold">Asistente de Negocio</span>
            </button>

            {/* Premium Chat Tab - Only for Premium users */}
            {activeClient.has_muva_access && (
              <button
                onClick={() => setActiveTab('premium-chat')}
                className={`py-3 px-4 font-medium text-sm whitespace-nowrap flex items-center rounded-lg transition-all duration-300 group enhanced-button relative ${
                  activeTab === 'premium-chat'
                    ? isDevMode
                      ? 'bg-gradient-to-r from-orange-500 to-yellow-500 text-white shadow-lg shadow-orange-500/30 scale-105'
                      : 'bg-gradient-to-r from-purple-500 to-indigo-500 text-white shadow-lg shadow-purple-500/30 scale-105'
                    : 'text-gray-600 hover:text-purple-600 hover:bg-purple-50 hover:shadow-md'
                }`}
              >
                {isDevMode ? (
                  <FlaskConical className={`h-4 w-4 mr-2 transition-transform duration-300 ${
                    activeTab === 'premium-chat' ? 'animate-bounce' : 'group-hover:scale-110'
                  }`} />
                ) : (
                  <Bot className={`h-4 w-4 mr-2 transition-transform duration-300 ${
                    activeTab === 'premium-chat' ? 'animate-pulse' : 'group-hover:scale-110'
                  }`} />
                )}
                <span className="font-semibold">Chat</span>
                {isDevMode ? (
                  <span className="ml-2 px-1.5 py-0.5 bg-gradient-to-r from-orange-400 to-red-400 text-orange-900 text-xs rounded-full font-bold shadow-sm animate-pulse">
                    DEV
                  </span>
                ) : (
                  <span className="ml-2 px-1.5 py-0.5 bg-gradient-to-r from-yellow-400 to-orange-400 text-yellow-900 text-xs rounded-full font-bold shadow-sm animate-pulse">
                    Premium
                  </span>
                )}
              </button>
            )}

            {/* Semantic Chat Tab - Only for Premium users */}
            {activeClient.has_muva_access && (
              <button
                onClick={() => setActiveTab('semantic-chat')}
                className={`py-3 px-4 font-medium text-sm whitespace-nowrap flex items-center rounded-lg transition-all duration-300 group enhanced-button relative ${
                  activeTab === 'semantic-chat'
                    ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg shadow-indigo-500/30 scale-105'
                    : 'text-gray-600 hover:text-indigo-600 hover:bg-indigo-50 hover:shadow-md'
                }`}
              >
                <Brain className={`h-4 w-4 mr-2 transition-transform duration-300 ${
                  activeTab === 'semantic-chat' ? 'animate-pulse' : 'group-hover:scale-110'
                }`} />
                <span className="font-semibold">Semántico</span>
                <span className="ml-2 px-1.5 py-0.5 bg-gradient-to-r from-indigo-400 to-purple-400 text-indigo-900 text-xs rounded-full font-bold shadow-sm">
                  LLM
                </span>
              </button>
            )}

            <button
              onClick={() => setActiveTab('upload')}
              className={`py-3 px-4 font-medium text-sm whitespace-nowrap flex items-center rounded-lg transition-all duration-300 group enhanced-button ${
                activeTab === 'upload'
                  ? 'bg-green-500 text-white shadow-lg shadow-green-500/30 scale-105'
                  : 'text-gray-600 hover:text-green-600 hover:bg-green-50 hover:shadow-md'
              }`}
            >
              <Upload className={`h-4 w-4 mr-2 transition-transform duration-300 ${
                activeTab === 'upload' ? 'animate-pulse' : 'group-hover:scale-110'
              }`} />
              <span className="font-semibold">Validador de Archivos</span>
            </button>

            {activeClient.business_type === 'hotel' && (
              <button
                onClick={() => setActiveTab('accommodation')}
                className={`py-3 px-4 font-medium text-sm whitespace-nowrap flex items-center rounded-lg transition-all duration-300 group enhanced-button ${
                  activeTab === 'accommodation'
                    ? 'bg-purple-500 text-white shadow-lg shadow-purple-500/30 scale-105'
                    : 'text-gray-600 hover:text-purple-600 hover:bg-purple-50 hover:shadow-md'
                }`}
              >
                <Home className={`h-4 w-4 mr-2 transition-transform duration-300 ${
                  activeTab === 'accommodation' ? 'animate-pulse' : 'group-hover:scale-110'
                }`} />
                <span className="font-semibold">Acomodaciones</span>
              </button>
            )}

            {activeClient.has_sire_access && (
              <button
                onClick={() => setActiveTab('sire')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'sire'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Shield className="inline h-4 w-4 mr-2" />
                SIRE Compliance
              </button>
            )}

            <button
              onClick={() => setActiveTab('reports')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'reports'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <BarChart3 className="inline h-4 w-4 mr-2" />
              Reportes
            </button>
          </nav>
        </div>

        {/* Development Toggle - Only show for premium chat */}
        {activeTab === 'premium-chat' && activeClient.has_muva_access && (
          <div className="mb-4 flex justify-end">
            <div className="bg-white/70 backdrop-blur-sm rounded-lg p-3 shadow-sm border border-orange-200/50">
              <div className="flex items-center space-x-3">
                <span className="text-sm font-medium text-gray-700">Entorno:</span>
                <button
                  onClick={() => setIsDevMode(!isDevMode)}
                  className={`flex items-center space-x-2 px-3 py-1.5 rounded-md transition-all duration-300 ${
                    isDevMode
                      ? 'bg-gradient-to-r from-orange-100 to-yellow-100 text-orange-700 border border-orange-300'
                      : 'bg-gradient-to-r from-purple-100 to-indigo-100 text-purple-700 border border-purple-300'
                  }`}
                >
                  {isDevMode ? (
                    <FlaskConical className="w-4 h-4" />
                  ) : (
                    <Bot className="w-4 h-4" />
                  )}
                  <span className="text-sm font-medium">
                    {isDevMode ? 'Desarrollo' : 'Producción'}
                  </span>
                  {isDevMode ? (
                    <ToggleRight className="w-5 h-5 text-orange-600" />
                  ) : (
                    <ToggleLeft className="w-5 h-5 text-purple-600" />
                  )}
                </button>
                {isDevMode && (
                  <div className="text-xs text-orange-600 bg-orange-50 px-2 py-1 rounded-full">
                    🧪 Versión experimental
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Enhanced Tab Content */}
        <div className="bg-white/90 backdrop-blur-sm rounded-xl shadow-lg border border-white/50 overflow-hidden">
          <div className="tab-content-animation">
          {activeTab === 'chat' && (
            <div className="p-6">
              <div className="mb-4">
                <h2 className="text-lg font-medium text-gray-900">
                  Asistente Inteligente - {activeClient.business_name}
                </h2>
                <p className="text-sm text-gray-500">
                  Obtén información sobre tu negocio + turismo en San Andrés.
                  Combina datos específicos de tu empresa con información turística de MUVA.
                </p>
              </div>
              <ListingsChatAssistant
                clientId={activeClient.client_id}
                businessType={activeClient.business_type}
                businessName={activeClient.business_name}
                hasMuvaAccess={activeClient.has_muva_access}
              />
            </div>
          )}

          {activeTab === 'upload' && (
            <div className="p-6">
              <div className="mb-4">
                <h2 className="text-lg font-medium text-gray-900">Validador de Archivos</h2>
                <p className="text-sm text-gray-500">
                  Valida documentos y archivos de tu negocio
                </p>
              </div>
              <FileUploader />
            </div>
          )}

          {activeTab === 'accommodation' && activeClient.business_type === 'hotel' && (
            <div className="p-6">
              <div className="mb-4">
                <h2 className="text-lg font-medium text-gray-900">Sistema de Acomodaciones</h2>
                <p className="text-sm text-gray-500">
                  Gestión de habitaciones y acomodaciones con tecnología Matryoshka embeddings
                </p>
              </div>
              <AccommodationSystemDashboard />
            </div>
          )}

          {activeTab === 'sire' && activeClient.has_sire_access && (
            <div className="p-6">
              <div className="mb-4">
                <h2 className="text-lg font-medium text-gray-900">SIRE Compliance</h2>
                <p className="text-sm text-gray-500">
                  Sistema de Información y Registro de Extranjeros - Colombia
                </p>
              </div>
              <div className="text-center py-12">
                <Shield className="mx-auto h-12 w-12 text-blue-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">SIRE Assistant</h3>
                <p className="mt-1 text-sm text-gray-500">
                  Funcionalidad SIRE disponible para usuarios autorizados
                </p>
                <Button className="mt-4">
                  Acceder a SIRE
                </Button>
              </div>
            </div>
          )}

          {activeTab === 'premium-chat' && activeClient.has_muva_access && (
            <div className="p-6">
              <div className="mb-4">
                <h2 className="text-lg font-medium text-gray-900 flex items-center">
                  Chat Premium
                  {isDevMode ? (
                    <>
                      <span className="ml-2 px-2 py-0.5 bg-gradient-to-r from-orange-400 to-red-400 text-orange-900 text-xs rounded-full font-bold animate-pulse">
                        DEV
                      </span>
                      <FlaskConical className="ml-2 w-4 h-4 text-orange-500 animate-bounce" />
                    </>
                  ) : (
                    <span className="ml-2 px-2 py-0.5 bg-gradient-to-r from-yellow-400 to-orange-400 text-yellow-900 text-xs rounded-full font-bold">
                      Premium
                    </span>
                  )}
                </h2>
                <p className="text-sm text-gray-500">
                  {isDevMode ? (
                    '🧪 Versión de desarrollo - Chat unificado experimental con logging extendido'
                  ) : (
                    'Chat unificado con acceso a información del hotel + turismo San Andrés'
                  )}
                </p>
              </div>
              {isDevMode ? (
                <PremiumChatInterfaceDev
                  clientId={activeClient.client_id}
                  businessName={activeClient.business_name}
                />
              ) : (
                <PremiumChatInterface
                  clientId={activeClient.client_id}
                  businessName={activeClient.business_name}
                />
              )}
            </div>
          )}

          {activeTab === 'semantic-chat' && activeClient.has_muva_access && (
            <div className="p-6">
              <div className="mb-4">
                <h2 className="text-lg font-medium text-gray-900 flex items-center">
                  <Brain className="mr-2 h-5 w-5 text-indigo-600" />
                  Chat Semántico
                  <span className="ml-2 px-2 py-0.5 bg-gradient-to-r from-indigo-400 to-purple-400 text-indigo-900 text-xs rounded-full font-bold">
                    Experimental
                  </span>
                  <span className="ml-2 px-2 py-0.5 bg-gradient-to-r from-purple-400 to-pink-400 text-purple-900 text-xs rounded-full font-bold">
                    LLM-Driven
                  </span>
                </h2>
                <p className="text-sm text-gray-500">
                  🔬 Sistema experimental de búsqueda con comprensión semántica profunda mediante LLMs.
                  Pipeline de 5 pasos: Understanding → Multi-Query → Vector Search → Curation → Response
                </p>
              </div>
              <PremiumChatInterfaceSemantic
                clientId={activeClient.client_id}
                businessName={activeClient.business_name}
              />
            </div>
          )}

          {activeTab === 'reports' && (
            <div className="p-6">
              <div className="mb-4">
                <h2 className="text-lg font-medium text-gray-900">Reportes y Métricas</h2>
                <p className="text-sm text-gray-500">
                  Estadísticas de uso y análisis de tu negocio
                </p>
              </div>
              <div className="text-center py-12">
                <BarChart3 className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">Próximamente</h3>
                <p className="mt-1 text-sm text-gray-500">
                  Panel de reportes en desarrollo
                </p>
              </div>
            </div>
          )}
          </div>
        </div>
      </div>
    </div>
  )
}