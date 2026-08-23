import { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

export function CustomerFormDialog({ 
  open, 
  onOpenChange, 
  customerToEdit 
}: { 
  open: boolean; 
  onOpenChange: (open: boolean) => void;
  customerToEdit: any | null;
}) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    address: '',
  });

  useEffect(() => {
    if (open) {
      setFormData({
        name: customerToEdit?.name || '',
        phone: customerToEdit?.phone || '',
        address: customerToEdit?.address || '',
      });
    }
  }, [open, customerToEdit]);

  const mutation = useMutation({
    mutationFn: async (data: any) => {
      if (customerToEdit) {
        return api.put(`/customers/${customerToEdit.id}`, data);
      }
      return api.post('/customers', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      onOpenChange(false);
      toast.success(customerToEdit ? 'Pelanggan berhasil diubah' : 'Pelanggan berhasil ditambahkan');
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || err?.message || 'Gagal menyimpan pelanggan');
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
          <DialogTitle>{customerToEdit ? 'Edit Pelanggan' : 'Tambah Pelanggan Baru'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Nama Pelanggan</Label>
            <Input required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="Cth: Budi Santoso" />
          </div>
          <div className="space-y-2">
            <Label>Nomor Telepon / WhatsApp (Opsional)</Label>
            <Input value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} placeholder="Cth: 081234567890" />
          </div>
          <div className="space-y-2">
            <Label>Alamat (Opsional)</Label>
            <Input value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} placeholder="Cth: Jl. Mawar No. 10" />
          </div>
          <DialogFooter className="pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Batal
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? 'Menyimpan...' : 'Simpan Pelanggan'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
