'use client'

import React, { useState, useEffect, useRef } from 'react'
import { Send, RotateCcw, ExternalLink } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

interface Source {
  result_type: 'tourism' | 'accommodation'
  tenant_name: string
  tenant_subdomain: string | null
  title: string
  similarity: number
  metadata: {
    category?: string
    unit_type?: string
    pricing?: Record<string, unknown>
    photos?: string[]
  }
}

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
  sources?: Source[]
}

// MUVA brand colors
const MUVA_PRIMARY = '#0d9488' // teal-600
const MUVA_GRADIENT_END = '#14b8a6' // teal-500

export default function SuperChatPage() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sessionId, setSessionId] = useState<string | null>(null)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const messagesContainerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const storedSessionId = localStorage.getItem('super_chat_session_id')
    if (storedSessionId) {
      setSessionId(storedSessionId)
    }
  }, [])

  useEffect(() => {
    if (messages.length > 1) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages])

  useEffect(() => {
    if (messages.length === 0) {
      const welcomeMessage: Message = {
        id: 'welcome',
        role: 'assistant',
        content: '',
        timestamp: new Date()
      }
      setMessages([welcomeMessage])
    }
  }, [messages.length])

  const handleNewConversation = () => {
    localStorage.removeItem('super_chat_session_id')
    setSessionId(null)
    setMessages([])
    setError(null)
  }

  const sendMessage = async () => {
    if (!input.trim() || loading) return

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: input.trim(),
      timestamp: new Date()
    }

    setMessages(prev => [...prev, userMessage])
    const messageText = input.trim()
    setInput('')
    setLoading(true)
    setError(null)

    const assistantId = `assistant-${Date.now()}`
    const assistantMessage: Message = {
      id: assistantId,
      role: 'assistant',
      content: '',
      timestamp: new Date()
    }

    setMessages(prev => [...prev, assistantMessage])

    try {
      const response = await fetch('/api/chat/super', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: messageText,
          session_id: sessionId
        })
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`Failed to send message: ${response.status} ${errorText}`)
      }

      const reader = response.body?.getReader()
      const decoder = new TextDecoder()

      if (!reader) {
        throw new Error('No reader available')
      }

      let fullContent = ''

      while (true) {
        const { done, value } = await reader.read()

        if (done) break

        const chunk = decoder.decode(value)
        const lines = chunk.split('\n')

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.substring(6))

              if (data.type === 'chunk') {
                fullContent += data.content

                setMessages(prev =>
                  prev.map(msg =>
                    msg.id === assistantId
                      ? { ...msg, content: fullContent }
                      : msg
                  )
                )
              } else if (data.type === 'done') {
                if (data.session_id) {
                  setSessionId(data.session_id)
                  localStorage.setItem('super_chat_session_id', data.session_id)
                }

                if (data.sources) {
                  setMessages(prev =>
                    prev.map(msg =>
                      msg.id === assistantId
                        ? { ...msg, sources: data.sources }
                        : msg
                    )
                  )
                }
              } else if (data.type === 'error') {
                throw new Error(data.error)
              }
            } catch (parseError) {
              console.error('Parse error:', parseError)
            }
          }
        }
      }

      setLoading(false)

    } catch (err) {
      console.error('Chat error:', err)
      const errorMessage = err instanceof Error ? err.message : 'Failed to send message'
      setError(errorMessage)
      setMessages(prev => prev.filter(msg => msg.id !== assistantId))
      setLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const retryLastMessage = () => {
    const lastUserMessage = [...messages].reverse().find(m => m.role === 'user')
    if (lastUserMessage) {
      setInput(lastUserMessage.content)
      setError(null)
      inputRef.current?.focus()
    }
  }

  // Welcome message HTML
  const getWelcomeHTML = () => `
    <p class="mb-3">
      <strong>Bienvenido a MUVA Chat</strong> - Tu guía de turismo en San Andrés
    </p>
    <p class="mb-3">
      Puedo ayudarte con:
    </p>
    <ul class="list-disc list-inside mb-3 space-y-1">
      <li>Playas, restaurantes y actividades</li>
      <li>Alojamientos de diferentes hoteles</li>
      <li>Comparar opciones de hospedaje</li>
      <li>Recomendaciones personalizadas</li>
    </ul>
    <p class="text-sm text-gray-500">
      Pregunta lo que quieras saber sobre San Andrés
    </p>
  `

  // Render tenant link for accommodation sources
  const renderTenantLink = (source: Source) => {
    if (source.result_type !== 'accommodation' || !source.tenant_subdomain) {
      return null
    }

    const chatUrl = `https://${source.tenant_subdomain}.muva.chat/with-me`

    return (
      <a
        href={chatUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1 text-sm text-teal-600 hover:text-teal-700 hover:underline"
      >
        Chatear con {source.tenant_name}
        <ExternalLink className="w-3 h-3" />
      </a>
    )
  }

  return (
    <div className="bg-white min-h-screen" role="main">
      {/* Header */}
      <header
        className="fixed top-0 left-0 right-0 z-50 bg-gradient-to-r from-teal-600 to-teal-500 shadow-md"
        style={{ paddingTop: 'env(safe-area-inset-top)' }}
      >
        <div className="flex items-center justify-between px-4 h-16">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
              <span className="text-white font-bold text-lg">M</span>
            </div>
            <div>
              <h1 className="text-white font-semibold text-lg">MUVA Chat</h1>
              <p className="text-white/80 text-xs">Descubre San Andrés</p>
            </div>
          </div>

          <button
            onClick={handleNewConversation}
            className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-full transition-colors"
            aria-label="Nueva conversación"
          >
            <RotateCcw className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Messages */}
      <div
        ref={messagesContainerRef}
        className="fixed overflow-y-auto px-4 bg-gradient-to-b from-teal-50 to-white"
        style={{
          top: 'calc(64px + env(safe-area-inset-top))',
          bottom: 'calc(80px + env(safe-area-inset-bottom))',
          left: 0,
          right: 0,
          paddingTop: '2rem',
          paddingBottom: '1rem'
        }}
        role="log"
        aria-live="polite"
      >
        <div className="space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${
                message.role === 'user' ? 'justify-end' : 'justify-start'
              }`}
            >
              <div className="max-w-[85%] flex flex-col gap-2">
                <div
                  className={`rounded-2xl px-4 py-3 ${
                    message.role === 'user'
                      ? 'bg-teal-500 text-white rounded-br-sm shadow-md'
                      : 'bg-white text-gray-900 rounded-bl-sm shadow-sm border border-gray-100'
                  }`}
                >
                  {message.role === 'assistant' ? (
                    <>
                      {!message.content && loading && message.id !== 'welcome' ? (
                        <div className="flex gap-1">
                          <div className="w-2 h-2 bg-teal-400 rounded-full animate-bounce" />
                          <div className="w-2 h-2 bg-teal-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                          <div className="w-2 h-2 bg-teal-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                        </div>
                      ) : message.id === 'welcome' ? (
                        <div
                          className="text-base leading-[1.6]"
                          dangerouslySetInnerHTML={{ __html: getWelcomeHTML() }}
                        />
                      ) : (
                        <div className="text-base leading-[1.6] prose prose-sm max-w-none">
                          <ReactMarkdown
                            remarkPlugins={[remarkGfm]}
                            components={{
                              ul: ({node, ...props}) => <ul className="list-disc list-inside mb-2 space-y-1" {...props} />,
                              ol: ({node, ...props}) => <ol className="list-decimal list-inside mb-2 space-y-1" {...props} />,
                              li: ({node, ...props}) => <li className="ml-2" {...props} />,
                              strong: ({node, ...props}) => <strong className="font-semibold text-gray-900" {...props} />,
                            }}
                          >
                            {message.content}
                          </ReactMarkdown>
                        </div>
                      )}
                    </>
                  ) : (
                    <p className="text-base whitespace-pre-wrap leading-[1.6]">
                      {message.content}
                    </p>
                  )}
                </div>

                {/* Sources with tenant links */}
                {message.role === 'assistant' && message.sources && message.sources.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-1">
                    {message.sources
                      .filter(s => s.result_type === 'accommodation' && s.tenant_subdomain)
                      .slice(0, 3) // Limit to 3 tenant links
                      .map((source, idx) => (
                        <div
                          key={idx}
                          className="bg-teal-50 border border-teal-200 rounded-lg px-3 py-2"
                        >
                          <p className="text-xs text-gray-600 mb-1">{source.title}</p>
                          {renderTenantLink(source)}
                        </div>
                      ))
                    }
                  </div>
                )}

                <p className="text-xs text-gray-500 px-1">
                  {message.timestamp.toLocaleTimeString('es-CO', {
                    hour: 'numeric',
                    minute: '2-digit'
                  })}
                </p>
              </div>
            </div>
          ))}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="fixed bottom-[calc(80px+env(safe-area-inset-bottom))] left-0 right-0 z-40 bg-red-50 border-t border-red-200 p-3 shadow-lg">
          <div className="flex items-center justify-between max-w-lg mx-auto">
            <p className="text-sm text-red-700 flex-1">{error}</p>
            <div className="flex gap-2">
              <button
                onClick={retryLastMessage}
                className="text-sm text-red-600 hover:text-red-800 font-medium underline"
              >
                Reintentar
              </button>
              <button
                onClick={() => setError(null)}
                className="text-sm text-red-400 hover:text-red-600 font-medium"
              >
                ✕
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Input */}
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-100 px-4 pt-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
        <div className="flex gap-2 items-end">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Pregunta sobre San Andrés..."
            disabled={loading}
            maxLength={500}
            aria-label="Mensaje"
            className="flex-1 resize-none rounded-xl border border-gray-300
                       focus:border-teal-500 focus:ring-2 focus:ring-teal-500/30 focus:outline-none
                       px-4 py-3 text-base
                       disabled:bg-gray-50 disabled:text-gray-400
                       transition-all duration-200"
            rows={1}
          />

          <button
            onClick={sendMessage}
            disabled={!input.trim() || loading}
            aria-label="Enviar mensaje"
            className="bg-gradient-to-r from-teal-600 to-teal-500 text-white rounded-xl
                       w-11 h-11
                       flex items-center justify-center
                       hover:shadow-lg
                       disabled:bg-gray-300 disabled:cursor-not-allowed
                       transition-all duration-200"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  )
}
