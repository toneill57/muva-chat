'use client'

import React, { useState, useEffect, useRef } from 'react'
import { X, Minimize2, Send, Bot, User, RotateCcw } from 'lucide-react'
import IntentSummary from './IntentSummary'
import PhotoCarousel from './PhotoCarousel'
import AvailabilityCTA from './AvailabilityCTA'
import {
  trackMessageSent,
  trackIntentCaptured,
  trackSuggestionClick,
  trackChatError,
  trackChatMinimized,
  trackChatClosed
} from '@/lib/analytics'

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

interface PublicChatInterfaceProps {
  onMinimize: () => void
  isExpanded: boolean
}

export default function PublicChatInterface({ onMinimize, isExpanded }: PublicChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [currentIntent, setCurrentIntent] = useState<Message['travel_intent']>({})

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  // Load session ID from localStorage
  useEffect(() => {
    const storedSessionId = localStorage.getItem('public_chat_session_id')
    if (storedSessionId) {
      setSessionId(storedSessionId)
    }
  }, [])

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Focus input when expanded
  useEffect(() => {
    if (isExpanded) {
      inputRef.current?.focus()
    }
  }, [isExpanded])

  // Add welcome message on first load
  useEffect(() => {
    if (messages.length === 0 && isExpanded) {
      const welcomeMessage: Message = {
        id: 'welcome',
        role: 'assistant',
        content: 'Welcome to Simmer Down! 🌴\n\nI\'m here to help you find the perfect accommodation in the beautiful Colombian Caribbean. Feel free to ask me about our rooms, availability, or anything else!',
        timestamp: new Date(),
        suggestions: [
          'Show me your rooms',
          'What are your rates?',
          'I need a room for 2 people in December'
        ]
      }
      setMessages([welcomeMessage])
    }
  }, [isExpanded, messages.length])

  const handleNewConversation = () => {
    // Clear session from localStorage
    localStorage.removeItem('public_chat_session_id')
    // Reset state
    setSessionId(null)
    setMessages([])
    setCurrentIntent({})
    setError(null)
    // Welcome message will be added automatically by the useEffect
  }

  const sendMessage = async () => {
    if (!input.trim() || loading) return

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: input.trim(),
      timestamp: new Date()
    }

    setMessages(prev => {
      const newMessages = [...prev, userMessage]
      // Track message sent (count only user messages)
      const userMessageCount = newMessages.filter(m => m.role === 'user').length
      trackMessageSent(sessionId, userMessageCount)
      return newMessages
    })
    setInput('')
    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/public/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: input.trim(),
          session_id: sessionId,
          tenant_id: 'simmerdown'
        })
      })

      if (!response.ok) {
        throw new Error('Failed to send message')
      }

      const data = await response.json()

      if (data.success && data.data) {
        // Store session ID
        if (data.data.session_id && !sessionId) {
          setSessionId(data.data.session_id)
          localStorage.setItem('public_chat_session_id', data.data.session_id)
        }

        // Update current intent
        if (data.data.travel_intent) {
          const newIntent = {
            ...currentIntent,
            ...data.data.travel_intent
          }
          setCurrentIntent(newIntent)

          // Track intent captured
          trackIntentCaptured(newIntent)
        }

        // Parse photos from sources
        const photos = data.data.sources
          ?.filter((s: any) => s.photos && s.photos.length > 0)
          .flatMap((s: any) => s.photos.map((url: string) => ({
            url,
            caption: s.unit_name || s.title
          }))) || []

        const assistantMessage: Message = {
          id: `assistant-${Date.now()}`,
          role: 'assistant',
          content: data.data.response,
          timestamp: new Date(),
          sources: data.data.sources,
          travel_intent: data.data.travel_intent,
          availability_url: data.data.availability_url,
          suggestions: data.data.suggestions
        }

        setMessages(prev => [...prev, assistantMessage])
      } else {
        throw new Error(data.error?.message || 'Unknown error')
      }
    } catch (err) {
      console.error('Chat error:', err)
      const errorMessage = err instanceof Error ? err.message : 'Failed to send message'
      setError(errorMessage)

      // Track error
      trackChatError('api_error', errorMessage)
    } finally {
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

    // Track suggestion click
    trackSuggestionClick(suggestion)
  }

  const handleMinimize = () => {
    trackChatMinimized()
    onMinimize()
  }

  const handleClose = () => {
    trackChatClosed()
    onMinimize()
  }

  const retryLastMessage = () => {
    const lastUserMessage = [...messages].reverse().find(m => m.role === 'user')
    if (lastUserMessage) {
      setInput(lastUserMessage.content)
      setError(null)
    }
  }

  if (!isExpanded) return null

  return (
    <div
      className="fixed z-[9998] bg-white rounded-2xl shadow-2xl
                 flex flex-col overflow-hidden
                 animate-scale-in
                 bottom-5 right-5
                 w-[400px] h-[600px]
                 md:bottom-8 md:right-8
                 max-md:inset-0 max-md:rounded-none max-md:w-full max-md:h-full"
      role="dialog"
      aria-label="Chat interface"
    >
      {/* Header */}
      <div className="bg-gradient-to-r from-teal-500 via-cyan-500 to-teal-600
                      text-white p-4 flex items-center justify-between
                      shadow-md">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
            <Bot className="w-6 h-6" />
          </div>
          <div>
            <h2 className="font-bold text-lg">Simmer Down Chat</h2>
            <p className="text-xs text-teal-100">We typically reply instantly</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleNewConversation}
            className="p-2 hover:bg-white/20 rounded-lg transition-colors"
            aria-label="New conversation"
            title="Start new conversation"
          >
            <RotateCcw className="w-5 h-5" />
          </button>
          <button
            onClick={handleMinimize}
            className="p-2 hover:bg-white/20 rounded-lg transition-colors"
            aria-label="Minimize chat"
          >
            <Minimize2 className="w-5 h-5" />
          </button>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-white/20 rounded-lg transition-colors"
            aria-label="Close chat"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Intent Summary */}
      {currentIntent && Object.keys(currentIntent).length > 0 && (
        <div className="p-3 border-b border-gray-100">
          <IntentSummary intent={currentIntent} />
        </div>
      )}

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gradient-to-b from-sand-50 to-white">
        {messages.map((message, index) => (
          <div
            key={message.id}
            className={`flex gap-3 animate-message-in ${
              message.role === 'user' ? 'flex-row-reverse' : 'flex-row'
            }`}
            style={{ animationDelay: `${index * 50}ms` }}
          >
            {/* Avatar */}
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                message.role === 'user'
                  ? 'bg-blue-500 text-white'
                  : 'bg-gradient-to-br from-teal-400 to-cyan-500 text-white'
              }`}
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
                <p className="text-sm whitespace-pre-wrap leading-relaxed">
                  {message.content}
                </p>
              </div>

              {/* Photos */}
              {message.role === 'assistant' && message.sources && (
                <>
                  {(() => {
                    const photos = message.sources
                      .filter(s => s.photos && s.photos.length > 0)
                      .flatMap(s => s.photos!.map(url => ({
                        url,
                        caption: s.unit_name
                      })))
                    return photos.length > 0 ? <PhotoCarousel photos={photos} /> : null
                  })()}
                </>
              )}

              {/* Availability CTA */}
              {message.role === 'assistant' && message.availability_url && (
                <AvailabilityCTA
                  availabilityUrl={message.availability_url}
                  disabled={!currentIntent?.check_in_date || !currentIntent?.num_guests}
                  disabledReason="Please tell me your dates and number of guests first"
                />
              )}

              {/* Follow-up Suggestions */}
              {message.role === 'assistant' && message.suggestions && message.suggestions.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {message.suggestions.map((suggestion, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSuggestionClick(suggestion)}
                      className="px-3 py-1.5 bg-teal-50 hover:bg-teal-100
                                 text-teal-700 text-sm rounded-full
                                 border border-teal-200
                                 transition-all duration-200
                                 hover:scale-105 active:scale-95"
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

        {/* Typing Indicator */}
        {loading && (
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-teal-400 to-cyan-500
                            flex items-center justify-center">
              <Bot className="w-5 h-5 text-white" />
            </div>
            <div className="bg-white rounded-2xl rounded-bl-sm px-4 py-3 shadow-sm border border-gray-100">
              <div className="flex gap-1">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Error Banner */}
      {error && (
        <div className="bg-red-50 border-t border-red-200 p-3 flex items-center justify-between">
          <p className="text-sm text-red-700">{error}</p>
          <button
            onClick={retryLastMessage}
            className="text-sm text-red-600 hover:text-red-800 font-medium
                       underline transition-colors"
          >
            Retry
          </button>
        </div>
      )}

      {/* Input Area */}
      <div className="p-4 border-t border-gray-200 bg-white">
        <div className="flex gap-2 items-end">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type your message..."
            disabled={loading}
            className="flex-1 resize-none rounded-xl border border-gray-300
                       focus:border-teal-500 focus:ring-2 focus:ring-teal-200
                       px-4 py-3 text-sm
                       disabled:bg-gray-50 disabled:text-gray-400
                       transition-all duration-200
                       max-h-32 min-h-[48px]"
            rows={1}
            style={{
              height: 'auto',
              minHeight: '48px',
              maxHeight: '128px'
            }}
            onInput={(e) => {
              const target = e.target as HTMLTextAreaElement
              target.style.height = 'auto'
              target.style.height = Math.min(target.scrollHeight, 128) + 'px'
            }}
          />

          <button
            onClick={sendMessage}
            disabled={!input.trim() || loading}
            className="bg-gradient-to-r from-teal-500 to-cyan-600
                       text-white p-3 rounded-xl
                       hover:shadow-lg hover:scale-105
                       active:scale-95
                       disabled:bg-gray-300 disabled:cursor-not-allowed
                       disabled:hover:scale-100 disabled:hover:shadow-none
                       transition-all duration-200
                       flex-shrink-0"
            aria-label="Send message"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>

        <p className="text-xs text-gray-400 mt-2 text-center">
          Press Enter to send, Shift+Enter for new line
        </p>
      </div>
    </div>
  )
}
