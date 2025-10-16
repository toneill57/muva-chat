'use client';

import React from 'react';

interface ErrorCloseButtonProps {
  onClick: () => void;
}

export default function ErrorCloseButton({ onClick }: ErrorCloseButtonProps) {
  return (
    <button
      onClick={onClick}
      className="text-sm text-red-400 hover:text-red-600 font-medium"
    >
      ✕
    </button>
  );
}
