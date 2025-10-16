'use client';

import React from 'react';

interface ErrorRetryButtonProps {
  onClick: () => void;
}

export default function ErrorRetryButton({ onClick }: ErrorRetryButtonProps) {
  return (
    <button
      onClick={onClick}
      className="text-sm text-red-600 hover:text-red-800 font-medium underline"
    >
      Retry
    </button>
  );
}
