import type { Metadata } from 'next';
import Link from 'next/link';
import { WifiOff } from 'lucide-react';
import { RetryButton } from './RetryButton';

export const metadata: Metadata = {
  title: 'Offline — POS Kasir Ennou',
  description: 'Tidak ada koneksi internet',
  robots: { index: false },
};

export default function OfflinePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 to-slate-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-xl border border-slate-100 p-8 max-w-sm w-full text-center">

        {/* Icon */}
        <div className="w-20 h-20 bg-amber-50 rounded-full flex items-center justify-center mx-auto mb-6">
          <WifiOff className="text-amber-500" size={36} />
        </div>

        {/* Title */}
        <h1 className="text-2xl font-bold text-slate-800 mb-2">
          Tidak Ada Koneksi
        </h1>
        <p className="text-slate-500 text-sm mb-6 leading-relaxed">
          Periksa koneksi internet Anda. Transaksi yang sudah dibuat saat offline
          akan tersinkronisasi otomatis saat koneksi kembali.
        </p>

        {/* Actions */}
        <div className="space-y-3">
          <RetryButton />
          <Link
            href="/pos"
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-slate-100 text-slate-700 font-medium rounded-xl hover:bg-slate-200 transition-colors"
          >
            Buka Kasir (Offline)
          </Link>
        </div>

        {/* Info */}
        <p className="mt-6 text-xs text-slate-400">
          Kasir tetap bisa digunakan dalam mode offline.
          <br />
          Data transaksi aman tersimpan di perangkat.
        </p>
      </div>
    </div>
  );
}
