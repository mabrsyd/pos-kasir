import { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

export function UnitFormDialog({ 
  open, 
  onOpenChange, 
  unitToEdit 
}: { 
  open: boolean; 
  onOpenChange: (open: boolean) => void;
  unitToEdit: any | null;
}) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    name: '',
    shortName: '',
  });

  useEffect(() => {
    if (open) {
      setFormData({
        name: unitToEdit?.name || '',
        shortName: unitToEdit?.shortName || '',
      });
    }
  }, [open, unitToEdit]);

  const mutation = useMutation({
    mutationFn: async (data: any) => {
      if (unitToEdit) {
        return api.put(`/units/${unitToEdit.id}`, data);
      }
      return api.post('/units', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['units'] });
      onOpenChange(false);
      toast.success(unitToEdit ? 'Satuan berhasil diubah' : 'Satuan berhasil ditambahkan');
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || err?.message || 'Gagal menyimpan satuan');
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
          <DialogTitle>{unitToEdit ? 'Edit Satuan' : 'Tambah Satuan Baru'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Nama Satuan</Label>
            <Input required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="Cth: Kilogram" />
          </div>
          <div className="space-y-2">
            <Label>Singkatan (Opsional)</Label>
            <Input value={formData.shortName} onChange={e => setFormData({...formData, shortName: e.target.value})} placeholder="Cth: kg" />
          </div>
          <DialogFooter className="pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Batal
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? 'Menyimpan...' : 'Simpan Satuan'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
