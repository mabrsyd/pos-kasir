'use client';

import { useEffect, useState } from 'react';
import { WifiOff, X } from 'lucide-react';

/**
 * Indikator status koneksi jaringan.
 * Tampil di sudut layar saat pengguna offline.
 * Mendengarkan browser online/offline events secara real-time.
 */
export function OfflineIndicator() {
  const [isOnline, setIsOnline] = useState(true);
  const [dismissed, setDismissed] = useState(false);
  const [wasOffline, setWasOffline] = useState(false);
  const [showReconnected, setShowReconnected] = useState(false);

  useEffect(() => {
    // Initialize from current network state
    setIsOnline(navigator.onLine);

    const handleOnline = () => {
      setIsOnline(true);
      if (wasOffline) {
        setShowReconnected(true);
        setDismissed(false);
        // Auto-hide reconnected message after 4 seconds
        setTimeout(() => setShowReconnected(false), 4000);
      }
    };

    const handleOffline = () => {
      setIsOnline(false);
      setWasOffline(true);
      setDismissed(false);
      setShowReconnected(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [wasOffline]);

  // Show reconnected banner
  if (showReconnected) {
    return (
      <div
        role="status"
        aria-live="polite"
        className="fixed bottom-4 left-4 right-4 z-[150] max-w-xs mx-auto pointer-events-none"
      >
        <div className="bg-emerald-500 text-white rounded-xl shadow-lg px-4 py-2.5 flex items-center gap-2 text-sm font-medium animate-in slide-in-from-bottom-4 duration-300">
          <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
          Kembali Online — Data akan disinkronkan
        </div>
      </div>
    );
  }

  // Show offline banner
  if (!isOnline && !dismissed) {
    return (
      <div
        role="alert"
        aria-live="assertive"
        className="fixed bottom-4 left-4 right-4 z-[150] max-w-xs mx-auto"
      >
        <div className="bg-amber-500 text-white rounded-xl shadow-lg px-4 py-2.5 flex items-center gap-2 text-sm font-medium animate-in slide-in-from-bottom-4 duration-300">
          <WifiOff size={16} className="shrink-0" />
          <span className="flex-1">Mode Offline — Transaksi tersimpan lokal</span>
          <button
            onClick={() => setDismissed(true)}
            className="shrink-0 p-0.5 hover:bg-amber-600 rounded transition-colors"
            aria-label="Tutup notifikasi offline"
          >
            <X size={14} />
          </button>
        </div>
      </div>
    );
  }

  return null;
}
