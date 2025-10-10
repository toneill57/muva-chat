import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { SessionMetrics } from '@/components/Chat/shared/types'
import { DollarSign, Clock, Zap, TrendingUp, Download, BarChart3, Activity } from 'lucide-react'

interface MetricsDashboardProps {
  sessionMetrics: SessionMetrics
  onExport: (format: 'json' | 'csv') => void
  onReset: () => void
}

export function MetricsDashboard({ sessionMetrics, onExport, onReset }: MetricsDashboardProps) {
  if (sessionMetrics.totalQueries === 0) {
    return null
  }

  const formatCost = (cost: number) => `$${cost.toFixed(6)}`
  const formatTime = (ms: number) => `${ms.toFixed(0)}ms`

  // Calculate comparisons vs benchmarks
  const productionAvg = 8144
  const savingsPercent = ((productionAvg - sessionMetrics.avgResponseTime) / productionAvg * 100).toFixed(1)

  return (
    <div className="p-4 space-y-4 bg-gradient-to-br from-orange-50 to-yellow-50 rounded-lg border-2 border-orange-200">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-bold text-gray-900 flex items-center">
            <Activity className="w-5 h-5 mr-2 text-orange-500" />
            Session Metrics Dashboard
          </h3>
          <p className="text-xs text-gray-600">
            Session: {sessionMetrics.sessionId} • Started: {sessionMetrics.sessionStart.toLocaleTimeString()}
          </p>
        </div>
        <div className="flex space-x-2">
          <Button size="sm" variant="outline" onClick={() => onExport('json')}>
            <Download className="w-4 h-4 mr-1" />
            JSON
          </Button>
          <Button size="sm" variant="outline" onClick={() => onExport('csv')}>
            <Download className="w-4 h-4 mr-1" />
            CSV
          </Button>
          <Button size="sm" variant="destructive" onClick={onReset}>
            Reset
          </Button>
        </div>
      </div>

      {/* Primary Metrics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <MetricCard icon={BarChart3} label="Total Queries" value={sessionMetrics.totalQueries.toString()} />
        <MetricCard icon={DollarSign} label="Total Cost" value={formatCost(sessionMetrics.totalCost)} subtitle={`${sessionMetrics.totalTokens.toLocaleString()} tokens`} color="green" />
        <MetricCard icon={Clock} label="Avg Response" value={formatTime(sessionMetrics.avgResponseTime)} subtitle={`${savingsPercent}% faster than prod`} color="blue" />
        <MetricCard icon={TrendingUp} label="Avg Quality" value={`${(sessionMetrics.avgSimilarity * 100).toFixed(1)}%`} subtitle={`${sessionMetrics.avgResultsPerQuery.toFixed(1)} results/query`} color="purple" />
      </div>

      {/* Tier Distribution */}
      <Card className="border-orange-200">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center">
            <Zap className="w-4 h-4 mr-2 text-yellow-500" />
            Tier Distribution
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {Object.entries(sessionMetrics.tierUsage).map(([tier, count]) => {
              const percentage = (count / sessionMetrics.totalQueries * 100).toFixed(1)
              return (
                <div key={tier} className="flex items-center justify-between">
                  <span className="text-sm text-gray-700">{tier}</span>
                  <div className="flex items-center space-x-2">
                    <div className="w-32 bg-gray-200 rounded-full h-2">
                      <div className="bg-gradient-to-r from-orange-400 to-yellow-400 h-2 rounded-full" style={{ width: `${percentage}%` }} />
                    </div>
                    <span className="text-xs text-gray-600 w-16 text-right">{count} ({percentage}%)</span>
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// Helper component for metric cards
function MetricCard({ icon: Icon, label, value, subtitle, color = 'gray' }: {
  icon: any
  label: string
  value: string
  subtitle?: string
  color?: string
}) {
  const colorClasses = {
    gray: 'border-gray-200 bg-white',
    green: 'border-green-200 bg-green-50',
    blue: 'border-blue-200 bg-blue-50',
    purple: 'border-purple-200 bg-purple-50',
  }

  const textColorClasses = {
    gray: 'text-gray-900',
    green: 'text-green-700',
    blue: 'text-blue-700',
    purple: 'text-purple-700',
  }

  return (
    <Card className={colorClasses[color as keyof typeof colorClasses]}>
      <CardHeader className="pb-2">
        <CardTitle className="text-xs text-gray-600 flex items-center">
          <Icon className="w-3 h-3 mr-1" />
          {label}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className={`text-2xl font-bold ${textColorClasses[color as keyof typeof textColorClasses]}`}>
          {value}
        </div>
        {subtitle && <div className="text-xs text-gray-600 mt-1">{subtitle}</div>}
      </CardContent>
    </Card>
  )
}