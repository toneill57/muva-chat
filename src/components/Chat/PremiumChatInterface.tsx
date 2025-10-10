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
  Trash2
} from "lucide-react"

interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
  sources?: Array<{
    type: 'accommodation' | 'tourism'
    name: string
    similarity: number
  }>
  performance?: {
    responseTime: number
    tier: string
    resultsCount: number
  }
}

interface PremiumChatInterfaceProps {
  clientId: string
  businessName: string
}

// Preguntas sugeridas premium
const PREMIUM_SUGGESTIONS = [
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
  }
]

export function PremiumChatInterface({ clientId, businessName }: PremiumChatInterfaceProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      role: 'assistant',
      content: `¡Hola! Soy tu asistente premium de **${businessName}**.

Tengo acceso a:
🏨 **Información completa del hotel** (habitaciones, amenidades, políticas)
🌴 **Datos turísticos de San Andrés** (actividades, restaurantes, playas)

Puedo ayudarte con consultas combinadas como "habitación con vista al mar + restaurantes cercanos" o información específica sobre cualquier aspecto. ¿En qué puedo asistirte?`,
      timestamp: new Date()
    }
  ])

  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [showSuggestions, setShowSuggestions] = useState(true)
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

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

Tengo acceso a:
🏨 **Información completa del hotel** (habitaciones, amenidades, políticas)
🌴 **Datos turísticos de San Andrés** (actividades, restaurantes, playas)

