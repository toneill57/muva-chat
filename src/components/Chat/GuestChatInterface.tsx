'use client'

import { useState, useRef, useEffect } from 'react'
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Send,
  Loader2,
  LogOut,
  User,
  Bot,
  Calendar,
  AlertCircle,
  RefreshCw,
  Menu,
  X,
} from "lucide-react"
import ReactMarkdown from 'react-markdown'
import { EntityBadge } from './EntityBadge'
import { FollowUpSuggestions } from './FollowUpSuggestions'
import ConversationList from './ConversationList'
import type { GuestChatInterfaceProps, GuestChatMessage, TrackedEntity } from '@/lib/guest-chat-types'

interface Conversation {
  id: string
  title: string
  last_message: string | null
  updated_at: string
}

/**
 * GuestChatInterface Component
 *
 * Complete conversational chat interface for guests
 * Features: Message history, entity tracking, follow-up suggestions, auto-scroll, responsive design
 */
export function GuestChatInterface({ session, token, onLogout }: GuestChatInterfaceProps) {
  const [messages, setMessages] = useState<GuestChatMessage[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingHistory, setIsLoadingHistory] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [trackedEntities, setTrackedEntities] = useState<Map<string, TrackedEntity>>(new Map())
  const [followUpSuggestions, setFollowUpSuggestions] = useState<string[]>([])

  // Multi-conversation state
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [activeConversationId, setActiveConversationId] = useState<string | null>(session.conversation_id)
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [isLoadingConversations, setIsLoadingConversations] = useState(true)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const scrollAreaRef = useRef<HTMLDivElement>(null)

  // Load conversations on mount
  useEffect(() => {
    loadConversations()
  }, [])

  // Load chat history when active conversation changes
  useEffect(() => {
    if (activeConversationId) {
      loadChatHistory()
    }
  }, [activeConversationId])

  // Auto-scroll to bottom when new message arrives
  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`
    }
  }, [input])

  const scrollToBottom = (behavior: ScrollBehavior = 'smooth') => {
    messagesEndRef.current?.scrollIntoView({ behavior })
  }

  const loadConversations = async () => {
    setIsLoadingConversations(true)

    try {
      const response = await fetch('/api/guest/conversations', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (!response.ok) {
        throw new Error('Error al cargar conversaciones')
      }

      const data = await response.json()
      setConversations(data.conversations || [])
    } catch (err) {
      console.error('Error loading conversations:', err)
    } finally {
      setIsLoadingConversations(false)
    }
  }

  const handleNewConversation = async () => {
    try {
      const response = await fetch('/api/guest/conversations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: 'Nueva conversación',
        }),
      })

      if (!response.ok) {
        throw new Error('Error al crear conversación')
      }

      const data = await response.json()

      // Add new conversation to list
      const newConversation: Conversation = {
        id: data.conversation.id,
        title: data.conversation.title,
        last_message: data.conversation.last_message,
        updated_at: data.conversation.updated_at,
      }

      setConversations((prev) => [newConversation, ...prev])
      setActiveConversationId(data.conversation.id)

      // Clear current messages
      setMessages([])
      setTrackedEntities(new Map())
      setFollowUpSuggestions([])

      // Close sidebar on mobile
      setIsSidebarOpen(false)
    } catch (err) {
      console.error('Error creating conversation:', err)
      setError('No se pudo crear la conversación')
    }
  }

  const handleSelectConversation = (conversationId: string) => {
    setActiveConversationId(conversationId)

    // Clear current state
    setMessages([])
    setTrackedEntities(new Map())
    setFollowUpSuggestions([])

    // Close sidebar on mobile
    setIsSidebarOpen(false)
  }

  const handleDeleteConversation = async (conversationId: string) => {
    try {
      const response = await fetch(`/api/guest/conversations/${conversationId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (!response.ok) {
        throw new Error('Error al eliminar conversación')
      }

      // Remove from list
      setConversations((prev) => prev.filter((c) => c.id !== conversationId))

      // If deleted conversation was active, select another
      if (conversationId === activeConversationId) {
        const remaining = conversations.filter((c) => c.id !== conversationId)
        if (remaining.length > 0) {
          setActiveConversationId(remaining[0].id)
          // Messages will be loaded automatically by useEffect
        } else {
          setActiveConversationId(null)
          setMessages([])
          setTrackedEntities(new Map())
          setFollowUpSuggestions([])
        }
      }
    } catch (err) {
      console.error('Error deleting conversation:', err)
      setError('No se pudo eliminar la conversación')
    }
  }

  const loadChatHistory = async () => {
    if (!activeConversationId) return

    setIsLoadingHistory(true)
    setError(null)

    try {
      const response = await fetch(
        `/api/guest/chat/history?conversation_id=${activeConversationId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      )

      if (!response.ok) {
        throw new Error('Error al cargar el historial')
      }

      const data = await response.json()

      // Convert API messages to GuestChatMessage format
      const historyMessages: GuestChatMessage[] = data.messages.map((msg: any) => ({
        id: msg.id,
        role: msg.role,
        content: msg.content,
        timestamp: new Date(msg.created_at),
        entities: msg.entities || [],
      }))

      setMessages(historyMessages)

      // Extract entities from history
      historyMessages.forEach((msg) => {
        if (msg.entities) {
          msg.entities.forEach((entity) => {
            updateTrackedEntity(entity)
          })
        }
      })

      // Add welcome message if no history
      if (historyMessages.length === 0) {
        const accommodationInfo = session.accommodation_unit
          ? `\n\nEstás alojado en **${session.accommodation_unit.name}${session.accommodation_unit.unit_number ? ` #${session.accommodation_unit.unit_number}` : ''}**${session.accommodation_unit.view_type ? ` con ${session.accommodation_unit.view_type}` : ''}.`
          : ''

        const welcomeMessage: GuestChatMessage = {
          id: 'welcome',
          role: 'assistant',
          content: `¡Hola **${session.guest_name}**! 👋${accommodationInfo}

Bienvenido a tu asistente personal. Puedo ayudarte con:

- 🏨 Información sobre las habitaciones y amenidades del hotel
- 🌴 Actividades turísticas y lugares de interés cercanos
- 🍽️ Restaurantes y opciones gastronómicas
- 🚕 Transporte y cómo llegar a diferentes lugares

¿En qué puedo ayudarte hoy?`,
          timestamp: new Date(),
        }
        setMessages([welcomeMessage])
      }
    } catch (err) {
      console.error('Error loading history:', err)
      setError('No se pudo cargar el historial de chat')
    } finally {
      setIsLoadingHistory(false)
    }
  }

  const updateTrackedEntity = (entityName: string) => {
    setTrackedEntities((prev) => {
      const newMap = new Map(prev)
      const existing = newMap.get(entityName)

      if (existing) {
        newMap.set(entityName, {
          ...existing,
          mentionCount: existing.mentionCount + 1,
        })
      } else {
        // Infer type from name (simple heuristic)
        const type = inferEntityType(entityName)
        newMap.set(entityName, {
          name: entityName,
          type,
          firstMentioned: new Date(),
          mentionCount: 1,
        })
      }

      return newMap
    })
  }

  const inferEntityType = (entity: string): TrackedEntity['type'] => {
    const lowerEntity = entity.toLowerCase()
    if (lowerEntity.includes('buceo') || lowerEntity.includes('surf') || lowerEntity.includes('tour')) {
      return 'activity'
    }
    if (lowerEntity.includes('playa') || lowerEntity.includes('restaurante') || lowerEntity.includes('hotel')) {
      return 'place'
    }
    if (lowerEntity.includes('wifi') || lowerEntity.includes('piscina') || lowerEntity.includes('terraza')) {
      return 'amenity'
    }
    return 'other'
  }

  const handleSendMessage = async (messageText?: string) => {
    const textToSend = messageText || input.trim()

    if (!textToSend || isLoading) {
      return
    }

    // Clear input immediately for better UX
    setInput('')
    setError(null)
    setIsLoading(true)

    // Add user message to UI
    const userMessage: GuestChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: textToSend,
      timestamp: new Date(),
    }

    setMessages((prev) => [...prev, userMessage])

    try {
      const response = await fetch('/api/guest/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          message: textToSend,
          conversation_id: activeConversationId,
        }),
      })

      if (!response.ok) {
        throw new Error('Error al enviar el mensaje')
      }

      const data = await response.json()

      // Add assistant message
      const assistantMessage: GuestChatMessage = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: data.response,
        timestamp: new Date(),
        entities: data.entities || [],
        sources: data.sources || [],
      }

      setMessages((prev) => [...prev, assistantMessage])

      // Update tracked entities
      if (data.entities) {
        data.entities.forEach((entity: string) => {
          updateTrackedEntity(entity)
        })
      }

      // Update follow-up suggestions
      if (data.followUpSuggestions) {
        setFollowUpSuggestions(data.followUpSuggestions)
      }

      // Update conversation in list (update last_message and updated_at)
      setConversations((prev) =>
        prev.map((conv) =>
          conv.id === activeConversationId
            ? { ...conv, last_message: textToSend, updated_at: new Date().toISOString() }
            : conv
        )
      )

      // Auto-generate title from first user message if title is default
      if (messages.filter((m) => m.role === 'user').length === 0) {
        const generatedTitle = textToSend.slice(0, 50) + (textToSend.length > 50 ? '...' : '')

        // Update title in backend
        try {
          await fetch(`/api/guest/conversations/${activeConversationId}`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ title: generatedTitle }),
          })

          // Update title in local state
          setConversations((prev) =>
            prev.map((conv) =>
              conv.id === activeConversationId
                ? { ...conv, title: generatedTitle }
                : conv
            )
          )
        } catch (err) {
          console.error('Error updating conversation title:', err)
        }
      }
    } catch (err) {
      console.error('Error sending message:', err)
      setError('No se pudo enviar el mensaje. Intenta de nuevo.')

      // Add error message to UI
      const errorMessage: GuestChatMessage = {
        id: `error-${Date.now()}`,
        role: 'assistant',
        content: '❌ Lo siento, hubo un error al procesar tu mensaje. Por favor, intenta de nuevo.',
        timestamp: new Date(),
      }
      setMessages((prev) => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  const handleRetry = () => {
    const lastUserMessage = [...messages].reverse().find((m) => m.role === 'user')
    if (lastUserMessage) {
      handleSendMessage(lastUserMessage.content)
    }
  }

  const formatDate = (date: string | undefined): string => {
    if (!date || typeof date !== 'string') {
      return 'N/A'
    }

    // Parse YYYY-MM-DD string to local date (not UTC) to avoid timezone issues
    const parts = date.split('-')
    if (parts.length !== 3) {
      return date // Return original string if not in expected format
    }

    const [year, month, day] = parts.map(Number)
    if (isNaN(year) || isNaN(month) || isNaN(day)) {
      return date // Return original string if parsing failed
    }

    const dateObj = new Date(year, month - 1, day)  // month is 0-indexed

    // Validate the date object
    if (isNaN(dateObj.getTime())) {
      return 'N/A'
    }

    return new Intl.DateTimeFormat('es-ES', {
      month: 'short',
      day: 'numeric',
    }).format(dateObj)
  }

  return (
    <div className="flex h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50">
      {/* Sidebar (Desktop: always visible, Mobile: drawer overlay) */}
      <aside
        className={`
          fixed lg:relative z-50 lg:z-0
          w-80 h-full
          transition-transform duration-300 ease-in-out
          ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
          bg-white border-r border-slate-200 shadow-lg lg:shadow-none
        `}
      >
        {isLoadingConversations ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          </div>
        ) : (
          <ConversationList
            conversations={conversations}
            activeConversationId={activeConversationId}
            onSelectConversation={handleSelectConversation}
            onNewConversation={handleNewConversation}
            onDeleteConversation={handleDeleteConversation}
          />
        )}
      </aside>

      {/* Mobile overlay backdrop */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Main Chat Area */}
      <div className="flex flex-col flex-1 h-screen">
        {/* Header */}
        <header className="flex-shrink-0 bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="lg:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors"
          >
            {isSidebarOpen ? (
              <X className="h-6 w-6 text-gray-600" />
            ) : (
              <Menu className="h-6 w-6 text-gray-600" />
            )}
          </button>

          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
              <User className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <h1 className="font-semibold text-gray-900">{session.guest_name}</h1>
              {session.accommodation_unit && (
                <p className="text-xs font-medium text-blue-600">
                  {session.accommodation_unit.name}{session.accommodation_unit.unit_number ? ` #${session.accommodation_unit.unit_number}` : ''}
                  {session.accommodation_unit.view_type && ` • ${session.accommodation_unit.view_type}`}
                </p>
              )}
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <Calendar className="h-3 w-3" />
                <span>
                  {formatDate(session.check_in)} - {formatDate(session.check_out)}
                </span>
              </div>
            </div>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={onLogout}
            className="flex items-center gap-2"
          >
            <LogOut className="h-4 w-4" />
            <span className="hidden sm:inline">Salir</span>
          </Button>
        </div>
        </header>

        {/* Entity Badges */}
        {trackedEntities.size > 0 && (
          <div className="flex-shrink-0 bg-white border-b border-gray-100 px-4 py-2">
            <div className="max-w-4xl mx-auto">
            <p className="text-xs text-gray-500 mb-2">Hablando sobre:</p>
            <div className="flex flex-wrap gap-2">
              {Array.from(trackedEntities.values()).map((entity) => (
                <EntityBadge
                  key={entity.name}
                  entity={entity.name}
                  type={entity.type}
                  onClick={() => handleSendMessage(`Cuéntame más sobre ${entity.name}`)}
                />
              ))}
            </div>
            </div>
          </div>
        )}

        {/* Messages Area */}
        <div className="flex-1 overflow-hidden">
        <ScrollArea className="h-full" ref={scrollAreaRef}>
          <div className="max-w-4xl mx-auto px-4 py-6 space-y-4">
            {isLoadingHistory ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
              </div>
            ) : (
              <>
                {messages.map((message, index) => (
                  <div
                    key={message.id}
                    className={`flex gap-3 animate-message-in ${
                      message.role === 'user' ? 'flex-row-reverse' : ''
                    }`}
                    style={{
                      animationDelay: `${index * 50}ms`,
                    }}
                  >
                    {/* Avatar */}
                    <div
                      className={`flex-shrink-0 h-8 w-8 rounded-full flex items-center justify-center ${
                        message.role === 'user'
                          ? 'bg-blue-600'
                          : 'bg-gray-200'
                      }`}
                    >
                      {message.role === 'user' ? (
                        <User className="h-4 w-4 text-white" />
                      ) : (
                        <Bot className="h-4 w-4 text-gray-600" />
                      )}
                    </div>

                    {/* Message Bubble */}
                    <div
                      className={`flex-1 max-w-[75%] ${
                        message.role === 'user' ? 'text-right' : ''
                      }`}
                    >
                      <div
                        className={`inline-block px-4 py-3 rounded-2xl ${
                          message.role === 'user'
                            ? 'bg-blue-600 text-white'
                            : 'bg-white border border-gray-200 text-gray-900'
                        }`}
                      >
                        <div className="prose prose-sm max-w-none">
                          <ReactMarkdown
                            components={{
                              p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                              strong: ({ children }) => (
                                <strong className={message.role === 'user' ? 'font-bold' : 'font-semibold text-blue-900'}>
                                  {children}
                                </strong>
                              ),
                              ul: ({ children }) => <ul className="list-disc pl-4 space-y-1">{children}</ul>,
                              li: ({ children }) => <li>{children}</li>,
                            }}
                          >
                            {message.content}
                          </ReactMarkdown>
                        </div>
                      </div>

                      {/* Sources (only for assistant messages) */}
                      {message.role === 'assistant' && message.sources && message.sources.length > 0 && (
                        <div className="mt-2 px-2">
                          <p className="text-xs font-medium text-gray-500 mb-1">Fuentes:</p>
                          <div className="space-y-1">
                            {message.sources.slice(0, 3).map((source, idx) => (
                              <div key={idx} className="text-xs text-gray-600 bg-gray-50 px-2 py-1 rounded">
                                {source.name}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      <p className="text-xs text-gray-400 mt-1 px-2">
                        {message.timestamp.toLocaleTimeString('es-ES', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                    </div>
                  </div>
                ))}

                {/* Typing Indicator */}
                {isLoading && (
                  <div className="flex gap-3 animate-message-in">
                    <div className="flex-shrink-0 h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center">
                      <Bot className="h-4 w-4 text-gray-600" />
                    </div>
                    <div className="bg-white border border-gray-200 rounded-2xl px-4 py-3">
                      <div className="flex gap-1">
                        <div className="h-2 w-2 bg-gray-400 rounded-full animate-typing-dot" />
                        <div className="h-2 w-2 bg-gray-400 rounded-full animate-typing-dot" style={{ animationDelay: '0.2s' }} />
                        <div className="h-2 w-2 bg-gray-400 rounded-full animate-typing-dot" style={{ animationDelay: '0.4s' }} />
                      </div>
                    </div>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </>
            )}
          </div>
          </ScrollArea>
        </div>

        {/* Follow-up Suggestions */}
        {followUpSuggestions.length > 0 && !isLoading && (
          <div className="flex-shrink-0 bg-white border-t border-gray-100">
          <div className="max-w-4xl mx-auto px-4">
            <FollowUpSuggestions
              suggestions={followUpSuggestions}
              onSuggestionClick={handleSendMessage}
            />
            </div>
          </div>
        )}

        {/* Error Bar */}
        {error && (
          <div className="flex-shrink-0 bg-red-50 border-t border-red-200 px-4 py-3">
          <div className="max-w-4xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-red-800">
              <AlertCircle className="h-4 w-4" />
              {error}
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={handleRetry}
              className="text-red-700 border-red-300 hover:bg-red-100"
            >
              <RefreshCw className="h-3.5 w-3.5 mr-1" />
              Reintentar
            </Button>
            </div>
          </div>
        )}

        {/* Input Area */}
        <div className="flex-shrink-0 bg-white border-t border-gray-200 shadow-lg">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex gap-2 items-end">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Escribe tu mensaje..."
              className="flex-1 resize-none rounded-2xl border border-gray-300 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent max-h-[120px] min-h-[44px]"
              rows={1}
              disabled={isLoading}
              aria-label="Mensaje"
            />

            <Button
              onClick={() => handleSendMessage()}
              disabled={!input.trim() || isLoading}
              className="h-11 w-11 rounded-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center transition-colors"
              aria-label="Enviar mensaje"
            >
              {isLoading ? (
                <Loader2 className="h-5 w-5 animate-spin text-white" />
              ) : (
                <Send className="h-5 w-5 text-white" />
              )}
            </Button>
          </div>

          <p className="text-xs text-gray-400 mt-2 text-center">
            <kbd className="px-2 py-0.5 bg-gray-100 rounded text-xs">Enter</kbd> para enviar •{' '}
            <kbd className="px-2 py-0.5 bg-gray-100 rounded text-xs">Shift+Enter</kbd> para nueva línea
          </p>
          </div>
        </div>
      </div>

      {/* Animations */}
      <style jsx global>{`
        @keyframes message-in {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes typing-dot {
          0%, 60%, 100% {
            opacity: 0.3;
            transform: scale(1);
          }
          30% {
            opacity: 1;
            transform: scale(1.2);
          }
        }

        .animate-message-in {
          animation: message-in 0.3s ease-out;
          animation-fill-mode: both;
        }

        .animate-typing-dot {
          animation: typing-dot 1.4s infinite;
        }

        /* Mobile keyboard handling */
        @media (max-width: 768px) {
          .h-screen {
            height: 100dvh;
          }
        }

        /* Markdown styles for messages */
        .prose {
          color: inherit;
        }

        .prose strong {
          color: inherit;
        }

        .prose ul {
          margin: 0;
        }
      `}</style>
    </div>
  )
}
