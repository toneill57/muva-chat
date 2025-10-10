'use client'

import { Plus, MessageSquare, Clock, Trash2 } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { es } from 'date-fns/locale'

interface Conversation {
  id: string
  title: string
  last_message: string | null
  updated_at: string
}

interface ConversationListProps {
  conversations: Conversation[]
  activeConversationId: string | null
  onSelectConversation: (id: string) => void
  onNewConversation: () => void
  onDeleteConversation?: (id: string) => void
}

export default function ConversationList({
  conversations,
  activeConversationId,
  onSelectConversation,
  onNewConversation,
  onDeleteConversation,
}: ConversationListProps) {

  const formatRelativeTime = (dateString: string) => {
    try {
      return formatDistanceToNow(new Date(dateString), {
        addSuffix: true,
        locale: es,
      })
    } catch {
      return 'Recientemente'
    }
  }

  return (
    <div className="h-full flex flex-col bg-white border-r border-slate-200">
      {/* Header with New Conversation Button */}
      <div className="p-4 border-b border-slate-200">
        <button
          onClick={onNewConversation}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
        >
          <Plus className="h-5 w-5" />
          Nueva conversación
        </button>
      </div>

      {/* Conversations List */}
      <div className="flex-1 overflow-y-auto">
        {conversations.length === 0 ? (
          /* Empty State */
          <div className="flex flex-col items-center justify-center h-full p-6 text-center">
            <MessageSquare className="h-16 w-16 text-slate-300 mb-4" />
            <h3 className="text-lg font-semibold text-slate-700 mb-2">
              No hay conversaciones
            </h3>
            <p className="text-sm text-slate-500 mb-4">
              Inicia una nueva conversación para comenzar
            </p>
          </div>
        ) : (
          /* Conversation Items */
          <div className="divide-y divide-slate-100">
            {conversations.map((conversation) => (
              <div
                key={conversation.id}
                className={`relative group w-full text-left p-4 hover:bg-slate-50 transition-colors ${
                  activeConversationId === conversation.id
                    ? 'bg-blue-50 border-l-4 border-l-blue-600'
                    : 'border-l-4 border-l-transparent'
                }`}
              >
                <button
                  onClick={() => onSelectConversation(conversation.id)}
                  className="w-full text-left pr-8"
                >
                  {/* Title */}
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h4 className="font-semibold text-slate-900 text-sm line-clamp-1">
                      {conversation.title}
                    </h4>
                  </div>

                  {/* Last Message Preview */}
                  <p className="text-sm text-slate-600 line-clamp-2 mb-2">
                    {conversation.last_message || 'Sin mensajes aún'}
                  </p>

                  {/* Timestamp */}
                  <div className="flex items-center gap-1 text-xs text-slate-500">
                    <Clock className="h-3 w-3" />
                    <span>{formatRelativeTime(conversation.updated_at)}</span>
                  </div>
                </button>

                {/* Delete button (hover) */}
                {onDeleteConversation && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      if (confirm('¿Eliminar esta conversación?')) {
                        onDeleteConversation(conversation.id)
                      }
                    }}
                    className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity p-1.5 hover:bg-red-100 rounded text-red-600"
                    aria-label="Eliminar conversación"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
