'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Search, Plus, Truck, ReceiptText, ChevronRight, FileEdit, Trash2, Package } from 'lucide-react';
import { SupplierFormDialog } from './SupplierFormDialog';
import { toast } from 'sonner';

export default function PurchasesPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'purchases' | 'suppliers'>('purchases');
  const [search, setSearch] = useState('');
  
  // Purchases Add State
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [supplierId, setSupplierId] = useState('');
  const [reference, setReference] = useState('');
  const [items, setItems] = useState([{ productId: '', quantity: 1, costPrice: 0 }]);

  // Supplier Edit State
  const [isSupplierFormOpen, setIsSupplierFormOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<any>(null);

  const { data: purchasesData, isLoading: isLoadingPurchases } = useQuery({
    queryKey: ['purchases'],
    queryFn: async () => (await api.get('/purchases')).data
  });

  const { data: suppliersData, isLoading: isLoadingSuppliers } = useQuery({
    queryKey: ['suppliers'],
    queryFn: async () => (await api.get('/suppliers')).data
  });

  const { data: productsData } = useQuery({
    queryKey: ['products'],
    queryFn: async () => (await api.get('/products')).data
  });

  const createPurchase = useMutation({
    mutationFn: async () => {
      const res = await api.post('/purchases', {
        supplierId,
        referenceNumber: reference || undefined,
        items: items.filter(i => i.productId && i.quantity > 0)
      });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchases'] });
      setIsAddOpen(false);
      setSupplierId('');
      setReference('');
      setItems([{ productId: '', quantity: 1, costPrice: 0 }]);
      toast.success('Pembelian berhasil dicatat!');
    },
    onError: (err: any) => toast.error(err?.response?.data?.message || err?.message || 'Gagal mencatat pembelian')
  });

  const deleteSupplier = useMutation({
    mutationFn: async (id: string) => api.delete(`/suppliers/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
      toast.success('Supplier berhasil dihapus!');
    },
    onError: (err: any) => toast.error(err?.response?.data?.message || err?.message || 'Gagal menghapus supplier')
  });

  const handleEditSupplier = (supplier: any) => {
    setEditingSupplier(supplier);
    setIsSupplierFormOpen(true);
  };

  const handleDeleteSupplier = (id: string) => {
    if (confirm('Yakin ingin menghapus supplier ini?')) {
      deleteSupplier.mutate(id);
    }
  };

  const purchases = purchasesData || [];
  const suppliers = suppliersData || [];
  const products = productsData || [];

  const filteredPurchases = purchases.filter((p: any) => 
    p.referenceNumber?.toLowerCase().includes(search.toLowerCase()) || 
    p.supplier?.name?.toLowerCase().includes(search.toLowerCase())
  );

  const filteredSuppliers = suppliers.filter((s: any) => 
    s.name.toLowerCase().includes(search.toLowerCase())
  );

  const calculateTotalNewPurchase = () => {
    return items.reduce((sum, item) => sum + (item.quantity * item.costPrice), 0);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Pembelian Stok</h1>
          <p className="text-muted-foreground mt-1">Catat barang masuk dari supplier dan perbarui stok gudang.</p>
        </div>
        
        {activeTab === 'purchases' ? (
          <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
            <DialogTrigger asChild>
              <Button className="shrink-0 bg-blue-600 hover:bg-blue-700">
                <Plus size={18} className="mr-2" /> Buat Pembelian
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Form Pembelian Baru</DialogTitle>
              </DialogHeader>
              <div className="space-y-6 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Supplier</Label>
                    <select 
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                      value={supplierId}
                      onChange={(e) => setSupplierId(e.target.value)}
                    >
                      <option value="">-- Pilih Supplier --</option>
                      {suppliers.map((s: any) => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label>No. Referensi / Faktur (Opsional)</Label>
                    <Input 
                      placeholder="INV-001..." 
                      value={reference}
                      onChange={(e) => setReference(e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between items-end">
                    <Label>Daftar Barang Masuk</Label>
                    <Button 
                      type="button" 
                      variant="outline" 
                      size="sm"
                      onClick={() => setItems([...items, { productId: '', quantity: 1, costPrice: 0 }])}
                    >
                      + Tambah Baris
                    </Button>
                  </div>
                  
                  {items.map((item, index) => (
                    <div key={index} className="flex items-center gap-3 bg-zinc-50 p-3 rounded-lg border border-border">
                      <div className="flex-1 space-y-1">
                        <Label className="text-xs text-muted-foreground">Produk</Label>
                        <select 
                          className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
                          value={item.productId}
                          onChange={(e) => {
                            const newItems = [...items];
                            newItems[index].productId = e.target.value;
                            const selectedProd = products.find((p:any) => p.id === e.target.value);
                            if(selectedProd) {
                              newItems[index].costPrice = Number(selectedProd.purchasePrice);
                            }
                            setItems(newItems);
                          }}
                        >
                          <option value="">- Pilih Produk -</option>
                          {products.map((p: any) => (
                            <option key={p.id} value={p.id}>{p.name} (Stok: {p.currentStock})</option>
                          ))}
                        </select>
                      </div>
                      <div className="w-24 space-y-1">
                        <Label className="text-xs text-muted-foreground">Qty</Label>
                        <Input 
                          type="number" 
                          min="1"
                          className="h-9" 
                          value={item.quantity}
                          onChange={(e) => {
                            const newItems = [...items];
                            newItems[index].quantity = Number(e.target.value);
                            setItems(newItems);
                          }}
                        />
                      </div>
                      <div className="w-36 space-y-1">
                        <Label className="text-xs text-muted-foreground">Harga Modal (Rp)</Label>
                        <Input 
                          type="number" 
                          className="h-9"
                          value={item.costPrice}
                          onChange={(e) => {
                            const newItems = [...items];
                            newItems[index].costPrice = Number(e.target.value);
                            setItems(newItems);
                          }}
                        />
                      </div>
                      <div className="w-36 space-y-1">
                        <Label className="text-xs text-muted-foreground">Subtotal</Label>
                        <div className="h-9 flex items-center px-3 font-semibold text-sm bg-white border border-input rounded-md">
                          {formatCurrency(item.quantity * item.costPrice)}
                        </div>
                      </div>
                      <div className="pt-5">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-9 w-9 text-destructive"
                          onClick={() => {
                            const newItems = items.filter((_, i) => i !== index);
                            setItems(newItems);
                          }}
                        >
                          x
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex justify-between items-center pt-4 border-t border-border">
                  <span className="text-muted-foreground font-medium">Total Estimasi Pembelian</span>
                  <span className="text-2xl font-bold text-primary">{formatCurrency(calculateTotalNewPurchase())}</span>
                </div>

                <Button 
                  className="w-full" 
                  size="lg"
                  disabled={!supplierId || items.length === 0 || createPurchase.isPending}
                  onClick={() => createPurchase.mutate()}
                >
                  {createPurchase.isPending ? 'Memproses...' : 'Simpan Transaksi Pembelian'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        ) : (
          <Button onClick={() => { setEditingSupplier(null); setIsSupplierFormOpen(true); }} className="shrink-0 bg-blue-600 hover:bg-blue-700">
            <Plus size={18} className="mr-2" /> Tambah Supplier
          </Button>
        )}
      </div>

      <div className="flex gap-2 border-b border-border">
        <button 
          onClick={() => setActiveTab('purchases')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'purchases' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
        >
          <div className="flex items-center gap-2"><Package size={16} /> Pembelian Masuk</div>
        </button>
        <button 
          onClick={() => setActiveTab('suppliers')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'suppliers' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
        >
          <div className="flex items-center gap-2"><Truck size={16} /> Data Supplier</div>
        </button>
      </div>

      <Card>
        <CardHeader className="pb-3 border-b border-border">
          <div className="relative max-w-sm">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={`Cari ${activeTab === 'purchases' ? 'referensi atau nama supplier' : 'nama supplier'}...`}
              className="pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          
          {/* TAB: PURCHASES */}
          {activeTab === 'purchases' && (
            isLoadingPurchases ? (
              <div className="p-8 text-center text-muted-foreground animate-pulse">Memuat data pembelian...</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tanggal</TableHead>
                    <TableHead>Referensi</TableHead>
                    <TableHead>Supplier</TableHead>
                    <TableHead>Status Pembayaran</TableHead>
                    <TableHead>Total Tagihan</TableHead>
                    <TableHead className="text-right">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPurchases.length === 0 ? (
                    <TableRow><TableCell colSpan={6} className="h-24 text-center text-muted-foreground">Tidak ada riwayat pembelian.</TableCell></TableRow>
                  ) : (
                    filteredPurchases.map((purchase: any) => (
                      <TableRow key={purchase.id}>
                        <TableCell><div className="font-medium">{formatDate(purchase.createdAt)}</div></TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                            <ReceiptText size={14} /> {purchase.referenceNumber || '-'}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1.5 font-medium">
                            <Truck size={14} className="text-blue-500" /> {purchase.supplier?.name || '-'}
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className={`text-xs px-2 py-1 rounded-full font-bold ${
                            purchase.paymentStatus === 'PAID' ? 'bg-emerald-100 text-emerald-800' : 
                            purchase.paymentStatus === 'PARTIAL' ? 'bg-amber-100 text-amber-800' : 
                            'bg-destructive/10 text-destructive'
                          }`}>
                            {purchase.paymentStatus}
                          </span>
                        </TableCell>
                        <TableCell className="font-bold">
                          {formatCurrency(Number(purchase.totalAmount))}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="sm" className="text-blue-600 hover:text-blue-700 hover:bg-blue-50">
                            Detail <ChevronRight size={16} className="ml-1" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            )
          )}

          {/* TAB: SUPPLIERS */}
          {activeTab === 'suppliers' && (
            isLoadingSuppliers ? (
              <div className="p-8 text-center text-muted-foreground animate-pulse">Memuat data supplier...</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nama Supplier</TableHead>
                    <TableHead>Telepon</TableHead>
                    <TableHead>Alamat</TableHead>
                    <TableHead>Info Bank</TableHead>
                    <TableHead className="text-right">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSuppliers.length === 0 ? (
                    <TableRow><TableCell colSpan={5} className="h-24 text-center text-muted-foreground">Tidak ada data supplier.</TableCell></TableRow>
                  ) : (
                    filteredSuppliers.map((sup: any) => (
                      <TableRow key={sup.id}>
                        <TableCell className="font-bold text-foreground">{sup.name}</TableCell>
                        <TableCell>{sup.phone || '-'}</TableCell>
                        <TableCell>{sup.address || '-'}</TableCell>
                        <TableCell>
                          {sup.bankName ? (
                            <span className="text-xs bg-zinc-100 px-2 py-1 rounded border">
                              {sup.bankName} - {sup.accountNumber}
                            </span>
                          ) : '-'}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="icon" onClick={() => handleEditSupplier(sup)} className="h-8 w-8 text-blue-600 hover:bg-blue-50">
                            <FileEdit size={16} />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleDeleteSupplier(sup.id)} className="h-8 w-8 text-destructive hover:bg-destructive/10">
                            <Trash2 size={16} />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            )
          )}
        </CardContent>
      </Card>

      {/* Supplier Modal */}
      {isSupplierFormOpen && (
        <SupplierFormDialog 
          open={isSupplierFormOpen} 
          onOpenChange={setIsSupplierFormOpen} 
          supplierToEdit={editingSupplier} 
        />
      )}
    </div>
  );
}
