'use client';

import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { 
  TrendingUp, 
  Package, 
  ShoppingCart, 
  AlertCircle 
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

export default function DashboardPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['dashboard-summary'],
    queryFn: async () => {
      const res = await api.get('/dashboard');
      return res.data;
    }
  });

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-6">
        <div className="h-8 w-48 bg-zinc-200 rounded"></div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1,2,3,4].map(i => <div key={i} className="h-32 bg-zinc-200 rounded-xl"></div>)}
        </div>
      </div>
    );
  }

  const summary = data?.summary || { revenue: 0, cogs: 0, transactionCount: 0, lowStockCount: 0 };
  const grossProfit = summary.revenue - summary.cogs;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard Hari Ini</h1>
        <p className="text-muted-foreground mt-1">Ringkasan aktivitas dan performa toko Anda.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Revenue Card */}
        <div className="bg-white rounded-xl border border-border p-5 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-primary/10 text-primary rounded-lg">
              <TrendingUp size={24} />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Pendapatan Kotor</p>
              <h3 className="text-2xl font-bold">{formatCurrency(summary.revenue)}</h3>
            </div>
          </div>
        </div>

        {/* Profit Card */}
        <div className="bg-white rounded-xl border border-border p-5 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-emerald-500/10 text-emerald-500 rounded-lg">
              <TrendingUp size={24} />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Laba Kotor (Estimasi)</p>
              <h3 className="text-2xl font-bold text-emerald-600">{formatCurrency(grossProfit)}</h3>
            </div>
          </div>
        </div>

        {/* Transactions Card */}
        <div className="bg-white rounded-xl border border-border p-5 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-500/10 text-blue-500 rounded-lg">
              <ShoppingCart size={24} />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Total Transaksi</p>
              <h3 className="text-2xl font-bold">{summary.transactionCount} <span className="text-sm font-normal text-muted-foreground">struk</span></h3>
            </div>
          </div>
        </div>

        {/* Low Stock Card */}
        <div className="bg-white rounded-xl border border-border p-5 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-destructive/10 text-destructive rounded-lg">
              <AlertCircle size={24} />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Stok Menipis</p>
              <h3 className="text-2xl font-bold text-destructive">{summary.lowStockCount} <span className="text-sm font-normal text-muted-foreground">produk</span></h3>
            </div>
          </div>
        </div>
      </div>
      
      {/* Additional Charts or Data would go here */}
      <div className="bg-white rounded-xl border border-border p-6 shadow-sm min-h-[300px] flex items-center justify-center">
        <div className="text-center">
          <Package className="mx-auto text-muted-foreground opacity-50 mb-4" size={48} />
          <p className="text-muted-foreground">Gunakan menu di samping untuk mengelola toko.</p>
        </div>
      </div>
    </div>
  );
}
