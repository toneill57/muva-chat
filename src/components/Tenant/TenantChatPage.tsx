'use client'

import React, { useState, useEffect, useRef, lazy, Suspense } from 'react'
import remarkGfm from 'remark-gfm'
import { getWelcomeMessageHTML } from '@/lib/welcome-message-static'
import TenantHeader from './TenantHeader'
import SuggestionButton from './SuggestionButton'
import ErrorRetryButton from './ErrorRetryButton'
import ErrorCloseButton from './ErrorCloseButton'
import SendMessageButton from './SendMessageButton'

const ReactMarkdown = lazy(() => import('react-markdown'))
const DevPhotoCarousel = lazy(() => import('../Dev/DevPhotoCarousel'))
const DevAvailabilityCTA = lazy(() => import('../Dev/DevAvailabilityCTA'))
const DevIntentSummary = lazy(() => import('../Dev/DevIntentSummary'))

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
  sources?: Array<{
    unit_name?: string
    photos?: string[]
  }>
  travel_intent?: {
    check_in_date?: string
    check_out_date?: string
    num_guests?: number
    accommodation_type?: string
  }
  availability_url?: string
  suggestions?: string[]
}

// Constants
const PULL_TO_REFRESH_THRESHOLD = 80 // pixels to trigger pull-to-refresh
const PULL_ANIMATION_DURATION = 300 // ms for scroll animation

interface TenantChatPageProps {
  subdomain: string
  tenant: {
    tenant_id: string
    business_name: string
    logo_url: string | null
    primary_color: string
  }
}

