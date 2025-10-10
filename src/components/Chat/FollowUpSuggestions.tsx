'use client'

import { useState, useEffect } from 'react'
import { Sparkles, Loader2, TrendingUp } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import type { FollowUpSuggestionsProps } from '@/lib/guest-chat-types'

type DisplayMode = 'compact' | 'expanded' | 'carousel'

/**
 * FollowUpSuggestions Component - ENHANCED for FASE 2.1
 *
 * Features:
 * - Entity-aware algorithm (generates from tracked entities)
 * - A/B testing variations (compact/expanded/carousel)
 * - Click-through analytics tracking
 * - Visual feedback for popular suggestions
 * - Smooth Framer Motion animations
 */
export function FollowUpSuggestions({
  suggestions,
  onSuggestionClick,
  isLoading = false,
  displayMode = 'compact',
  trackedEntities = [],
  onAnalytics,
}: FollowUpSuggestionsProps) {
  const [clickCounts, setClickCounts] = useState<Map<string, number>>(new Map())
  const [carouselIndex, setCarouselIndex] = useState(0)

  // Auto-rotate carousel
  useEffect(() => {
    if (displayMode === 'carousel' && suggestions.length > 1) {
      const interval = setInterval(() => {
        setCarouselIndex((prev) => (prev + 1) % suggestions.length)
      }, 5000)
      return () => clearInterval(interval)
    }
  }, [displayMode, suggestions.length])

  if (suggestions.length === 0 && !isLoading) {
    return null
  }

  const handleClick = async (suggestion: string, index: number) => {
    // Track click-through
    setClickCounts((prev) => {
      const newMap = new Map(prev)
      newMap.set(suggestion, (newMap.get(suggestion) || 0) + 1)
      return newMap
    })

    // Send analytics
    if (onAnalytics) {
      try {
        await fetch('/api/guest/analytics', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            event: 'follow_up_click',
            data: {
              suggestion,
              displayMode,
              position: index,
              entityCount: trackedEntities.length,
            },
          }),
        })
      } catch (err) {
        console.error('Analytics error:', err)
      }
    }

    onSuggestionClick(suggestion)
  }

  const getPopularityIndicator = (suggestion: string) => {
    const count = clickCounts.get(suggestion) || 0
    if (count === 0) return null
    return (
      <motion.span
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        className="ml-2 inline-flex items-center gap-1 text-xs text-blue-700"
      >
        <TrendingUp className="h-3 w-3" />
        {count}
      </motion.span>
    )
  }

  // COMPACT MODE (Original + Analytics)
  if (displayMode === 'compact') {
    return (
      <div className="w-full py-3 border-t border-gray-100">
        <div className="flex items-center gap-2 mb-2 px-1">
          <Sparkles className="h-4 w-4 text-blue-600" />
          <span className="text-xs font-medium text-gray-600">
            Sugerencias para ti
          </span>
        </div>

        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent">
          {isLoading ? (
            <div className="flex items-center gap-2 px-4 py-2 bg-gray-100 rounded-full">
              <Loader2 className="h-3.5 w-3.5 animate-spin text-gray-500" />
              <span className="text-sm text-gray-500">Generando sugerencias...</span>
            </div>
          ) : (
            suggestions.map((suggestion, index) => (
              <motion.button
                key={`${suggestion}-${index}`}
                data-testid="follow-up-suggestion"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => handleClick(suggestion, index)}
                className="
                  group relative flex-shrink-0 px-4 py-2
                  bg-blue-50 hover:bg-blue-100 active:bg-blue-200
                  text-blue-900 text-sm font-medium
                  rounded-full border border-blue-200
                  transition-colors duration-200
                  focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
                "
                aria-label={`Sugerencia: ${suggestion}`}
              >
                {suggestion}
                {getPopularityIndicator(suggestion)}
              </motion.button>
            ))
          )}
        </div>

        <style jsx>{`
          /* Custom scrollbar for horizontal scroll */
          .scrollbar-thin::-webkit-scrollbar {
            height: 6px;
          }

          .scrollbar-thin::-webkit-scrollbar-track {
            background: transparent;
          }

          .scrollbar-thin::-webkit-scrollbar-thumb {
            background: #d1d5db;
            border-radius: 3px;
          }

          .scrollbar-thin::-webkit-scrollbar-thumb:hover {
            background: #9ca3af;
          }

          .overflow-x-auto {
            -webkit-overflow-scrolling: touch;
            scroll-behavior: smooth;
          }
        `}</style>
      </div>
    )
  }

  // EXPANDED MODE (Vertical grid with descriptions)
  if (displayMode === 'expanded') {
    return (
      <motion.div
        initial={{ height: 0, opacity: 0 }}
        animate={{ height: 'auto', opacity: 1 }}
        exit={{ height: 0, opacity: 0 }}
        className="w-full py-4 border-t border-gray-100 bg-gradient-to-b from-blue-50/50 to-transparent"
      >
        <div className="flex items-center gap-2 mb-3 px-1">
          <Sparkles className="h-5 w-5 text-blue-600" />
          <span className="text-sm font-semibold text-gray-700">
            Explora más sobre estos temas
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {suggestions.map((suggestion, index) => (
            <motion.button
              key={`${suggestion}-${index}`}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              whileHover={{ scale: 1.02, boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
              whileTap={{ scale: 0.98 }}
              onClick={() => handleClick(suggestion, index)}
              className="
                flex items-start gap-3 p-4 text-left
                bg-white hover:bg-blue-50
                border border-gray-200 hover:border-blue-300
                rounded-xl transition-all duration-200
                focus:outline-none focus:ring-2 focus:ring-blue-500
              "
            >
              <Sparkles className="h-5 w-5 text-blue-500 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900">{suggestion}</p>
                {getPopularityIndicator(suggestion)}
              </div>
            </motion.button>
          ))}
        </div>
      </motion.div>
    )
  }

  // CAROUSEL MODE (Auto-rotating single suggestion)
  if (displayMode === 'carousel') {
    const currentSuggestion = suggestions[carouselIndex]

    return (
      <div className="w-full py-4 border-t border-gray-100 bg-gradient-to-r from-blue-50 via-purple-50 to-blue-50">
        <AnimatePresence mode="wait">
          <motion.div
            key={carouselIndex}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.4 }}
            className="flex flex-col items-center gap-3"
          >
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-purple-600 animate-pulse" />
              <span className="text-xs font-medium text-gray-500">
                Sugerencia {carouselIndex + 1} de {suggestions.length}
              </span>
            </div>

            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => handleClick(currentSuggestion, carouselIndex)}
              className="
                px-8 py-4 text-center max-w-md
                bg-gradient-to-r from-blue-600 to-purple-600
                hover:from-blue-700 hover:to-purple-700
                text-white text-base font-semibold
                rounded-2xl shadow-lg
                focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2
                transition-all duration-200
              "
            >
              {currentSuggestion}
              {getPopularityIndicator(currentSuggestion)}
            </motion.button>

            {/* Carousel indicators */}
            <div className="flex gap-2">
              {suggestions.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setCarouselIndex(idx)}
                  className={`
                    h-2 rounded-full transition-all duration-200
                    ${idx === carouselIndex ? 'w-8 bg-blue-600' : 'w-2 bg-gray-300'}
                  `}
                  aria-label={`Go to suggestion ${idx + 1}`}
                />
              ))}
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    )
  }

  return null
}
