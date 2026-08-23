'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Wallet, LogIn, LogOut, ArrowDownToLine, ArrowUpFromLine } from 'lucide-react';
import { toast } from 'sonner';

export default function CashSessionPage() {
  const queryClient = useQueryClient();
  const [openingBalance, setOpeningBalance] = useState('');
  const [actualBalance, setActualBalance] = useState('');
  const [notes, setNotes] = useState('');
  
  const [txAmount, setTxAmount] = useState('');
  const [txDesc, setTxDesc] = useState('');
  const [txType, setTxType] = useState<'CASH_IN' | 'CASH_OUT'>('CASH_OUT');
  const [isTxModalOpen, setIsTxModalOpen] = useState(false);

  const { data: sessionData, isLoading } = useQuery({
    queryKey: ['current-cash-session'],
    queryFn: async () => {
      try {
        const res = await api.get('/cash-sessions/current');
        return res.data;
      } catch (err: any) {
        if (err.status === 404) return null;
        throw err;
      }
    }
  });

  const openSession = useMutation({
    mutationFn: async () => {
      const res = await api.post('/cash-sessions', { 
        openingBalance: Number(openingBalance) 
      });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['current-cash-session'] });
      setOpeningBalance('');
    }
  });

  const closeSession = useMutation({
    mutationFn: async (sessionId: string) => {
      const res = await api.post(`/cash-sessions/${sessionId}/close`, { 
        actualBalance: Number(actualBalance),
        notes 
      });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['current-cash-session'] });
      setActualBalance('');
      setNotes('');
      toast.success('Sesi kasir berhasil ditutup!');
    },
    onError: (err: any) => toast.error(err?.response?.data?.message || err?.message || 'Gagal menutup sesi kasir')
  });

  const addTransaction = useMutation({
    mutationFn: async (sessionId: string) => {
      const res = await api.post(`/cash-sessions/${sessionId}/transactions`, { 
        type: txType,
        amount: Number(txAmount),
        description: txDesc
      });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['current-cash-session'] });
      setTxAmount('');
      setTxDesc('');
      setIsTxModalOpen(false);
    }
  });

  if (isLoading) {
    return <div className="animate-pulse p-8">Memuat data sesi...</div>;
  }

  const session = sessionData;

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Sesi Kasir</h1>
        <p className="text-muted-foreground mt-1">Kelola pembukaan dan penutupan shift laci kasir (Cash Drawer).</p>
      </div>

      {!session ? (
        <Card className="max-w-md mx-auto mt-12 border-primary/20 shadow-md">
          <CardHeader className="text-center bg-primary/5 rounded-t-xl border-b border-border">
            <div className="mx-auto w-12 h-12 bg-primary/10 text-primary rounded-full flex items-center justify-center mb-3">
              <LogIn size={24} />
            </div>
            <CardTitle className="text-xl">Buka Sesi Kasir Baru</CardTitle>
            <CardDescription>Masukkan saldo awal uang tunai di laci sebelum memulai penjualan.</CardDescription>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="openingBalance">Saldo Awal (Modal Kembalian)</Label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-muted-foreground font-medium">Rp</span>
                <Input 
                  id="openingBalance"
                  type="number"
                  placeholder="0"
                  className="pl-10 text-lg"
                  value={openingBalance}
                  onChange={(e) => setOpeningBalance(e.target.value)}
                />
              </div>
            </div>
            <Button 
              className="w-full" 
              size="lg"
              disabled={!openingBalance || openSession.isPending}
              onClick={() => openSession.mutate()}
            >
              {openSession.isPending ? 'Memproses...' : 'Buka Shift Sekarang'}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2 space-y-6">
            <Card className="border-emerald-200 shadow-sm">
              <CardHeader className="bg-emerald-50 rounded-t-xl border-b border-emerald-100 pb-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-emerald-800">
                    <Wallet size={20} />
                    <CardTitle>Status: Sedang Aktif</CardTitle>
                  </div>
                  <span className="text-sm font-medium text-emerald-600">
                    Mulai: {formatDate(session.openedAt)}
                  </span>
                </div>
              </CardHeader>
              <CardContent className="p-6">
                <div className="grid grid-cols-2 gap-y-6 gap-x-4">
                  <div>
                    <p className="text-sm text-muted-foreground font-medium">Saldo Awal</p>
                    <p className="text-xl font-bold mt-1">{formatCurrency(Number(session.openingBalance))}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground font-medium">Total Uang Masuk</p>
                    <p className="text-xl font-bold mt-1 text-emerald-600">+{formatCurrency(Number(session.totalCashIn))}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground font-medium">Total Uang Keluar</p>
                    <p className="text-xl font-bold mt-1 text-destructive">-{formatCurrency(Number(session.totalCashOut))}</p>
                  </div>
                  <div className="pt-2 border-t border-dashed">
                    <p className="text-sm text-muted-foreground font-medium">Ekspektasi Uang di Laci</p>
                    <p className="text-3xl font-black text-primary mt-1">{formatCurrency(Number(session.expectedBalance))}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between border-b border-border pb-4">
                <CardTitle className="text-lg">Riwayat Kas Keluar/Masuk</CardTitle>
                
                <Dialog open={isTxModalOpen} onOpenChange={setIsTxModalOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm">Catat Kas Lainnya</Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Catat Transaksi Kas</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="grid grid-cols-2 gap-2">
                        <Button 
                          type="button" 
                          variant={txType === 'CASH_IN' ? 'default' : 'outline'}
                          className={txType === 'CASH_IN' ? 'bg-emerald-600 hover:bg-emerald-700' : ''}
                          onClick={() => setTxType('CASH_IN')}
                        >
                          <ArrowDownToLine size={16} className="mr-2" /> Uang Masuk
                        </Button>
                        <Button 
                          type="button" 
                          variant={txType === 'CASH_OUT' ? 'default' : 'outline'}
                          className={txType === 'CASH_OUT' ? 'bg-destructive hover:bg-destructive/90' : ''}
                          onClick={() => setTxType('CASH_OUT')}
                        >
                          <ArrowUpFromLine size={16} className="mr-2" /> Uang Keluar
                        </Button>
                      </div>
                      
                      <div className="space-y-2">
                        <Label>Nominal (Rp)</Label>
                        <Input 
                          type="number" 
                          value={txAmount} 
                          onChange={(e) => setTxAmount(e.target.value)} 
                          placeholder="Contoh: 50000"
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label>Keterangan</Label>
                        <Input 
                          type="text" 
                          value={txDesc} 
                          onChange={(e) => setTxDesc(e.target.value)} 
                          placeholder="Contoh: Beli galon air"
                        />
                      </div>
                      
                      <Button 
                        className="w-full mt-2" 
                        onClick={() => addTransaction.mutate(session.id)}
                        disabled={!txAmount || !txDesc || addTransaction.isPending}
                      >
                        Simpan Transaksi
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </CardHeader>
              <CardContent className="p-0">
                {session.cashTransactions?.length === 0 ? (
                  <div className="p-6 text-center text-muted-foreground text-sm">
                    Belum ada transaksi kas manual.
                  </div>
                ) : (
                  <ul className="divide-y divide-border">
                    {session.cashTransactions?.map((tx: any) => (
                      <li key={tx.id} className="p-4 flex items-center justify-between">
                        <div>
                          <p className="font-medium">{tx.description}</p>
                          <p className="text-xs text-muted-foreground">{formatDate(tx.createdAt)}</p>
                        </div>
                        <span className={`font-bold ${tx.type === 'CASH_IN' ? 'text-emerald-600' : 'text-destructive'}`}>
                          {tx.type === 'CASH_IN' ? '+' : '-'}{formatCurrency(Number(tx.amount))}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="md:col-span-1">
            <Card className="sticky top-20 border-destructive/20 shadow-md">
              <CardHeader className="bg-destructive/5 rounded-t-xl border-b border-border text-center pb-4">
                <div className="mx-auto w-12 h-12 bg-destructive/10 text-destructive rounded-full flex items-center justify-center mb-2">
                  <LogOut size={24} />
                </div>
                <CardTitle className="text-lg">Tutup Kasir (End of Shift)</CardTitle>
                <CardDescription>Hitung fisik uang di laci dan cocokkan dengan sistem.</CardDescription>
              </CardHeader>
              <CardContent className="p-4 space-y-4 mt-2">
                <div className="space-y-2">
                  <Label>Total Uang Fisik (Actual)</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-muted-foreground font-medium">Rp</span>
                    <Input 
                      type="number"
                      placeholder="0"
                      className="pl-10 text-lg border-destructive/30 focus-visible:ring-destructive/30"
                      value={actualBalance}
                      onChange={(e) => setActualBalance(e.target.value)}
                    />
                  </div>
                </div>
                
                {actualBalance && (
                  <div className={`p-3 rounded-md text-sm border ${
                    Number(actualBalance) === Number(session.expectedBalance) 
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-800' 
                      : 'bg-amber-50 border-amber-200 text-amber-800'
                  }`}>
                    Selisih:{' '}
                    <span className="font-bold">
                      {formatCurrency(Number(actualBalance) - Number(session.expectedBalance))}
                    </span>
                    {Number(actualBalance) !== Number(session.expectedBalance) && (
                      <p className="text-xs mt-1 opacity-80">Catat alasan selisih di bawah ini.</p>
                    )}
                  </div>
                )}
                
                <div className="space-y-2">
                  <Label>Catatan (Opsional)</Label>
                  <Input 
                    type="text"
                    placeholder="Alasan selisih uang..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                  />
                </div>
                
                <Button 
                  variant="destructive" 
                  className="w-full"
                  disabled={!actualBalance || closeSession.isPending}
                  onClick={() => {
                    if(confirm('Anda yakin ingin menutup shift kasir saat ini? Pastikan jumlah uang sudah sesuai.')) {
                      closeSession.mutate(session.id);
                    }
                  }}
                >
                  Tutup Shift Sekarang
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
