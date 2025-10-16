'use client';

import React from 'react';
import { Send } from 'lucide-react';

interface SendMessageButtonProps {
  onClick: () => void;
  disabled: boolean;
  primaryColor: string;
}

export default function SendMessageButton({ onClick, disabled, primaryColor }: SendMessageButtonProps) {
  // Helper to adjust color brightness
  const adjustColor = (hex: string, percent: number): string => {
    const num = parseInt(hex.replace('#', ''), 16);
    const amt = Math.round(2.55 * percent);
    const R = (num >> 16) + amt;
    const G = (num >> 8 & 0x00FF) + amt;
    const B = (num & 0x0000FF) + amt;
    return '#' + (
      0x1000000 +
      (R < 255 ? R < 1 ? 0 : R : 255) * 0x10000 +
      (G < 255 ? G < 1 ? 0 : G : 255) * 0x100 +
      (B < 255 ? B < 1 ? 0 : B : 255)
    ).toString(16).slice(1);
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-label="Send message"
      style={{
        background: `linear-gradient(to right, ${primaryColor}, ${adjustColor(primaryColor, 20)})`
      }}
      className="text-white rounded-xl
                 w-11 h-11
                 flex items-center justify-center
                 hover:shadow-lg
                 disabled:bg-gray-300 disabled:cursor-not-allowed
                 transition-all duration-200"
    >
      <Send className="w-5 h-5" />
    </button>
  );
}
