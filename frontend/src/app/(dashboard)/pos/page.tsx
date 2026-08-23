'use client';

import { useState, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { db } from '@/lib/db';
import { syncEngine } from '@/lib/syncEngine';
import { formatCurrency } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { 
  Search, 
  ScanLine, 
  ShoppingCart, 
  Trash2, 
  Plus, 
  Minus, 
  CreditCard,
  Banknote,
  Receipt,
  X
} from 'lucide-react';
import { toast } from 'sonner';

interface CartItem {
  id: string;
  productId: string;
  name: string;
  price: number;
  quantity: number;
  stock: number;
  isFuel: boolean;
}

export default function PosPage() {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [search, setSearch] = useState('');
  const [barcodeInput, setBarcodeInput] = useState('');
  const barcodeInputRef = useRef<HTMLInputElement>(null);
  
  const { data: productsData, isLoading } = useQuery({
    queryKey: ['products'],
    queryFn: async () => {
      // In a real offline-first app, we'd query Dexie if offline
      try {
        const res = await api.get('/products');
        return res.data;
      } catch (err) {
        // Fallback to IndexedDB
        return await db.products.toArray();
      }
    }
  });

  const products = productsData || [];
  
  const filteredProducts = products.filter((p: any) => 
    p.isActive && (
      (p.name || '').toLowerCase().includes(search.toLowerCase()) || 
      (p.sku || '').toLowerCase().includes(search.toLowerCase())
    )
  );

  const addToCart = (product: any, quantity = 1) => {
    setCart(prev => {
      const existing = prev.find(item => item.productId === product.id);
      if (existing) {
        return prev.map(item => 
          item.productId === product.id 
            ? { ...item, quantity: item.quantity + quantity }
            : item
        );
      }
      return [...prev, {
        id: Math.random().toString(36).substring(7),
        productId: product.id,
        name: product.name,
        price: Number(product.sellingPrice),
        quantity,
        stock: Number(product.currentStock),
        isFuel: product.productType === 'FUEL'
      }];
    });
  };

  const updateQuantity = (id: string, newQuantity: number) => {
    if (newQuantity <= 0) {
      removeFromCart(id);
      return;
    }
    setCart(prev => prev.map(item => item.id === id ? { ...item, quantity: newQuantity } : item));
  };

  const removeFromCart = (id: string) => {
    setCart(prev => prev.filter(item => item.id !== id));
  };

  const clearCart = () => setCart([]);

  const handleBarcodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!barcodeInput) return;
    
    const product = products.find((p: any) => p.barcode === barcodeInput || p.sku === barcodeInput);
    if (product) {
      addToCart(product);
      setBarcodeInput('');
    } else {
      toast.error('Produk tidak ditemukan');
    }
    
    barcodeInputRef.current?.focus();
  };

  const totalAmount = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  const handleCheckout = async (paymentMethod: 'CASH' | 'QRIS' | 'TRANSFER') => {
    if (cart.length === 0) return;
    
    const mappedPaymentMethod = paymentMethod === 'CASH' ? 'CASH' : 'DIGITAL';

    const payload = {
      items: cart.map(item => ({
        productId: item.productId,
        quantity: item.quantity
      })),
      paymentMethod: mappedPaymentMethod,
      amountReceived: totalAmount, // Assuming exact amount for now
      paymentReference: paymentMethod !== 'CASH' ? paymentMethod : undefined
    };

    try {
      if (navigator.onLine) {
        await api.post('/sales', payload);
      } else {
        await syncEngine.enqueueOperation('CREATE_SALE', payload);
      }
      toast.success('Transaksi berhasil!');
      clearCart();
    } catch (error: any) {
      toast.error(error?.message || 'Gagal melakukan transaksi');
    }
  };

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col md:flex-row gap-6 -m-2 md:m-0">
      
      {/* Left Area: Product Grid */}
      <div className="flex-1 flex flex-col min-h-0 bg-white rounded-xl border border-border shadow-sm overflow-hidden">
        {/* Top Bar: Search & Barcode */}
        <div className="p-4 border-b border-border bg-zinc-50 flex gap-3 flex-wrap">
          <form onSubmit={handleBarcodeSubmit} className="flex-1 relative min-w-[200px]">
            <ScanLine className="absolute left-3 top-2.5 h-4 w-4 text-primary" />
            <Input
              ref={barcodeInputRef}
              autoFocus
              className="pl-9 bg-white border-primary/20 focus-visible:ring-primary/30"
              placeholder="Scan barcode..."
              value={barcodeInput}
              onChange={e => setBarcodeInput(e.target.value)}
            />
          </form>
          <div className="flex-1 relative min-w-[200px]">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              className="pl-9 bg-white"
              placeholder="Cari nama produk..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
        </div>

        {/* Product Grid */}
        <div className="flex-1 overflow-y-auto p-4 bg-zinc-50/50">
          {isLoading ? (
            <div className="flex items-center justify-center h-full text-muted-foreground animate-pulse">
              Memuat data produk...
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {filteredProducts.map((product: any) => (
                <button
                  key={product.id}
                  onClick={() => addToCart(product)}
                  className="group relative flex flex-col items-start p-4 bg-white rounded-xl border border-border shadow-sm hover:shadow-md hover:border-primary/50 transition-all text-left overflow-hidden"
                >
                  <div className="w-full flex justify-between items-start mb-2">
                    <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground">
                      {product.category?.name || 'Umum'}
                    </span>
                    <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${Number(product.currentStock) > 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-destructive/10 text-destructive'}`}>
                      Stok: {product.currentStock}
                    </span>
                  </div>
                  
                  <h3 className="font-semibold text-sm line-clamp-2 leading-tight group-hover:text-primary transition-colors">
                    {product.name}
                  </h3>
                  
                  <div className="mt-auto pt-3 w-full flex items-center justify-between">
                    <p className="font-bold text-primary">
                      {formatCurrency(Number(product.sellingPrice))}
                    </p>
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity bg-primary/10 p-1.5 rounded-full text-primary">
                      <Plus size={14} />
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Right Area: Cart */}
      <div className="w-full md:w-96 flex flex-col bg-white rounded-xl border border-border shadow-sm overflow-hidden shrink-0">
        <div className="p-4 border-b border-border bg-primary text-primary-foreground flex justify-between items-center">
          <div className="flex items-center gap-2 font-semibold">
            <ShoppingCart size={18} />
            <h2>Keranjang ({cart.length})</h2>
          </div>
          {cart.length > 0 && (
            <button onClick={clearCart} className="text-primary-foreground/80 hover:text-white text-sm flex items-center gap-1 transition-colors">
              <Trash2 size={14} /> Kosongkan
            </button>
          )}
        </div>

        {/* Cart Items */}
        <div className="flex-1 overflow-y-auto p-3 space-y-3 bg-zinc-50">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-muted-foreground opacity-50">
              <ShoppingCart size={48} className="mb-3" />
              <p>Keranjang masih kosong</p>
            </div>
          ) : (
            cart.map((item) => (
              <div key={item.id} className="bg-white p-3 rounded-lg border border-border shadow-sm relative pr-10">
                <h4 className="font-medium text-sm leading-tight pr-4">{item.name}</h4>
                <p className="text-primary font-bold text-sm mt-1">{formatCurrency(item.price)}</p>
                
                <div className="flex items-center justify-between mt-3">
                  <div className="flex items-center gap-3 bg-zinc-100 rounded-md p-0.5 border border-border">
                    <button 
                      onClick={() => updateQuantity(item.id, item.quantity - 1)}
                      className="p-1 rounded bg-white shadow-sm hover:text-primary transition-colors"
                    >
                      <Minus size={14} />
                    </button>
                    <span className="text-sm font-semibold w-6 text-center">{item.quantity}</span>
                    <button 
                      onClick={() => updateQuantity(item.id, item.quantity + 1)}
                      className="p-1 rounded bg-white shadow-sm hover:text-primary transition-colors"
                    >
                      <Plus size={14} />
                    </button>
                  </div>
                  <span className="font-bold text-sm">
                    {formatCurrency(item.price * item.quantity)}
                  </span>
                </div>

                <button 
                  onClick={() => removeFromCart(item.id)}
                  className="absolute right-3 top-3 text-muted-foreground hover:text-destructive transition-colors p-1"
                >
                  <X size={16} />
                </button>
              </div>
            ))
          )}
        </div>

        {/* Checkout Section */}
        <div className="p-4 border-t border-border bg-white space-y-4">
          <div className="flex justify-between items-end border-b border-dashed border-zinc-200 pb-4">
            <span className="text-muted-foreground font-medium">Total Tagihan</span>
            <span className="text-3xl font-bold text-primary tracking-tight">
              {formatCurrency(totalAmount)}
            </span>
          </div>
          
          <div className="grid grid-cols-2 gap-2">
            <Button 
              size="lg" 
              className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm h-14 text-sm"
              disabled={cart.length === 0}
              onClick={() => handleCheckout('CASH')}
            >
              <Banknote size={20} className="mr-2" /> Tunai
            </Button>
            <Button 
              size="lg" 
              variant="outline" 
              className="h-14 text-sm border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 hover:text-blue-800"
              disabled={cart.length === 0}
              onClick={() => handleCheckout('QRIS')}
            >
              <CreditCard size={20} className="mr-2" /> QRIS / Digital
            </Button>
          </div>
          
          <Button 
            variant="ghost" 
            className="w-full text-muted-foreground hover:text-primary"
            disabled={cart.length === 0}
          >
            <Receipt size={16} className="mr-2" /> Cetak Struk Saja
          </Button>
        </div>
      </div>
    </div>
  );
}
