'use client'

import { useState, useRef, useEffect } from 'react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Send, Bot, User, Loader2, Copy, Share, Trash2, RefreshCw } from "lucide-react"
import ReactMarkdown from 'react-markdown'
import { useChatState, ChatType, BusinessFilters } from '@/hooks/useChatState'

interface EnhancedChatAssistantProps {
  chatType: ChatType
  filters?: BusinessFilters
  onFiltersChange?: (filters: BusinessFilters) => void
}

// Different suggestions for each chat type
const CHAT_SUGGESTIONS = {
  sire: [
    "¿Qué tipos de documentos válidos acepta el SIRE?",
    "¿Cuáles son los 7 pasos oficiales para reportar información al SIRE?",
    "¿Cuáles son las 13 especificaciones de campos obligatorios?",
    "¿Qué información específica deben reportar los hoteles?"
  ],
  tourism: [
    "¿Cuáles son las mejores playas de San Andrés?",
    "¿Qué actividades acuáticas están disponibles?",
    "¿Dónde puedo encontrar la mejor comida local?",
    "¿Cómo llego desde el aeropuerto al centro?"
  ],
  business: [
    "¿Qué servicios ofrece este hotel?",
    "¿Cuáles son las políticas de cancelación?",
    "¿Qué actividades están disponibles?",
    "¿Cuáles son los horarios de atención?"
  ]
}

