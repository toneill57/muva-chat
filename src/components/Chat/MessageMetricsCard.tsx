import React, { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ChatMessage } from '@/components/Chat/shared/types'
import { ChevronDown, ChevronUp, DollarSign, Clock, Zap, Target } from 'lucide-react'

interface MessageMetricsCardProps {
  message: ChatMessage
}

export function MessageMetricsCard({ message }: MessageMetricsCardProps) {
  const [expanded, setExpanded] = useState(false)

  if (!message.metrics) return null

  const { tokens, performance, analysis, quality } = message.metrics

  // Quality indicators
  const similarityColor = performance.avgSimilarityScore > 0.7 ? 'green' : performance.avgSimilarityScore > 0.4 ? 'yellow' : 'red'
  const efficiencyColor = performance.tierEfficiency > 0.7 ? 'green' : performance.tierEfficiency > 0.4 ? 'yellow' : 'red'

  return (
    <Card className="border-2 border-orange-200 bg-orange-50 mt-3">
      <CardContent className="pt-3 pb-2">
        {/* Compact View */}
        <div className="space-y-2">
          {/* Primary Metrics Row */}
          <div className="grid grid-cols-4 gap-2 text-xs">
            <div className="flex items-center text-green-700">
              <DollarSign className="w-3 h-3 mr-1" />
              <span className="font-mono">${tokens.embeddingCost.toFixed(6)}</span>
            </div>
            <div className="flex items-center text-blue-700">
              <Clock className="w-3 h-3 mr-1" />
              <span className="font-mono">{performance.responseTime}ms</span>
            </div>
            <div className="flex items-center text-purple-700">
              <Zap className="w-3 h-3 mr-1" />
              <span className="truncate">{performance.tier}</span>
            </div>
            <div className="flex items-center text-gray-700">
              <Target className="w-3 h-3 mr-1" />
              <span>{performance.resultsCount} results</span>
            </div>
          </div>

          {/* Quality Indicators */}
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center space-x-2">
              <QualityBadge
                label="Similarity"
                value={`${(performance.avgSimilarityScore * 100).toFixed(1)}%`}
                color={similarityColor}
              />
              <QualityBadge
                label="Efficiency"
                value={`${(performance.tierEfficiency * 100).toFixed(1)}%`}
                color={efficiencyColor}
              />
            </div>
            <Button variant="ghost" size="sm" onClick={() => setExpanded(!expanded)} className="h-6 px-2">
              {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </Button>
          </div>
        </div>

        {/* Expanded View */}
        {expanded && (
          <div className="mt-3 pt-3 border-t border-orange-200 space-y-3">
            {/* Performance Breakdown */}
            <div>
              <div className="text-xs font-semibold text-gray-700 mb-1">⚡ Performance Breakdown</div>
              <div className="space-y-1">
                <ProgressBar label="Embedding" value={performance.embeddingGenerationMs} total={performance.responseTime} />
                <ProgressBar label="Vector Search" value={performance.vectorSearchMs} total={performance.responseTime} />
                <ProgressBar label="Formatting" value={performance.formattingMs} total={performance.responseTime} />
                <ProgressBar label="Network" value={performance.networkLatencyMs} total={performance.responseTime} />
              </div>
            </div>

            {/* Query Analysis */}
            <div>
              <div className="text-xs font-semibold text-gray-700 mb-1">🎯 Query Analysis</div>
              <div className="bg-white rounded p-2 border border-orange-100 space-y-1 text-xs">
                <DetailRow label="Type" value={analysis.detectedType} />
                <DetailRow label="Complexity" value={analysis.complexity} />
                <DetailRow label="Confidence" value={`${(analysis.routingConfidence * 100).toFixed(1)}%`} />
              </div>
            </div>

            {/* Quality Metrics */}
            <div>
              <div className="text-xs font-semibold text-gray-700 mb-1">📊 Quality Metrics</div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <MetricBadge label="Cost/Result" value={`$${quality.costPerResult.toFixed(6)}`} />
                <MetricBadge label="Time/Result" value={`${quality.timePerResult.toFixed(0)}ms`} />
                <MetricBadge label="Tokens/Result" value={quality.tokensPerResult.toFixed(0)} />
                <MetricBadge label="Diversity" value={`${(quality.sourceDiversity * 100).toFixed(0)}%`} />
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// Helper Components
function QualityBadge({ label, value, color }: { label: string; value: string; color: string }) {
  const bgColors = { green: 'bg-green-100', yellow: 'bg-yellow-100', red: 'bg-red-100' }
  const textColors = { green: 'text-green-700', yellow: 'text-yellow-700', red: 'text-red-700' }

  return (
    <span className={`px-2 py-0.5 rounded-full font-medium ${bgColors[color as keyof typeof bgColors]} ${textColors[color as keyof typeof textColors]}`}>
      {label}: {value}
    </span>
  )
}

function ProgressBar({ label, value, total }: { label: string; value: number; total: number }) {
  const percentage = (value / total * 100).toFixed(1)
  return (
    <div className="flex items-center text-xs">
      <span className="w-24 text-gray-600">{label}:</span>
      <div className="flex-1 bg-gray-200 rounded-full h-2 mx-2">
        <div className="bg-gradient-to-r from-orange-400 to-yellow-400 h-2 rounded-full" style={{ width: `${percentage}%` }} />
      </div>
      <span className="w-20 text-right text-gray-700 font-mono">
        {value.toFixed(0)}ms ({percentage}%)
      </span>
    </div>
  )
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-gray-600">{label}:</span>
      <span className="font-medium capitalize">{value}</span>
    </div>
  )
}

function MetricBadge({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white rounded p-2 border border-orange-100">
      <div className="text-gray-600">{label}</div>
      <div className="font-bold text-gray-900">{value}</div>
    </div>
  )
}