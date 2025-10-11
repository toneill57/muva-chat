'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { FileUploader } from "@/components/FileUploader/FileUploader"
import { ChatAssistant } from "@/components/ChatAssistant/ChatAssistant"
import { ChatTypeSelector, ChatType } from "@/components/ChatTypeSelector/ChatTypeSelector"
import { BusinessListingsInterface } from "@/components/BusinessListings/BusinessListingsInterface"
import { TourismInterface } from "@/components/Tourism/TourismInterface"
import { EnhancedChatAssistant } from "@/components/ChatAssistant/EnhancedChatAssistant"
import { FileCheck, MessageCircle, Upload, BarChart3, Shield, Users } from "lucide-react"

export function Dashboard() {
  const [activeTab, setActiveTab] = useState<'upload' | 'chat' | 'reports'>('upload')
  const [activeChatType, setActiveChatType] = useState<ChatType>('sire')

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center">
              <Shield className="h-8 w-8 text-blue-600 mr-3" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">MUVA</h1>
                <p className="text-sm text-gray-500">Plataforma de Gestión SIRE</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <p className="text-sm font-medium text-gray-900">Colombia</p>
                <p className="text-xs text-gray-500">Gestión Hotelera</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Reportes Enviados</CardTitle>
              <FileCheck className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">24</div>
              <p className="text-xs text-muted-foreground">+2 desde ayer</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Validaciones OK</CardTitle>
              <Shield className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">98.5%</div>
              <p className="text-xs text-muted-foreground">Tasa de éxito</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Consultas Chat</CardTitle>
              <MessageCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">156</div>
              <p className="text-xs text-muted-foreground">Este mes</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Huéspedes Reportados</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">1,247</div>
              <p className="text-xs text-muted-foreground">Total registrados</p>
            </CardContent>
          </Card>
        </div>

        {/* Navigation Tabs */}
        <div className="mb-8">
          <nav className="flex space-x-8">
            <button
              onClick={() => setActiveTab('upload')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'upload'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Upload className="inline h-4 w-4 mr-2" />
              Validar Archivos SIRE
            </button>
            <button
              onClick={() => setActiveTab('chat')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'chat'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <MessageCircle className="inline h-4 w-4 mr-2" />
              Asistente SIRE
            </button>
            <button
              onClick={() => setActiveTab('reports')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'reports'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <BarChart3 className="inline h-4 w-4 mr-2" />
              Reportes y Métricas
            </button>
          </nav>
        </div>

        {/* Tab Content */}
        <div className="bg-white rounded-lg shadow">
          {activeTab === 'upload' && (
            <div className="p-6">
              <div className="mb-4">
                <h2 className="text-lg font-medium text-gray-900">Validador de Archivos SIRE</h2>
                <p className="text-sm text-gray-500">
                  Sube tu archivo TXT para validar el formato y contenido antes de enviarlo al SIRE
                </p>
              </div>
              <FileUploader />
            </div>
          )}

          {activeTab === 'chat' && (
            <div className="p-6">
              <div className="mb-4">
                <h2 className="text-lg font-medium text-gray-900">Asistentes Inteligentes</h2>
                <p className="text-sm text-gray-500">
                  Selecciona el tipo de asistente según tus necesidades: SIRE compliance, turismo o información empresarial
                </p>
              </div>

              {/* Chat Type Selector */}
              <ChatTypeSelector
                activeType={activeChatType}
                onTypeChange={setActiveChatType}
              />

              {/* Dynamic Chat Interface based on selected type */}
              {activeChatType === 'sire' && (
                <div className="space-y-4">
                  <div className="flex items-center space-x-2 mb-4">
                    <MessageCircle className="h-5 w-5 text-blue-600" />
                    <h3 className="text-lg font-medium text-gray-900">Asistente SIRE</h3>
                  </div>
                  <EnhancedChatAssistant chatType="sire" />
                </div>
              )}

              {activeChatType === 'tourism' && (
                <TourismInterface />
              )}

              {activeChatType === 'business' && (
                <BusinessListingsInterface />
              )}
            </div>
          )}

          {activeTab === 'reports' && (
            <div className="p-6">
              <div className="mb-4">
                <h2 className="text-lg font-medium text-gray-900">Reportes y Métricas</h2>
                <p className="text-sm text-gray-500">
                  Historial de validaciones y estadísticas de uso
                </p>
              </div>
              <div className="text-center py-12">
                <BarChart3 className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">Próximamente</h3>
                <p className="mt-1 text-sm text-gray-500">
                  Panel de reportes y métricas en desarrollo
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}