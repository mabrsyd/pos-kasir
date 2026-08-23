'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { FileText, TrendingUp, Download, PieChart } from 'lucide-react';

export default function ReportsPage() {
  const [reportType, setReportType] = useState<'sales' | 'profit' | 'stock'>('profit');

  const { data, isLoading } = useQuery({
    queryKey: ['reports', reportType],
    queryFn: async () => {
      const res = await api.get(`/reports/${reportType}`);
      return res.data;
    }
  });

  const renderContent = () => {
    if (isLoading) return <div className="p-8 text-center animate-pulse">Memuat laporan...</div>;
    
    if (reportType === 'profit') {
      const report = data || {};
      return (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white p-4 rounded-xl border">
              <p className="text-sm text-muted-foreground">Total Pendapatan</p>
              <h3 className="text-2xl font-bold">{formatCurrency(report.totalRevenue || 0)}</h3>
            </div>
            <div className="bg-white p-4 rounded-xl border">
              <p className="text-sm text-muted-foreground">Total HPP (Modal)</p>
              <h3 className="text-2xl font-bold">{formatCurrency(report.totalCOGS || 0)}</h3>
            </div>
            <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-200">
              <p className="text-sm text-emerald-800 font-medium">Estimasi Laba Kotor</p>
              <h3 className="text-2xl font-bold text-emerald-600">{formatCurrency(report.grossProfit || 0)}</h3>
            </div>
          </div>
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Ringkasan Laba</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Metrik</TableHead>
                    <TableHead className="text-right">Nilai</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell>Pendapatan Kotor</TableCell>
                    <TableCell className="text-right font-medium">{formatCurrency(report.totalRevenue || 0)}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>Harga Pokok Penjualan (HPP)</TableCell>
                    <TableCell className="text-right text-destructive">-{formatCurrency(report.totalCOGS || 0)}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-bold">Laba Kotor</TableCell>
                    <TableCell className="text-right font-bold text-emerald-600">{formatCurrency(report.grossProfit || 0)}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>Pengeluaran Operasional</TableCell>
                    <TableCell className="text-right text-destructive">-{formatCurrency(report.totalExpenses || 0)}</TableCell>
                  </TableRow>
                  <TableRow className="bg-primary/5">
                    <TableCell className="font-bold text-primary">Laba Bersih (Estimasi)</TableCell>
                    <TableCell className="text-right font-bold text-primary text-xl">{formatCurrency(report.netProfit || 0)}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      );
    }

    if (reportType === 'sales') {
      const sales = data?.sales || [];
      return (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Laporan Penjualan</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tanggal</TableHead>
                  <TableHead>ID Transaksi</TableHead>
                  <TableHead>Kasir</TableHead>
                  <TableHead className="text-right">Total Transaksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sales.length === 0 ? (
                  <TableRow><TableCell colSpan={4} className="text-center p-8">Belum ada penjualan</TableCell></TableRow>
                ) : (
                  sales.map((s:any) => (
                    <TableRow key={s.id}>
                      <TableCell>{formatDate(s.createdAt)}</TableCell>
                      <TableCell><span className="text-xs bg-zinc-100 p-1 rounded font-mono">{s.id}</span></TableCell>
                      <TableCell>{s.cashier?.fullName || '-'}</TableCell>
                      <TableCell className="text-right font-bold text-emerald-600">{formatCurrency(Number(s.totalAmount))}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      );
    }

    if (reportType === 'stock') {
      const stock = data?.items || [];
      return (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Laporan Valuasi Stok</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Produk</TableHead>
                  <TableHead>Stok Tersedia</TableHead>
                  <TableHead>Harga Modal</TableHead>
                  <TableHead className="text-right">Valuasi (Estimasi Aset)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stock.length === 0 ? (
                  <TableRow><TableCell colSpan={4} className="text-center p-8">Tidak ada data stok</TableCell></TableRow>
                ) : (
                  stock.map((s:any) => (
                    <TableRow key={s.id}>
                      <TableCell>{s.name}</TableCell>
                      <TableCell>{s.currentStock}</TableCell>
                      <TableCell>{formatCurrency(Number(s.purchasePrice))}</TableCell>
                      <TableCell className="text-right font-bold text-blue-600">
                        {formatCurrency(Number(s.currentStock) * Number(s.purchasePrice))}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      );
    }

    return null;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <PieChart className="text-blue-500" /> Laporan & Analitik
          </h1>
          <p className="text-muted-foreground mt-1">Pantau performa penjualan, laba rugi, dan valuasi stok Anda.</p>
        </div>
        <Button variant="outline">
          <Download size={16} className="mr-2" /> Ekspor PDF
        </Button>
      </div>

      <div className="flex gap-2 p-1 bg-zinc-100 rounded-lg inline-flex">
        <button 
          className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${reportType === 'profit' ? 'bg-white shadow text-primary' : 'text-muted-foreground hover:bg-zinc-200'}`}
          onClick={() => setReportType('profit')}
        >
          Laba Rugi (Profit)
        </button>
        <button 
          className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${reportType === 'sales' ? 'bg-white shadow text-primary' : 'text-muted-foreground hover:bg-zinc-200'}`}
          onClick={() => setReportType('sales')}
        >
          Penjualan Detail
        </button>
        <button 
          className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${reportType === 'stock' ? 'bg-white shadow text-primary' : 'text-muted-foreground hover:bg-zinc-200'}`}
          onClick={() => setReportType('stock')}
        >
          Valuasi Stok
        </button>
      </div>

      {renderContent()}
    </div>
  );
}
