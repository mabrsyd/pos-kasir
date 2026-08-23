'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Search, RotateCcw, AlertTriangle, FileWarning, SearchCode } from 'lucide-react';
import { toast } from 'sonner';

export default function ReturnsPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  
  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchInvoice, setSearchInvoice] = useState('');
  const [activeSale, setActiveSale] = useState<any>(null);
  
  // Return / Void inputs
  const [actionType, setActionType] = useState<'VOID' | 'RETURN'>('VOID');
  const [reason, setReason] = useState('');
  const [returnItems, setReturnItems] = useState<any[]>([]);

  const { data: returnsData, isLoading } = useQuery({
    queryKey: ['returns'],
    queryFn: async () => {
      const res = await api.get('/returns');
      return res.data;
    }
  });

  const searchSale = useMutation({
    mutationFn: async () => {
      // In a real scenario we might search by invoice ID or invoice Number, assuming searchInvoice is the exact ID or we fetch all and find it. 
      // For simplicity, we just fetch /sales/:id
      const res = await api.get(`/sales/${searchInvoice}`);
      return res.data;
    },
    onSuccess: (data) => {
      setActiveSale(data);
      if(data.items) {
        setReturnItems(data.items.map((i:any) => ({
          productId: i.productId,
          productName: i.product?.name,
          maxQty: i.quantity,
          returnQty: 0,
          condition: 'GOOD'
        })));
      }
    },
    onError: () => {
      toast.error('Transaksi tidak ditemukan atau sudah dibatalkan.');
      setActiveSale(null);
    }
  });

  const processVoid = useMutation({
    mutationFn: async () => {
      const res = await api.post(`/sales/${activeSale.id}/void`, { reason });
      return res.data;
    },
    onSuccess: () => {
      toast.success('Transaksi berhasil di-VOID.');
      resetModal();
    },
    onError: (err: any) => toast.error(err?.response?.data?.message || err?.message || 'Gagal membatalkan transaksi')
  });

  const processReturn = useMutation({
    mutationFn: async () => {
      const itemsToReturn = returnItems
        .filter(i => i.returnQty > 0)
        .map(i => ({
          productId: i.productId,
          quantity: i.returnQty,
          condition: i.condition
        }));

      if (itemsToReturn.length === 0) throw new Error('Pilih minimal 1 barang untuk diretur');

      const res = await api.post('/returns', {
        saleId: activeSale.id,
        reason,
        items: itemsToReturn
      });
      return res.data;
    },
    onSuccess: () => {
      toast.success('Retur berhasil diproses.');
      queryClient.invalidateQueries({ queryKey: ['returns'] });
      resetModal();
    },
    onError: (err: any) => toast.error(err?.response?.data?.message || err?.message || 'Gagal memproses retur')
  });

  const resetModal = () => {
    setIsModalOpen(false);
    setActiveSale(null);
    setSearchInvoice('');
    setReason('');
    setReturnItems([]);
  };

  const returns = returnsData || [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <RotateCcw className="text-rose-500" /> Retur & Pembatalan
          </h1>
          <p className="text-muted-foreground mt-1">Kelola pengembalian barang dari pelanggan dan pembatalan transaksi (VOID).</p>
        </div>
        
        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogTrigger asChild>
            <Button className="shrink-0 bg-rose-600 hover:bg-rose-700">
              <FileWarning size={18} className="mr-2" /> Proses Retur / Void
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Proses Retur / Batal Transaksi</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              
              {/* Search Sale Step */}
              <div className="flex gap-2">
                <Input 
                  placeholder="Masukkan ID Transaksi (Invoice)..." 
                  value={searchInvoice}
                  onChange={e => setSearchInvoice(e.target.value)}
                />
                <Button variant="secondary" onClick={() => searchSale.mutate()} disabled={!searchInvoice || searchSale.isPending}>
                  <SearchCode size={18} className="mr-2" /> Cari
                </Button>
              </div>

              {activeSale && (
                <div className="border rounded-xl p-4 bg-zinc-50 space-y-4">
                  <div className="flex justify-between items-center border-b pb-2">
                    <div>
                      <p className="text-xs text-muted-foreground">ID Transaksi</p>
                      <p className="font-bold">{activeSale.id}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground">Total Belanja</p>
                      <p className="font-bold text-primary">{formatCurrency(Number(activeSale.totalAmount))}</p>
                    </div>
                  </div>

                  <div className="flex gap-2 bg-white p-1 rounded-md border">
                    <Button 
                      variant={actionType === 'VOID' ? 'default' : 'ghost'} 
                      className={`flex-1 ${actionType === 'VOID' ? 'bg-rose-600' : ''}`}
                      onClick={() => setActionType('VOID')}
                    >
                      Batal Keseluruhan (VOID)
                    </Button>
                    <Button 
                      variant={actionType === 'RETURN' ? 'default' : 'ghost'} 
                      className={`flex-1 ${actionType === 'RETURN' ? 'bg-amber-600' : ''}`}
                      onClick={() => setActionType('RETURN')}
                    >
                      Retur Sebagian / Semua
                    </Button>
                  </div>

                  {actionType === 'VOID' ? (
                    <div className="space-y-3 bg-rose-50 p-3 rounded-lg border border-rose-200">
                      <p className="text-sm text-rose-800 flex items-center gap-2 font-medium">
                        <AlertTriangle size={16} /> Peringatan: Transaksi akan dibatalkan sepenuhnya dan stok dikembalikan.
                      </p>
                      <Label>Alasan Pembatalan</Label>
                      <Input value={reason} onChange={e => setReason(e.target.value)} placeholder="Contoh: Salah input barang..." />
                      <Button className="w-full bg-rose-600 hover:bg-rose-700" onClick={() => processVoid.mutate()} disabled={!reason || processVoid.isPending}>
                        Eksekusi VOID
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <Label>Pilih Barang yang Diretur</Label>
                      <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
                        {returnItems.map((item, index) => (
                          <div key={item.productId} className="flex flex-wrap items-center gap-2 p-2 border rounded-md bg-white">
                            <span className="flex-1 text-sm font-medium">{item.productName} (Maks: {item.maxQty})</span>
                            <div className="flex items-center gap-2">
                              <Input 
                                type="number" 
                                className="w-20 h-8" 
                                placeholder="Qty"
                                min={0}
                                max={item.maxQty}
                                value={item.returnQty || ''}
                                onChange={e => {
                                  let val = Number(e.target.value);
                                  if(val > item.maxQty) val = item.maxQty;
                                  if(val < 0) val = 0;
                                  const newItems = [...returnItems];
                                  newItems[index].returnQty = val;
                                  setReturnItems(newItems);
                                }}
                              />
                              <select 
                                className="h-8 rounded-md border text-sm px-2"
                                value={item.condition}
                                onChange={e => {
                                  const newItems = [...returnItems];
                                  newItems[index].condition = e.target.value;
                                  setReturnItems(newItems);
                                }}
                              >
                                <option value="GOOD">Bagus (Bisa dijual)</option>
                                <option value="DAMAGED">Rusak</option>
                              </select>
                            </div>
                          </div>
                        ))}
                      </div>
                      <Label>Alasan Retur</Label>
                      <Input value={reason} onChange={e => setReason(e.target.value)} placeholder="Contoh: Barang cacat dari pabrik..." />
                      <Button className="w-full bg-amber-600 hover:bg-amber-700" onClick={() => processReturn.mutate()} disabled={!reason || processReturn.isPending}>
                        Proses Retur Barang
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader className="pb-3 border-b border-border">
          <CardTitle className="text-lg">Riwayat Retur Barang</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8 text-center text-muted-foreground animate-pulse">
              Memuat data retur...
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tanggal</TableHead>
                  <TableHead>ID Transaksi Asal</TableHead>
                  <TableHead>Alasan</TableHead>
                  <TableHead>Jml Barang</TableHead>
                  <TableHead>Kasir</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {returns.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                      Tidak ada riwayat retur.
                    </TableCell>
                  </TableRow>
                ) : (
                  returns.map((ret: any) => (
                    <TableRow key={ret.id}>
                      <TableCell>
                        <div className="font-medium text-sm">{formatDate(ret.createdAt)}</div>
                      </TableCell>
                      <TableCell>
                        <span className="font-mono text-xs bg-zinc-100 px-2 py-1 rounded">{ret.saleId}</span>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm">{ret.reason || '-'}</span>
                      </TableCell>
                      <TableCell>
                        <span className="font-bold">{ret.items?.length || 0} item</span>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-muted-foreground">{ret.processedBy?.fullName || '-'}</span>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
