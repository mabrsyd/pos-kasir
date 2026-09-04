'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '@/store/authStore';
import { 
  Store, 
  LayoutDashboard, 
  ShoppingCart, 
  Package, 
  Users, 
  Settings, 
  LogOut,
  Menu,
  X,
  Fuel,
  FileText,
  ShieldAlert
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { OfflineIndicator } from '@/components/OfflineIndicator';
import { BottomNav } from '@/components/BottomNav';
import { SyncIndicator } from '@/components/SyncIndicator';

import React, { Component, ErrorInfo } from 'react';

class ErrorBoundary extends Component<{children: React.ReactNode}, {hasError: boolean, error: Error | null}> {
  constructor(props: {children: React.ReactNode}) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("React Crash:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-8 text-red-500 bg-red-50 min-h-screen">
          <h1 className="text-2xl font-bold mb-4">Aplikasi Crash (Error)</h1>
          <p className="mb-4">Tolong laporkan pesan ini:</p>
          <pre className="bg-white p-4 border border-red-200 rounded overflow-auto whitespace-pre-wrap">
            {this.state.error?.toString()}
          </pre>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  if (!isHydrated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-50">
        <div className="animate-pulse text-muted-foreground font-medium">Memuat sistem...</div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <DashboardInner>{children}</DashboardInner>
    </ErrorBoundary>
  );
}

function DashboardInner({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated, logout } = useAuthStore();
  const router = useRouter();
  const pathname = usePathname();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useEffect(() => {
    if (!isAuthenticated || !user) {
      router.push('/login');
    }
  }, [isAuthenticated, user, router]);

  if (!isAuthenticated || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-50 flex-col gap-4">
        <div className="animate-pulse text-muted-foreground font-medium">Memverifikasi sesi Anda...</div>
      </div>
    );
  }

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  const menuItems = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Kasir (POS)', href: '/pos', icon: ShoppingCart },
    { name: 'Sesi Kasir', href: '/cash-sessions', icon: Store },
    { name: 'Riwayat Transaksi', href: '/sales', icon: ShoppingCart },
    { name: 'Produk & Stok', href: '/products', icon: Package },
    { name: 'Pembelian', href: '/purchases', icon: Package },
    { name: 'Pengeluaran', href: '/expenses', icon: FileText },
    { name: 'Retur & Batal', href: '/returns', icon: FileText },
    { name: 'Pom Mini', href: '/fuel', icon: Fuel },
    { name: 'Laporan', href: '/reports', icon: FileText },
    { name: 'Pelanggan', href: '/customers', icon: Users },
    { name: 'Pengaturan', href: '/settings', icon: Settings },
  ];

  if (user?.role === 'OWNER') {
    menuItems.push({ name: 'Riwayat Aktivitas', href: '/audit-logs', icon: ShieldAlert as any });
  }

  const isCashier = user?.role === 'CASHIER';

  // ─── CASHIER LAYOUT (Touch-first, no sidebar, Bottom Nav) ─────────────
  if (isCashier) {
    return (
      <div className="h-screen bg-zinc-50 flex flex-col overflow-hidden">
        {/* Simple Top Header for Cashier */}
        <header className="h-14 flex-shrink-0 bg-white border-b border-border flex items-center justify-between px-4 z-30">
          <div className="font-bold text-lg text-zinc-900 flex items-center gap-2">
            <Store size={20} className="text-primary" />
            <span className="hidden sm:inline">POS Ennou</span>
            <SyncIndicator />
          </div>
          <div className="flex items-center gap-3">
             <span className="text-xs font-medium text-muted-foreground truncate max-w-[120px]">{user.fullName}</span>
             <Button variant="ghost" size="sm" className="text-destructive h-8 px-2" onClick={handleLogout}>
               <LogOut size={16} />
             </Button>
          </div>
        </header>
        
        <main className="flex-1 min-w-0 overflow-y-auto p-2 sm:p-4">
          {children}
        </main>
        
        <OfflineIndicator />
        <BottomNav />
      </div>
    );
  }

  // ─── OWNER / ADMIN LAYOUT (Desktop-first with Sidebar) ────────────────
  return (
    <div className="h-screen bg-zinc-50 flex overflow-hidden">
      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed lg:sticky top-0 inset-y-0 left-0 z-50
        w-64 h-screen flex-shrink-0 bg-white border-r border-border transition-transform duration-300 ease-in-out
        flex flex-col
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        <div className="h-16 flex items-center justify-between px-6 border-b border-border bg-primary text-primary-foreground">
          <div className="flex items-center gap-2 font-bold text-lg">
            <Store size={24} />
            <span>POS Ennou</span>
          </div>
          <button className="lg:hidden" onClick={() => setIsSidebarOpen(false)}>
            <X size={24} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          <div className="mb-6 px-2">
            <p className="text-sm text-muted-foreground">Login sebagai</p>
            <p className="font-semibold text-foreground truncate">{user.fullName}</p>
            <p className="text-xs font-medium text-primary uppercase bg-primary/10 inline-block px-2 py-0.5 rounded mt-1">
              {user.role}
            </p>
          </div>

          <nav className="space-y-1">
            {menuItems.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <Link key={item.href} href={item.href}>
                  <span className={`
                    flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors
                    ${isActive 
                      ? 'bg-primary text-primary-foreground' 
                      : 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900'}
                  `}>
                    <item.icon size={18} />
                    {item.name}
                  </span>
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="flex-shrink-0 p-4 border-t border-border bg-white">
          <Button variant="ghost" className="w-full justify-start text-destructive hover:text-destructive hover:bg-destructive/10" onClick={handleLogout}>
            <LogOut size={18} className="mr-3" />
            Keluar
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        <header className="h-16 flex-shrink-0 bg-white border-b border-border flex items-center px-4 lg:hidden z-30">
          <button 
            className="p-2 -ml-2 mr-2 text-zinc-600 rounded-md hover:bg-zinc-100"
            onClick={() => setIsSidebarOpen(true)}
          >
            <Menu size={24} />
          </button>
          <div className="font-bold text-lg text-zinc-900 flex items-center gap-2">
            <Store size={20} className="text-primary" />
            POS Ennou
          </div>
        </header>
        
        <div className="flex-1 p-4 lg:p-8 overflow-y-auto">
          {children}
        </div>
      </main>

      {/* Offline status indicator */}
      <OfflineIndicator />
    </div>
  );
}
