'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ShoppingCart, Store, Package, ReceiptText } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';

export function BottomNav() {
  const pathname = usePathname();
  const { user } = useAuthStore();

  if (!user || user.role !== 'CASHIER') return null;

  const navItems = [
    {
      name: 'Kasir',
      href: '/pos',
      icon: ShoppingCart,
    },
    {
      name: 'Sesi',
      href: '/cash-sessions',
      icon: Store,
    },
    {
      name: 'Produk',
      href: '/products',
      icon: Package,
    },
    {
      name: 'Riwayat',
      href: '/sales',
      icon: ReceiptText,
    },
  ];

  return (
    <>
      {/* Spacer to prevent content from being hidden behind the fixed bottom nav */}
      <div className="h-[68px] w-full shrink-0" />
      
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-border shadow-[0_-4px_20px_-10px_rgba(0,0,0,0.1)] z-50 pb-safe">
        <ul className="flex items-center justify-around h-[68px] px-2">
          {navItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <li key={item.name} className="flex-1">
                <Link 
                  href={item.href}
                  className="flex flex-col items-center justify-center w-full h-full py-2 tap-highlight-transparent"
                >
                  <div className={`
                    p-1.5 rounded-xl mb-1 transition-all duration-200
                    ${isActive ? 'bg-primary/10 text-primary scale-110' : 'text-zinc-500'}
                  `}>
                    <item.icon size={22} strokeWidth={isActive ? 2.5 : 2} />
                  </div>
                  <span className={`text-[10px] font-medium tracking-wide transition-colors ${isActive ? 'text-primary font-bold' : 'text-zinc-500'}`}>
                    {item.name}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </>
  );
}
