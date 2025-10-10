'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, MapPin, Activity, Home, Info } from 'lucide-react'
import type { EntityBadgeProps } from '@/lib/guest-chat-types'

/**
 * EntityBadge Component - ENHANCED for FASE 2.2
 *
 * Displays tracked entities with premium animations and interactions
 * Features:
 * - Type-specific icons with color coding
 * - Smooth hover tooltips with Framer Motion
 * - Removable with animated confirmation
 * - Staggered entrance animations
 * - Pulse effect on new entity
 */
export function EntityBadge({ entity, type, onClick, onRemove, isNew = false }: EntityBadgeProps) {
  const [isHovered, setIsHovered] = useState(false)

  const getIcon = () => {
    switch (type) {
      case 'activity':
        return <Activity className="h-3.5 w-3.5" />
      case 'place':
        return <MapPin className="h-3.5 w-3.5" />
      case 'amenity':
        return <Home className="h-3.5 w-3.5" />
      default:
        return <Info className="h-3.5 w-3.5" />
    }
  }

  const getColorClasses = () => {
    switch (type) {
      case 'activity':
        return 'bg-green-100 text-green-800 border-green-200 hover:bg-green-200'
      case 'place':
        return 'bg-blue-100 text-blue-800 border-blue-200 hover:bg-blue-200'
      case 'amenity':
        return 'bg-purple-100 text-purple-800 border-purple-200 hover:bg-purple-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200 hover:bg-gray-200'
    }
  }

  const handleClick = () => {
    if (onClick) {
      onClick()
    }
  }

  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (onRemove) {
      onRemove()
    }
  }

  return (
    <motion.div
      data-testid="entity-badge"
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.8 }}
      whileHover={onClick ? { scale: 1.05 } : {}}
      whileTap={onClick ? { scale: 0.95 } : {}}
      className={`
        relative inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full
        text-sm font-medium border transition-all duration-200
        ${getColorClasses()}
        ${onClick ? 'cursor-pointer' : ''}
        ${isNew ? 'animate-pulse-new' : ''}
      `}
      onClick={handleClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      role={onClick ? 'button' : 'status'}
      tabIndex={onClick ? 0 : -1}
      onKeyDown={(e) => {
        if (onClick && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault()
          onClick()
        }
      }}
      aria-label={`${type}: ${entity}`}
    >
      {getIcon()}
      <span className="truncate max-w-[150px]">{entity}</span>

      {onRemove && (
        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: isHovered ? 1 : 0 }}
          transition={{ duration: 0.2 }}
          onClick={handleRemove}
          className="ml-1 -mr-1 rounded-full p-0.5 hover:bg-black/10 transition-colors"
          aria-label={`Remove ${entity}`}
          tabIndex={0}
        >
          <X className="h-3 w-3" />
        </motion.button>
      )}

      {/* Enhanced hover tooltip with Framer Motion */}
      <AnimatePresence>
        {isHovered && onClick && (
          <motion.div
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            transition={{ duration: 0.2 }}
            className="absolute z-20 bottom-full mb-2 left-1/2 -translate-x-1/2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg shadow-xl whitespace-nowrap pointer-events-none"
          >
            Click para buscar más sobre "{entity}"
            <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-gray-900 rotate-45" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* New entity indicator */}
      {isNew && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="absolute -top-1 -right-1 h-3 w-3 bg-red-500 rounded-full border-2 border-white"
        />
      )}

      <style jsx>{`
        @keyframes pulse-new {
          0%, 100% {
            box-shadow: 0 0 0 0 rgba(59, 130, 246, 0.7);
          }
          50% {
            box-shadow: 0 0 0 4px rgba(59, 130, 246, 0);
          }
        }

        .animate-pulse-new {
          animation: pulse-new 2s ease-out infinite;
        }
      `}</style>
    </motion.div>
  )
}
