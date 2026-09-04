'use client';

import { useState, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { db } from '@/lib/db';
import { syncEngine } from '@/lib/syncEngine';
import { formatCurrency } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
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
  X,
  ChevronUp,
  Fuel
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
  const [isMobileCartOpen, setIsMobileCartOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  
  // Payment Modal state
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [amountReceived, setAmountReceived] = useState<string>('');
  
  // Fuel Modal state
  const [isFuelModalOpen, setIsFuelModalOpen] = useState(false);
  const [selectedFuelProduct, setSelectedFuelProduct] = useState<any>(null);
  const [fuelNominal, setFuelNominal] = useState<string>('');

  const barcodeInputRef = useRef<HTMLInputElement>(null);
  const amountInputRef = useRef<HTMLInputElement>(null);
  
  // Queries
  const { data: productsData, isLoading: isLoadingProducts } = useQuery({
    queryKey: ['products'],
    queryFn: async () => {
      try {
        const res = await api.get('/products');
        return res.data;
      } catch (err) {
        return await db.products.toArray();
      }
    }
  });

  const { data: categoriesData } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      try {
        const res = await api.get('/categories');
        return res.data;
      } catch (err) {
        return await db.categories.toArray();
      }
    }
  });

  const products = productsData || [];
  const categories = categoriesData || [];
  
  const filteredProducts = products.filter((p: any) => 
    p.isActive && 
    (selectedCategory === 'all' || p.categoryId === selectedCategory) &&
    (
      (p.name || '').toLowerCase().includes(search.toLowerCase()) || 
      (p.sku || '').toLowerCase().includes(search.toLowerCase())
    )
  );

  const addToCart = (product: any, quantity = 1) => {
    setCart(prev => {
      // For fuel, we don't merge items (each nominal purchase is a separate line item)
      if (product.productType !== 'FUEL') {
        const existing = prev.find(item => item.productId === product.id);
        if (existing) {
          return prev.map(item => 
            item.productId === product.id 
              ? { ...item, quantity: item.quantity + quantity }
              : item
          );
        }
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
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(50);
    }
  };

  const handleProductClick = (product: any) => {
    if (product.productType === 'FUEL') {
      setSelectedFuelProduct(product);
      setFuelNominal('');
      setIsFuelModalOpen(true);
    } else {
      addToCart(product, 1);
    }
  };

  const submitFuelInput = () => {
    if (!selectedFuelProduct || !fuelNominal) return;
    const nominal = parseFloat(fuelNominal);
    if (isNaN(nominal) || nominal <= 0) return;

    const pricePerLiter = Number(selectedFuelProduct.sellingPrice);
    const liters = Number((nominal / pricePerLiter).toFixed(2)); // Round to 2 decimals

    addToCart(selectedFuelProduct, liters);
    setIsFuelModalOpen(false);
    setSelectedFuelProduct(null);
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

  const clearCart = () => {
    setCart([]);
    setIsMobileCartOpen(false);
  };

  const handleBarcodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!barcodeInput) return;
    
    const product = products.find((p: any) => p.barcode === barcodeInput || p.sku === barcodeInput);
    if (product) {
      handleProductClick(product);
      setBarcodeInput('');
    } else {
      toast.error('Produk tidak ditemukan');
    }
    barcodeInputRef.current?.focus();
  };

  const totalAmount = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  // Round total to avoid floating point issues
  const roundedTotalAmount = Math.round(totalAmount);
  
  // Custom totalItems to handle decimal fuel appropriately (each fuel item counts as 1 "sale item" line visually)
  const totalItems = cart.reduce((sum, item) => sum + (item.isFuel ? 1 : item.quantity), 0);

  const processPayment = async (paymentMethod: 'CASH' | 'QRIS' | 'TRANSFER', finalAmountReceived: number) => {
    const mappedPaymentMethod = paymentMethod === 'CASH' ? 'CASH' : 'DIGITAL';

    const payload = {
      items: cart.map(item => ({
        productId: item.productId,
        quantity: item.quantity
      })),
      paymentMethod: mappedPaymentMethod,
      amountReceived: finalAmountReceived,
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
      setIsPaymentModalOpen(false);
    } catch (error: any) {
      toast.error(error?.message || 'Gagal melakukan transaksi');
    }
  };

  const handleCheckoutCASH = () => {
    setAmountReceived(roundedTotalAmount.toString());
    setIsPaymentModalOpen(true);
    // Focus input after modal open
    setTimeout(() => amountInputRef.current?.focus(), 100);
  };

  const handleCheckoutQRIS = () => {
    if (cart.length === 0) return;
    processPayment('QRIS', roundedTotalAmount);
  };

  const submitCashPayment = (e: React.FormEvent) => {
    e.preventDefault();
    const received = parseFloat(amountReceived);
    if (isNaN(received) || received < roundedTotalAmount) {
      toast.error('Nominal uang tidak cukup');
      return;
    }
    processPayment('CASH', received);
  };

  // Prevent background scrolling when mobile cart is open
  useEffect(() => {
    if (isMobileCartOpen) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = 'unset';
    return () => { document.body.style.overflow = 'unset'; };
  }, [isMobileCartOpen]);

  // Quick Amount logic
  const getQuickAmounts = (total: number) => {
    const amounts = [total];
    
    // Nearest thousands
    const nearest5k = Math.ceil(total / 5000) * 5000;
    const nearest10k = Math.ceil(total / 10000) * 10000;
    const nearest20k = Math.ceil(total / 20000) * 20000;
    const nearest50k = Math.ceil(total / 50000) * 50000;
    const nearest100k = Math.ceil(total / 100000) * 100000;

    if (nearest5k > total) amounts.push(nearest5k);
    if (nearest10k > total && !amounts.includes(nearest10k)) amounts.push(nearest10k);
    if (nearest20k > total && !amounts.includes(nearest20k)) amounts.push(nearest20k);
    if (nearest50k > total && !amounts.includes(nearest50k)) amounts.push(nearest50k);
    if (nearest100k > total && !amounts.includes(nearest100k)) amounts.push(nearest100k);
    if (amounts.length < 4 && !amounts.includes(100000)) amounts.push(100000);
    
    return amounts.slice(0, 4); // Show top 4
  };
  const quickAmounts = getQuickAmounts(roundedTotalAmount);

  // Cart Component UI
  const CartUI = () => (
    <div className="flex flex-col h-full bg-white">
      <div className="p-4 border-b border-border bg-primary text-primary-foreground flex justify-between items-center shrink-0">
        <div className="flex items-center gap-2 font-semibold">
          <ShoppingCart size={20} />
          <h2 className="text-lg">Keranjang ({cart.length})</h2>
        </div>
        <div className="flex items-center gap-4">
          {cart.length > 0 && (
            <button onClick={clearCart} className="text-primary-foreground/80 hover:text-white text-sm flex items-center gap-1 transition-colors p-2 -m-2">
              <Trash2 size={16} /> <span className="hidden sm:inline">Kosongkan</span>
            </button>
          )}
          {/* Close button for mobile modal */}
          <button 
            onClick={() => setIsMobileCartOpen(false)}
            className="lg:hidden p-2 -mr-2 text-primary-foreground hover:bg-primary-foreground/20 rounded-full transition-colors"
          >
            <X size={24} />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-3 bg-zinc-50/50">
        {cart.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-muted-foreground opacity-50">
            <ShoppingCart size={64} className="mb-4" />
            <p className="text-lg">Keranjang kosong</p>
          </div>
        ) : (
          cart.map((item) => (
            <div key={item.id} className="bg-white p-3.5 rounded-xl border border-border shadow-sm relative">
              <h4 className="font-semibold text-base leading-tight pr-8">{item.name}</h4>
              <p className="text-primary font-bold text-sm mt-1">
                {formatCurrency(item.price)} {item.isFuel ? '/L' : ''}
              </p>
              
              <div className="flex items-center justify-between mt-4">
                {item.isFuel ? (
                  <div className="bg-amber-100 text-amber-800 px-3 py-1.5 rounded-lg font-bold text-sm flex items-center gap-1.5">
                    <Fuel size={16} />
                    {item.quantity} Liter
                  </div>
                ) : (
                  <div className="flex items-center gap-1 bg-zinc-100 rounded-lg p-1 border border-border">
                    <button 
                      onClick={() => updateQuantity(item.id, item.quantity - 1)}
                      className="w-10 h-10 flex items-center justify-center rounded-md bg-white shadow-sm hover:text-primary transition-colors touch-manipulation"
                    >
                      <Minus size={18} />
                    </button>
                    <span className="text-base font-bold w-8 text-center">{item.quantity}</span>
                    <button 
                      onClick={() => updateQuantity(item.id, item.quantity + 1)}
                      className="w-10 h-10 flex items-center justify-center rounded-md bg-white shadow-sm hover:text-primary transition-colors touch-manipulation"
                    >
                      <Plus size={18} />
                    </button>
                  </div>
                )}
                <span className="font-bold text-base">
                  {formatCurrency(item.price * item.quantity)}
                </span>
              </div>

              <button 
                onClick={() => removeFromCart(item.id)}
                className="absolute right-2 top-2 text-muted-foreground hover:text-destructive transition-colors p-2 touch-manipulation"
              >
                <X size={20} />
              </button>
            </div>
          ))
        )}
      </div>

      <div className="p-4 border-t border-border bg-white space-y-4 shrink-0 pb-safe">
        <div className="flex justify-between items-end border-b border-dashed border-zinc-200 pb-4">
          <span className="text-muted-foreground font-medium">Total Tagihan</span>
          <span className="text-3xl font-bold text-primary tracking-tight">
            {formatCurrency(roundedTotalAmount)}
          </span>
        </div>
        
        <div className="grid grid-cols-2 gap-3">
          <Button 
            size="lg" 
            className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm h-14 text-base rounded-xl font-bold"
            disabled={cart.length === 0}
            onClick={handleCheckoutCASH}
          >
            <Banknote size={22} className="mr-2" /> Tunai
          </Button>
          <Button 
            size="lg" 
            variant="outline" 
            className="h-14 text-base border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 hover:text-blue-800 rounded-xl font-bold"
            disabled={cart.length === 0}
            onClick={handleCheckoutQRIS}
          >
            <CreditCard size={22} className="mr-2" /> QRIS
          </Button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="h-[calc(100vh-3.5rem)] lg:h-[calc(100vh-4rem)] flex flex-col lg:flex-row relative -mx-2 -mt-2 lg:m-0">
      
      {/* Left Area: Product Grid */}
      <div className="flex-1 flex flex-col min-h-0 bg-white rounded-none lg:rounded-xl lg:border border-border lg:shadow-sm overflow-hidden">
        
        {/* Top Search & Category Nav */}
        <div className="shrink-0 flex flex-col">
          {/* Search Bar */}
          <div className="p-3 lg:p-4 border-b border-border bg-zinc-50 flex gap-2 lg:gap-3 shrink-0">
            <form onSubmit={handleBarcodeSubmit} className="flex-[0.4] relative min-w-[120px]">
              <ScanLine className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-primary" />
              <Input
                ref={barcodeInputRef}
                className="pl-10 h-12 bg-white border-primary/20 focus-visible:ring-primary/30 text-base"
                placeholder="Barcode..."
                value={barcodeInput}
                onChange={e => setBarcodeInput(e.target.value)}
              />
            </form>
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                className="pl-10 h-12 bg-white text-base"
                placeholder="Cari produk..."
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
          </div>

          {/* Category Pills */}
          <div className="flex overflow-x-auto hide-scrollbar gap-2 px-3 lg:px-4 py-3 border-b border-border bg-white shadow-sm z-10">
            <button 
              onClick={() => setSelectedCategory('all')}
              className={`shrink-0 px-5 py-2 rounded-full text-sm font-bold transition-colors border ${selectedCategory === 'all' ? 'bg-primary border-primary text-primary-foreground shadow-md' : 'bg-white border-border text-zinc-600 hover:bg-zinc-50'}`}
            >
              Semua
            </button>
            {categories.map((c: any) => (
              <button 
                key={c.id}
                onClick={() => setSelectedCategory(c.id)}
                className={`shrink-0 px-5 py-2 rounded-full text-sm font-bold transition-colors border ${selectedCategory === c.id ? 'bg-primary border-primary text-primary-foreground shadow-md' : 'bg-white border-border text-zinc-600 hover:bg-zinc-50'}`}
              >
                {c.name}
              </button>
            ))}
          </div>
        </div>

        {/* Product Grid */}
        <div className="flex-1 overflow-y-auto p-2 lg:p-4 bg-zinc-50/50 pb-24 lg:pb-4">
          {isLoadingProducts ? (
            <div className="flex items-center justify-center h-full text-muted-foreground animate-pulse">
              Memuat data produk...
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-2 lg:gap-4">
              {filteredProducts.map((product: any) => (
                <button
                  key={product.id}
                  onClick={() => handleProductClick(product)}
                  className="group relative flex flex-col items-start p-3 lg:p-4 bg-white rounded-2xl border border-border shadow-sm hover:shadow-md hover:border-primary/50 active:scale-95 transition-all text-left overflow-hidden touch-manipulation min-h-[150px]"
                >
                  <div className="w-full flex justify-between items-start mb-2 absolute top-3 left-0 right-0 px-3 lg:px-4 z-10">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm backdrop-blur-md ${product.productType === 'FUEL' ? 'bg-amber-100/90 text-amber-800' : 'bg-white/90 text-zinc-800 border border-zinc-200/50'}`}>
                      {product.productType === 'FUEL' ? 'BBM' : product.category?.name || 'Umum'}
                    </span>
                    {Number(product.currentStock) <= 5 && product.productType !== 'FUEL' && (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded shadow-sm backdrop-blur-md bg-destructive/90 text-white">
                        Sisa {product.currentStock}
                      </span>
                    )}
                  </div>
                  
                  {/* Product Image */}
                  <div className="w-full aspect-[4/3] bg-zinc-100 rounded-xl mb-3 overflow-hidden flex items-center justify-center">
                    {product.image ? (
                      <img src={product.image} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                    ) : (
                      <div className="text-zinc-300 group-hover:text-primary/40 transition-colors">
                        {product.productType === 'FUEL' ? <Fuel size={40} /> : <ShoppingCart size={40} />}
                      </div>
                    )}
                  </div>
                  
                  <h3 className="font-semibold text-[15px] line-clamp-2 leading-snug group-hover:text-primary transition-colors mb-2">
                    {product.name}
                  </h3>
                  
                  <div className="mt-auto w-full flex items-center justify-between">
                    <p className="font-bold text-primary text-lg">
                      {formatCurrency(Number(product.sellingPrice))}
                      {product.productType === 'FUEL' && <span className="text-xs font-normal text-muted-foreground">/L</span>}
                    </p>
                    <div className={`${product.productType === 'FUEL' ? 'bg-amber-500' : 'bg-primary'} text-white w-9 h-9 rounded-xl flex items-center justify-center shadow-sm`}>
                      {product.productType === 'FUEL' ? <Fuel size={18} /> : <Plus size={20} />}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Sticky Bottom Bar for Mobile Cart Trigger */}
      {cart.length > 0 && (
        <div className="lg:hidden fixed bottom-[68px] left-0 right-0 p-3 bg-transparent z-40 pointer-events-none">
          <button 
            onClick={() => setIsMobileCartOpen(true)}
            className="w-full bg-primary text-primary-foreground rounded-2xl shadow-[0_12px_40px_rgb(0,0,0,0.2)] p-4 flex items-center justify-between active:scale-[0.98] transition-transform touch-manipulation pointer-events-auto"
          >
            <div className="flex items-center gap-3">
              <div className="bg-primary-foreground/20 p-2.5 rounded-xl">
                <ShoppingCart size={24} />
              </div>
              <div className="text-left">
                <div className="font-bold text-xl">{formatCurrency(roundedTotalAmount)}</div>
                <div className="text-primary-foreground/80 text-sm font-medium">{totalItems} Item</div>
              </div>
            </div>
            <div className="flex items-center gap-1 font-bold text-base bg-white text-primary px-5 py-2.5 rounded-xl shadow-sm">
              Bayar <ChevronUp size={20} />
            </div>
          </button>
        </div>
      )}

      {/* Desktop Cart Side Panel */}
      <div className="hidden lg:flex w-[400px] flex-col shrink-0 ml-4 rounded-xl border border-border shadow-sm overflow-hidden z-20 relative">
        <CartUI />
      </div>

      {/* Mobile Cart Modal / Bottom Sheet */}
      {isMobileCartOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex flex-col justify-end">
          <div 
            className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
            onClick={() => setIsMobileCartOpen(false)}
          />
          <div className="relative w-full h-[85vh] bg-white rounded-t-3xl overflow-hidden flex flex-col shadow-2xl animate-in slide-in-from-bottom-full duration-300">
            <div className="w-full h-6 flex justify-center items-center absolute top-0 left-0 right-0 pointer-events-none z-10">
               <div className="w-12 h-1.5 bg-zinc-300 rounded-full" />
            </div>
            <div className="pt-2 flex-1 flex flex-col overflow-hidden relative z-0">
               <CartUI />
            </div>
          </div>
        </div>
      )}

      {/* ─── FUEL NOMINAL INPUT MODAL ─── */}
      <Dialog open={isFuelModalOpen} onOpenChange={setIsFuelModalOpen}>
        <DialogContent className="sm:max-w-md bg-white border-border rounded-3xl" hideCloseButton>
          <div className="flex flex-col items-center pt-4 pb-2">
            <div className="w-16 h-16 bg-amber-100 text-amber-500 rounded-full flex items-center justify-center mb-4">
              <Fuel size={32} />
            </div>
            <DialogTitle className="text-xl font-bold text-center">Beli Nominal (BBM)</DialogTitle>
            <DialogDescription className="text-center text-zinc-500 mt-1">
              {selectedFuelProduct?.name} — {formatCurrency(Number(selectedFuelProduct?.sellingPrice || 0))}/Liter
            </DialogDescription>
          </div>
          
          <div className="py-4">
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-2xl font-bold text-zinc-400">Rp</span>
              <Input
                type="number"
                value={fuelNominal}
                onChange={(e) => setFuelNominal(e.target.value)}
                className="pl-14 h-16 text-3xl font-bold rounded-2xl bg-zinc-50 border-border focus-visible:ring-amber-500"
                placeholder="0"
                autoFocus
              />
            </div>
            
            {fuelNominal && (
              <div className="mt-4 p-4 bg-amber-50 rounded-2xl border border-amber-100 flex justify-between items-center">
                <span className="text-amber-800 font-medium">Konversi Liter:</span>
                <span className="text-2xl font-bold text-amber-600">
                  {Number((parseFloat(fuelNominal) / Number(selectedFuelProduct?.sellingPrice || 1)).toFixed(2))} L
                </span>
              </div>
            )}
          </div>
          
          <DialogFooter className="flex gap-2 sm:justify-between mt-2">
            <Button 
              variant="outline" 
              onClick={() => setIsFuelModalOpen(false)}
              className="flex-1 h-14 rounded-xl font-bold"
            >
              Batal
            </Button>
            <Button 
              onClick={submitFuelInput}
              disabled={!fuelNominal || parseFloat(fuelNominal) <= 0}
              className="flex-1 h-14 rounded-xl font-bold bg-amber-500 hover:bg-amber-600 text-white"
            >
              Tambah ke Keranjang
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── CASH TENDER (KEMBALIAN) MODAL ─── */}
      <Dialog open={isPaymentModalOpen} onOpenChange={setIsPaymentModalOpen}>
        <DialogContent className="sm:max-w-md bg-white border-border rounded-3xl" hideCloseButton>
          <div className="flex flex-col items-center pt-2 pb-2">
            <DialogTitle className="text-xl font-bold text-center">Pembayaran Tunai</DialogTitle>
            <DialogDescription className="text-center text-zinc-500 mt-1">
              Masukkan nominal uang yang diterima dari pelanggan
            </DialogDescription>
          </div>
          
          <div className="py-4 space-y-6">
            <div className="text-center">
              <p className="text-sm font-medium text-zinc-500 mb-1">Total Tagihan</p>
              <p className="text-4xl font-black text-primary tracking-tight">{formatCurrency(roundedTotalAmount)}</p>
            </div>

            {/* Quick Amounts */}
            <div className="grid grid-cols-2 gap-2">
              {quickAmounts.map(amount => (
                <button
                  key={amount}
                  onClick={() => setAmountReceived(amount.toString())}
                  className={`h-12 rounded-xl font-bold border-2 transition-all active:scale-95 ${
                    amount.toString() === amountReceived 
                      ? 'border-primary bg-primary/10 text-primary' 
                      : 'border-border bg-white text-zinc-700 hover:bg-zinc-50'
                  }`}
                >
                  {amount === roundedTotalAmount ? 'Uang Pas' : formatCurrency(amount)}
                </button>
              ))}
            </div>

            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-2xl font-bold text-zinc-400">Rp</span>
              <Input
                ref={amountInputRef}
                type="number"
                value={amountReceived}
                onChange={(e) => setAmountReceived(e.target.value)}
                className="pl-14 h-16 text-3xl font-bold rounded-2xl bg-zinc-50 border-border focus-visible:ring-emerald-500"
                placeholder="0"
              />
            </div>
            
            {/* Change Calculation Display */}
            {parseFloat(amountReceived) >= roundedTotalAmount ? (
              <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100 flex justify-between items-center">
                <span className="text-emerald-800 font-medium">Kembalian:</span>
                <span className="text-3xl font-black text-emerald-600">
                  {formatCurrency(parseFloat(amountReceived) - roundedTotalAmount)}
                </span>
              </div>
            ) : parseFloat(amountReceived) > 0 ? (
              <div className="p-4 bg-red-50 rounded-2xl border border-red-100 flex justify-between items-center text-red-600">
                <span className="font-medium">Uang Kurang:</span>
                <span className="text-xl font-bold">
                  {formatCurrency(roundedTotalAmount - parseFloat(amountReceived))}
                </span>
              </div>
            ) : null}
          </div>
          
          <DialogFooter className="flex gap-2 sm:justify-between mt-2">
            <Button 
              variant="outline" 
              onClick={() => setIsPaymentModalOpen(false)}
              className="flex-1 h-14 rounded-xl font-bold text-zinc-600"
            >
              Batal
            </Button>
            <form onSubmit={submitCashPayment} className="flex-1 flex">
              <Button 
                type="submit"
                disabled={!amountReceived || parseFloat(amountReceived) < roundedTotalAmount}
                className="flex-1 h-14 rounded-xl font-bold bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                Proses Pembayaran
              </Button>
            </form>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}
