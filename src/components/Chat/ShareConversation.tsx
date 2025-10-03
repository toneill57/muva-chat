'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Share2, Copy, Check, Download, Loader2 } from 'lucide-react'
import html2canvas from 'html2canvas'

interface ShareConversationProps {
  conversationId: string
  conversationRef: React.RefObject<HTMLElement>
  guestName: string
}

/**
 * ShareConversation Component - FASE 2.3
 *
 * Share conversation via multiple methods
 * Features:
 * - Screenshot generation with html2canvas
 * - Native share sheet integration
 * - Copy link functionality
 * - Download conversation as image
 * - Premium share animations
 */
export function ShareConversation({
  conversationId,
  conversationRef,
  guestName,
}: ShareConversationProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [copied, setCopied] = useState(false)

  const shareUrl = `${window.location.origin}/guest/chat/${conversationId}`

  const generateScreenshot = async (): Promise<Blob | null> => {
    if (!conversationRef.current) return null

    setIsGenerating(true)

    try {
      const canvas = await html2canvas(conversationRef.current, {
        backgroundColor: '#ffffff',
        scale: 2,
        logging: false,
        useCORS: true,
      })

      return new Promise((resolve) => {
        canvas.toBlob((blob) => {
          resolve(blob)
        }, 'image/png')
      })
    } catch (err) {
      console.error('Screenshot generation failed:', err)
      return null
    } finally {
      setIsGenerating(false)
    }
  }

  const handleNativeShare = async () => {
    if (!navigator.share) {
      alert('Tu navegador no soporta compartir')
      return
    }

    try {
      const screenshot = await generateScreenshot()

      if (screenshot) {
        const file = new File([screenshot], `conversacion-${guestName}.png`, {
          type: 'image/png',
        })

        await navigator.share({
          title: `Conversación con ${guestName}`,
          text: 'Mi conversación con el asistente del hotel',
          url: shareUrl,
          files: [file],
        })
      } else {
        await navigator.share({
          title: `Conversación con ${guestName}`,
          text: 'Mi conversación con el asistente del hotel',
          url: shareUrl,
        })
      }

      setIsOpen(false)
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        console.error('Share failed:', err)
      }
    }
  }

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Copy failed:', err)
    }
  }

  const handleDownload = async () => {
    const screenshot = await generateScreenshot()

    if (screenshot) {
      const url = URL.createObjectURL(screenshot)
      const a = document.createElement('a')
      a.href = url
      a.download = `conversacion-${guestName}-${Date.now()}.png`
      a.click()
      URL.revokeObjectURL(url)
      setIsOpen(false)
    }
  }

  return (
    <>
      {/* Share Button */}
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(true)}
        className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
        aria-label="Compartir conversación"
      >
        <Share2 className="h-5 w-5" />
      </motion.button>

      {/* Share Modal */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="fixed inset-0 bg-black/50 z-50 backdrop-blur-sm"
            />

            {/* Modal */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="fixed inset-x-4 top-1/2 -translate-y-1/2 max-w-md mx-auto bg-white rounded-2xl shadow-2xl z-50 overflow-hidden"
            >
              {/* Header */}
              <div className="px-6 py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white">
                <div className="flex items-center gap-3">
                  <Share2 className="h-6 w-6" />
                  <div>
                    <h3 className="font-semibold text-lg">Compartir conversación</h3>
                    <p className="text-sm text-blue-100">
                      Comparte tu chat con el asistente
                    </p>
                  </div>
                </div>
              </div>

              {/* Options */}
              <div className="p-6 space-y-3">
                {/* Native Share */}
                {typeof navigator !== 'undefined' && 'share' in navigator && (
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleNativeShare}
                    disabled={isGenerating}
                    className="w-full flex items-center gap-4 p-4 bg-gradient-to-r from-blue-50 to-purple-50 hover:from-blue-100 hover:to-purple-100 border border-blue-200 rounded-xl transition-all disabled:opacity-50"
                  >
                    {isGenerating ? (
                      <Loader2 className="h-5 w-5 text-blue-600 animate-spin" />
                    ) : (
                      <Share2 className="h-5 w-5 text-blue-600" />
                    )}
                    <div className="text-left">
                      <p className="font-medium text-gray-900">Compartir</p>
                      <p className="text-xs text-gray-600">
                        {isGenerating
                          ? 'Generando captura...'
                          : 'Usa el menú de compartir del sistema'}
                      </p>
                    </div>
                  </motion.button>
                )}

                {/* Copy Link */}
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleCopyLink}
                  className="w-full flex items-center gap-4 p-4 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-xl transition-all"
                >
                  {copied ? (
                    <Check className="h-5 w-5 text-green-600" />
                  ) : (
                    <Copy className="h-5 w-5 text-gray-600" />
                  )}
                  <div className="text-left">
                    <p className="font-medium text-gray-900">
                      {copied ? 'Enlace copiado' : 'Copiar enlace'}
                    </p>
                    <p className="text-xs text-gray-600">
                      Comparte el enlace de esta conversación
                    </p>
                  </div>
                </motion.button>

                {/* Download Screenshot */}
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleDownload}
                  disabled={isGenerating}
                  className="w-full flex items-center gap-4 p-4 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-xl transition-all disabled:opacity-50"
                >
                  {isGenerating ? (
                    <Loader2 className="h-5 w-5 text-gray-600 animate-spin" />
                  ) : (
                    <Download className="h-5 w-5 text-gray-600" />
                  )}
                  <div className="text-left">
                    <p className="font-medium text-gray-900">
                      {isGenerating ? 'Generando...' : 'Descargar imagen'}
                    </p>
                    <p className="text-xs text-gray-600">
                      Guarda una captura de la conversación
                    </p>
                  </div>
                </motion.button>
              </div>

              {/* Cancel Button */}
              <div className="px-6 pb-6">
                <button
                  onClick={() => setIsOpen(false)}
                  className="w-full py-3 text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
                >
                  Cancelar
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  )
}
