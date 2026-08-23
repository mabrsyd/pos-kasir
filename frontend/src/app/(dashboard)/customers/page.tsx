'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Users, Search, Plus, FileEdit, Trash2 } from 'lucide-react';
import { CustomerFormDialog } from './CustomerFormDialog';
import { toast } from 'sonner';

export default function CustomersPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<any>(null);

  const { data: customersData, isLoading } = useQuery({
    queryKey: ['customers'],
    queryFn: async () => {
      const res = await api.get('/customers');
      return res.data;
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => api.delete(`/customers/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      toast.success('Pelanggan berhasil dihapus');
    },
    onError: (err: any) => toast.error(err?.response?.data?.message || err?.message || 'Gagal menghapus pelanggan')
  });

  const handleDelete = (id: string) => {
    if (confirm('Yakin ingin menghapus pelanggan ini?')) {
      deleteMutation.mutate(id);
    }
  };

  const handleEdit = (customer: any) => {
    setEditingCustomer(customer);
    setIsFormOpen(true);
  };

  const handleAddNew = () => {
    setEditingCustomer(null);
    setIsFormOpen(true);
  };

  const customers = customersData || [];
  const filtered = customers.filter((c: any) => c.name.toLowerCase().includes(search.toLowerCase()) || c.phone?.includes(search));

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Users className="text-blue-500" /> Pelanggan
          </h1>
          <p className="text-muted-foreground mt-1">Kelola data pelanggan untuk pencatatan bon/hutang.</p>
        </div>
        <Button onClick={handleAddNew} className="shrink-0">
          <Plus size={18} className="mr-2" /> Tambah Pelanggan
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-3 border-b border-border">
          <div className="relative max-w-sm">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Cari nama atau telepon..."
              className="pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8 text-center text-muted-foreground animate-pulse">Memuat...</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nama Pelanggan</TableHead>
                  <TableHead>Telepon</TableHead>
                  <TableHead>Alamat</TableHead>
                  <TableHead>Total Transaksi</TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow><TableCell colSpan={5} className="text-center p-8">Tidak ada data pelanggan.</TableCell></TableRow>
                ) : (
                  filtered.map((c: any) => (
                    <TableRow key={c.id}>
                      <TableCell className="font-bold">{c.name}</TableCell>
                      <TableCell>{c.phone || '-'}</TableCell>
                      <TableCell>{c.address || '-'}</TableCell>
                      <TableCell>{c.sales?.length || 0}</TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" onClick={() => handleEdit(c)} className="h-8 w-8 text-blue-600 hover:bg-blue-50">
                          <FileEdit size={16} />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(c.id)} className="h-8 w-8 text-destructive hover:bg-destructive/10">
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
      
      {isFormOpen && (
        <CustomerFormDialog 
          open={isFormOpen} 
          onOpenChange={setIsFormOpen} 
          customerToEdit={editingCustomer} 
        />
      )}
    </div>
  );
}
