'use client';

import { useEffect } from 'react';

/**
 * Komponen client-side untuk registrasi Service Worker.
 * Dipisah dari layout.tsx agar tidak crash saat SSR.
 * Juga mendeteksi SW baru dan mem-broadcast event ke PwaUpdatePrompt.
 */
export function ServiceWorkerRegistration() {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;

    const registerSW = async () => {
      try {
        const registration = await navigator.serviceWorker.register('/sw.js', {
          scope: '/',
        });

        console.log('[SW] Registered. Scope:', registration.scope);

        // Listen for SW updates
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (!newWorker) return;

          newWorker.addEventListener('statechange', () => {
            if (
              newWorker.state === 'installed' &&
              navigator.serviceWorker.controller
            ) {
              // New SW installed but waiting — notify UI
              window.dispatchEvent(new CustomEvent('sw-update-available', {
                detail: { registration },
              }));
              console.log('[SW] Update available');
            }
          });
        });

        // Check for waiting SW on load (e.g., user was offline and came back)
        if (registration.waiting && navigator.serviceWorker.controller) {
          window.dispatchEvent(new CustomEvent('sw-update-available', {
            detail: { registration },
          }));
        }

        // Periodic update check every 60 minutes
        setInterval(() => {
          registration.update().catch(() => { /* ignore network errors */ });
        }, 60 * 60 * 1000);

      } catch (err) {
        console.warn('[SW] Registration failed:', err);
      }
    };

    // Register after page load to not block render
    if (document.readyState === 'complete') {
      registerSW();
    } else {
      window.addEventListener('load', registerSW, { once: true });
    }

    // Listen for controller change (after skipWaiting)
    // This means the new SW took over — reload to use fresh assets
    let refreshing = false;
    const handleControllerChange = () => {
      if (refreshing) return;
      refreshing = true;
      window.location.reload();
    };
    navigator.serviceWorker.addEventListener('controllerchange', handleControllerChange);

    return () => {
      navigator.serviceWorker.removeEventListener('controllerchange', handleControllerChange);
    };
  }, []);

  return null;
}
