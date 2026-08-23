import { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

export function UserFormDialog({ 
  open, 
  onOpenChange, 
  userToEdit 
}: { 
  open: boolean; 
  onOpenChange: (open: boolean) => void;
  userToEdit: any | null;
}) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    fullName: '',
    role: 'CASHIER'
  });

  useEffect(() => {
    if (open) {
      setFormData({
        username: userToEdit?.username || '',
        password: '', // Jangan tampilkan password lama
        fullName: userToEdit?.fullName || '',
        role: userToEdit?.role || 'CASHIER',
      });
    }
  }, [open, userToEdit]);

  const mutation = useMutation({
    mutationFn: async (data: any) => {
      // Jika edit, jangan kirim password jika kosong
      const payload = { ...data };
      if (userToEdit && !payload.password) {
        delete payload.password;
      }
      
      if (userToEdit) {
        return api.put(`/users/${userToEdit.id}`, payload);
      }
      return api.post('/users', payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      onOpenChange(false);
      toast.success(userToEdit ? 'Pengguna berhasil diubah' : 'Pengguna berhasil ditambahkan');
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || err?.message || 'Gagal menyimpan pengguna');
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
          <DialogTitle>{userToEdit ? 'Edit Pengguna' : 'Tambah Pengguna Baru'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Nama Lengkap</Label>
            <Input required value={formData.fullName} onChange={e => setFormData({...formData, fullName: e.target.value})} placeholder="Cth: Budi Kasir" />
          </div>
          <div className="space-y-2">
            <Label>Username</Label>
            <Input required value={formData.username} onChange={e => setFormData({...formData, username: e.target.value})} placeholder="Cth: budi" />
          </div>
          <div className="space-y-2">
            <Label>Password {userToEdit && '(Kosongkan jika tidak ingin mengubah)'}</Label>
            <Input 
              type="password"
              required={!userToEdit}
              value={formData.password} 
              onChange={e => setFormData({...formData, password: e.target.value})} 
              placeholder="Min 6 karakter" 
            />
          </div>
          <div className="space-y-2">
            <Label>Role (Hak Akses)</Label>
            <select 
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
              value={formData.role}
              onChange={(e) => setFormData({...formData, role: e.target.value})}
            >
              <option value="CASHIER">Kasir (Transaksi Saja)</option>
              <option value="ADMIN">Admin (Manajemen Data)</option>
              <option value="OWNER">Owner (Akses Penuh)</option>
            </select>
          </div>
          <DialogFooter className="pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Batal
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? 'Menyimpan...' : 'Simpan Pengguna'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
