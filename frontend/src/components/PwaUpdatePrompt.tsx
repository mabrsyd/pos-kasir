'use client';

import { useEffect, useState } from 'react';
import { RefreshCw, X } from 'lucide-react';

interface SWUpdateEvent extends Event {
  detail: { registration: ServiceWorkerRegistration };
}

/**
 * Banner yang muncul saat ada Service Worker baru tersedia.
 * Meminta user untuk reload agar mendapatkan versi terbaru aplikasi.
 */
export function PwaUpdatePrompt() {
  const [showPrompt, setShowPrompt] = useState(false);
  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    const handleUpdateAvailable = (event: Event) => {
      const e = event as SWUpdateEvent;
      setRegistration(e.detail.registration);
      setShowPrompt(true);
    };

    window.addEventListener('sw-update-available', handleUpdateAvailable);
    return () => window.removeEventListener('sw-update-available', handleUpdateAvailable);
  }, []);

  const handleUpdate = async () => {
    setIsUpdating(true);
    try {
      if (registration?.waiting) {
        // Tell the waiting SW to take control
        registration.waiting.postMessage({ type: 'SKIP_WAITING' });
        // controllerchange listener in ServiceWorkerRegistration.tsx will reload
      } else {
        window.location.reload();
      }
    } catch {
      window.location.reload();
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
  };

  if (!showPrompt) return null;

  return (
    <div
      role="alert"
      aria-live="polite"
      className="fixed top-4 left-4 right-4 z-[200] max-w-md mx-auto animate-in slide-in-from-top-4 duration-500"
    >
      <div className="bg-white rounded-2xl shadow-2xl border border-sky-100 p-4 flex items-center gap-3">
        <div className="p-2.5 bg-sky-500/10 text-sky-600 rounded-xl shrink-0">
          <RefreshCw size={20} />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-sm text-foreground">Update Tersedia</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Versi baru aplikasi siap digunakan.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={handleUpdate}
            disabled={isUpdating}
            className="px-3 py-1.5 bg-sky-500 text-white text-xs font-medium rounded-lg hover:bg-sky-600 transition-colors disabled:opacity-60 flex items-center gap-1.5"
          >
            {isUpdating ? (
              <RefreshCw size={12} className="animate-spin" />
            ) : null}
            {isUpdating ? 'Memuat...' : 'Perbarui'}
          </button>
          <button
            onClick={handleDismiss}
            className="p-1 text-muted-foreground hover:text-foreground rounded hover:bg-zinc-100 transition-colors"
            aria-label="Tutup notifikasi update"
          >
            <X size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
