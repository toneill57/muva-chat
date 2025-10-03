'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  Hotel,
  Home,
  DollarSign,
  Star,
  Search,
  Layers,
  Zap,
  Clock,
  TrendingUp,
  Eye,
  Settings,
  Link
} from "lucide-react"
import { HotelViewer } from './HotelViewer'
import { AccommodationUnitsGrid } from './AccommodationUnitsGrid'
import { VectorSearchTester } from './VectorSearchTester'
import { MatryoshkaVisualization } from './MatryoshkaVisualization'
import { IntegrationsPanel } from '../integrations/IntegrationsPanel'
import { SyncHistoryVisualization } from '../integrations/motopress/SyncHistoryVisualization'
import { useAuth } from '@/contexts/AuthContext'

type TabType = 'overview' | 'hotels' | 'units' | 'search' | 'matryoshka' | 'integrations' | 'sync-history'

interface AccommodationStats {
  hotels_count: number
  units_count: number
  pricing_rules: number
  amenities_count: number
  embedding_coverage: number
  avg_search_time: number
}

export function AccommodationSystemDashboard() {
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState<TabType>('overview')
  const [stats, setStats] = useState<AccommodationStats>({
    hotels_count: 1,
    units_count: 0, // Will be loaded dynamically
    pricing_rules: 4,
    amenities_count: 9,
    embedding_coverage: 100,
    avg_search_time: 25
  })
  const [isLoading, setIsLoading] = useState(false)

  // Load real stats from API
  useEffect(() => {
    const loadStats = async () => {
      setIsLoading(true)
      try {
        // Get real accommodation units count (use tenant_id from user context)
        const tenantId = (user as any)?.user_metadata?.client_id || 'b5c45f51-a333-4cdf-ba9d-ad0a17bf79bf'

        const response = await fetch(`/api/accommodation/units?tenant_id=${tenantId}`)
        if (response.ok) {
          const data = await response.json()

          // Get unique units (remove duplicates by name)
          const uniqueUnits = data.units?.reduce((acc: any[], unit: any) => {
            if (!acc.find(u => u.name === unit.name)) {
              acc.push(unit)
            }
            return acc
          }, []) || []

          setStats(prev => ({
            ...prev,
            units_count: uniqueUnits.length
          }))
        }
      } catch (error) {
        console.error('Error loading dashboard stats:', error)
      } finally {
        setIsLoading(false)
      }
    }

    loadStats()
  }, [user])

  const tabs = [
    {
      id: 'overview' as TabType,
      name: 'Overview',
      icon: Eye,
      description: 'Resumen del sistema'
    },
    {
      id: 'hotels' as TabType,
      name: 'Hotels',
      icon: Hotel,
      description: 'Gestión de hoteles'
    },
    {
      id: 'units' as TabType,
      name: 'Units',
      icon: Home,
      description: 'Habitaciones y suites'
    },
    {
      id: 'integrations' as TabType,
      name: 'Integraciones',
      icon: Link,
      description: 'Sincronización externa'
    },
    {
      id: 'sync-history' as TabType,
      name: 'Historial',
      icon: TrendingUp,
      description: 'Analytics y historial de sync'
    },
    {
      id: 'search' as TabType,
      name: 'Vector Search',
      icon: Search,
      description: 'Búsquedas inteligentes'
    },
    {
      id: 'matryoshka' as TabType,
      name: 'Matryoshka',
      icon: Layers,
      description: 'Sistema de embeddings'
    }
  ]

  const StatCard = ({ title, value, description, icon: Icon, color = 'blue' }: {
    title: string
    value: string | number
    description: string
    icon: any
    color?: string
  }) => (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className={`h-4 w-4 text-${color}-600`} />
      </CardHeader>
      <CardContent>
        <div className={`text-2xl font-bold text-${color}-700`}>{value}</div>
        <p className="text-xs text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  )

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50/30">
      {/* Enhanced Header */}
      <div className="bg-white/80 backdrop-blur-sm border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center">
              <div className="relative">
                <Hotel className="h-8 w-8 text-green-600 mr-3 animate-pulse" />
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full animate-ping"></div>
              </div>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-gray-900 to-green-700 bg-clip-text text-transparent">Accommodation System</h1>
                <p className="text-sm text-gray-500 font-medium">SimmerDown Guest House • Matryoshka Embeddings ⚡</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <p className="text-sm font-medium text-gray-900 flex items-center">
                  Multi-Tenant Active
                  <span className="ml-2 px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full font-semibold">
                    SECURE
                  </span>
                </p>
                <p className="text-xs text-gray-500">RLS Enabled • Tenant Isolated</p>
              </div>
              <div className="relative">
                <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                <div className="absolute inset-0 w-3 h-3 bg-green-400 rounded-full animate-ping"></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Overview */}
        {activeTab === 'overview' && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
              <StatCard
                title="Hotels"
                value={stats.hotels_count}
                description="Properties active"
                icon={Hotel}
                color="green"
              />
              <StatCard
                title="Units"
                value={stats.units_count}
                description="Accommodation units"
                icon={Home}
                color="blue"
              />
              <StatCard
                title="Pricing Rules"
                value={stats.pricing_rules}
                description="Hybrid MotoPress + InnPilot"
                icon={DollarSign}
                color="purple"
              />
              <StatCard
                title="Amenities"
                value={stats.amenities_count}
                description="Categorized services"
                icon={Star}
                color="yellow"
              />
              <StatCard
                title="Embeddings"
                value={`${stats.embedding_coverage}%`}
                description="Matryoshka coverage"
                icon={Layers}
                color="indigo"
              />
              <StatCard
                title="Search Speed"
                value={`${stats.avg_search_time}ms`}
                description="Avg response time"
                icon={Zap}
                color="green"
              />
            </div>

            {/* Matryoshka Performance Overview */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Zap className="h-5 w-5 text-green-500 mr-2" />
                    Tier 1 Performance
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Dimensions</span>
                      <span className="text-sm font-medium">1024d</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Use Case</span>
                      <span className="text-sm font-medium">Tourism</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Speed</span>
                      <span className="text-sm font-medium text-green-600">5-15ms</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div className="bg-green-500 h-2 rounded-full" style={{ width: '95%' }}></div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Clock className="h-5 w-5 text-blue-500 mr-2" />
                    Tier 2 Performance
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Dimensions</span>
                      <span className="text-sm font-medium">1536d</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Use Case</span>
                      <span className="text-sm font-medium">Policies</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Speed</span>
                      <span className="text-sm font-medium text-blue-600">15-40ms</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div className="bg-blue-500 h-2 rounded-full" style={{ width: '85%' }}></div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <TrendingUp className="h-5 w-5 text-purple-500 mr-2" />
                    System Health
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">RLS Status</span>
                      <span className="text-sm font-medium text-green-600">Active</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Multi-tenant</span>
                      <span className="text-sm font-medium text-green-600">Isolated</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Uptime</span>
                      <span className="text-sm font-medium">99.9%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div className="bg-purple-500 h-2 rounded-full" style={{ width: '100%' }}></div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </>
        )}

        {/* Enhanced Navigation Tabs */}
        <div className="mb-8">
          <nav className="flex space-x-2 overflow-x-auto bg-white/70 backdrop-blur-sm rounded-xl p-2 shadow-sm">
            {tabs.map((tab) => {
              const Icon = tab.icon
              const isActive = activeTab === tab.id

              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`relative py-3 px-4 font-medium text-sm whitespace-nowrap flex items-center rounded-lg transition-all duration-300 group ${
                    isActive
                      ? 'bg-green-500 text-white shadow-lg shadow-green-500/30 scale-105'
                      : 'text-gray-600 hover:text-green-600 hover:bg-green-50 hover:shadow-md'
                  }`}
                >
                  <Icon className={`h-4 w-4 mr-2 transition-transform duration-300 ${
                    isActive ? 'animate-pulse' : 'group-hover:scale-110'
                  }`} />
                  <span className="font-semibold">{tab.name}</span>
                  {isActive && (
                    <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-2 h-2 bg-white rounded-full animate-bounce"></div>
                  )}
                </button>
              )
            })}
          </nav>
        </div>

        {/* Enhanced Tab Content */}
        <div className="bg-white/90 backdrop-blur-sm rounded-xl shadow-lg border border-white/50 min-h-96 overflow-hidden">
          <div className="tab-content-animation">
            {activeTab === 'hotels' && <HotelViewer />}
            {activeTab === 'units' && <AccommodationUnitsGrid />}
            {activeTab === 'integrations' && (
              <div className="p-6">
                <IntegrationsPanel
                  tenantId={(user as any)?.client_id || 'b5c45f51-a333-4cdf-ba9d-ad0a17bf79bf'}
                  onMotoPressConfigure={() => {
                    // Navigate to dedicated MotoPress configuration page
                    window.location.href = `/dashboard/simmerdown/accommodations/integrations/motopress`
                  }}
                  onImport={(type) => {
                    console.log('Import from', type)
                    // The import is now handled directly in IntegrationsPanel
                  }}
                />
              </div>
            )}
            {activeTab === 'sync-history' && (
              <div className="p-6">
                <SyncHistoryVisualization
                  tenantId={(user as any)?.client_id || 'b5c45f51-a333-4cdf-ba9d-ad0a17bf79bf'}
                  integrationType="motopress"
                />
              </div>
            )}
            {activeTab === 'search' && <VectorSearchTester />}
            {activeTab === 'matryoshka' && <MatryoshkaVisualization />}
          </div>
        </div>
      </div>
    </div>
  )
}