'use client'

import React, { useState, useEffect, useRef, lazy, Suspense, memo, useCallback, useMemo } from 'react'
import { Send, Bot, User, RotateCcw } from 'lucide-react'

// Lazy load heavy components to reduce initial bundle size and improve TTI
const ReactMarkdown = lazy(() => import('react-markdown'))
const DevPhotoCarousel = lazy(() => import('../Dev/DevPhotoCarousel'))
const DevAvailabilityCTA = lazy(() => import('../Dev/DevAvailabilityCTA'))
const DevIntentSummary = lazy(() => import('../Dev/DevIntentSummary'))

// Import remarkGfm dynamically within component
// This prevents loading it on initial page load

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

export default function ChatMobile() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [remarkGfmPlugin, setRemarkGfmPlugin] = useState<any>(null)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  // Dynamically load remarkGfm plugin after component mounts
  useEffect(() => {
    import('remark-gfm').then((module) => {
      setRemarkGfmPlugin(() => module.default)
    })
  }, [])

  // Load session ID from localStorage
  useEffect(() => {
    const storedSessionId = localStorage.getItem('public_chat_session_id')
    if (storedSessionId) {
      setSessionId(storedSessionId)
    }
  }, [])

  // Auto-focus input on mount for accessibility
  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  // Debounced auto-resize for textarea (performance optimization)
  const handleTextareaResize = (e: React.FormEvent<HTMLTextAreaElement>) => {
    const target = e.target as HTMLTextAreaElement
    target.style.height = 'auto'
    target.style.height = Math.min(target.scrollHeight, 128) + 'px'
  }

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Add welcome message on first load
  useEffect(() => {
    if (messages.length === 0) {
      const welcomeMessage: Message = {
        id: 'welcome',
        role: 'assistant',
        content: 'Welcome to Simmer Down! 🌴\n\nI\'m here to help you find the perfect accommodation in the beautiful Colombian Caribbean. Feel free to ask me about our rooms, availability, or anything else!',
        timestamp: new Date()
      }
      setMessages([welcomeMessage])
    }
  }, [messages.length])

  const handleNewConversation = useCallback(async () => {
    // Clear session from localStorage
    localStorage.removeItem('public_chat_session_id')

    // Call backend to expire HttpOnly session cookie
    try {
      const response = await fetch('/api/public/reset-session', {
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

    // Reset state
    setSessionId(null)
    setMessages([])
    setError(null)
    console.log('[reset] State cleared, ready for new conversation')
    // Welcome message will be added automatically by the useEffect
  }, [])

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

    // Create placeholder assistant message
    const assistantId = `assistant-${Date.now()}`
    const assistantMessage: Message = {
      id: assistantId,
      role: 'assistant',
      content: '',
      timestamp: new Date()
    }

    setMessages(prev => [...prev, assistantMessage])

    try {
      // Use streaming API
      const response = await fetch('/api/public/chat?stream=true', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: messageText,
          session_id: sessionId,
          tenant_id: 'simmerdown'
        })
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error('[ChatMobile] API Error:', {
          status: response.status,
          statusText: response.statusText,
          error: errorText
        })
        throw new Error(`Failed to send message: ${response.status} ${errorText}`)
      }

      // Handle streaming response
      const reader = response.body?.getReader()
      const decoder = new TextDecoder()

      if (!reader) {
        throw new Error('No reader available')
      }

      let fullContent = ''

      while (true) {
        const { done, value } = await reader.read()

        if (done) break

        // Decode chunk and parse SSE format
        const chunk = decoder.decode(value)
        const lines = chunk.split('\n')

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.substring(6))

              if (data.type === 'chunk') {
                fullContent += data.content

                // Update message with new content
                setMessages(prev =>
                  prev.map(msg =>
                    msg.id === assistantId
                      ? { ...msg, content: fullContent }
                      : msg
                  )
                )
              } else if (data.type === 'done') {
                console.log('[chat] Stream completed')

                // Save session_id if returned
                if (data.session_id) {
                  setSessionId(data.session_id)
                  localStorage.setItem('public_chat_session_id', data.session_id)
                }

                // Update message with additional metadata (sources, suggestions, etc.)
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

      // Stream complete
      setLoading(false)

    } catch (err) {
      console.error('Chat error:', err)
      const errorMessage = err instanceof Error ? err.message : 'Failed to send message'
      setError(errorMessage)

      // Remove failed message
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

  const handleSuggestionClick = useCallback((suggestion: string) => {
    setInput(suggestion)
    inputRef.current?.focus()
  }, [])

  const retryLastMessage = useCallback(() => {
    const lastUserMessage = [...messages].reverse().find(m => m.role === 'user')
    if (lastUserMessage) {
      setInput(lastUserMessage.content)
      setError(null)
      inputRef.current?.focus()
    }
  }, [messages])

  // Memoize markdown components to prevent re-renders
  const markdownComponents = useMemo(() => ({
    h1: ({node, ...props}: any) => <h1 className="text-lg font-bold mb-2 text-gray-900" {...props} />,
    h2: ({node, ...props}: any) => <h2 className="text-base font-bold mb-2 text-gray-900" {...props} />,
    h3: ({node, ...props}: any) => <h3 className="text-sm font-bold mb-1 text-gray-900" {...props} />,
    p: ({node, ...props}: any) => <p className="mb-2 last:mb-0" {...props} />,
    ul: ({node, ...props}: any) => <ul className="list-disc list-inside mb-2 space-y-1" {...props} />,
    ol: ({node, ...props}: any) => <ol className="list-decimal list-inside mb-2 space-y-1" {...props} />,
    li: ({node, ...props}: any) => <li className="ml-2" {...props} />,
    strong: ({node, ...props}: any) => <strong className="font-semibold text-gray-900" {...props} />,
    em: ({node, ...props}: any) => <em className="italic" {...props} />,
    a: ({node, ...props}: any) => <a className="text-teal-600 hover:underline" {...props} />,
    code: ({node, ...props}: any) => <code className="bg-gray-100 px-1 py-0.5 rounded text-xs font-mono" {...props} />,
  }), [])

  return (
    <div
      className="h-[100dvh] w-screen overflow-hidden bg-white relative"
      role="main"
      aria-label="Chat conversation"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0
      }}
    >
      {/* Header fijo con safe area top (notch) */}
      <header
        className="fixed top-0 left-0 right-0 z-50
                   pt-[env(safe-area-inset-top)]
                   bg-gradient-to-r from-teal-500 via-cyan-500 to-teal-600
                   text-white shadow-md"
        role="banner"
      >
        <div className="h-[60px] flex items-center justify-between px-4 gap-2">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center flex-shrink-0" aria-hidden="true">
              <Bot className="w-6 h-6" />
            </div>
            <h1 className="font-bold text-lg truncate">Simmer Down Chat</h1>
          </div>

          <button
            onClick={handleNewConversation}
            className="p-2 hover:bg-white/20 rounded-lg transition-colors flex-shrink-0"
            aria-label="New conversation"
            title="Start new conversation"
          >
            <RotateCcw className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Messages scrollable con safe areas y smooth scroll */}
      <div
        className="absolute overflow-y-auto overflow-x-hidden px-4
                   bg-gradient-to-b from-amber-50 to-white
                   touch-pan-y"
        style={{
          top: 'calc(60px + env(safe-area-inset-top))',
          bottom: 'calc(80px + env(safe-area-inset-bottom))',
          left: 0,
          right: 0,
          WebkitOverflowScrolling: 'touch',
          overscrollBehaviorY: 'none',
          touchAction: 'pan-y'
        }}
        role="log"
        aria-live="polite"
        aria-atomic="false"
        aria-label="Chat messages"
      >
        <div className="flex flex-col min-h-full justify-end">
          <div className="space-y-4 py-4">
          {messages.map((message, index) => (
            <div
              key={message.id}
              className={`flex gap-3 animate-message-in ${
                message.role === 'user' ? 'flex-row-reverse' : 'flex-row'
              }`}
              style={{
                animationDelay: `${index * 50}ms`,
                willChange: index === messages.length - 1 ? 'transform, opacity' : 'auto'
              }}
              role="article"
              aria-label={`${message.role === 'user' ? 'Your message' : 'Assistant message'} at ${message.timestamp.toLocaleTimeString()}`}
            >
              {/* Avatar */}
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                  message.role === 'user'
                    ? 'bg-blue-500 text-white'
                    : 'bg-gradient-to-br from-teal-400 to-cyan-500 text-white'
                }`}
                aria-hidden="true"
              >
                {message.role === 'user' ? (
                  <User className="w-5 h-5" />
                ) : (
                  <Bot className="w-5 h-5" />
                )}
              </div>

              {/* Message Content */}
              <div
                className={`flex-1 max-w-[80%] ${
                  message.role === 'user' ? 'items-end' : 'items-start'
                } flex flex-col gap-2`}
              >
                <div
                  className={`rounded-2xl px-4 py-3 shadow-sm ${
                    message.role === 'user'
                      ? 'bg-blue-500 text-white rounded-br-sm'
                      : 'bg-white text-gray-900 rounded-bl-sm border border-gray-100'
                  }`}
                >
                  {message.role === 'assistant' ? (
                    <>
                      {!message.content && loading ? (
                        // Typing dots while waiting for first chunk
                        <div className="flex gap-1">
                          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                        </div>
                      ) : (
                        <div className="text-sm leading-relaxed markdown-content transition-opacity duration-150">
                          <Suspense fallback={<div className="text-sm text-gray-600">{message.content}</div>}>
                            <ReactMarkdown
                              remarkPlugins={remarkGfmPlugin ? [remarkGfmPlugin] : []}
                              components={markdownComponents}
                            >
                              {message.content}
                            </ReactMarkdown>
                          </Suspense>
                          {loading && message.content && (
                            <span className="inline-block w-2 h-4 bg-gray-900 ml-0.5 animate-pulse" />
                          )}
                        </div>
                      )}
                    </>
                  ) : (
                    <p className="text-sm whitespace-pre-wrap leading-relaxed text-white">
                      {message.content}
                    </p>
                  )}
                </div>

                {/* Photo Carousel */}
                {message.role === 'assistant' && message.sources && (
                  <>
                    {(() => {
                      const photos = message.sources
                        .filter(s => s.photos && s.photos.length > 0)
                        .flatMap(s => s.photos!.map(url => ({
                          url,
                          caption: s.unit_name
                        })))
                      return photos.length > 0 ? (
                        <Suspense fallback={<div className="text-sm text-gray-500">Loading photos...</div>}>
                          <DevPhotoCarousel photos={photos} />
                        </Suspense>
                      ) : null
                    })()}
                  </>
                )}

                {/* Follow-up Suggestions */}
                {message.role === 'assistant' && message.suggestions && message.suggestions.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2" role="group" aria-label="Suggested follow-up questions">
                    {message.suggestions.map((suggestion, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleSuggestionClick(suggestion)}
                        className="px-3 py-1.5 bg-teal-50 hover:bg-teal-100
                                   text-teal-700 text-sm rounded-full
                                   border border-teal-200
                                   transition-all duration-200
                                   hover:scale-105 active:scale-95
                                   focus:ring-2 focus:ring-teal-500 focus:outline-none"
                        aria-label={`Ask: ${suggestion}`}
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                )}

                <p className="text-xs text-gray-400 px-1">
                  {message.timestamp.toLocaleTimeString('en-US', {
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
      </div>

      {/* Error Banner */}
      {error && (
        <div
          className="fixed left-0 right-0 z-40 bg-red-50 border-t border-red-200 p-3"
          style={{ top: 'calc(60px + env(safe-area-inset-top))' }}
          role="alert"
          aria-live="assertive"
        >
          <div className="flex items-center justify-between max-w-lg mx-auto">
            <p className="text-sm text-red-700 flex-1" id="error-message">{error}</p>
            <button
              onClick={retryLastMessage}
              className="text-sm text-red-600 hover:text-red-800 font-medium underline ml-3 whitespace-nowrap
                         focus:ring-2 focus:ring-red-500 focus:outline-none rounded px-2 py-1"
              aria-label="Retry sending last message"
              aria-describedby="error-message"
            >
              Retry
            </button>
          </div>
        </div>
      )}

      {/* Input fijo con safe area bottom (home bar) */}
      <div
        className="fixed bottom-0 left-0 right-0 z-50
                   bg-white border-t border-gray-200
                   pb-[env(safe-area-inset-bottom)]"
        style={{ touchAction: 'none' }}
      >
        <div className="p-4">
        <div className="flex gap-2 items-end">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type your message..."
            disabled={loading}
            maxLength={2000}
            aria-label="Type your message"
            aria-describedby="message-input-help"
            className="flex-1 resize-none rounded-xl border border-gray-300
                       focus:border-teal-500 focus:ring-2 focus:ring-teal-500/30 focus:outline-none
                       px-4 py-3 text-base
                       disabled:bg-gray-50 disabled:text-gray-400
                       transition-all duration-200
                       max-h-32 min-h-[48px]"
            rows={1}
            style={{
              height: 'auto',
              minHeight: '48px',
              maxHeight: '128px',
              fontSize: '16px'  // Explicit 16px to prevent iOS auto-zoom
            }}
            onInput={handleTextareaResize}
          />
          <span id="message-input-help" className="sr-only">
            Press Enter to send, Shift+Enter for new line. Maximum 2000 characters.
          </span>

          <button
            onClick={sendMessage}
            disabled={!input.trim() || loading}
            className="bg-gradient-to-r from-teal-500 to-cyan-600
                       text-white rounded-xl
                       w-11 h-11 min-w-[44px] min-h-[44px]
                       flex items-center justify-center
                       touch-manipulation
                       hover:shadow-lg hover:scale-105
                       active:scale-95
                       disabled:bg-gray-300 disabled:cursor-not-allowed
                       disabled:hover:scale-100 disabled:hover:shadow-none
                       focus:ring-2 focus:ring-teal-500 focus:outline-none
                       transition-transform duration-200
                       flex-shrink-0"
            aria-label="Send message"
            type="button"
          >
            <Send className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>
        </div>
      </div>
    </div>
  )
}
