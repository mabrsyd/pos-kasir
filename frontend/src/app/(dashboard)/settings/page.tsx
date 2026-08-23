'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Settings2, Printer, Shield, HardDrive, Plus, FileEdit, Trash2, UserCog } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { UserFormDialog } from './UserFormDialog';
import { toast } from 'sonner';

export default function SettingsPage() {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState('general');

  // User Management State
  const [isUserFormOpen, setIsUserFormOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<any>(null);

  const { data: usersData, isLoading: isLoadingUsers } = useQuery({
    queryKey: ['users'],
    queryFn: async () => (await api.get('/users')).data,
    enabled: activeTab === 'users' && user?.role === 'OWNER' // Only fetch if we are on users tab and have permission
  });

  const deleteUser = useMutation({
    mutationFn: async (id: string) => api.delete(`/users/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success('Pengguna berhasil dihapus');
    },
    onError: (err: any) => toast.error(err?.response?.data?.message || err?.message || 'Gagal menghapus pengguna')
  });

  const handleEditUser = (u: any) => {
    setEditingUser(u);
    setIsUserFormOpen(true);
  };

  const handleDeleteUser = (id: string) => {
    if (confirm('Yakin ingin menghapus pengguna ini? Hati-hati, data tidak dapat dikembalikan!')) {
      deleteUser.mutate(id);
    }
  };

  const users = usersData || [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
          <Settings2 className="text-zinc-500" /> Pengaturan Sistem
        </h1>
        <p className="text-muted-foreground mt-1">Konfigurasi toko, printer kasir, dan sinkronisasi offline.</p>
      </div>

      <div className="flex flex-col md:flex-row gap-6">
        <aside className="w-full md:w-64 space-y-1">
          <button 
            className={`w-full text-left px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${activeTab === 'general' ? 'bg-primary text-primary-foreground' : 'text-zinc-600 hover:bg-zinc-100'}`}
            onClick={() => setActiveTab('general')}
          >
            <StoreIcon size={16} className="inline mr-2" /> Umum
          </button>
          <button 
            className={`w-full text-left px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${activeTab === 'hardware' ? 'bg-primary text-primary-foreground' : 'text-zinc-600 hover:bg-zinc-100'}`}
            onClick={() => setActiveTab('hardware')}
          >
            <Printer size={16} className="inline mr-2" /> Hardware & Printer
          </button>
          <button 
            className={`w-full text-left px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${activeTab === 'sync' ? 'bg-primary text-primary-foreground' : 'text-zinc-600 hover:bg-zinc-100'}`}
            onClick={() => setActiveTab('sync')}
          >
            <HardDrive size={16} className="inline mr-2" /> Sinkronisasi (Offline)
          </button>
          {user?.role === 'OWNER' && (
            <button 
              className={`w-full text-left px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${activeTab === 'users' ? 'bg-primary text-primary-foreground' : 'text-zinc-600 hover:bg-zinc-100'}`}
              onClick={() => setActiveTab('users')}
            >
              <Shield size={16} className="inline mr-2" /> Manajemen Pengguna
            </button>
          )}
        </aside>

        <main className="flex-1">
          {activeTab === 'general' && (
            <Card>
              <CardHeader>
                <CardTitle>Pengaturan Toko</CardTitle>
                <CardDescription>Ubah nama toko, alamat, dan informasi yang tertera di struk.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Nama Toko</label>
                  <input type="text" className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" defaultValue="POS Kasir Ennou" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Alamat</label>
                  <textarea className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm" defaultValue="Jl. Contoh Toko Madura No. 123" />
                </div>
                <Button>Simpan Perubahan</Button>
              </CardContent>
            </Card>
          )}

          {activeTab === 'hardware' && (
            <Card>
              <CardHeader>
                <CardTitle>Printer Struk Thermal</CardTitle>
                <CardDescription>Hubungkan sistem dengan printer kasir bluetooth atau USB.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 bg-zinc-50 border rounded-lg flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Printer className="text-muted-foreground" />
                    <div>
                      <p className="font-medium">Web Bluetooth Printer</p>
                      <p className="text-xs text-muted-foreground">Status: Tidak Terhubung</p>
                    </div>
                  </div>
                  <Button variant="outline">Cari Printer</Button>
                </div>
                <p className="text-xs text-muted-foreground mt-2">Browser Anda mungkin memerlukan izin khusus untuk mengakses perangkat Bluetooth/Serial.</p>
              </CardContent>
            </Card>
          )}

          {activeTab === 'sync' && (
            <Card>
              <CardHeader>
                <CardTitle>Sinkronisasi Database</CardTitle>
                <CardDescription>Status database lokal dan riwayat sinkronisasi.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-lg">
                  <p className="font-semibold text-emerald-800">Status: Sinkronisasi Aktif</p>
                  <p className="text-sm text-emerald-700">Aplikasi siap digunakan secara offline. Data akan otomatis disinkronkan saat koneksi tersedia.</p>
                </div>
                <Button variant="outline" className="w-full">
                  <HardDrive size={16} className="mr-2" /> Paksa Sinkronisasi Sekarang
                </Button>
              </CardContent>
            </Card>
          )}

          {activeTab === 'users' && user?.role === 'OWNER' && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <div>
                  <CardTitle>Manajemen Pengguna</CardTitle>
                  <CardDescription>Kelola akun akses untuk kasir dan admin.</CardDescription>
                </div>
                <Button onClick={() => { setEditingUser(null); setIsUserFormOpen(true); }} size="sm">
                  <Plus size={16} className="mr-1" /> Tambah User
                </Button>
              </CardHeader>
              <CardContent>
                {isLoadingUsers ? (
                  <div className="p-8 text-center text-muted-foreground animate-pulse">Memuat pengguna...</div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nama Lengkap</TableHead>
                        <TableHead>Username</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead className="text-right">Aksi</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {users.length === 0 ? (
                        <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-4">Belum ada data.</TableCell></TableRow>
                      ) : (
                        users.map((u: any) => (
                          <TableRow key={u.id}>
                            <TableCell className="font-medium flex items-center gap-2">
                              <UserCog size={16} className="text-muted-foreground" /> {u.fullName}
                            </TableCell>
                            <TableCell>{u.username}</TableCell>
                            <TableCell>
                              <span className={`text-xs px-2 py-1 rounded font-bold ${
                                u.role === 'OWNER' ? 'bg-purple-100 text-purple-800' :
                                u.role === 'ADMIN' ? 'bg-blue-100 text-blue-800' :
                                'bg-zinc-100 text-zinc-800'
                              }`}>
                                {u.role}
                              </span>
                            </TableCell>
                            <TableCell className="text-right">
                              {u.id !== user.id && ( // Jangan perbolehkan owner menghapus dirinya sendiri di sini
                                <>
                                  <Button variant="ghost" size="icon" onClick={() => handleEditUser(u)} className="h-8 w-8 text-blue-600 hover:bg-blue-50">
                                    <FileEdit size={16} />
                                  </Button>
                                  <Button variant="ghost" size="icon" onClick={() => handleDeleteUser(u.id)} className="h-8 w-8 text-destructive hover:bg-destructive/10">
                                    <Trash2 size={16} />
                                  </Button>
                                </>
                              )}
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          )}
        </main>
      </div>

      {isUserFormOpen && (
        <UserFormDialog 
          open={isUserFormOpen} 
          onOpenChange={setIsUserFormOpen} 
          userToEdit={editingUser} 
        />
      )}
    </div>
  );
}

function StoreIcon(props: any) {
  return <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m2 7 4.41-4.41A2 2 0 0 1 7.83 2h8.34a2 2 0 0 1 1.42.59L22 7"/><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><path d="M15 22v-4a2 2 0 0 0-2-2h-2a2 2 0 0 0-2 2v4"/><path d="M2 7h20"/><path d="M22 7v3a2 2 0 0 1-2 2v0a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 16 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 12 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 8 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 4 12v0a2 2 0 0 1-2-2V7"/></svg>
}
