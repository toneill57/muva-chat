import { Dialog, Disclosure } from '@headlessui/react'
import { X, ChevronDown, Loader2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import { logManualEvent } from '@/lib/manual-analytics'

interface ManualContentModalProps {
  manualId: string | null
  unitId: string
  tenantId: string
  onClose: () => void
}

interface Chunk {
  id: string
  chunk_index: number
  section_title: string
  chunk_content: string
}

export function ManualContentModal({ manualId, unitId, tenantId, onClose }: ManualContentModalProps) {
  const [chunks, setChunks] = useState<Chunk[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // P3.1: Lazy Loading - Fetch chunks solo cuando modal está abierto
  // Evita requests innecesarios si el usuario nunca abre el modal
  const isOpen = manualId !== null

  useEffect(() => {
    // Solo cargar si modal está abierto Y no tenemos chunks ya cargados (cache)
    if (!isOpen || !manualId || !unitId || chunks.length > 0) return

    // P4.3: Log view event when modal opens
    logManualEvent({
      manualId,
      tenantId,
      unitId,
      eventType: 'view'
    })

    const fetchChunks = async () => {
      setIsLoading(true)
      setError(null)

      try {
        const response = await fetch(`/api/accommodation-manuals/${unitId}/${manualId}/chunks`)

        if (!response.ok) throw new Error('Failed to fetch chunks')

        const data = await response.json()
        setChunks(data.data || [])

      } catch (err) {
        setError('Failed to load manual content')
      } finally {
        setIsLoading(false)
      }
    }

    fetchChunks()
  }, [isOpen, manualId, unitId]) // Solo depende de isOpen, no se recarga si chunks ya existen

  // Limpiar chunks cuando modal se cierra (opcional - comentar si quieres mantener cache)
  useEffect(() => {
    if (!isOpen) {
      // Limpiar después de cerrar para liberar memoria
      // Comentar esta línea si prefieres mantener cache entre aperturas
      setChunks([])
    }
  }, [isOpen])

  return (
    <Dialog open={manualId !== null} onClose={onClose} className="relative z-50">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/30" aria-hidden="true" />

      {/* Full-screen container */}
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <Dialog.Panel className="mx-auto max-w-3xl w-full bg-white rounded-lg shadow-xl max-h-[80vh] overflow-y-auto">

          {/* Header */}
          <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
            <Dialog.Title className="text-lg font-semibold">
              Manual Content
            </Dialog.Title>
            <button
              onClick={onClose}
              className="hover:bg-gray-100 rounded p-1 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
              aria-label="Close modal"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Body */}
          <div className="p-6">
            {isLoading && (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
              </div>
            )}

            {error && (
              <div className="bg-red-50 text-red-700 px-4 py-3 rounded">
                {error}
              </div>
            )}

            {!isLoading && !error && chunks.length === 0 && (
              <p className="text-gray-500 text-center py-8">
                No content available
              </p>
            )}

            {!isLoading && !error && chunks.length > 0 && (
              <div className="space-y-2">
                {chunks.map((chunk, index) => (
                  <Disclosure key={chunk.id}>
                    {({ open }) => (
                      <>
                        <Disclosure.Button className="flex w-full items-start justify-between rounded-lg bg-gray-100 px-4 py-3 text-left hover:bg-gray-200 gap-3 cursor-pointer">
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-gray-900">
                              {chunk.section_title || `Chunk ${index + 1}`}
                            </div>
                            {!open && (
                              <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                                {chunk.chunk_content
                                  .replace(/#{1,6}\s+/g, '') // Remove markdown headers
                                  .replace(/\*\*(.+?)\*\*/g, '$1') // Remove bold
                                  .replace(/\*(.+?)\*/g, '$1') // Remove italic
                                  .replace(/`(.+?)`/g, '$1') // Remove code
                                  .replace(/\[(.+?)\]\(.+?\)/g, '$1') // Remove links, keep text
                                  .replace(/^[-*+]\s+/gm, '') // Remove list markers
                                  .replace(/^\d+\.\s+/gm, '') // Remove numbered list markers
                                  .substring(0, 120)
                                  .trim()}
                                {chunk.chunk_content.length > 120 ? '...' : ''}
                              </p>
                            )}
                          </div>
                          <ChevronDown
                            className={`${
                              open ? 'rotate-180 transform' : ''
                            } h-5 w-5 transition-transform flex-shrink-0 text-gray-500`}
                          />
                        </Disclosure.Button>

                        <Disclosure.Panel className="px-4 py-3 text-sm text-gray-700">
                          <div className="prose prose-sm max-w-none">
                            <ReactMarkdown
                              components={{
                                p: ({ children }) => <p className="mb-2 last:mb-0 leading-relaxed">{children}</p>,
                                ul: ({ children }) => <ul className="list-disc list-inside mb-3 space-y-1">{children}</ul>,
                                ol: ({ children }) => <ol className="list-decimal list-inside mb-3 space-y-1">{children}</ol>,
                                li: ({ children }) => <li className="mb-1 leading-relaxed">{children}</li>,
                                strong: ({ children }) => <strong className="font-semibold text-gray-900">{children}</strong>,
                                code: ({ children }) => <code className="bg-gray-100 text-gray-800 px-2 py-1 rounded text-xs font-mono">{children}</code>,
                                h1: ({ children }) => <h1 className="font-bold text-lg mb-3 text-gray-900 border-b border-gray-200 pb-2">{children}</h1>,
                                h2: ({ children }) => <h2 className="font-semibold text-base mb-2 text-gray-800">{children}</h2>,
                                h3: ({ children }) => <h3 className="font-medium text-sm mb-2 text-gray-700">{children}</h3>,
                                blockquote: ({ children }) => <blockquote className="border-l-4 border-gray-300 pl-3 ml-2 italic text-gray-600 my-2">{children}</blockquote>,
                              }}
                            >
                              {chunk.chunk_content}
                            </ReactMarkdown>
                          </div>
                        </Disclosure.Panel>
                      </>
                    )}
                  </Disclosure>
                ))}
              </div>
            )}
          </div>
        </Dialog.Panel>
      </div>
    </Dialog>
  )
}
