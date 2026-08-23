'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Search, Plus, FileEdit, Trash2, Tag, Archive, Layers, Scale } from 'lucide-react';
import { ProductFormDialog } from './ProductFormDialog';
import { CategoryFormDialog } from './CategoryFormDialog';
import { UnitFormDialog } from './UnitFormDialog';
import { toast } from 'sonner';

export default function ProductsPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'products' | 'categories' | 'units'>('products');
  const [search, setSearch] = useState('');
  
  // Dialog states
  const [isProductFormOpen, setIsProductFormOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any>(null);
  
  const [isCategoryFormOpen, setIsCategoryFormOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<any>(null);

  const [isUnitFormOpen, setIsUnitFormOpen] = useState(false);
  const [editingUnit, setEditingUnit] = useState<any>(null);

  // Queries
  const { data: productsData, isLoading: isLoadingProducts } = useQuery({
    queryKey: ['products'],
    queryFn: async () => (await api.get('/products')).data
  });

  const { data: categoriesData, isLoading: isLoadingCategories } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => (await api.get('/categories')).data
  });

  const { data: unitsData, isLoading: isLoadingUnits } = useQuery({
    queryKey: ['units'],
    queryFn: async () => (await api.get('/units')).data
  });

  const deleteProduct = useMutation({
    mutationFn: async (id: string) => api.delete(`/products/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast.success('Produk berhasil dihapus');
    },
    onError: (err: any) => toast.error(err?.response?.data?.message || err?.message || 'Gagal menghapus produk')
  });

  const deleteCategory = useMutation({
    mutationFn: async (id: string) => api.delete(`/categories/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      toast.success('Kategori berhasil dihapus');
    },
    onError: (err: any) => toast.error(err?.response?.data?.message || err?.message || 'Gagal menghapus kategori')
  });

  const deleteUnit = useMutation({
    mutationFn: async (id: string) => api.delete(`/units/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['units'] });
      toast.success('Satuan berhasil dihapus');
    },
    onError: (err: any) => toast.error(err?.response?.data?.message || err?.message || 'Gagal menghapus satuan')
  });

  const handleDelete = (id: string, type: 'product' | 'category' | 'unit') => {
    if (confirm(`Yakin ingin menghapus ${type} ini?`)) {
      if (type === 'product') deleteProduct.mutate(id);
      if (type === 'category') deleteCategory.mutate(id);
      if (type === 'unit') deleteUnit.mutate(id);
    }
  };

  const handleEdit = (item: any, type: 'product' | 'category' | 'unit') => {
    if (type === 'product') { setEditingProduct(item); setIsProductFormOpen(true); }
    if (type === 'category') { setEditingCategory(item); setIsCategoryFormOpen(true); }
    if (type === 'unit') { setEditingUnit(item); setIsUnitFormOpen(true); }
  };

  const handleAddNew = () => {
    if (activeTab === 'products') { setEditingProduct(null); setIsProductFormOpen(true); }
    if (activeTab === 'categories') { setEditingCategory(null); setIsCategoryFormOpen(true); }
    if (activeTab === 'units') { setEditingUnit(null); setIsUnitFormOpen(true); }
  };

  const products = productsData || [];
  const categories = categoriesData || [];
  const units = unitsData || [];
  
  const filteredProducts = products.filter((p: any) => 
    (p.name || '').toLowerCase().includes(search.toLowerCase()) || 
    (p.sku || '').toLowerCase().includes(search.toLowerCase()) ||
    (p.barcode && p.barcode.includes(search))
  );

  const filteredCategories = categories.filter((c: any) => c.name.toLowerCase().includes(search.toLowerCase()));
  const filteredUnits = units.filter((u: any) => u.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Master Data</h1>
          <p className="text-muted-foreground mt-1">Kelola data produk, stok, kategori, dan satuan.</p>
        </div>
        <Button onClick={handleAddNew} className="shrink-0">
          <Plus size={18} className="mr-2" /> Tambah {activeTab === 'products' ? 'Produk' : activeTab === 'categories' ? 'Kategori' : 'Satuan'}
        </Button>
      </div>

      <div className="flex gap-2 border-b border-border">
        <button 
          onClick={() => setActiveTab('products')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'products' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
        >
          <div className="flex items-center gap-2"><Archive size={16} /> Produk</div>
        </button>
        <button 
          onClick={() => setActiveTab('categories')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'categories' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
        >
          <div className="flex items-center gap-2"><Layers size={16} /> Kategori</div>
        </button>
        <button 
          onClick={() => setActiveTab('units')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'units' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
        >
          <div className="flex items-center gap-2"><Scale size={16} /> Satuan</div>
        </button>
      </div>

      <Card>
        <CardHeader className="pb-3 border-b border-border">
          <div className="flex items-center space-x-2">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder={`Cari ${activeTab === 'products' ? 'nama, SKU, atau barcode' : activeTab === 'categories' ? 'kategori' : 'satuan'}...`}
                className="pl-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          
          {/* TAB: PRODUCTS */}
          {activeTab === 'products' && (
            isLoadingProducts ? (
              <div className="p-8 text-center text-muted-foreground animate-pulse">Memuat data produk...</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Produk</TableHead>
                    <TableHead>Kategori</TableHead>
                    <TableHead>Harga Jual</TableHead>
                    <TableHead>Stok</TableHead>
                    <TableHead>Tipe</TableHead>
                    <TableHead className="text-right">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredProducts.length === 0 ? (
                    <TableRow><TableCell colSpan={6} className="h-24 text-center text-muted-foreground">Tidak ada produk ditemukan.</TableCell></TableRow>
                  ) : (
                    filteredProducts.map((product: any) => (
                      <TableRow key={product.id}>
                        <TableCell>
                          <div className="font-medium text-foreground">{product.name}</div>
                          <div className="text-xs text-muted-foreground mt-0.5 flex items-center gap-2">
                            <span>{product.sku}</span>
                            {product.barcode && <span className="text-[10px] bg-zinc-100 px-1.5 py-0.5 rounded border">{product.barcode}</span>}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="inline-flex items-center gap-1.5 bg-secondary px-2.5 py-1 rounded-md text-xs font-medium text-secondary-foreground">
                            <Tag size={12} /> {product.category?.name || '-'}
                          </div>
                        </TableCell>
                        <TableCell className="font-medium">
                          {formatCurrency(Number(product.sellingPrice))}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1.5">
                            <Archive size={14} className="text-muted-foreground" />
                            <span className={`font-medium ${Number(product.currentStock) <= Number(product.minimumStock) ? 'text-destructive' : ''}`}>
                              {product.currentStock} {product.unit?.name || ''}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className={`text-[10px] uppercase font-bold px-2 py-1 rounded-full ${
                            product.productType === 'FUEL' ? 'bg-amber-100 text-amber-800' : 'bg-blue-100 text-blue-800'
                          }`}>
                            {product.productType}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="icon" onClick={() => handleEdit(product, 'product')} className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50">
                            <FileEdit size={16} />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleDelete(product.id, 'product')} className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10">
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

          {/* TAB: CATEGORIES */}
          {activeTab === 'categories' && (
            isLoadingCategories ? (
              <div className="p-8 text-center text-muted-foreground animate-pulse">Memuat data kategori...</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nama Kategori</TableHead>
                    <TableHead>Deskripsi</TableHead>
                    <TableHead>Total Produk</TableHead>
                    <TableHead className="text-right">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCategories.length === 0 ? (
                    <TableRow><TableCell colSpan={4} className="h-24 text-center text-muted-foreground">Tidak ada kategori ditemukan.</TableCell></TableRow>
                  ) : (
                    filteredCategories.map((cat: any) => (
                      <TableRow key={cat.id}>
                        <TableCell className="font-medium text-foreground">{cat.name}</TableCell>
                        <TableCell className="text-muted-foreground">{cat.description || '-'}</TableCell>
                        <TableCell>{cat.products?.length || 0}</TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="icon" onClick={() => handleEdit(cat, 'category')} className="h-8 w-8 text-blue-600 hover:bg-blue-50">
                            <FileEdit size={16} />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleDelete(cat.id, 'category')} className="h-8 w-8 text-destructive hover:bg-destructive/10">
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

          {/* TAB: UNITS */}
          {activeTab === 'units' && (
            isLoadingUnits ? (
              <div className="p-8 text-center text-muted-foreground animate-pulse">Memuat data satuan...</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nama Satuan</TableHead>
                    <TableHead>Singkatan</TableHead>
                    <TableHead>Total Produk</TableHead>
                    <TableHead className="text-right">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUnits.length === 0 ? (
                    <TableRow><TableCell colSpan={4} className="h-24 text-center text-muted-foreground">Tidak ada satuan ditemukan.</TableCell></TableRow>
                  ) : (
                    filteredUnits.map((unit: any) => (
                      <TableRow key={unit.id}>
                        <TableCell className="font-medium text-foreground">{unit.name}</TableCell>
                        <TableCell className="text-muted-foreground">{unit.shortName || '-'}</TableCell>
                        <TableCell>{unit.products?.length || 0}</TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="icon" onClick={() => handleEdit(unit, 'unit')} className="h-8 w-8 text-blue-600 hover:bg-blue-50">
                            <FileEdit size={16} />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleDelete(unit.id, 'unit')} className="h-8 w-8 text-destructive hover:bg-destructive/10">
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

      {/* Modals */}
      {isProductFormOpen && <ProductFormDialog open={isProductFormOpen} onOpenChange={setIsProductFormOpen} productToEdit={editingProduct} />}
      {isCategoryFormOpen && <CategoryFormDialog open={isCategoryFormOpen} onOpenChange={setIsCategoryFormOpen} categoryToEdit={editingCategory} />}
      {isUnitFormOpen && <UnitFormDialog open={isUnitFormOpen} onOpenChange={setIsUnitFormOpen} unitToEdit={editingUnit} />}
    </div>
  );
}