export function EnhancedChatAssistant({
  chatType,
  filters = {},
  onFiltersChange
}: EnhancedChatAssistantProps) {
  const { chatState, addMessage, clearMessages, getApiEndpoint } = useChatState()

  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [showSuggestions, setShowSuggestions] = useState(true)
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Initialize with welcome message based on chat type
  const [messages, setMessages] = useState<Array<{ id: string; role: 'user' | 'assistant'; content: string; timestamp: Date }>>(() => {
    const initialMessage = (() => {
      switch (chatType) {
        case 'sire':
          return '¡Hola! Soy tu asistente especializado en SIRE. Puedo ayudarte con dudas sobre procedimientos, validaciones, documentos válidos y cualquier aspecto del registro de extranjeros. ¿En qué puedo asistirte?'
        case 'tourism':
          return '¡Hola! Soy tu asistente de turismo para San Andrés. Puedo ayudarte con información sobre actividades, restaurantes, playas, transporte y cultura local. ¿Qué te gustaría conocer sobre San Andrés?'
        case 'business':
          return '¡Hola! Soy tu asistente de información empresarial. Puedo ayudarte con detalles específicos sobre hoteles, restaurantes, actividades y servicios. Selecciona un cliente y tipo de negocio para comenzar.'
        default:
          return '¡Hola! ¿En qué puedo ayudarte?'
      }
    })()

    return [
      {
        id: '1',
        role: 'assistant' as const,
        content: initialMessage,
        timestamp: new Date()
      }
    ]
  })

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // Reset messages when chat type changes
  useEffect(() => {
    const initialMessage = (() => {
      switch (chatType) {
        case 'sire':
          return '¡Hola! Soy tu asistente especializado en SIRE. Puedo ayudarte con dudas sobre procedimientos, validaciones, documentos válidos y cualquier aspecto del registro de extranjeros. ¿En qué puedo asistirte?'
        case 'tourism':
          return '¡Hola! Soy tu asistente de turismo para San Andrés. Puedo ayudarte con información sobre actividades, restaurantes, playas, transporte y cultura local. ¿Qué te gustaría conocer sobre San Andrés?'
        case 'business':
          return '¡Hola! Soy tu asistente de información empresarial. Puedo ayudarte con detalles específicos sobre hoteles, restaurantes, actividades y servicios. Selecciona un cliente y tipo de negocio para comenzar.'
        default:
          return '¡Hola! ¿En qué puedo ayudarte?'
      }
    })()

    setMessages([
      {
        id: '1',
        role: 'assistant',
        content: initialMessage,
        timestamp: new Date()
      }
    ])
    setShowSuggestions(true)
  }, [chatType])

  // Hide suggestions when user starts typing or after first message
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
    const initialMessage = (() => {
      switch (chatType) {
        case 'sire':
          return '¡Hola! Soy tu asistente especializado en SIRE. Puedo ayudarte con dudas sobre procedimientos, validaciones, documentos válidos y cualquier aspecto del registro de extranjeros. ¿En qué puedo asistirte?'
        case 'tourism':
          return '¡Hola! Soy tu asistente de turismo para San Andrés. Puedo ayudarte con información sobre actividades, restaurantes, playas, transporte y cultura local. ¿Qué te gustaría conocer sobre San Andrés?'
        case 'business':
          return '¡Hola! Soy tu asistente de información empresarial. Puedo ayudarte con detalles específicos sobre hoteles, restaurantes, actividades y servicios. Selecciona un cliente y tipo de negocio para comenzar.'
        default:
          return '¡Hola! ¿En qué puedo ayudarte?'
      }
    })()

    const message = {
      id: '1',
      role: 'assistant' as const,
      content: initialMessage,
      timestamp: new Date()
    }
    setMessages([message])
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

  const buildRequestBody = (question: string) => {
    const baseBody = {
      question,
      use_context: true,
      max_context_chunks: 4,
      conversation_history: messages.slice(-4).map(m => ({
        role: m.role,
        content: m.content
      }))
    }

    // Add business-specific filters for business chat
    if (chatType === 'business') {
      return {
        ...baseBody,
        client_id: filters.clientId,
        business_type: filters.businessType
      }
    }

    return baseBody
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || isLoading) return

    const userMessage = {
      id: Date.now().toString(),
      role: 'user' as const,
      content: input.trim(),
      timestamp: new Date()
    }

    setMessages(prev => [...prev, userMessage])
    setInput('')
    setIsLoading(true)

    try {
      const endpoint = getApiEndpoint()
      const requestBody = buildRequestBody(userMessage.content)

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      })

      if (!response.ok) {
        throw new Error('Error en la respuesta del servidor')
      }

      const data = await response.json()

      const assistantMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant' as const,
        content: data.response || 'Lo siento, no pude generar una respuesta. Por favor, intenta de nuevo.',
        timestamp: new Date()
      }

      setMessages(prev => [...prev, assistantMessage])
    } catch (error) {
      console.error('Error en chat:', error)
      const errorMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant' as const,
        content: 'Lo siento, hubo un error al procesar tu consulta. Por favor, verifica tu conexión e intenta de nuevo.',
        timestamp: new Date()
      }
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }

  const getChatTitle = () => {
    switch (chatType) {
      case 'sire':
        return 'Asistente SIRE'
      case 'tourism':
        return 'Tourism MUVA'
      case 'business':
        return 'Business Assistant'
      default:
        return 'Chat Assistant'
    }
  }

  const getPlaceholder = () => {
    switch (chatType) {
      case 'sire':
        return 'Pregunta sobre SIRE, validaciones, documentos...'
      case 'tourism':
        return 'Pregunta sobre turismo en San Andrés...'
      case 'business':
        return 'Pregunta sobre servicios, políticas, precios...'
      default:
        return 'Escribe tu pregunta...'
    }
  }

  const suggestions = CHAT_SUGGESTIONS[chatType] || []

  return (
    <div className="flex flex-col h-96 max-w-4xl mx-auto">
      {/* Header with Actions */}
      <div className="flex justify-between items-center p-3 bg-white border-b rounded-t-lg">
        <h3 className="font-medium text-gray-800">{getChatTitle()}</h3>
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

      {/* Messages Container */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex items-start space-x-3 ${
              message.role === 'user' ? 'justify-end' : 'justify-start'
            }`}
          >
            {message.role === 'assistant' && (
              <div className="flex-shrink-0 w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                <Bot className="w-4 h-4 text-white" />
              </div>
            )}

            <Card className={`max-w-xs lg:max-w-md relative group ${
              message.role === 'user'
                ? 'bg-blue-500 text-white'
                : 'bg-white'
            }`}>
              <CardContent className="p-3">
                {message.role === 'assistant' ? (
                  <div className="text-sm prose prose-sm max-w-none">
                    <ReactMarkdown
                      components={{
                        p: ({ children }) => <p className="mb-2 last:mb-0 leading-relaxed">{children}</p>,
                        ul: ({ children }) => <ul className="list-disc list-inside mb-3 space-y-1">{children}</ul>,
                        ol: ({ children }) => <ol className="list-decimal list-inside mb-3 space-y-1">{children}</ol>,
                        li: ({ children }) => <li className="mb-1 leading-relaxed">{children}</li>,
                        strong: ({ children }) => <strong className="font-semibold text-blue-700">{children}</strong>,
                        code: ({ children }) => <code className="bg-blue-50 text-blue-800 px-2 py-1 rounded text-xs font-mono">{children}</code>,
                        h1: ({ children }) => <h1 className="font-bold text-base mb-3 text-gray-800 border-b border-gray-200 pb-1">{children}</h1>,
                        h2: ({ children }) => <h2 className="font-semibold text-sm mb-2 text-gray-700">{children}</h2>,
                        h3: ({ children }) => <h3 className="font-medium text-sm mb-2 text-gray-600">{children}</h3>,
                        blockquote: ({ children }) => <blockquote className="border-l-4 border-blue-200 pl-3 ml-2 italic text-gray-600 my-2">{children}</blockquote>,
                      }}
                    >
                      {message.content}
                    </ReactMarkdown>
                  </div>
                ) : (
                  <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                )}
                <div className="flex justify-between items-center mt-2">
                  <p className={`text-xs ${
                    message.role === 'user'
                      ? 'text-blue-100'
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
              </CardContent>
            </Card>

            {message.role === 'user' && (
              <div className="flex-shrink-0 w-8 h-8 bg-gray-400 rounded-full flex items-center justify-center">
                <User className="w-4 h-4 text-white" />
              </div>
            )}
          </div>
        ))}

        {isLoading && (
          <div className="flex items-start space-x-3 justify-start">
            <div className="flex-shrink-0 w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
              <Bot className="w-4 h-4 text-white" />
            </div>
            <Card className="bg-white">
              <CardContent className="p-3">
                <div className="flex items-center space-x-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span className="text-sm text-gray-500">Procesando pregunta...</span>
                </div>
                <div className="mt-2 text-xs text-gray-400">
                  {chatType === 'sire' && 'Buscando información relevante en documentos SIRE'}
                  {chatType === 'tourism' && 'Buscando información turística de San Andrés'}
                  {chatType === 'business' && 'Buscando información específica del negocio'}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Question Suggestions */}
      {showSuggestions && suggestions.length > 0 && (
        <div className="p-3 bg-white border-t">
          <p className="text-sm font-medium text-gray-700 mb-2">Preguntas frecuentes:</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {suggestions.map((question, index) => (
              <Button
                key={index}
                variant="ghost"
                size="sm"
                className="h-auto p-2 text-left justify-start whitespace-normal text-xs hover:bg-gray-100"
                onClick={() => handleSuggestionClick(question)}
              >
                {question}
              </Button>
            ))}
          </div>
          <div className="mt-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowSuggestions(false)}
              className="w-full text-xs"
            >
              Ocultar sugerencias
            </Button>
          </div>
        </div>
      )}

      {/* Input Form */}
      <form onSubmit={handleSubmit} className="p-4 bg-white border-t rounded-b-lg">
        <div className="flex space-x-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={getPlaceholder()}
            className="flex-1"
            disabled={isLoading}
            maxLength={500}
          />
          {!showSuggestions && suggestions.length > 0 && (
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={() => setShowSuggestions(true)}
              disabled={isLoading}
            >
              <RefreshCw className="w-4 h-4" />
            </Button>
          )}
          <Button
            type="submit"
            disabled={isLoading || !input.trim()}
            size="icon"
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
            {chatType === 'sire' && 'Pregunta sobre procedimientos SIRE, validaciones, documentos válidos, campos obligatorios, etc.'}
            {chatType === 'tourism' && 'Pregunta sobre lugares, actividades, restaurantes, cultura y turismo en San Andrés'}
            {chatType === 'business' && 'Pregunta sobre servicios específicos, políticas, precios y operaciones del negocio'}
          </p>
          <p className="text-xs text-gray-400">
            {input.length}/500
          </p>
        </div>
      </form>
    </div>
  )
}