export default function TenantChatPage({ subdomain, tenant }: TenantChatPageProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [tenantId, setTenantId] = useState<string | null>(null)
  const [isPulling, setIsPulling] = useState(false)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const messagesContainerRef = useRef<HTMLDivElement>(null)
  const pullStartY = useRef<number>(0)

  // Set tenant_id from props
  useEffect(() => {
    setTenantId(tenant.tenant_id)
    console.log('[tenant] Using tenant_id from props:', tenant.tenant_id)
  }, [tenant.tenant_id])

  useEffect(() => {
    const storedSessionId = localStorage.getItem('dev_chat_session_id')
    if (storedSessionId) {
      setSessionId(storedSessionId)
    }
  }, [])

  useEffect(() => {
    // Only scroll for messages AFTER welcome message (length > 1)
    // Welcome message (length === 1) stays at natural position with padding-top
    if (messages.length > 1) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages])

  useEffect(() => {
    if (messages.length === 0) {
      const welcomeMessage: Message = {
        id: 'welcome',
        role: 'assistant',
        content: '', // Empty - will use static HTML instead
        timestamp: new Date()
      }
      setMessages([welcomeMessage])
    }
  }, [messages.length])


  const handleNewConversation = async () => {
    localStorage.removeItem('dev_chat_session_id')

    try {
      const response = await fetch('/api/dev/reset-session', {
        method: 'POST',
      })

      if (response.ok) {
        console.log('[reset] Session cookie expired by backend')
      } else {
        console.warn('[reset] Failed to expire session cookie')
      }
    } catch (error) {
      console.error('[reset] Error calling reset-session API:', error)
    }

    setSessionId(null)
    setMessages([])
    setError(null)
    console.log('[reset] State cleared, ready for new conversation')
  }

  const sendMessage = async () => {
    if (!input.trim() || loading || !tenantId) return

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
      const response = await fetch('/api/dev/chat?stream=true', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: messageText,
          session_id: sessionId,
          tenant_id: tenantId
        })
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error('[DevChatMobileDev] API Error:', {
          status: response.status,
          statusText: response.statusText,
          error: errorText
        })
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
                console.log('[chat] Stream completed')

                if (data.session_id) {
                  setSessionId(data.session_id)
                  localStorage.setItem('dev_chat_session_id', data.session_id)
                }

                if (data.sources || data.suggestions || data.availability_url) {
                  setMessages(prev =>
                    prev.map(msg =>
                      msg.id === assistantId
                        ? {
                            ...msg,
                            sources: data.sources,
                            suggestions: data.suggestions,
                            availability_url: data.availability_url,
                            travel_intent: data.travel_intent
                          }
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

  const handleSuggestionClick = (suggestion: string) => {
    setInput(suggestion)
    inputRef.current?.focus()
  }

  const retryLastMessage = () => {
    const lastUserMessage = [...messages].reverse().find(m => m.role === 'user')
    if (lastUserMessage) {
      setInput(lastUserMessage.content)
      setError(null)
      inputRef.current?.focus()
    }
  }

  // Helper: Extract photos from message sources
  const getPhotosFromSources = (sources: Message['sources']) => {
    if (!sources) return []
    return sources
      .filter(s => s.photos && s.photos.length > 0)
      .flatMap(s => s.photos!.map(url => ({
        url,
        caption: s.unit_name
      })))
  }

  const handleTouchStart = (e: React.TouchEvent) => {
    if (messagesContainerRef.current?.scrollTop === 0) {
      pullStartY.current = e.touches[0].clientY
    }
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    if (pullStartY.current === 0) return

    const currentY = e.touches[0].clientY
    const diff = currentY - pullStartY.current

    if (diff > PULL_TO_REFRESH_THRESHOLD && !isPulling) {
      setIsPulling(true)
    }
  }

  const handleTouchEnd = () => {
    if (isPulling) {
      messagesContainerRef.current?.scrollTo({ top: 0, behavior: 'smooth' })
      setTimeout(() => setIsPulling(false), PULL_ANIMATION_DURATION)
    }
    pullStartY.current = 0
  }

  return (
    <div className="bg-white" role="main">
      {/* Header */}
      <TenantHeader
        tenant={tenant}
        onNewConversation={handleNewConversation}
      />

      {/* Messages */}
      <div
        ref={messagesContainerRef}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        className="fixed overflow-y-auto px-4 bg-gradient-to-b from-amber-50 to-white overscroll-behavior-contain scroll-smooth"
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
        aria-atomic="false"
      >
        {isPulling && (
          <div className="absolute top-[calc(64px+env(safe-area-inset-top)+0.5rem)] left-1/2 -translate-x-1/2 bg-white/90 backdrop-blur-sm rounded-full px-4 py-2 shadow-lg z-10">
            <p className="text-sm text-teal-600 font-medium">↓ Ir al inicio</p>
          </div>
        )}
        <div className="space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex animate-[messageIn_0.3s_ease-out] ${
                message.role === 'user' ? 'justify-end' : 'justify-start'
              }`}
            >
              {/* Message Content */}
              <div className={`max-w-[85%] flex flex-col gap-2`}>
                <div
                  className={`rounded-2xl px-4 py-3 ${
                    message.role === 'user'
                      ? 'bg-blue-500 text-white rounded-br-sm shadow-md'
                      : 'bg-white text-gray-900 rounded-bl-sm shadow-sm border border-gray-100'
                  }`}
                >
                  {message.role === 'assistant' ? (
                    <>
                      {!message.content && loading && message.id !== 'welcome' ? (
                        <div className="flex gap-1">
                          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                        </div>
                      ) : message.id === 'welcome' ? (
                        /* Welcome message: Dynamic HTML with tenant branding */
                        <div
                          className="text-base leading-[1.6]"
                          dangerouslySetInnerHTML={{ __html: getWelcomeMessageHTML(tenant.business_name) }}
                        />
                      ) : (
                        /* Dynamic messages: Lazy-loaded ReactMarkdown */
                        <div className="text-base leading-[1.6]">
                          <Suspense fallback={<div className="text-base text-gray-600">{message.content}</div>}>
                            <ReactMarkdown
                              remarkPlugins={[remarkGfm]}
                              components={{
                                ul: ({node, ...props}) => <ul className="list-disc list-inside mb-2 space-y-1 marker:text-xs marker:text-gray-400" {...props} />,
                                ol: ({node, ...props}) => <ol className="list-decimal list-inside mb-2 space-y-1 marker:text-xs marker:text-gray-400" {...props} />,
                                li: ({node, ...props}) => <li className="ml-2" {...props} />,
                                hr: ({node, ...props}) => <hr className="my-3 border-gray-300" {...props} />,
                                strong: ({node, ...props}) => <strong className="font-semibold text-gray-900" {...props} />,
                              }}
                            >
                              {message.content}
                            </ReactMarkdown>
                          </Suspense>
                        </div>
                      )}
                    </>
                  ) : (
                    <p className="text-base whitespace-pre-wrap leading-[1.6] text-white">
                      {message.content}
                    </p>
                  )}
                </div>

                {/* Photo Carousel */}
                {message.role === 'assistant' && message.sources && (
                  <>
                    {getPhotosFromSources(message.sources).length > 0 && (
                      <Suspense fallback={<div className="text-sm text-gray-500">Loading photos...</div>}>
                        <DevPhotoCarousel photos={getPhotosFromSources(message.sources)} />
                      </Suspense>
                    )}
                  </>
                )}

                {/* Suggestions */}
                {message.role === 'assistant' && message.suggestions && message.suggestions.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {message.suggestions.map((suggestion, idx) => (
                      <SuggestionButton
                        key={idx}
                        suggestion={suggestion}
                        onClick={handleSuggestionClick}
                      />
                    ))}
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
              <ErrorRetryButton onClick={retryLastMessage} />
              <ErrorCloseButton onClick={() => setError(null)} />
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
            placeholder="Type your message..."
            disabled={loading}
            maxLength={2000}
            aria-label="Message input"
            className="flex-1 resize-none rounded-xl border border-gray-300
                       focus:border-teal-500 focus:ring-2 focus:ring-teal-500/30 focus:outline-none
                       px-4 py-3 text-base
                       disabled:bg-gray-50 disabled:text-gray-400
                       transition-all duration-200"
            rows={1}
          />

          <SendMessageButton
            onClick={sendMessage}
            disabled={!input.trim() || loading || !tenantId}
            primaryColor={tenant.primary_color}
          />
        </div>
      </div>
    </div>
  )
}
