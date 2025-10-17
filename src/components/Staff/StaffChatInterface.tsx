'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Menu, X, LogOut, Send, User, Crown, Shield, Briefcase } from 'lucide-react';
import ConversationList from './ConversationList';
import SourcesDrawer from './SourcesDrawer';
import type { StaffInfo, Conversation, ChatMessage, ChatResponse } from './types';

export default function StaffChatInterface() {
  const router = useRouter();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const [staffInfo, setStaffInfo] = useState<StaffInfo | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load staff info on mount
  useEffect(() => {
    const staffInfoStr = localStorage.getItem('staff_info');
    if (staffInfoStr) {
      try {
        setStaffInfo(JSON.parse(staffInfoStr));
      } catch (err) {
        console.error('Failed to parse staff info:', err);
        handleLogout();
      }
    } else {
      handleLogout();
    }
  }, []);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleLogout = () => {
    localStorage.removeItem('staff_token');
    localStorage.removeItem('staff_info');
    router.push('/login');
  };

  const handleNewConversation = () => {
    setActiveConversationId(null);
    setMessages([]);
    setError(null);
    inputRef.current?.focus();
  };

  const handleSelectConversation = async (conversationId: string) => {
    setActiveConversationId(conversationId);
    setMessages([]);
    setError(null);

    // TODO: Load conversation history from API
    // For now, just set empty messages
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return;

    const userMessage = inputMessage.trim();
    setInputMessage('');
    setError(null);

    // Add user message to UI
    const newUserMessage: ChatMessage = {
      role: 'user',
      content: userMessage,
      timestamp: new Date().toISOString(),
    };
    setMessages(prev => [...prev, newUserMessage]);

    try {
      setIsLoading(true);

      const token = localStorage.getItem('staff_token');
      if (!token) {
        handleLogout();
        return;
      }

      const response = await fetch('/api/staff/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          message: userMessage,
          ...(activeConversationId && { conversation_id: activeConversationId }),
        }),
      });

      if (!response.ok) {
        if (response.status === 401) {
          handleLogout();
          return;
        }
        // Get detailed error message from server
        const errorData = await response.json().catch(() => ({}));
        const errorMsg = errorData.message || errorData.error || `HTTP ${response.status}`;
        console.error('[StaffChat] API Error:', errorMsg, errorData);
        throw new Error(`Failed to get response: ${errorMsg}`);
      }

      const data: ChatResponse = await response.json();

      // Update conversation ID if new conversation
      if (!activeConversationId && data.conversation_id) {
        setActiveConversationId(data.conversation_id);
      }

      // Add assistant message to UI
      const assistantMessage: ChatMessage = {
        role: 'assistant',
        content: data.response,
        sources: data.sources,
        timestamp: new Date().toISOString(),
      };
      setMessages(prev => [...prev, assistantMessage]);

      // TODO: Update conversations list with new/updated conversation

    } catch (err) {
      console.error('[StaffChat] Chat error:', err);
      const errorMsg = err instanceof Error ? err.message : 'Unknown error';
      setError(`Error: ${errorMsg}`);
    } finally {
      setIsLoading(false);
      inputRef.current?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const getRoleBadge = (role: StaffInfo['role']) => {
    switch (role) {
      case 'ceo':
        return {
          icon: <Crown className="h-4 w-4" />,
          label: 'CEO',
          className: 'bg-yellow-100 text-yellow-800',
        };
      case 'admin':
        return {
          icon: <Shield className="h-4 w-4" />,
          label: 'Admin',
          className: 'bg-blue-100 text-blue-800',
        };
      case 'housekeeper':
        return {
          icon: <Briefcase className="h-4 w-4" />,
          label: 'Staff',
          className: 'bg-green-100 text-green-800',
        };
    }
  };

  if (!staffInfo) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-900"></div>
      </div>
    );
  }

  const roleBadge = getRoleBadge(staffInfo.role);

  return (
    <div className="h-screen flex flex-col bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="lg:hidden p-2 hover:bg-slate-100 rounded-lg transition-colors"
          >
            {isSidebarOpen ? (
              <X className="h-5 w-5 text-slate-700" />
            ) : (
              <Menu className="h-5 w-5 text-slate-700" />
            )}
          </button>
          <h1 className="text-xl font-bold text-blue-900">Staff Portal</h1>
        </div>

        <div className="flex items-center gap-4">
          {/* Staff Info */}
          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <div className="text-sm font-semibold text-slate-900">
                {staffInfo.full_name}
              </div>
              <div className="text-xs text-slate-500">
                @{staffInfo.username}
              </div>
            </div>
            <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full ${roleBadge.className}`}>
              {roleBadge.icon}
              <span className="text-sm font-semibold">{roleBadge.label}</span>
            </div>
          </div>

          {/* Logout Button */}
          <button
            onClick={handleLogout}
            className="p-2 text-slate-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            title="Logout"
          >
            <LogOut className="h-5 w-5" />
          </button>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar - Conversations List */}
        <aside
          className={`${
            isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
          } lg:translate-x-0 absolute lg:relative z-20 w-80 h-full bg-white transition-transform duration-300 ease-in-out`}
        >
          <ConversationList
            conversations={conversations}
            activeConversationId={activeConversationId}
            onSelectConversation={handleSelectConversation}
            onNewConversation={handleNewConversation}
          />
        </aside>

        {/* Overlay for mobile */}
        {isSidebarOpen && (
          <div
            className="lg:hidden absolute inset-0 bg-black bg-opacity-50 z-10"
            onClick={() => setIsSidebarOpen(false)}
          />
        )}

        {/* Chat Area */}
        <main className="flex-1 flex flex-col bg-slate-50">
          {/* Chat Header */}
          <div className="bg-white border-b border-slate-200 px-6 py-4">
            <h2 className="text-lg font-semibold text-slate-900">
              {activeConversationId
                ? conversations.find(c => c.id === activeConversationId)?.title || 'Conversation'
                : 'New Conversation'}
            </h2>
            <p className="text-sm text-slate-500">
              Ask about SIRE compliance, operations, or administrative tasks
            </p>
          </div>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
            {messages.length === 0 ? (
              /* Welcome Message */
              <div className="flex flex-col items-center justify-center h-full text-center">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
                  <User className="h-8 w-8 text-blue-900" />
                </div>
                <h3 className="text-xl font-semibold text-slate-900 mb-2">
                  Welcome to Staff Portal
                </h3>
                <p className="text-slate-600 max-w-md">
                  Start a conversation to get help with SIRE documentation, hotel operations,
                  or administrative tasks. I can search through your knowledge base to provide
                  accurate information.
                </p>
              </div>
            ) : (
              /* Message List */
              messages.map((message, index) => (
                <div
                  key={index}
                  className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-3xl ${
                      message.role === 'user'
                        ? 'bg-blue-900 text-white'
                        : 'bg-white text-slate-900 border border-slate-200'
                    } rounded-lg px-4 py-3 shadow-sm`}
                  >
                    <div className="whitespace-pre-wrap text-sm leading-relaxed">
                      {message.content}
                    </div>

                    {/* Sources Drawer for Assistant Messages */}
                    {message.role === 'assistant' && message.sources && (
                      <SourcesDrawer sources={message.sources} />
                    )}

                    {/* Timestamp */}
                    <div
                      className={`text-xs mt-2 ${
                        message.role === 'user' ? 'text-blue-200' : 'text-slate-500'
                      }`}
                    >
                      {new Date(message.timestamp).toLocaleTimeString()}
                    </div>
                  </div>
                </div>
              ))
            )}

            {/* Loading Indicator */}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-white border border-slate-200 rounded-lg px-4 py-3 shadow-sm">
                  <div className="flex items-center gap-2">
                    <div className="flex gap-1">
                      <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                      <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                      <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                    </div>
                    <span className="text-sm text-slate-600">Thinking...</span>
                  </div>
                </div>
              </div>
            )}

            {/* Error Message */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3">
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="bg-white border-t border-slate-200 px-6 py-4">
            <div className="flex gap-3">
              <textarea
                ref={inputRef}
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Type your message... (Shift+Enter for new line)"
                disabled={isLoading}
                className="flex-1 resize-none border border-slate-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-slate-100 disabled:cursor-not-allowed max-h-32"
                rows={1}
                style={{
                  minHeight: '48px',
                  height: 'auto',
                }}
                onInput={(e) => {
                  const target = e.target as HTMLTextAreaElement;
                  target.style.height = '48px';
                  target.style.height = `${Math.min(target.scrollHeight, 128)}px`;
                }}
              />
              <button
                onClick={handleSendMessage}
                disabled={!inputMessage.trim() || isLoading}
                className="px-6 bg-blue-900 text-white rounded-lg hover:bg-blue-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2 font-medium"
              >
                <Send className="h-5 w-5" />
                <span className="hidden sm:inline">Send</span>
              </button>
            </div>
            <p className="text-xs text-slate-500 mt-2">
              Press Enter to send, Shift+Enter for new line
            </p>
          </div>
        </main>
      </div>
    </div>
  );
}
