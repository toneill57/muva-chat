'use client'

import { useState, useRef, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Bot,
  User,
  Send,
  Loader2,
  Copy,
  CheckCircle,
  Sparkles,
  Zap,
  Home,
  MapPin,
  Clock,
  Share,
  Trash2,
  FlaskConical
} from "lucide-react"
import ReactMarkdown from 'react-markdown'
import { useSessionMetrics } from '@/hooks/useSessionMetrics'
import { MetricsDashboard } from './MetricsDashboard'
import { MessageMetricsCard } from './MessageMetricsCard'
import { ChatMessage } from './shared/types'

interface PremiumChatInterfaceDevProps {
  clientId: string
  businessName: string
}

// Preguntas sugeridas premium - versión de desarrollo
const PREMIUM_SUGGESTIONS_DEV = [
  {
    category: "Acomodaciones",
    icon: Home,
    color: "blue",
    questions: [
      "¿Qué habitaciones tienen vista al mar?",
      "Muéstrame las suites con terraza",
      "¿Cuáles son las amenidades de Dreamland?",
      "Información sobre apartamentos para 4 personas"
    ]
  },
  {
    category: "Turismo",
    icon: MapPin,
    color: "green",
    questions: [
      "¿Qué actividades hay cerca del hotel?",
      "Restaurantes recomendados en San Andrés",
      "¿Cómo llegar a las mejores playas?",
      "Actividades de buceo disponibles"
    ]
  },
  {
    category: "Combinadas",
    icon: Sparkles,
    color: "purple",
    questions: [
      "Habitación con vista al mar + restaurantes cercanos",
      "Suite familiar + actividades para niños",
      "Acomodación romántica + cenas especiales",
      "Apartamento + guía turística completa"
    ]
  },
  {
    category: "Testing",
    icon: FlaskConical,
    color: "orange",
    questions: [
      "Prueba de búsqueda rápida",
      "Test de respuesta combinada",
      "Verificar performance del sistema",
      "Evaluar calidad de respuestas"
    ]
  }
]

