'use client'

import { useEffect, useState } from 'react'
import { BarChart3, Eye, Upload, Trash2, TrendingUp, Loader2 } from 'lucide-react'
import useSWR from 'swr'

interface AnalyticsMetrics {
  total_uploads: number
  total_views: number
  total_search_hits: number
  total_deletes: number
  recent_activity: {
    uploads: number
    views: number
    search_hits: number
    deletes: number
  }
  top_manuals: Array<{
    manual_id: string
    filename: string
    view_count: number
    search_hit_count: number
  }>
}

interface ManualAnalyticsProps {
  unitId: string
}

export function ManualAnalytics({ unitId }: ManualAnalyticsProps) {
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | 'all'>('7d')

  // SWR fetcher
  const fetcher = async (url: string) => {
    const token = localStorage.getItem('staff_token')
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    })

    if (!response.ok) {
      throw new Error('Failed to fetch analytics')
    }

    const data = await response.json()
    return data.success ? data.data : null
  }

  // Fetch analytics with SWR (cache for 30 seconds)
  const {
    data: metrics,
    error,
    isLoading
  } = useSWR<AnalyticsMetrics>(
    `/api/accommodation-manuals/${unitId}/analytics`,
    fetcher,
    {
      refreshInterval: 30000, // Refresh every 30 seconds
      revalidateOnFocus: false
    }
  )

  // Loading state
  if (isLoading) {
    return (
      <div className="border-t pt-3">
        <div className="flex items-center space-x-2 mb-3">
          <BarChart3 className="h-4 w-4 text-gray-400" />
          <h4 className="text-sm font-medium text-gray-900">Manual Analytics</h4>
        </div>
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
        </div>
      </div>
    )
  }

  // Error state
  if (error || !metrics) {
    return (
      <div className="border-t pt-3">
        <div className="flex items-center space-x-2 mb-3">
          <BarChart3 className="h-4 w-4 text-gray-400" />
          <h4 className="text-sm font-medium text-gray-900">Manual Analytics</h4>
        </div>
        <p className="text-xs text-gray-500">No analytics data available</p>
      </div>
    )
  }

  // Decide which metrics to show based on time range
  const displayMetrics = timeRange === '7d' ? metrics.recent_activity : {
    uploads: metrics.total_uploads,
    views: metrics.total_views,
    search_hits: metrics.total_search_hits,
    deletes: metrics.total_deletes
  }

  return (
    <div className="border-t pt-3">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-2">
          <BarChart3 className="h-4 w-4 text-gray-400" />
          <h4 className="text-sm font-medium text-gray-900">Manual Analytics</h4>
        </div>

        {/* Time Range Selector */}
        <div className="flex items-center space-x-1 text-xs">
          <button
            onClick={() => setTimeRange('7d')}
            className={`px-2 py-1 rounded ${
              timeRange === '7d'
                ? 'bg-blue-100 text-blue-700 font-medium'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            7 days
          </button>
          <button
            onClick={() => setTimeRange('all')}
            className={`px-2 py-1 rounded ${
              timeRange === 'all'
                ? 'bg-blue-100 text-blue-700 font-medium'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            All time
          </button>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 gap-2 mb-3">
        {/* Uploads */}
        <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-center space-x-2 mb-1">
            <Upload className="h-3.5 w-3.5 text-green-600" />
            <p className="text-xs font-medium text-green-900">Uploads</p>
          </div>
          <p className="text-2xl font-bold text-green-700">{displayMetrics.uploads}</p>
        </div>

        {/* Views */}
        <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center space-x-2 mb-1">
            <Eye className="h-3.5 w-3.5 text-blue-600" />
            <p className="text-xs font-medium text-blue-900">Views</p>
          </div>
          <p className="text-2xl font-bold text-blue-700">{displayMetrics.views}</p>
        </div>

        {/* Guest Chat Usage */}
        <div className="p-3 bg-purple-50 border border-purple-200 rounded-lg">
          <div className="flex items-center space-x-2 mb-1">
            <TrendingUp className="h-3.5 w-3.5 text-purple-600" />
            <p className="text-xs font-medium text-purple-900">Chat Hits</p>
          </div>
          <p className="text-2xl font-bold text-purple-700">{displayMetrics.search_hits}</p>
        </div>

        {/* Deletes */}
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center space-x-2 mb-1">
            <Trash2 className="h-3.5 w-3.5 text-red-600" />
            <p className="text-xs font-medium text-red-900">Deleted</p>
          </div>
          <p className="text-2xl font-bold text-red-700">{displayMetrics.deletes}</p>
        </div>
      </div>

      {/* Top Manuals */}
      {metrics.top_manuals.length > 0 && (
        <div className="mt-3 pt-3 border-t">
          <h5 className="text-xs font-medium text-gray-700 mb-2">Most Used Manuals</h5>
          <div className="space-y-1.5">
            {metrics.top_manuals.map((manual, index) => {
              const totalEngagement = manual.view_count + manual.search_hit_count
              return (
                <div
                  key={manual.manual_id}
                  className="flex items-center justify-between p-2 bg-gray-50 rounded text-xs"
                >
                  <div className="flex items-center space-x-2 flex-1 min-w-0">
                    <span className="font-semibold text-gray-400 w-4">#{index + 1}</span>
                    <span className="text-gray-900 truncate" title={manual.filename}>
                      {manual.filename}
                    </span>
                  </div>
                  <div className="flex items-center space-x-3 text-gray-600 flex-shrink-0">
                    <span className="flex items-center space-x-1">
                      <Eye className="h-3 w-3" />
                      <span>{manual.view_count}</span>
                    </span>
                    <span className="flex items-center space-x-1">
                      <TrendingUp className="h-3 w-3" />
                      <span>{manual.search_hit_count}</span>
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* No data message */}
      {metrics.total_uploads === 0 && (
        <p className="text-xs text-gray-500 text-center py-2">
          No manual activity yet. Upload a manual to start tracking analytics.
        </p>
      )}
    </div>
  )
}
