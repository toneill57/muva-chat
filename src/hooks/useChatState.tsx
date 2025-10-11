'use client'

import { useState, useEffect } from 'react'

export type ChatType = 'sire' | 'tourism' | 'business'

export interface BusinessFilters {
  clientId?: string
  businessType?: string
}

export interface ChatState {
  type: ChatType
  filters: BusinessFilters
  messages: Array<{
    id: string
    role: 'user' | 'assistant'
    content: string
    timestamp: Date
  }>
}

const STORAGE_KEY = 'muva_chat_state'

export function useChatState() {
  const [chatState, setChatState] = useState<ChatState>({
    type: 'sire',
    filters: {},
    messages: []
  })

  // Load from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        setChatState({
          ...parsed,
          messages: parsed.messages?.map((msg: any) => ({
            ...msg,
            timestamp: new Date(msg.timestamp)
          })) || []
        })
      } catch (error) {
        console.warn('Failed to parse saved chat state:', error)
      }
    }
  }, [])

  // Save to localStorage when state changes
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(chatState))
  }, [chatState])

  const changeChatType = (type: ChatType) => {
    setChatState(prev => ({
      ...prev,
      type,
      filters: {}, // Reset filters when changing type
      messages: [] // Clear messages when changing type
    }))
  }

  const updateFilters = (filters: BusinessFilters) => {
    setChatState(prev => ({
      ...prev,
      filters: { ...prev.filters, ...filters }
    }))
  }

  const addMessage = (message: Omit<ChatState['messages'][0], 'id' | 'timestamp'>) => {
    const newMessage = {
      ...message,
      id: Date.now().toString(),
      timestamp: new Date()
    }

    setChatState(prev => ({
      ...prev,
      messages: [...prev.messages, newMessage]
    }))
  }

  const clearMessages = () => {
    setChatState(prev => ({
      ...prev,
      messages: []
    }))
  }

  const getApiEndpoint = (): string => {
    switch (chatState.type) {
      case 'sire':
        return '/api/chat'
      case 'tourism':
        return '/api/chat/muva'
      case 'business':
        return '/api/chat/listings'
      default:
        return '/api/chat'
    }
  }

  const getInitialMessage = (): string => {
    switch (chatState.type) {
      case 'sire':
        return '¡Hola! Soy tu asistente especializado en SIRE. Puedo ayudarte con dudas sobre procedimientos, validaciones, documentos válidos y cualquier aspecto del registro de extranjeros. ¿En qué puedo asistirte?'
      case 'tourism':
        return '¡Hola! Soy tu asistente de turismo para San Andrés. Puedo ayudarte con información sobre actividades, restaurantes, playas, transporte y cultura local. ¿Qué te gustaría conocer sobre San Andrés?'
      case 'business':
        return '¡Hola! Soy tu asistente de información empresarial. Puedo ayudarte con detalles específicos sobre hoteles, restaurantes, actividades y servicios. Selecciona un cliente y tipo de negocio para comenzar.'
      default:
        return '¡Hola! ¿En qué puedo ayudarte?'
    }
  }

  return {
    chatState,
    changeChatType,
    updateFilters,
    addMessage,
    clearMessages,
    getApiEndpoint,
    getInitialMessage
  }
}