'use client';

import React from 'react';
import { RotateCcw } from 'lucide-react';

interface NewConversationButtonProps {
  onClick: () => void;
}

export default function NewConversationButton({ onClick }: NewConversationButtonProps) {
  return (
    <button
      onClick={onClick}
      className="p-2.5 min-w-[44px] min-h-[44px] hover:bg-white/20 rounded-lg transition-colors flex items-center justify-center"
      aria-label="Start new conversation"
    >
      <RotateCcw className="w-5 h-5" />
    </button>
  );
}
