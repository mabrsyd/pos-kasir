'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, ReceiptText, Calendar, Printer, Ban } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { toast } from 'sonner';

export default function SalesHistoryPage() {
  const { user } = useAuthStore();
  const [search, setSearch] = useState('');
  const [selectedSale, setSelectedSale] = useState<any>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  const { data: salesData, isLoading, refetch } = useQuery({
    queryKey: ['sales'],
    queryFn: async () => {
      // By default backend should return sales, maybe we should add query params like ?limit=50 or ?date=today
      const res = await api.get('/sales');
      return res.data;
    }
  });

  const sales = Array.isArray(salesData) ? salesData : (salesData?.data || []);
  
  // Filter sales based on search (invoice number)
  const filteredSales = sales.filter((s: any) => 
    (s.invoiceNumber || '').toLowerCase().includes(search.toLowerCase())
  );

  const handleVoidSale = async (id: string) => {
    if (!confirm('Apakah Anda yakin ingin me-VOID (membatalkan) transaksi ini? Stok akan dikembalikan.')) return;
    try {
      await api.post(`/sales/${id}/void`);
      toast.success('Transaksi berhasil dibatalkan (VOID)');
      setIsDetailOpen(false);
      refetch();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Gagal membatalkan transaksi');
    }
  };

  const openDetail = (sale: any) => {
    setSelectedSale(sale);
    setIsDetailOpen(true);
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-24 lg:pb-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Riwayat Transaksi</h1>
        <p className="text-muted-foreground mt-1">Daftar transaksi penjualan yang telah selesai.</p>
      </div>

      <div className="flex items-center space-x-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Cari No. Invoice..." 
            className="pl-9 bg-white"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <Card className="shadow-sm">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8 text-center text-muted-foreground animate-pulse">Memuat riwayat transaksi...</div>
          ) : filteredSales.length === 0 ? (
            <div className="p-12 flex flex-col items-center justify-center text-muted-foreground">
              <ReceiptText size={48} className="mb-4 opacity-50" />
              <p>Belum ada transaksi ditemukan.</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {filteredSales.map((sale: any) => (
                <div 
                  key={sale.id} 
                  onClick={() => openDetail(sale)}
                  className="p-4 flex flex-col sm:flex-row sm:items-center justify-between hover:bg-zinc-50 cursor-pointer transition-colors active:bg-zinc-100 touch-manipulation"
                >
                  <div className="flex items-start gap-4">
                    <div className={`p-2 rounded-lg shrink-0 mt-1 sm:mt-0 ${sale.status === 'VOID' ? 'bg-zinc-100 text-zinc-500' : 'bg-primary/10 text-primary'}`}>
                      <ReceiptText size={20} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`font-semibold ${sale.status === 'VOID' ? 'line-through text-muted-foreground' : ''}`}>
                          {sale.invoiceNumber}
                        </span>
                        {sale.status === 'VOID' && <Badge variant="destructive" className="text-[10px] h-5">VOID</Badge>}
                        {sale.payments?.[0]?.method === 'DIGITAL' && <Badge variant="secondary" className="text-[10px] h-5 bg-blue-100 text-blue-700">QRIS/Digital</Badge>}
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1"><Calendar size={12} /> {formatDate(sale.createdAt)}</span>
                        <span>Kasir: {sale.user?.fullName || 'Sistem'}</span>
                      </div>
                    </div>
                  </div>
                  <div className="mt-3 sm:mt-0 sm:text-right flex items-center justify-between sm:block pl-14 sm:pl-0">
                    <span className="text-xs text-muted-foreground sm:hidden">Total: </span>
                    <span className={`font-bold text-lg ${sale.status === 'VOID' ? 'text-muted-foreground' : 'text-foreground'}`}>
                      {formatCurrency(Number(sale.total))}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Sale Detail Modal */}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="sm:max-w-md bg-white p-0 overflow-hidden rounded-2xl">
          {selectedSale && (
            <>
              <div className="bg-zinc-50 border-b border-border p-6 text-center">
                <ReceiptText size={32} className="mx-auto mb-3 text-primary opacity-80" />
                <DialogTitle className="text-xl font-bold">{selectedSale.invoiceNumber}</DialogTitle>
                <DialogDescription className="mt-1">{formatDate(selectedSale.createdAt)}</DialogDescription>
                {selectedSale.status === 'VOID' && (
                  <div className="mt-3 inline-block bg-destructive/10 text-destructive px-3 py-1 rounded-full text-sm font-bold border border-destructive/20">
                    TRANSAKSI DIBATALKAN (VOID)
                  </div>
                )}
              </div>
              
              <div className="p-6 max-h-[50vh] overflow-y-auto">
                <div className="space-y-4">
                  <div>
                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Item Pembelian</p>
                    <ul className="space-y-3">
                      {selectedSale.items?.map((item: any) => (
                        <li key={item.id} className="flex justify-between items-start">
                          <div>
                            <p className="font-medium text-sm">{item.productName}</p>
                            <p className="text-xs text-muted-foreground">
                              {item.quantity} x {formatCurrency(Number(item.sellingPrice))}
                            </p>
                          </div>
                          <span className="font-semibold text-sm">
                            {formatCurrency(Number(item.subtotal))}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  
                  <div className="border-t border-dashed border-border pt-4 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Subtotal</span>
                      <span>{formatCurrency(Number(selectedSale.total))}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Metode Pembayaran</span>
                      <span className="font-medium">{selectedSale.payments?.[0]?.method || '-'}</span>
                    </div>
                    <div className="flex justify-between font-bold text-lg pt-2 border-t border-border">
                      <span>Total</span>
                      <span className="text-primary">{formatCurrency(Number(selectedSale.total))}</span>
                    </div>
                  </div>
                  
                  {selectedSale.payments?.find((p: any) => p.method === 'CASH') && (
                    <div className="bg-zinc-50 p-3 rounded-lg text-sm space-y-1">
                      <div className="flex justify-between text-muted-foreground">
                        <span>Tunai Diterima</span>
                        <span>{formatCurrency(Number(selectedSale.payments.find((p: any) => p.method === 'CASH')?.amountReceived || 0))}</span>
                      </div>
                      <div className="flex justify-between text-emerald-600 font-medium">
                        <span>Kembalian</span>
                        <span>{formatCurrency(Number(selectedSale.payments.find((p: any) => p.method === 'CASH')?.change || 0))}</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              
              <div className="p-4 border-t border-border bg-zinc-50 flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => toast.info('Fitur cetak struk hardware sedang dikembangkan')}>
                  <Printer size={16} className="mr-2" /> Cetak
                </Button>
                {/* Only allow void if not already voided and user has permission (Owner/Admin usually, but we can let Cashier void today's trans if allowed) */}
                {selectedSale.status !== 'VOID' && user?.role !== 'CASHIER' && (
                  <Button variant="destructive" className="flex-1" onClick={() => handleVoidSale(selectedSale.id)}>
                    <Ban size={16} className="mr-2" /> Void
                  </Button>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
