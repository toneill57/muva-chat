'use client';

import React from 'react';

interface SuggestionButtonProps {
  suggestion: string;
  onClick: (suggestion: string) => void;
}

export default function SuggestionButton({ suggestion, onClick }: SuggestionButtonProps) {
  return (
    <button
      onClick={() => onClick(suggestion)}
      className="px-4 py-2.5 min-h-[44px] bg-teal-50 hover:bg-teal-100
                 text-teal-700 text-base rounded-full
                 border border-teal-200
                 transition-colors"
      aria-label={`Quick reply: ${suggestion}`}
    >
      {suggestion}
    </button>
  );
}