Puedo ayudarte con consultas combinadas como "habitación con vista al mar + restaurantes cercanos" o información específica sobre cualquier aspecto. ¿En qué puedo asistirte?`,
        timestamp: new Date()
      }
    ])
    setShowSuggestions(true)
  }

  const shareConversation = async () => {
    const conversationText = messages
      .map(msg => `[${msg.role.toUpperCase()}] ${msg.content}`)
      .join('\n\n')

    try {
      await navigator.clipboard.writeText(conversationText)
      alert('Conversación copiada al portapapeles')
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

      const response = await fetch('/api/premium-chat', {
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
        throw new Error('Error en la respuesta del servidor')
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
        }
      }

      setMessages(prev => [...prev, assistantMessage])
    } catch (error) {
      console.error('Error en chat premium:', error)
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'Lo siento, hubo un error al procesar tu consulta. Por favor, verifica tu conexión e intenta de nuevo.',
        timestamp: new Date()
      }
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="h-full max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex justify-between items-center p-4 bg-gradient-to-r from-purple-50 to-indigo-50 border-b border-purple-200 rounded-t-lg">
        <div className="flex items-center">
          <div className="p-2 bg-gradient-to-r from-purple-500 to-indigo-500 rounded-lg mr-3">
            <Bot className="w-5 h-5 text-white animate-pulse" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-800 flex items-center">
              Chat Premium
              <span className="ml-2 px-2 py-0.5 bg-gradient-to-r from-yellow-400 to-orange-400 text-yellow-900 text-xs rounded-full font-bold">
                Premium
              </span>
            </h3>
            <p className="text-sm text-gray-600">Hotel + Turismo • Búsqueda ultra-rápida</p>
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

      <div className="flex h-[600px]">
        {/* Chat Area */}
        <div className="flex-1 flex flex-col">
          {/* Messages */}
          <ScrollArea className="flex-1 p-4">
            <div className="space-y-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex items-start space-x-3 ${
                    message.role === 'user' ? 'justify-end' : 'justify-start'
                  }`}
                >
                  {message.role === 'assistant' && (
                    <div className="flex-shrink-0 w-8 h-8 bg-gradient-to-r from-purple-500 to-indigo-500 rounded-full flex items-center justify-center">
                      <Bot className="w-4 h-4 text-white" />
                    </div>
                  )}

                  <div className={`max-w-xs lg:max-w-2xl relative group ${
                    message.role === 'user'
                      ? 'bg-gradient-to-r from-purple-500 to-indigo-500 text-white'
                      : 'bg-white border border-gray-200'
                  } rounded-lg p-3 shadow-sm`}>
                    <div className="prose prose-sm max-w-none">
                      <div className={`text-sm leading-relaxed ${
                        message.role === 'user' ? 'text-white' : 'text-gray-800'
                      }`}>
                        {message.content.split('\n').map((line, index) => (
                          <p key={index} className={`${index === 0 ? '' : 'mt-2'} ${line.startsWith('🏨') || line.startsWith('🌴') ? 'font-medium' : ''}`}>
                            {line}
                          </p>
                        ))}
                      </div>
                    </div>

                    {/* Performance indicators for assistant messages */}
                    {message.role === 'assistant' && message.performance && (
                      <div className="mt-3 pt-2 border-t border-gray-100">
                        <div className="flex items-center justify-between text-xs text-gray-500">
                          <div className="flex items-center space-x-3">
                            <span className="flex items-center">
                              <Clock className="w-3 h-3 mr-1" />
                              {message.performance.responseTime}ms
                            </span>
                            <span className="flex items-center">
                              <Zap className="w-3 h-3 mr-1" />
                              {message.performance.tier}
                            </span>
                            {message.performance.resultsCount > 0 && (
                              <span className="flex items-center">
                                <CheckCircle className="w-3 h-3 mr-1" />
                                {message.performance.resultsCount} resultados
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="flex justify-between items-center mt-2">
                      <p className={`text-xs ${
                        message.role === 'user'
                          ? 'text-purple-100'
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
                    <div className="flex-shrink-0 w-8 h-8 bg-gray-400 rounded-full flex items-center justify-center">
                      <User className="w-4 h-4 text-white" />
                    </div>
                  )}
                </div>
              ))}

              {isLoading && (
                <div className="flex items-start space-x-3 justify-start">
                  <div className="flex-shrink-0 w-8 h-8 bg-gradient-to-r from-purple-500 to-indigo-500 rounded-full flex items-center justify-center">
                    <Bot className="w-4 h-4 text-white" />
                  </div>
                  <div className="bg-white border border-gray-200 rounded-lg p-3 shadow-sm">
                    <div className="flex items-center space-x-2">
                      <Loader2 className="w-4 h-4 animate-spin text-purple-500" />
                      <span className="text-sm text-gray-500">Procesando consulta...</span>
                    </div>
                    <div className="mt-2 text-xs text-gray-400">
                      Buscando en contenido premium (hotel + turismo)
                    </div>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          </ScrollArea>

          {/* Input Form */}
          <form onSubmit={handleSubmit} className="p-4 bg-white border-t border-gray-200">
            <div className="flex space-x-2">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Pregunta sobre habitaciones, amenidades, turismo..."
                className="flex-1 border-purple-200 focus:border-purple-500"
                disabled={isLoading}
                maxLength={500}
              />
              <Button
                type="submit"
                disabled={isLoading || !input.trim()}
                className="bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-600 hover:to-indigo-600"
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
                Chat premium con acceso a hotel + turismo
              </p>
              <p className="text-xs text-gray-400">
                {input.length}/500
              </p>
            </div>
          </form>
        </div>

        {/* Suggestions Sidebar */}
        {showSuggestions && (
          <div className="w-80 border-l border-gray-200 bg-gray-50 p-4">
            <h4 className="font-medium text-gray-900 mb-4 flex items-center">
              <Sparkles className="w-4 h-4 mr-2 text-purple-500" />
              Consultas Premium
            </h4>
            <div className="space-y-4">
              {PREMIUM_SUGGESTIONS.map((category, index) => {
                const Icon = category.icon
                return (
                  <Card key={index} className="border-0 shadow-sm">
                    <CardHeader className="pb-2">
                      <CardTitle className={`text-sm flex items-center text-${category.color}-700`}>
                        <Icon className={`w-4 h-4 mr-2 text-${category.color}-500`} />
                        {category.category}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="space-y-2">
                        {category.questions.map((question, qIndex) => (
                          <button
                            key={qIndex}
                            onClick={() => handleSuggestionClick(question)}
                            className="w-full text-left p-2 text-xs text-gray-600 bg-white rounded hover:bg-gray-50 border border-gray-200 hover:border-purple-300 transition-all duration-200"
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