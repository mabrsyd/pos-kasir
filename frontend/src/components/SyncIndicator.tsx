'use client';

import { useState, useEffect } from 'react';
import { Cloud, CloudOff, CloudUpload, RefreshCw } from 'lucide-react';
import { db } from '@/lib/db';
import { useLiveQuery } from 'dexie-react-hooks';

export function SyncIndicator() {
  const [isOnline, setIsOnline] = useState(true);

  // Gunakan Dexie live query untuk pantau antrean sync
  const pendingCount = useLiveQuery(
    () => db.syncQueue.where('status').equals('PENDING').count(),
    [],
    0
  );

  useEffect(() => {
    setIsOnline(navigator.onLine);
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (!isOnline) {
    return (
      <div className="flex items-center gap-1.5 px-2 py-1 bg-amber-100 text-amber-700 rounded-full text-[10px] font-bold">
        <CloudOff size={12} />
        <span>Offline</span>
        {pendingCount > 0 && (
          <span className="bg-amber-500 text-white w-4 h-4 rounded-full flex items-center justify-center text-[9px] ml-1">
            {pendingCount}
          </span>
        )}
      </div>
    );
  }

  if (pendingCount > 0) {
    return (
      <div className="flex items-center gap-1.5 px-2 py-1 bg-sky-100 text-sky-700 rounded-full text-[10px] font-bold" title="Menyinkronkan data...">
        <RefreshCw size={12} className="animate-spin" />
        <span>Syncing... ({pendingCount})</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1.5 px-2 py-1 bg-emerald-100 text-emerald-700 rounded-full text-[10px] font-bold" title="Semua data tersinkronisasi">
      <Cloud size={12} />
      <span>Online</span>
    </div>
  );
}
