import { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

export function SupplierFormDialog({ 
  open, 
  onOpenChange, 
  supplierToEdit 
}: { 
  open: boolean; 
  onOpenChange: (open: boolean) => void;
  supplierToEdit: any | null;
}) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    address: '',
    accountNumber: '',
    bankName: '',
  });

  useEffect(() => {
    if (open) {
      setFormData({
        name: supplierToEdit?.name || '',
        phone: supplierToEdit?.phone || '',
        address: supplierToEdit?.address || '',
        accountNumber: supplierToEdit?.accountNumber || '',
        bankName: supplierToEdit?.bankName || '',
      });
    }
  }, [open, supplierToEdit]);

  const mutation = useMutation({
    mutationFn: async (data: any) => {
      if (supplierToEdit) {
        return api.put(`/suppliers/${supplierToEdit.id}`, data);
      }
      return api.post('/suppliers', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
      onOpenChange(false);
      toast.success(supplierToEdit ? 'Supplier berhasil diubah' : 'Supplier berhasil ditambahkan');
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || err?.message || 'Gagal menyimpan supplier');
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mutation.mutate(formData);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{supplierToEdit ? 'Edit Supplier' : 'Tambah Supplier Baru'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Nama Supplier / Perusahaan</Label>
            <Input required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="Cth: PT Indofood / Toko Maju" />
          </div>
          <div className="space-y-2">
            <Label>Nomor Telepon / WhatsApp (Opsional)</Label>
            <Input value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} placeholder="Cth: 081234567890" />
          </div>
          <div className="space-y-2">
            <Label>Alamat (Opsional)</Label>
            <Input value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} placeholder="Cth: Jl. Raya Gudang No. 1" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Nama Bank (Opsional)</Label>
              <Input value={formData.bankName} onChange={e => setFormData({...formData, bankName: e.target.value})} placeholder="Cth: BCA" />
            </div>
            <div className="space-y-2">
              <Label>No. Rekening (Opsional)</Label>
              <Input value={formData.accountNumber} onChange={e => setFormData({...formData, accountNumber: e.target.value})} placeholder="Cth: 123456789" />
            </div>
          </div>
          <DialogFooter className="pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Batal
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? 'Menyimpan...' : 'Simpan Supplier'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