export function PremiumChatInterfaceDev({ clientId, businessName }: PremiumChatInterfaceDevProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      role: 'assistant',
      content: `¡Hola! Soy tu asistente premium de **${businessName}**.

**Acceso a contenido:**
- 🏨 Información del hotel (habitaciones, amenidades, políticas)
- 🌴 Datos turísticos (actividades, restaurantes, playas)

¿En qué puedo ayudarte?`,
      timestamp: new Date()
    }
  ])

  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [showSuggestions, setShowSuggestions] = useState(true)
  const [showMetricsDashboard, setShowMetricsDashboard] = useState(true)
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // NEW: Session metrics tracking
  const { sessionMetrics, addQuery, resetSession, exportSession } = useSessionMetrics()

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  useEffect(() => {
    if (messages.length > 1) {
      setShowSuggestions(false)
    }
  }, [messages])

  const copyToClipboard = async (text: string, messageId: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedMessageId(messageId)
      setTimeout(() => setCopiedMessageId(null), 2000)
    } catch (err) {
      console.error('Failed to copy text: ', err)
    }
  }

  const clearConversation = () => {
    setMessages([
      {
        id: '1',
        role: 'assistant',
        content: `¡Hola! Soy tu asistente premium de **${businessName}**.

**Acceso a contenido:**
- 🏨 Información del hotel (habitaciones, amenidades, políticas)
- 🌴 Datos turísticos (actividades, restaurantes, playas)

¿En qué puedo ayudarte?`,
        timestamp: new Date()
      }
    ])
    setShowSuggestions(true)
    // Also reset session metrics
    resetSession()
  }

  const shareConversation = async () => {
    const conversationText = messages
      .map(msg => `[${msg.role.toUpperCase()}] ${msg.content}`)
      .join('\n\n')

    try {
      await navigator.clipboard.writeText(conversationText)
      alert('Conversación copiada al portapapeles (versión de desarrollo)')
    } catch (err) {
      console.error('Failed to share conversation: ', err)
    }
  }

  const handleSuggestionClick = (question: string) => {
    setInput(question)
    setShowSuggestions(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || isLoading) return

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
      timestamp: new Date()
    }

    setMessages(prev => [...prev, userMessage])
    setInput('')
    setIsLoading(true)

    try {
      const startTime = Date.now()

      // Usar endpoint de desarrollo
      const response = await fetch('/api/premium-chat-dev', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: userMessage.content,
          client_id: clientId,
          business_name: businessName
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        const errorMsg = errorData.error || errorData.details || response.statusText
        console.error('[Premium Chat DEV] API Error:', {
          status: response.status,
          statusText: response.statusText,
          errorData
        })
        throw new Error(`Error ${response.status}: ${errorMsg}`)
      }

      const data = await response.json()
      const responseTime = Date.now() - startTime

      const assistantMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.response || 'Lo siento, no pude generar una respuesta. Por favor, intenta de nuevo.',
        timestamp: new Date(),
        sources: data.sources || [],
        performance: {
          responseTime,
          tier: data.tier_info?.name || 'N/A',
          resultsCount: data.results_count || 0
        },
        // NEW: Extended metrics from API
        metrics: data.metrics
      }

      setMessages(prev => [...prev, assistantMessage])

      // NEW: Track query in session metrics
      if (data.metrics) {
        addQuery(assistantMessage)
      }
    } catch (error) {
      console.error('Error en chat premium dev:', error)
      const errorMsg = error instanceof Error ? error.message : 'Error desconocido'
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `❌ **Error**\n\n${errorMsg}\n\n🧪 **Dev Info**: Revisa la consola del navegador y los logs del servidor para más detalles.`,
        timestamp: new Date()
      }
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="h-full max-w-7xl mx-auto">
      {/* Header con indicadores de desarrollo */}
      <div className="flex justify-between items-center p-4 bg-gradient-to-r from-orange-50 to-yellow-50 border-b border-orange-200 rounded-t-lg">
        <div className="flex items-center">
          <div className="p-2 bg-gradient-to-r from-orange-500 to-yellow-500 rounded-lg mr-3">
            <FlaskConical className="w-5 h-5 text-white animate-bounce" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-800 flex items-center">
              Chat Premium
              <span className="ml-2 px-2 py-0.5 bg-gradient-to-r from-orange-400 to-red-400 text-orange-900 text-xs rounded-full font-bold animate-pulse">
                DEV
              </span>
              <span className="ml-1 px-2 py-0.5 bg-gradient-to-r from-yellow-400 to-orange-400 text-yellow-900 text-xs rounded-full font-bold">
                Testing
              </span>
            </h3>
            <p className="text-sm text-gray-600">🧪 Versión Experimental • Hotel + Turismo • Testing</p>
          </div>
        </div>
        <div className="flex space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={shareConversation}
            disabled={messages.length <= 1}
          >
            <Share className="w-4 h-4 mr-1" />
            Compartir
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={clearConversation}
            disabled={messages.length <= 1}
          >
            <Trash2 className="w-4 h-4 mr-1" />
            Limpiar
          </Button>
        </div>
      </div>

      {/* NEW: Metrics Dashboard Toggle */}
      <div className="flex justify-end p-2 bg-orange-50 border-b border-orange-200">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowMetricsDashboard(!showMetricsDashboard)}
        >
          {showMetricsDashboard ? 'Hide' : 'Show'} Metrics Dashboard
        </Button>
      </div>

      {/* NEW: Metrics Dashboard */}
      {showMetricsDashboard && (
        <MetricsDashboard
          sessionMetrics={sessionMetrics}
          onExport={exportSession}
          onReset={() => {
            resetSession()
            clearConversation()
          }}
        />
      )}

      <div className="flex h-[600px]">
        {/* Chat Area */}
        <div className="flex-1 flex flex-col">
          {/* Messages */}
          <ScrollArea className="flex-1 p-4">
            <div className="space-y-4">
              {messages.map((message) => (
                <div key={message.id}>
                  <div
                    className={`flex items-start space-x-3 ${
                      message.role === 'user' ? 'justify-end' : 'justify-start'
                    }`}
                  >
                  {message.role === 'assistant' && (
                    <div className="flex-shrink-0 w-8 h-8 bg-gradient-to-r from-orange-500 to-yellow-500 rounded-full flex items-center justify-center">
                      <FlaskConical className="w-4 h-4 text-white" />
                    </div>
                  )}

                  <div className={`max-w-xs lg:max-w-2xl relative group ${
                    message.role === 'user'
                      ? 'bg-gradient-to-r from-orange-500 to-yellow-500 text-white'
                      : 'bg-white border-2 border-dashed border-orange-200'
                  } rounded-lg p-3 shadow-sm`}>
                    <div className="prose prose-sm max-w-none">
                      {message.role === 'user' ? (
                        <div className="text-sm leading-relaxed text-white">
                          {message.content}
                        </div>
                      ) : (
                        <div className="text-sm leading-relaxed text-gray-800">
                          <ReactMarkdown
                            components={{
                              p: ({node, ...props}) => <p className="mb-2" {...props} />,
                              strong: ({node, ...props}) => <strong className="font-semibold text-gray-900" {...props} />,
                              ul: ({node, ...props}) => <ul className="list-disc pl-4 mb-2" {...props} />,
                              li: ({node, ...props}) => <li className="mb-1" {...props} />,
                              h1: ({node, ...props}) => <h1 className="text-lg font-bold mb-2 text-gray-900" {...props} />,
                              h2: ({node, ...props}) => <h2 className="text-base font-semibold mb-2 text-gray-800" {...props} />,
                              h3: ({node, ...props}) => <h3 className="text-sm font-medium mb-1 text-gray-700" {...props} />,
                            }}
                          >
                            {message.content}
                          </ReactMarkdown>
                        </div>
                      )}
                    </div>

                    {/* Sources display - visually attractive badges */}
                    {message.role === 'assistant' && message.sources && message.sources.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-gray-200">
                        <div className="flex items-center mb-2">
                          <span className="text-xs font-medium text-gray-600">📚 Fuentes consultadas</span>
                          <span className="ml-2 text-xs text-gray-400">({message.sources.length})</span>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {message.sources.map((source, idx) => (
                            <div
                              key={idx}
                              className={`inline-flex items-center px-2 py-1 rounded-md text-xs border ${
                                source.type === 'accommodation'
                                  ? 'bg-blue-50 border-blue-200 text-blue-800'
                                  : 'bg-green-50 border-green-200 text-green-800'
                              }`}
                            >
                              <span className="mr-1">{source.type === 'accommodation' ? '🏨' : '🌴'}</span>
                              <span className="font-medium truncate max-w-[150px]">{source.name}</span>
                              <span className="ml-2 px-1 py-0.5 bg-white rounded text-[10px] font-mono">
                                {Math.round(source.similarity * 100)}%
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Performance indicators for assistant messages - versión dev */}
                    {message.role === 'assistant' && message.performance && (
                      <div className="mt-3 pt-3 border-t border-orange-200">
                        <div className="bg-orange-50 rounded-md p-2 border border-orange-100">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs font-medium text-orange-800 flex items-center">
                              <FlaskConical className="w-3 h-3 mr-1" />
                              Dev Metrics
                            </span>
                          </div>
                          <div className="grid grid-cols-3 gap-2 text-xs">
                            <div className="flex items-center text-gray-600">
                              <Clock className="w-3 h-3 mr-1 text-blue-500" />
                              <span className="font-mono">{message.performance.responseTime}ms</span>
                            </div>
                            <div className="flex items-center text-gray-600">
                              <Zap className="w-3 h-3 mr-1 text-purple-500" />
                              <span className="truncate">{message.performance.tier}</span>
                            </div>
                            {message.performance.resultsCount > 0 && (
                              <div className="flex items-center text-gray-600">
                                <CheckCircle className="w-3 h-3 mr-1 text-green-500" />
                                <span>{message.performance.resultsCount} results</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="flex justify-between items-center mt-2">
                      <p className={`text-xs ${
                        message.role === 'user'
                          ? 'text-orange-100'
                          : 'text-gray-500'
                      }`}>
                        {message.timestamp.toLocaleTimeString('es-CO', {
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                      {message.role === 'assistant' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="opacity-0 group-hover:opacity-100 transition-opacity h-6 w-6 p-0"
                          onClick={() => copyToClipboard(message.content, message.id)}
                        >
                          {copiedMessageId === message.id ? (
                            <span className="text-xs text-green-600">✓</span>
                          ) : (
                            <Copy className="w-3 h-3" />
                          )}
                        </Button>
                      )}
                    </div>
                  </div>

                  {message.role === 'user' && (
                    <div className="flex-shrink-0 w-8 h-8 bg-orange-400 rounded-full flex items-center justify-center">
                      <User className="w-4 h-4 text-white" />
                    </div>
                  )}
                  </div>

                  {/* NEW: Per-message metrics card */}
                  {message.role === 'assistant' && message.metrics && (
                    <MessageMetricsCard message={message} />
                  )}
                </div>
              ))}

              {isLoading && (
                <div className="flex items-start space-x-3 justify-start">
                  <div className="flex-shrink-0 w-8 h-8 bg-gradient-to-r from-orange-500 to-yellow-500 rounded-full flex items-center justify-center">
                    <FlaskConical className="w-4 h-4 text-white animate-bounce" />
                  </div>
                  <div className="bg-white border-2 border-dashed border-orange-200 rounded-lg p-3 shadow-sm">
                    <div className="flex items-center space-x-2">
                      <Loader2 className="w-4 h-4 animate-spin text-orange-500" />
                      <span className="text-sm text-gray-500">Procesando consulta... (DEV)</span>
                    </div>
                    <div className="mt-2 text-xs text-gray-400">
                      🧪 Testing en contenido premium (hotel + turismo)
                    </div>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          </ScrollArea>

          {/* Input Form - versión dev */}
          <form onSubmit={handleSubmit} className="p-4 bg-white border-t border-orange-200">
            <div className="flex space-x-2">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="🧪 Pregunta sobre habitaciones, amenidades, turismo... (Testing)"
                className="flex-1 border-orange-200 focus:border-orange-500"
                disabled={isLoading}
                maxLength={500}
              />
              <Button
                type="submit"
                disabled={isLoading || !input.trim()}
                className="bg-gradient-to-r from-orange-500 to-yellow-500 hover:from-orange-600 hover:to-yellow-600"
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </Button>
            </div>
            <div className="flex justify-between items-center mt-2">
              <p className="text-xs text-gray-500">
                🧪 Chat premium de desarrollo con acceso a hotel + turismo
              </p>
              <p className="text-xs text-gray-400">
                {input.length}/500
              </p>
            </div>
          </form>
        </div>

        {/* Suggestions Sidebar - versión dev */}
        {showSuggestions && (
          <div className="w-80 border-l border-orange-200 bg-orange-50 p-4">
            <h4 className="font-medium text-gray-900 mb-4 flex items-center">
              <FlaskConical className="w-4 h-4 mr-2 text-orange-500 animate-bounce" />
              Consultas Development
            </h4>
            <div className="space-y-4">
              {PREMIUM_SUGGESTIONS_DEV.map((category, index) => {
                const Icon = category.icon
                return (
                  <Card key={index} className="border-0 shadow-sm">
                    <CardHeader className="pb-2">
                      <CardTitle className={`text-sm flex items-center text-${category.color}-700`}>
                        <Icon className={`w-4 h-4 mr-2 text-${category.color}-500`} />
                        {category.category}
                        {category.category === 'Testing' && <span className="ml-2 text-xs text-orange-600">[DEV]</span>}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="space-y-2">
                        {category.questions.map((question, qIndex) => (
                          <button
                            key={qIndex}
                            onClick={() => handleSuggestionClick(question)}
                            className="w-full text-left p-2 text-xs text-gray-600 bg-white rounded hover:bg-orange-50 border border-orange-200 hover:border-orange-300 transition-all duration-200"
                          >
                            {question}
                          </button>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowSuggestions(false)}
              className="w-full mt-4 text-xs"
            >
              Ocultar sugerencias
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}