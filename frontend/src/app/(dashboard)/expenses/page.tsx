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
import { Search, Plus, Receipt, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

export default function ExpensesPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [isAddOpen, setIsAddOpen] = useState(false);

  // New Expense State
  const [category, setCategory] = useState('LISTRIK');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');

  const { data: expensesData, isLoading } = useQuery({
    queryKey: ['expenses'],
    queryFn: async () => {
      const res = await api.get('/expenses');
      return res.data;
    }
  });

  const createExpense = useMutation({
    mutationFn: async () => {
      const res = await api.post('/expenses', {
        category,
        amount: Number(amount),
        description
      });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      setIsAddOpen(false);
      setAmount('');
      setDescription('');
      setCategory('LISTRIK');
      toast.success('Pengeluaran berhasil dicatat!');
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || err?.message || 'Gagal mencatat pengeluaran');
    }
  });

  const deleteExpense = useMutation({
    mutationFn: async (id: string) => api.delete(`/expenses/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      toast.success('Pengeluaran berhasil dihapus!');
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || err?.message || 'Gagal menghapus pengeluaran');
    }
  });

  const handleDelete = (id: string) => {
    if (confirm('Yakin ingin menghapus catatan pengeluaran ini?')) {
      deleteExpense.mutate(id);
    }
  };

  const expenses = expensesData || [];
  const filteredExpenses = expenses.filter((e: any) => 
    e.description?.toLowerCase().includes(search.toLowerCase()) || 
    e.category?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Pengeluaran Operasional</h1>
          <p className="text-muted-foreground mt-1">Catat biaya operasional toko (listrik, gaji, kebersihan, dll).</p>
        </div>
        
        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogTrigger asChild>
            <Button className="shrink-0 bg-rose-600 hover:bg-rose-700">
              <Plus size={18} className="mr-2" /> Catat Pengeluaran
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Form Pengeluaran Baru</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Kategori Pengeluaran</Label>
                <select 
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                >
                  <option value="LISTRIK">Listrik / Air</option>
                  <option value="GAJI">Gaji Karyawan</option>
                  <option value="KEBERSIHAN">Kebersihan / Keamanan</option>
                  <option value="INVENTARIS">Inventaris / Perlengkapan</option>
                  <option value="LAINNYA">Lain-lain</option>
                </select>
              </div>

              <div className="space-y-2">
                <Label>Nominal Pengeluaran (Rp)</Label>
                <Input 
                  type="number"
                  placeholder="Contoh: 150000" 
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label>Keterangan Lengkap</Label>
                <Input 
                  placeholder="Contoh: Bayar listrik bulan Agustus" 
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>

              <Button 
                className="w-full" 
                size="lg"
                disabled={!amount || !description || createExpense.isPending}
                onClick={() => createExpense.mutate()}
              >
                {createExpense.isPending ? 'Menyimpan...' : 'Simpan Pengeluaran'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader className="pb-3 border-b border-border">
          <div className="relative max-w-sm">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Cari keterangan atau kategori..."
              className="pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8 text-center text-muted-foreground animate-pulse">
              Memuat data pengeluaran...
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tanggal</TableHead>
                  <TableHead>Kategori</TableHead>
                  <TableHead>Keterangan</TableHead>
                  <TableHead>Nominal</TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredExpenses.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                      Tidak ada data pengeluaran.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredExpenses.map((expense: any) => (
                    <TableRow key={expense.id}>
                      <TableCell>
                        <div className="font-medium text-sm">{formatDate(expense.date)}</div>
                      </TableCell>
                      <TableCell>
                        <span className="text-[10px] uppercase font-bold px-2 py-1 rounded bg-zinc-100 border text-zinc-700">
                          {expense.category}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2 font-medium">
                          <Receipt size={14} className="text-muted-foreground" />
                          {expense.description}
                        </div>
                      </TableCell>
                      <TableCell className="font-bold text-rose-600">
                        {formatCurrency(Number(expense.amount))}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => handleDelete(expense.id)}
                          className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                        >
                          <Trash2 size={16} />
                        </Button>
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
