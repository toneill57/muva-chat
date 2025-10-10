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
  Brain,
  Lightbulb,
  Filter,
  Target,
  FlaskConical,
  Search,
  CheckCircle2,
  XCircle
} from "lucide-react"
import ReactMarkdown from 'react-markdown'
import { ChatMessage } from './shared/types'

interface PremiumChatInterfaceSemanticProps {
  clientId: string
  businessName: string
}

// Test queries for semantic search
const SEMANTIC_TEST_QUERIES = [
  {
    category: "Alojamiento",
    icon: Target,
    color: "purple",
    queries: [
      "habitación con vista al mar",
      "suite para 4 personas",
      "apartamento con cocina",
      "alojamiento romántico"
    ]
  },
  {
    category: "Bebidas & Comida",
    icon: FlaskConical,
    color: "green",
    queries: [
      "agua de coco",
      "mariscos frescos",
      "comida típica",
      "cena romántica"
    ]
  },
  {
    category: "Actividades",
    icon: Search,
    color: "blue",
    queries: [
      "buceo",
      "snorkel",
      "surf",
      "paseo en lancha"
    ]
  }
]

export function PremiumChatInterfaceSemantic({ clientId, businessName }: PremiumChatInterfaceSemanticProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      role: 'assistant',
      content: `🔬 **Sistema de Búsqueda Semántica con LLM**

Este es un endpoint experimental que usa **comprensión semántica profunda** mediante LLMs para entender tu consulta.

**Pipeline de 5 pasos:**
1. 🧠 Semantic Understanding - Claude analiza tu intent
2. 🔀 Multi-Query Generation - Genera 3 variaciones
3. 🔍 Vector Search + Metadata Filtering
4. 🎯 LLM Result Curation - Selecciona top 3 con reasoning
5. 💬 Conversational Response

**Diferencias vs sistema actual:**
- ✅ Comprensión profunda del intent (no solo keywords)
- ✅ Filtrado inteligente por metadata
- ✅ Curaduría LLM con explicaciones
- ⚡ Latencia: ~2.5s vs ~1.5s actual

Prueba con: "agua de coco", "buceo", "comida típica"`,
      timestamp: new Date()
    }
  ])

  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [semanticAnalysis, setSemanticAnalysis] = useState<any>(null)
  const scrollAreaRef = useRef<HTMLDivElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Auto-scroll on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSendMessage = async (messageText: string = input) => {
    if (!messageText.trim() || isLoading) return

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: messageText.trim(),
      timestamp: new Date()
    }

    setMessages(prev => [...prev, userMessage])
    setInput('')
    setIsLoading(true)
    setSemanticAnalysis(null)

    try {
      const response = await fetch('/api/premium-chat-semantic', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: messageText.trim(),
          client_id: clientId,
          business_name: businessName
        })
      })

      const data = await response.json()

      if (data.success) {
        const assistantMessage: ChatMessage = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: data.response,
          timestamp: new Date(),
          sources: data.sources || [],
          metrics: data.metrics
        }

        setMessages(prev => [...prev, assistantMessage])
        setSemanticAnalysis(data.semantic_analysis)
      } else {
        throw new Error(data.error || 'Error en búsqueda semántica')
      }
    } catch (error) {
      console.error('Error:', error)
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `❌ Error: ${error instanceof Error ? error.message : 'Error desconocido'}`,
        timestamp: new Date()
      }
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  return (
    <div className="flex flex-col h-full gap-4">
      {/* Main Chat Card */}
      <Card className="flex-1 flex flex-col border-purple-200 bg-gradient-to-br from-purple-50 to-white">
        <CardHeader className="border-b bg-gradient-to-r from-purple-600 to-indigo-600 text-white">
          <div className="flex items-center gap-3">
            <Brain className="h-6 w-6" />
            <div>
              <CardTitle className="text-xl">Chat Semántico (Experimental)</CardTitle>
              <p className="text-sm text-purple-100 mt-1">
                Búsqueda LLM-driven con comprensión profunda
              </p>
            </div>
          </div>
        </CardHeader>

        <CardContent className="flex-1 flex flex-col p-0 overflow-hidden">
          {/* Messages Area */}
          <ScrollArea className="flex-1 p-6" ref={scrollAreaRef}>
            <div className="space-y-6">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  {message.role === 'assistant' && (
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-indigo-500 flex items-center justify-center">
                        <Brain className="h-5 w-5 text-white" />
                      </div>
                    </div>
                  )}

                  <div
                    className={`
                      max-w-[85%] rounded-2xl px-4 py-3
                      ${message.role === 'user'
                        ? 'bg-purple-600 text-white'
                        : 'bg-white border border-purple-100 shadow-sm'
                      }
                    `}
                  >
                    <div className="prose prose-sm max-w-none dark:prose-invert">
                      <ReactMarkdown>{message.content}</ReactMarkdown>
                    </div>

                    {/* Show sources if available */}
                    {message.sources && message.sources.length > 0 && (
                      <div className="mt-4 pt-3 border-t border-purple-100">
                        <p className="text-xs font-semibold text-purple-600 mb-2">
                          📚 Fuentes ({message.sources.length})
                        </p>
                        <div className="space-y-1">
                          {message.sources.slice(0, 5).map((source: any, idx: number) => (
                            <div key={idx} className="text-xs flex items-center gap-2">
                              <span className="text-purple-400">🌴</span>
                              <span className="font-medium">{source.name}</span>
                              <span className="text-gray-400">
                                {source.llmScore ? `LLM: ${(source.llmScore * 100).toFixed(0)}%` : ''}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {message.role === 'user' && (
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-gray-400 to-gray-500 flex items-center justify-center">
                        <User className="h-5 w-5 text-white" />
                      </div>
                    </div>
                  )}
                </div>
              ))}

              {isLoading && (
                <div className="flex gap-3 justify-start">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-indigo-500 flex items-center justify-center">
                      <Brain className="h-5 w-5 text-white animate-pulse" />
                    </div>
                  </div>
                  <div className="bg-white border border-purple-100 rounded-2xl px-4 py-3 shadow-sm">
                    <div className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin text-purple-600" />
                      <span className="text-sm text-gray-600">Analizando semánticamente...</span>
                    </div>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          </ScrollArea>

          {/* Input Area */}
          <div className="border-t bg-gray-50 p-4">
            <div className="flex gap-2">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Escribe tu consulta (ej: agua de coco)..."
                disabled={isLoading}
                className="flex-1 border-purple-200 focus:border-purple-400"
              />
              <Button
                onClick={() => handleSendMessage()}
                disabled={isLoading || !input.trim()}
                className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700"
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Semantic Analysis Panel */}
      {semanticAnalysis && (
        <Card className="border-indigo-200 bg-gradient-to-br from-indigo-50 to-white">
          <CardHeader className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white">
            <CardTitle className="text-sm flex items-center gap-2">
              <Lightbulb className="h-4 w-4" />
              Análisis Semántico (Debug)
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <div className="space-y-3 text-sm">
              {/* Intent */}
              <div>
                <p className="font-semibold text-indigo-600 mb-1 flex items-center gap-1">
                  <Target className="h-3 w-3" />
                  Intent Detectado:
                </p>
                <p className="text-gray-700">{semanticAnalysis.intent}</p>
                <p className="text-xs text-gray-500 mt-1">
                  Confidence: {(semanticAnalysis.confidence * 100).toFixed(0)}%
                </p>
              </div>

              {/* Context */}
              <div>
                <p className="font-semibold text-indigo-600 mb-1">Contexto Usuario:</p>
                <p className="text-gray-700">{semanticAnalysis.userContext}</p>
              </div>

              {/* Expected Entities */}
              <div>
                <p className="font-semibold text-indigo-600 mb-1 flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3 text-green-500" />
                  Entidades Esperadas:
                </p>
                <div className="flex flex-wrap gap-1">
                  {semanticAnalysis.expectedEntities?.map((entity: string, idx: number) => (
                    <span key={idx} className="px-2 py-0.5 bg-green-100 text-green-700 rounded text-xs">
                      {entity}
                    </span>
                  ))}
                </div>
              </div>

              {/* Avoid Entities */}
              {semanticAnalysis.avoidEntities?.length > 0 && (
                <div>
                  <p className="font-semibold text-indigo-600 mb-1 flex items-center gap-1">
                    <XCircle className="h-3 w-3 text-red-500" />
                    Entidades Evitadas:
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {semanticAnalysis.avoidEntities.map((entity: string, idx: number) => (
                      <span key={idx} className="px-2 py-0.5 bg-red-100 text-red-700 rounded text-xs">
                        {entity}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Semantic Keywords */}
              <div>
                <p className="font-semibold text-indigo-600 mb-1">Keywords Semánticos:</p>
                <div className="flex flex-wrap gap-1">
                  {semanticAnalysis.semanticKeywords?.slice(0, 8).map((kw: string, idx: number) => (
                    <span key={idx} className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs">
                      {kw}
                    </span>
                  ))}
                </div>
              </div>

              {/* Metadata Filters */}
              {Object.keys(semanticAnalysis.metadataFilters || {}).length > 0 && (
                <div>
                  <p className="font-semibold text-indigo-600 mb-1 flex items-center gap-1">
                    <Filter className="h-3 w-3" />
                    Filtros Metadata:
                  </p>
                  <div className="bg-gray-50 rounded p-2 text-xs font-mono">
                    {JSON.stringify(semanticAnalysis.metadataFilters, null, 2)}
                  </div>
                </div>
              )}

              {/* Multi-Queries Generated */}
              {semanticAnalysis.queries?.length > 0 && (
                <div>
                  <p className="font-semibold text-indigo-600 mb-1">Queries Generados ({semanticAnalysis.queries.length}):</p>
                  <div className="space-y-1">
                    {semanticAnalysis.queries.map((q: string, idx: number) => (
                      <p key={idx} className="text-xs text-gray-600 pl-4 border-l-2 border-indigo-200">
                        {idx + 1}. "{q}"
                      </p>
                    ))}
                  </div>
                </div>
              )}

              {/* Curation Reasoning */}
              {semanticAnalysis.curationReasoning && (
                <div>
                  <p className="font-semibold text-indigo-600 mb-1">Reasoning Curaduría:</p>
                  <p className="text-xs text-gray-600 italic">{semanticAnalysis.curationReasoning}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick Test Queries */}
      <Card className="border-gray-200">
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <FlaskConical className="h-4 w-4" />
            Queries de Prueba
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {SEMANTIC_TEST_QUERIES.map((category) => {
              const Icon = category.icon
              return (
                <div key={category.category}>
                  <p className="text-xs font-semibold text-gray-600 mb-2 flex items-center gap-1">
                    <Icon className="h-3 w-3" />
                    {category.category}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {category.queries.map((query) => (
                      <Button
                        key={query}
                        variant="outline"
                        size="sm"
                        onClick={() => handleSendMessage(query)}
                        disabled={isLoading}
                        className="text-xs"
                      >
                        {query}
                      </Button>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}