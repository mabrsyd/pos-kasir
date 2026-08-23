'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactNode, useState, useEffect } from 'react';
import { syncEngine } from '@/lib/syncEngine';
import { PwaInstallPrompt } from './PwaInstallPrompt';

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 1000 * 60 * 5, // 5 minutes
        retry: 1,
      },
    },
  }));

  useEffect(() => {
    // Initialize device ID if not present
    if (!localStorage.getItem('deviceId')) {
      localStorage.setItem('deviceId', `dev-${Math.random().toString(36).substring(2, 9)}`);
    }
    
    // Start background sync
    syncEngine.startPeriodicSync();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <PwaInstallPrompt />
    </QueryClientProvider>
  );
}
