'use client';

import { useEffect, useState } from 'react';
import { Download, Share, X } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

type Platform = 'android' | 'ios' | 'other';

function detectPlatform(): Platform {
  const ua = navigator.userAgent;
  if (/iphone|ipad|ipod/i.test(ua)) return 'ios';
  return 'other';
}

function isInStandaloneMode(): boolean {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    ('standalone' in window.navigator && (window.navigator as { standalone?: boolean }).standalone === true)
  );
}

const DISMISS_KEY = 'pwa-install-dismissed-at';
const DISMISS_DURATION_DAYS = 7; // Show again after 7 days

function wasDismissedRecently(): boolean {
  const dismissed = localStorage.getItem(DISMISS_KEY);
  if (!dismissed) return false;
  const daysPassed = (Date.now() - parseInt(dismissed)) / (1000 * 60 * 60 * 24);
  return daysPassed < DISMISS_DURATION_DAYS;
}

/**
 * Banner install PWA.
 * - Android Chrome: menggunakan browser beforeinstallprompt native
 * - iOS Safari: menampilkan instruksi manual "Share → Add to Home Screen"
 * - Tidak muncul jika sudah berjalan sebagai PWA standalone
 */
export function PwaInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showBanner, setShowBanner] = useState(false);
  const [platform, setPlatform] = useState<Platform>('other');

  useEffect(() => {
    // Don't show if already installed as PWA
    if (isInStandaloneMode()) return;
    // Don't show if recently dismissed
    if (wasDismissedRecently()) return;

    const detectedPlatform = detectPlatform();
    setPlatform(detectedPlatform);

    // iOS: show manual instructions after a short delay
    if (detectedPlatform === 'ios') {
      // Only show on mobile Safari (not Chrome iOS which can't install PWA)
      const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
      if (isSafari) {
        const timer = setTimeout(() => setShowBanner(true), 3000);
        return () => clearTimeout(timer);
      }
      return;
    }

    // Android/Desktop: listen for browser install prompt
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setShowBanner(true);
    };

    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setShowBanner(false);
    }
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setShowBanner(false);
    localStorage.setItem(DISMISS_KEY, Date.now().toString());
  };

  if (!showBanner) return null;

  // iOS instructions banner
  if (platform === 'ios') {
    return (
      <div className="fixed bottom-4 left-4 right-4 z-[100] max-w-sm mx-auto animate-in slide-in-from-bottom-4 duration-500">
        <div className="bg-white rounded-2xl shadow-2xl border border-border p-4">
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-sky-500/10 text-sky-600 rounded-xl shrink-0">
                <Share size={20} />
              </div>
              <div>
                <h3 className="font-bold text-sm text-foreground">Install POS Ennou</h3>
                <p className="text-xs text-muted-foreground">Pasang di iPhone/iPad</p>
              </div>
            </div>
            <button
              onClick={handleDismiss}
              className="p-1 text-muted-foreground hover:text-foreground rounded hover:bg-zinc-100 transition-colors"
              aria-label="Tutup"
            >
              <X size={16} />
            </button>
          </div>
          <ol className="space-y-1.5 text-xs text-muted-foreground">
            <li className="flex items-center gap-2">
              <span className="w-5 h-5 bg-sky-100 text-sky-700 rounded-full flex items-center justify-center font-bold text-xs shrink-0">1</span>
              Ketuk tombol <strong className="text-foreground mx-1">Bagikan</strong>
              <Share size={12} className="text-sky-500 shrink-0" />
              di bawah layar
            </li>
            <li className="flex items-center gap-2">
              <span className="w-5 h-5 bg-sky-100 text-sky-700 rounded-full flex items-center justify-center font-bold text-xs shrink-0">2</span>
              Pilih <strong className="text-foreground">"Tambahkan ke Layar Utama"</strong>
            </li>
            <li className="flex items-center gap-2">
              <span className="w-5 h-5 bg-sky-100 text-sky-700 rounded-full flex items-center justify-center font-bold text-xs shrink-0">3</span>
              Ketuk <strong className="text-foreground">"Tambahkan"</strong>
            </li>
          </ol>
        </div>
      </div>
    );
  }

  // Android / Desktop browser banner
  return (
    <div className="fixed bottom-4 left-4 right-4 z-[100] max-w-md mx-auto animate-in slide-in-from-bottom-4 duration-500">
      <div className="bg-white rounded-2xl shadow-2xl border border-border p-4 flex items-center gap-4">
        <div className="p-3 bg-sky-500/10 text-sky-600 rounded-xl shrink-0">
          <Download size={24} />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-sm text-foreground">Install POS Ennou</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Pasang di HP/tablet untuk akses cepat & mode offline.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={handleInstall}
            className="px-4 py-2 bg-sky-500 text-white text-sm font-medium rounded-lg hover:bg-sky-600 transition-colors"
          >
            Install
          </button>
          <button
            onClick={handleDismiss}
            className="p-1.5 text-muted-foreground hover:text-foreground rounded-md hover:bg-zinc-100 transition-colors"
            aria-label="Tutup"
          >
            <X size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}
