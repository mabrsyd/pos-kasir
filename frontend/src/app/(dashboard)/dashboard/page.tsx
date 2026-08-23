'use client';

import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import Link from 'next/link';
import { 
  TrendingUp, 
  Package, 
  ShoppingCart, 
  AlertTriangle,
  Banknote,
  CreditCard,
  Fuel,
  ArrowUpRight,
  Receipt,
  Building2,
  Calendar,
  Sparkles,
  ArrowDownRight,
  Percent
} from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export default function DashboardPage() {
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['dashboard-summary'],
    queryFn: async () => {
      const res: any = await api.get('/dashboard');
      return res?.data ?? res;
    },
    refetchInterval: 30000, // Refresh every 30s
  });

  if (isLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="flex justify-between items-center">
          <div className="space-y-2">
            <div className="h-8 w-64 bg-zinc-200 rounded"></div>
            <div className="h-4 w-96 bg-zinc-200 rounded"></div>
          </div>
          <div className="h-10 w-36 bg-zinc-200 rounded-lg"></div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-32 bg-zinc-200 rounded-xl"></div>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 h-80 bg-zinc-200 rounded-xl"></div>
          <div className="h-80 bg-zinc-200 rounded-xl"></div>
        </div>
      </div>
    );
  }

  const payload = data?.data ?? data ?? {};

  const salesToday = payload.salesToday || {
    total: 0,
    transactionCount: 0,
    itemsSold: 0,
    cogs: 0,
    grossProfit: 0,
    cashTotal: 0,
    digitalTotal: 0,
  };

  const fuelToday = payload.fuelToday || {
    liters: 0,
    revenue: 0,
    count: 0,
  };

  const expenses = payload.expenses || { total: 0, count: 0 };
  const estimatedNetProfit = payload.estimatedNetProfit ?? (salesToday.grossProfit - expenses.total);
  const lowStockProducts = payload.lowStockProducts || [];
  const lowStockCount = payload.lowStockCount ?? lowStockProducts.length;
  const supplierDebt = payload.supplierDebt || { total: 0, suppliers: [] };
  const salesTrend = payload.salesTrend || [];
  const topProducts = payload.topProducts || [];

  // Calculate max for chart scale
  const maxTrendTotal = Math.max(...salesTrend.map((d: any) => Number(d.total) || 0), 1000000);

  // Payment method ratio
  const totalPayment = (salesToday.cashTotal || 0) + (salesToday.digitalTotal || 0);
  const cashPct = totalPayment > 0 ? Math.round((salesToday.cashTotal / totalPayment) * 100) : 0;
  const digitalPct = totalPayment > 0 ? 100 - cashPct : 0;

  // Profit margin
  const profitMargin = salesToday.total > 0 
    ? Math.round((salesToday.grossProfit / salesToday.total) * 100) 
    : 0;

  return (
    <div className="space-y-8 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-border shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl lg:text-3xl font-extrabold tracking-tight text-zinc-900">
              Dashboard Toko & Pom Mini
            </h1>
            <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-xs font-semibold px-2.5 py-0.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 mr-1.5 animate-pulse"></span>
              Live Shift Aktif
            </Badge>
          </div>
          <p className="text-muted-foreground mt-1 text-sm">
            Ringkasan performa penjualan real-time, estimasi laba rugi, arus kas, dan stok toko.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link href="/pos">
            <Button className="bg-primary hover:bg-primary/90 shadow-md flex items-center gap-2">
              <ShoppingCart size={18} />
              Buka Kasir (POS)
            </Button>
          </Link>
          <Link href="/fuel">
            <Button variant="outline" className="border-amber-300 bg-amber-50 text-amber-900 hover:bg-amber-100 flex items-center gap-2">
              <Fuel size={18} className="text-amber-600" />
              Pom Mini
            </Button>
          </Link>
        </div>
      </div>

      {/* 6 Primary KPI Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {/* 1. Pendapatan Kotor */}
        <div className="bg-white rounded-2xl border border-border p-5 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Omzet Hari Ini</p>
            <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
              <TrendingUp size={20} />
            </div>
          </div>
          <h3 className="text-2xl font-black text-zinc-900 mt-2">
            {formatCurrency(salesToday.total)}
          </h3>
          <div className="flex items-center gap-1.5 mt-2 text-xs font-medium text-blue-600">
            <Receipt size={14} />
            <span>{salesToday.itemsSold} unit produk terjual</span>
          </div>
          <div className="absolute -right-4 -bottom-4 w-16 h-16 bg-blue-500/5 rounded-full pointer-events-none"></div>
        </div>

        {/* 2. Laba Bersih Estimasi */}
        <div className="bg-white rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50/50 to-white p-5 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-emerald-800 uppercase tracking-wider">Laba Bersih Est.</p>
            <div className="p-2 bg-emerald-500 text-white rounded-xl shadow-sm">
              <Sparkles size={20} />
            </div>
          </div>
          <h3 className="text-2xl font-black text-emerald-600 mt-2">
            {formatCurrency(estimatedNetProfit)}
          </h3>
          <div className="flex items-center gap-1.5 mt-2 text-xs font-medium text-emerald-700">
            <Percent size={14} />
            <span>Margin Bersih: {profitMargin}%</span>
          </div>
          <div className="absolute -right-4 -bottom-4 w-16 h-16 bg-emerald-500/10 rounded-full pointer-events-none"></div>
        </div>

        {/* 3. Laba Kotor */}
        <div className="bg-white rounded-2xl border border-border p-5 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Laba Kotor</p>
            <div className="p-2 bg-teal-50 text-teal-600 rounded-xl">
              <ArrowUpRight size={20} />
            </div>
          </div>
          <h3 className="text-2xl font-bold text-teal-700 mt-2">
            {formatCurrency(salesToday.grossProfit)}
          </h3>
          <p className="text-xs text-muted-foreground mt-2">
            HPP: {formatCurrency(salesToday.cogs || (salesToday.total - salesToday.grossProfit))}
          </p>
        </div>

        {/* 4. Total Transaksi */}
        <div className="bg-white rounded-2xl border border-border p-5 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Total Struk</p>
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
              <ShoppingCart size={20} />
            </div>
          </div>
          <h3 className="text-2xl font-black text-zinc-900 mt-2">
            {salesToday.transactionCount} <span className="text-sm font-normal text-muted-foreground">transaksi</span>
          </h3>
          <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
            <span className="text-emerald-600 font-semibold">{salesToday.cashTotal > 0 ? 'Tunai' : ''}</span>
            <span>&bull;</span>
            <span className="text-indigo-600 font-semibold">QRIS / Digital</span>
          </div>
        </div>

        {/* 5. Pengeluaran Hari Ini */}
        <div className="bg-white rounded-2xl border border-border p-5 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Biaya Operasional</p>
            <div className="p-2 bg-amber-50 text-amber-600 rounded-xl">
              <ArrowDownRight size={20} />
            </div>
          </div>
          <h3 className="text-2xl font-bold text-amber-600 mt-2">
            {formatCurrency(expenses.total)}
          </h3>
          <p className="text-xs text-muted-foreground mt-2">
            {expenses.count} pos pengeluaran kasir
          </p>
        </div>

        {/* 6. Stok Menipis Alert */}
        <div className={`rounded-2xl border p-5 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden ${
          lowStockCount > 0 ? 'bg-red-50/50 border-red-200' : 'bg-white border-border'
        }`}>
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-red-800 uppercase tracking-wider">Stok Menipis</p>
            <div className="p-2 bg-red-100 text-red-600 rounded-xl">
              <AlertTriangle size={20} />
            </div>
          </div>
          <h3 className="text-2xl font-black text-red-600 mt-2">
            {lowStockCount} <span className="text-sm font-normal text-red-500">item</span>
          </h3>
          <p className="text-xs text-red-700/80 mt-2 font-medium">
            {lowStockCount > 0 ? 'Perlu segera restock' : 'Semua stok aman'}
          </p>
        </div>
      </div>

      {/* Middle Section: Sales Trend Chart & Payment / Fuel Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Sales Trend (7 Days) */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-border p-6 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-lg font-bold text-zinc-900 flex items-center gap-2">
                <Calendar size={20} className="text-primary" />
                Tren Penjualan 7 Hari Terakhir
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">Perbandingan omzet harian toko dan pom mini</p>
            </div>
            <Badge variant="secondary" className="font-semibold text-xs bg-zinc-100">
              7 Hari Terakhir
            </Badge>
          </div>

          {/* Bar Chart Visualization */}
          <div className="space-y-4 pt-2">
            <div className="grid grid-cols-7 gap-2 sm:gap-4 items-end h-48 sm:h-56 pb-2 border-b border-border">
              {salesTrend.map((day: any, idx: number) => {
                const total = Number(day.total) || 0;
                const count = Number(day.count) || 0;
                const heightPct = Math.max(Math.round((total / maxTrendTotal) * 100), 8);
                const isLatest = idx === salesTrend.length - 1;

                // Format short date
                const dateObj = new Date(day.date);
                const dayName = dateObj.toLocaleDateString('id-ID', { weekday: 'short' });
                const dateNum = dateObj.toLocaleDateString('id-ID', { day: 'numeric', month: 'numeric' });

                return (
                  <div key={day.date} className="flex flex-col items-center h-full justify-end group">
                    {/* Tooltip / Value on hover or top */}
                    <span className="text-[10px] sm:text-xs font-bold text-zinc-700 opacity-80 group-hover:opacity-100 transition-opacity mb-1 text-center whitespace-nowrap">
                      {(total / 1000).toLocaleString('id-ID')}k
                    </span>

                    {/* Bar */}
                    <div 
                      className={`w-full max-w-[48px] rounded-t-xl transition-all duration-500 ease-out group-hover:scale-105 shadow-sm relative ${
                        isLatest 
                          ? 'bg-gradient-to-t from-primary to-blue-500 ring-2 ring-primary/20' 
                          : 'bg-zinc-200 group-hover:bg-primary/70'
                      }`}
                      style={{ height: `${heightPct}%` }}
                    >
                      {isLatest && (
                        <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-2 h-2 bg-emerald-400 rounded-full ring-2 ring-white"></div>
                      )}
                    </div>

                    {/* Label */}
                    <div className="text-center mt-2">
                      <p className={`text-xs font-semibold ${isLatest ? 'text-primary font-bold' : 'text-zinc-600'}`}>
                        {isLatest ? 'Hari Ini' : dayName}
                      </p>
                      <p className="text-[10px] text-muted-foreground">{dateNum}</p>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Quick Chart Legend */}
            <div className="flex items-center justify-between text-xs text-muted-foreground pt-1">
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded bg-primary inline-block"></span> Hari Ini
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded bg-zinc-200 inline-block"></span> Hari Sebelumnya
              </span>
              <span className="font-semibold text-zinc-700">
                Rata-rata: {formatCurrency(Math.round(salesTrend.reduce((s: number, d: any) => s + Number(d.total), 0) / (salesTrend.length || 1)))}/hari
              </span>
            </div>
          </div>
        </div>

        {/* Payment Methods & Fuel Breakdown Card */}
        <div className="space-y-6">
          {/* Payment Split Card */}
          <div className="bg-white rounded-2xl border border-border p-6 shadow-sm">
            <h2 className="text-base font-bold text-zinc-900 mb-4 flex items-center justify-between">
              <span>Metode Pembayaran Hari Ini</span>
              <Badge variant="outline" className="text-xs font-normal">Hari Ini</Badge>
            </h2>

            {/* Visual Progress Bar */}
            <div className="w-full h-3 bg-zinc-100 rounded-full overflow-hidden flex mb-4">
              <div className="bg-emerald-500 h-full transition-all" style={{ width: `${cashPct}%` }}></div>
              <div className="bg-indigo-600 h-full transition-all" style={{ width: `${digitalPct}%` }}></div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-emerald-50/60 rounded-xl border border-emerald-100">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-emerald-500 text-white rounded-lg">
                    <Banknote size={18} />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-emerald-950">Tunai (Cash)</p>
                    <p className="text-xs text-emerald-700">{cashPct}% dari total</p>
                  </div>
                </div>
                <span className="font-bold text-sm text-emerald-700">
                  {formatCurrency(salesToday.cashTotal)}
                </span>
              </div>

              <div className="flex items-center justify-between p-3 bg-indigo-50/60 rounded-xl border border-indigo-100">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-indigo-600 text-white rounded-lg">
                    <CreditCard size={18} />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-indigo-950">QRIS / Non-Tunai</p>
                    <p className="text-xs text-indigo-700">{digitalPct}% dari total</p>
                  </div>
                </div>
                <span className="font-bold text-sm text-indigo-700">
                  {formatCurrency(salesToday.digitalTotal)}
                </span>
              </div>
            </div>
          </div>

          {/* Pom Mini Quick Widget */}
          <div className="bg-gradient-to-br from-zinc-900 to-zinc-800 text-white rounded-2xl p-6 shadow-md border border-zinc-700">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-amber-500 text-zinc-950 rounded-xl font-bold">
                  <Fuel size={20} />
                </div>
                <div>
                  <h3 className="font-bold text-base text-amber-400">Pom Mini (BBM)</h3>
                  <p className="text-xs text-zinc-400">Penjualan bahan bakar hari ini</p>
                </div>
              </div>
              <Link href="/fuel">
                <Button size="sm" variant="secondary" className="h-8 text-xs bg-zinc-700 hover:bg-zinc-600 text-white">
                  Buka Pom
                </Button>
              </Link>
            </div>

            <div className="grid grid-cols-2 gap-4 pt-2 border-t border-zinc-700/60">
              <div>
                <p className="text-xs text-zinc-400">Volume Terjual</p>
                <p className="text-2xl font-black text-white mt-1">
                  {Number(fuelToday.liters || 0).toFixed(1)} <span className="text-xs font-normal text-amber-400">Liter</span>
                </p>
              </div>
              <div>
                <p className="text-xs text-zinc-400">Omzet BBM</p>
                <p className="text-2xl font-black text-emerald-400 mt-1">
                  {formatCurrency(fuelToday.revenue)}
                </p>
              </div>
            </div>
          </div>

        </div>

      </div>

      {/* Bottom Grid: Top Selling Products & Low Stock Alerts + Supplier Debts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Top 5 Products Today */}
        <div className="bg-white rounded-2xl border border-border p-6 shadow-sm">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-lg font-bold text-zinc-900 flex items-center gap-2">
                <Package size={20} className="text-emerald-600" />
                Produk Terlaris Hari Ini
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">Berdasarkan total omzet penjualan hari ini</p>
            </div>
            <Link href="/reports">
              <Button variant="ghost" size="sm" className="text-xs text-primary font-semibold">
                Lihat Semua &rarr;
              </Button>
            </Link>
          </div>

          <div className="space-y-3">
            {topProducts.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">Belum ada transaksi hari ini.</p>
            ) : (
              topProducts.slice(0, 5).map((prod: any, idx: number) => {
                const rankColor = 
                  idx === 0 ? 'bg-amber-400 text-amber-950 font-black' :
                  idx === 1 ? 'bg-zinc-200 text-zinc-800 font-bold' :
                  idx === 2 ? 'bg-amber-700/20 text-amber-900 font-bold' :
                  'bg-zinc-100 text-zinc-600 font-medium';

                return (
                  <div key={prod.productId || idx} className="flex items-center justify-between p-3 rounded-xl border border-zinc-100 hover:bg-zinc-50 transition-colors">
                    <div className="flex items-center gap-3 min-w-0">
                      <span className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs shrink-0 ${rankColor}`}>
                        #{idx + 1}
                      </span>
                      <div className="truncate">
                        <p className="font-semibold text-sm text-zinc-900 truncate">{prod.name}</p>
                        <p className="text-xs text-muted-foreground">
                          Terjual: <span className="font-bold text-zinc-700">{prod.quantity} unit</span>
                        </p>
                      </div>
                    </div>
                    <span className="font-bold text-sm text-emerald-600 shrink-0 ml-4">
                      {formatCurrency(prod.total)}
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Low Stock Alerts & Supplier Debt Column */}
        <div className="space-y-6">
          
          {/* Low Stock Products */}
          <div className="bg-white rounded-2xl border border-border p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-bold text-zinc-900 flex items-center gap-2">
                  <AlertTriangle size={20} className="text-red-500" />
                  Peringatan Stok Menipis
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">Produk dengan stok di bawah batas minimum</p>
              </div>
              <Link href="/products">
                <Button variant="ghost" size="sm" className="text-xs text-primary font-semibold">
                  Kelola Stok &rarr;
                </Button>
              </Link>
            </div>

            <div className="space-y-2.5">
              {lowStockProducts.length === 0 ? (
                <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-200 text-center text-emerald-800 text-xs font-semibold">
                  Semua stok produk dalam kondisi aman & mencukupi!
                </div>
              ) : (
                lowStockProducts.slice(0, 4).map((p: any) => (
                  <div key={p.id} className="flex items-center justify-between p-3 rounded-xl bg-red-50/50 border border-red-100">
                    <div>
                      <p className="font-semibold text-sm text-zinc-900">{p.name}</p>
                      <p className="text-xs text-muted-foreground font-mono">{p.sku}</p>
                    </div>
                    <div className="text-right">
                      <Badge variant="destructive" className="text-xs font-bold px-2 py-0.5">
                        Sisa: {Number(p.currentStock)} {p.unit?.name || 'pcs'}
                      </Badge>
                      <p className="text-[11px] text-muted-foreground mt-0.5">Min: {Number(p.minimumStock)}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Outstanding Supplier Debt */}
          <div className="bg-white rounded-2xl border border-border p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-bold text-zinc-900 flex items-center gap-2">
                  <Building2 size={20} className="text-indigo-600" />
                  Hutang Pembelian ke Supplier
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">Jatuh tempo hutang dagang barang masuk</p>
              </div>
              <Link href="/purchases">
                <Button variant="ghost" size="sm" className="text-xs text-primary font-semibold">
                  Riwayat &rarr;
                </Button>
              </Link>
            </div>

            <div className="p-4 bg-indigo-50/60 rounded-xl border border-indigo-100 mb-3 flex items-center justify-between">
              <span className="text-xs font-semibold text-indigo-900">Total Kewajiban Hutang:</span>
              <span className="text-lg font-black text-indigo-700">{formatCurrency(supplierDebt.total)}</span>
            </div>

            <div className="space-y-2">
              {supplierDebt.suppliers?.map((sup: any) => (
                <div key={sup.id} className="flex items-center justify-between text-xs py-1.5 border-b border-zinc-100 last:border-0">
                  <span className="font-medium text-zinc-800 truncate pr-2">{sup.name}</span>
                  <span className="font-bold text-destructive whitespace-nowrap">{formatCurrency(Number(sup.totalDebt))}</span>
                </div>
              ))}
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
