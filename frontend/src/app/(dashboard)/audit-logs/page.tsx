'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { formatDate } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ShieldAlert, Search, RefreshCw, ChevronLeft, ChevronRight } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';

export default function AuditLogsPage() {
  const { user } = useAuthStore();
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  
  const [filters, setFilters] = useState({
    action: '',
    entityType: '',
    startDate: '',
    endDate: ''
  });

  const { data: auditData, isLoading, refetch } = useQuery({
    queryKey: ['audit-logs', page, limit, filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.append('page', page.toString());
      params.append('limit', limit.toString());
      
      if (filters.action) params.append('action', filters.action);
      if (filters.entityType) params.append('entityType', filters.entityType);
      if (filters.startDate) params.append('startDate', filters.startDate);
      if (filters.endDate) params.append('endDate', filters.endDate);
      
      const res = await api.get(`/audit-logs?${params.toString()}`);
      return res.data;
    },
    enabled: user?.role === 'OWNER'
  });

  const logs = auditData?.data || [];
  const meta = auditData?.meta || { totalPages: 1, total: 0 };

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPage(1);
  };

  const getActionColor = (action: string) => {
    switch (action) {
      case 'CREATE': return 'bg-emerald-100 text-emerald-800';
      case 'UPDATE': return 'bg-blue-100 text-blue-800';
      case 'DELETE': return 'bg-rose-100 text-rose-800';
      case 'VOID': return 'bg-amber-100 text-amber-800';
      case 'LOGIN': return 'bg-zinc-100 text-zinc-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (user?.role !== 'OWNER') {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-center">
        <ShieldAlert size={64} className="text-destructive mb-4" />
        <h2 className="text-2xl font-bold text-foreground">Akses Ditolak</h2>
        <p className="text-muted-foreground mt-2">Hanya OWNER yang dapat melihat log aktivitas sistem.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
          <ShieldAlert className="text-rose-600" /> Riwayat Aktivitas (Audit Logs)
        </h1>
        <p className="text-muted-foreground mt-1">Pemantauan seluruh aktivitas sensitif dalam sistem yang dilakukan oleh pengguna.</p>
      </div>

      <Card>
        <CardHeader className="pb-4">
          <div className="flex flex-col md:flex-row gap-4 items-end">
            <div className="space-y-2 flex-1">
              <label className="text-sm font-medium text-muted-foreground">Jenis Aksi</label>
              <select 
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={filters.action}
                onChange={e => handleFilterChange('action', e.target.value)}
              >
                <option value="">Semua Aksi</option>
                <option value="CREATE">CREATE</option>
                <option value="UPDATE">UPDATE</option>
                <option value="DELETE">DELETE</option>
                <option value="VOID">VOID</option>
                <option value="LOGIN">LOGIN</option>
              </select>
            </div>
            
            <div className="space-y-2 flex-1">
              <label className="text-sm font-medium text-muted-foreground">Entitas (Modul)</label>
              <select 
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={filters.entityType}
                onChange={e => handleFilterChange('entityType', e.target.value)}
              >
                <option value="">Semua Modul</option>
                <option value="Sale">Sale (Penjualan)</option>
                <option value="Product">Product (Produk)</option>
                <option value="StockMovement">Stock (Stok)</option>
                <option value="Return">Return (Retur)</option>
                <option value="CashSession">CashSession (Sesi Kasir)</option>
                <option value="User">User (Pengguna)</option>
              </select>
            </div>

            <div className="space-y-2 flex-1">
              <label className="text-sm font-medium text-muted-foreground">Dari Tanggal</label>
              <Input 
                type="date" 
                value={filters.startDate}
                onChange={e => handleFilterChange('startDate', e.target.value)}
              />
            </div>
            
            <div className="space-y-2 flex-1">
              <label className="text-sm font-medium text-muted-foreground">Sampai Tanggal</label>
              <Input 
                type="date" 
                value={filters.endDate}
                onChange={e => handleFilterChange('endDate', e.target.value)}
              />
            </div>
            
            <Button variant="outline" onClick={() => {
              setFilters({ action: '', entityType: '', startDate: '', endDate: '' });
              setPage(1);
            }}>
              <RefreshCw size={16} className="mr-2" /> Reset
            </Button>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-12 text-center text-muted-foreground animate-pulse">
              Memuat data log aktivitas...
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Waktu</TableHead>
                    <TableHead>Aksi</TableHead>
                    <TableHead>Pengguna</TableHead>
                    <TableHead>Modul (ID)</TableHead>
                    <TableHead>Detail Perubahan</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="h-32 text-center text-muted-foreground">
                        Tidak ada catatan aktivitas yang sesuai dengan filter.
                      </TableCell>
                    </TableRow>
                  ) : (
                    logs.map((log: any) => (
                      <TableRow key={log.id}>
                        <TableCell className="whitespace-nowrap">
                          <div className="text-sm font-medium">{formatDate(log.createdAt)}</div>
                          <div className="text-xs text-muted-foreground">IP: {log.ipAddress || '-'}</div>
                        </TableCell>
                        <TableCell>
                          <span className={`text-[10px] font-bold px-2 py-1 rounded uppercase ${getActionColor(log.action)}`}>
                            {log.action}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className="font-semibold">{log.user?.fullName || 'Sistem'}</span>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm font-medium text-primary">{log.entityType}</div>
                          <div className="text-xs text-muted-foreground font-mono mt-1">{log.entityId || '-'}</div>
                        </TableCell>
                        <TableCell className="max-w-md">
                          <div className="text-sm bg-zinc-50 p-2 rounded border border-border whitespace-pre-wrap max-h-24 overflow-y-auto">
                            {JSON.stringify(log.details, null, 2)}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
              
              {/* Pagination */}
              {meta.totalPages > 1 && (
                <div className="flex items-center justify-between p-4 border-t border-border">
                  <p className="text-sm text-muted-foreground">
                    Menampilkan total {meta.total} aktivitas
                  </p>
                  <div className="flex items-center gap-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      disabled={page === 1}
                      onClick={() => setPage(p => p - 1)}
                    >
                      <ChevronLeft size={16} />
                    </Button>
                    <span className="text-sm font-medium px-4">
                      Halaman {page} dari {meta.totalPages}
                    </span>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      disabled={page === meta.totalPages}
                      onClick={() => setPage(p => p + 1)}
                    >
                      <ChevronRight size={16} />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
