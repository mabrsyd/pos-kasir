'use client';

import { RefreshCw } from 'lucide-react';

export function RetryButton() {
  return (
    <button
      onClick={() => window.location.reload()}
      className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-sky-500 text-white font-medium rounded-xl hover:bg-sky-600 transition-colors"
      id="offline-retry-btn"
    >
      <RefreshCw size={18} />
      Coba Lagi
    </button>
  );
}
