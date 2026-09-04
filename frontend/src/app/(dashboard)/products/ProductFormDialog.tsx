import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { SearchableDropdown } from '@/components/ui/searchable-dropdown';

export function ProductFormDialog({ 
  open, 
  onOpenChange, 
  productToEdit 
}: { 
  open: boolean; 
  onOpenChange: (open: boolean) => void;
  productToEdit: any | null;
}) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    name: productToEdit?.name || '',
    barcode: productToEdit?.barcode || '',
    image: productToEdit?.image || '',
    categoryId: productToEdit?.categoryId || '',
    unitId: productToEdit?.unitId || '',
    purchasePrice: productToEdit?.purchasePrice || '',
    sellingPrice: productToEdit?.sellingPrice || '',
    minimumStock: productToEdit?.minimumStock || '',
    currentStock: productToEdit ? '' : '',
    productType: productToEdit?.productType || 'RETAIL',
  });
  const [isUploadingImage, setIsUploadingImage] = useState(false);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Ukuran gambar maksimal 5MB');
      return;
    }

    const uploadData = new FormData();
    uploadData.append('image', file);

    try {
      setIsUploadingImage(true);
      const res = await api.post('/upload/image', uploadData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setFormData({ ...formData, image: res.data.url });
      toast.success('Gambar berhasil diunggah');
    } catch (err: any) {
      toast.error(err?.message || 'Gagal mengunggah gambar');
    } finally {
      setIsUploadingImage(false);
    }
  };

  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => (await api.get('/categories')).data,
  });

  const { data: units } = useQuery({
    queryKey: ['units'],
    queryFn: async () => (await api.get('/units')).data,
  });

  const mutation = useMutation({
    mutationFn: async (data: any) => {
      const payload = {
        ...data,
        purchasePrice: Number(data.purchasePrice),
        sellingPrice: Number(data.sellingPrice),
        minimumStock: Number(data.minimumStock),
        currentStock: data.currentStock ? Number(data.currentStock) : 0,
      };
      if (productToEdit) {
        return api.put(`/products/${productToEdit.id}`, payload);
      }
      return api.post('/products', payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      onOpenChange(false);
      toast.success(productToEdit ? 'Produk berhasil diubah' : 'Produk berhasil ditambahkan');
    },
    onError: (err: any) => {
      toast.error(err?.message || 'Gagal menyimpan produk');
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mutation.mutate(formData);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md flex flex-col max-h-[90vh] p-0 gap-0">
        <DialogHeader className="px-6 pt-6 pb-0">
          <DialogTitle>{productToEdit ? 'Edit Produk' : 'Tambah Produk Baru'}</DialogTitle>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto px-6 pb-6">
        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Nama Produk</Label>
            <Input required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
          </div>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Barcode (Opsional)</Label>
              <Input value={formData.barcode} onChange={e => setFormData({...formData, barcode: e.target.value})} placeholder="Scan atau ketik barcode..." />
            </div>
            <div className="space-y-2">
              <Label>Gambar Produk (Opsional)</Label>
              <div className="flex gap-4 items-center">
                {formData.image && (
                  <div className="w-16 h-16 rounded-md overflow-hidden border border-border bg-zinc-50 flex items-center justify-center shrink-0 shadow-sm">
                    <img src={formData.image} alt="Preview" className="w-full h-full object-cover" />
                  </div>
                )}
                <div className="flex gap-2 items-center flex-1">
                  <Input 
                    type="url" 
                    value={formData.image} 
                    onChange={e => setFormData({...formData, image: e.target.value})} 
                    placeholder="URL Gambar..." 
                    className="flex-1"
                  />
                  <span className="text-xs font-medium text-muted-foreground shrink-0">atau</span>
                  <div className="relative overflow-hidden inline-block shrink-0">
                    <Button type="button" variant="outline" disabled={isUploadingImage}>
                      {isUploadingImage ? 'Mengunggah...' : 'Upload File'}
                    </Button>
                    <input 
                      type="file" 
                      accept="image/*"
                      onChange={handleImageUpload}
                      disabled={isUploadingImage}
                      className="absolute inset-0 opacity-0 cursor-pointer text-[0px]"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Kategori</Label>
              <SearchableDropdown
                options={categories?.map((c: any) => ({ value: c.id, label: c.name })) || []}
                value={formData.categoryId}
                onChange={(val) => setFormData({...formData, categoryId: val})}
                placeholder="Pilih Kategori"
                searchPlaceholder="Cari kategori..."
                emptyText="Kategori tidak ditemukan."
                addNewText="+ Tambah Kategori Baru"
                onAddNew={async () => {
                  const newName = window.prompt('Masukkan nama kategori baru:');
                  if (newName && newName.trim()) {
                    try {
                      const res = await api.post('/categories', { name: newName.trim() });
                      queryClient.invalidateQueries({ queryKey: ['categories'] });
                      setFormData({ ...formData, categoryId: res.data.id });
                      toast.success('Kategori baru berhasil ditambahkan');
                    } catch (err: any) {
                      toast.error(err?.message || 'Gagal menambahkan kategori');
                    }
                  }
                }}
              />
            </div>
            <div className="space-y-2">
              <Label>Satuan</Label>
              <SearchableDropdown
                options={units?.map((u: any) => ({ value: u.id, label: u.name })) || []}
                value={formData.unitId}
                onChange={(val) => setFormData({...formData, unitId: val})}
                placeholder="Pilih Satuan"
                searchPlaceholder="Cari satuan..."
                emptyText="Satuan tidak ditemukan."
                addNewText="+ Tambah Satuan Baru"
                onAddNew={async () => {
                  const newName = window.prompt('Masukkan nama satuan baru (contoh: Pcs, Kg):');
                  if (newName && newName.trim()) {
                    try {
                      const res = await api.post('/units', { name: newName.trim(), shortName: newName.trim().substring(0, 3).toUpperCase() });
                      queryClient.invalidateQueries({ queryKey: ['units'] });
                      setFormData({ ...formData, unitId: res.data.id });
                      toast.success('Satuan baru berhasil ditambahkan');
                    } catch (err: any) {
                      toast.error(err?.message || 'Gagal menambahkan satuan');
                    }
                  }
                }}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Harga Modal (Rp)</Label>
              <Input required type="number" value={formData.purchasePrice} onChange={e => setFormData({...formData, purchasePrice: e.target.value})} />
            </div>
            <div className="space-y-2">
              <Label>Harga Jual (Rp)</Label>
              <Input required type="number" value={formData.sellingPrice} onChange={e => setFormData({...formData, sellingPrice: e.target.value})} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Stok Minimum</Label>
              <Input required type="number" value={formData.minimumStock} onChange={e => setFormData({...formData, minimumStock: e.target.value})} />
            </div>
            {!productToEdit ? (
              <div className="space-y-2">
                <Label>Stok Awal</Label>
                <Input required type="number" value={formData.currentStock} onChange={e => setFormData({...formData, currentStock: e.target.value})} />
              </div>
            ) : (
              <div className="space-y-2">
                <Label>Tipe Produk</Label>
                <select 
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={formData.productType} 
                  onChange={e => setFormData({...formData, productType: e.target.value})}
                >
                  <option value="RETAIL">Retail Biasa</option>
                  <option value="FUEL">BBM / Pom Mini</option>
                  <option value="OTHER">Lainnya</option>
                </select>
              </div>
            )}
          </div>
          {!productToEdit && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Tipe Produk</Label>
                <SearchableDropdown
                  options={[
                    { value: 'RETAIL', label: 'Retail Biasa' },
                    { value: 'FUEL', label: 'BBM / Pom Mini' },
                    { value: 'OTHER', label: 'Lainnya' }
                  ]}
                  value={formData.productType}
                  onChange={(val) => setFormData({...formData, productType: val})}
                  placeholder="Pilih Tipe Produk"
                />
              </div>
            </div>
          )}
          <DialogFooter className="pt-4">
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? 'Menyimpan...' : 'Simpan Produk'}
            </Button>
          </DialogFooter>
        </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
