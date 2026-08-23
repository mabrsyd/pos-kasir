'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Fuel, Droplet, CreditCard, Banknote, History } from 'lucide-react';
import { toast } from 'sonner';

export default function PomMiniPage() {
  const queryClient = useQueryClient();
  const [nominal, setNominal] = useState('');
  
  const { data: productsData, isLoading } = useQuery({
    queryKey: ['products', 'fuel'],
    queryFn: async () => {
      const res = await api.get('/products');
      return res.data.filter((p: any) => p.productType === 'FUEL' && p.isActive);
    }
  });

  const [selectedFuelId, setSelectedFuelId] = useState<string | null>(null);

  const fuelProducts = productsData || [];
  const selectedFuel = fuelProducts.find((p: any) => p.id === selectedFuelId) || fuelProducts[0];

  const handleCreateSale = useMutation({
    mutationFn: async (paymentMethod: 'CASH' | 'QRIS') => {
      if (!selectedFuel || !nominal) throw new Error('Data tidak lengkap');
      
      const parsedNominal = Number(nominal);
      const pricePerLiter = Number(selectedFuel.sellingPrice);
      const liters = parsedNominal / pricePerLiter;
      
      const payload = {
        items: [{
          productId: selectedFuel.id,
          quantity: Number(liters.toFixed(3)) // Decimal for liters
        }],
        payment: {
          method: paymentMethod,
          amount: parsedNominal
        }
      };

      const res = await api.post('/sales', payload);
      return res.data;
    },
    onSuccess: () => {
      setNominal('');
      toast.success('Transaksi BBM Berhasil!');
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || err?.message || 'Gagal memproses transaksi BBM');
    }
  });

  const presetNominals = [10000, 20000, 30000, 50000, 100000, 150000];

  const calculatedLiters = selectedFuel && nominal 
    ? (Number(nominal) / Number(selectedFuel.sellingPrice)).toFixed(2)
    : '0.00';

  if (isLoading) return <div className="p-8 animate-pulse text-muted-foreground">Memuat Modul Pom Mini...</div>;

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
          <Fuel className="text-amber-500" /> Pom Mini (BBM)
        </h1>
        <p className="text-muted-foreground mt-1">Sistem Point of Sale khusus untuk penjualan bahan bakar (Nominal & Liter otomatis).</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Input Section */}
        <Card className="border-amber-200 shadow-md">
          <CardContent className="p-6 space-y-6">
            
            <div className="space-y-3">
              <label className="text-sm font-semibold text-muted-foreground">Pilih Jenis BBM</label>
              <div className="grid grid-cols-2 gap-3">
                {fuelProducts.map((fuel: any) => (
                  <button
                    key={fuel.id}
                    onClick={() => setSelectedFuelId(fuel.id)}
                    className={`p-4 rounded-xl border-2 text-left transition-all ${
                      (selectedFuelId ? fuel.id === selectedFuelId : fuel.id === fuelProducts[0]?.id)
                        ? 'border-amber-500 bg-amber-50 ring-2 ring-amber-500/20' 
                        : 'border-border bg-white hover:border-amber-200'
                    }`}
                  >
                    <h3 className="font-bold text-lg">{fuel.name}</h3>
                    <p className="text-amber-700 font-semibold">{formatCurrency(Number(fuel.sellingPrice))}/L</p>
                    <p className="text-xs text-muted-foreground mt-1">Stok: {fuel.currentStock} L</p>
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <label className="text-sm font-semibold text-muted-foreground">Nominal Pembelian (Rp)</label>
              <Input
                type="number"
                value={nominal}
                onChange={(e) => setNominal(e.target.value)}
                placeholder="Contoh: 25000"
                className="text-3xl h-16 font-bold text-center border-amber-300 focus-visible:ring-amber-500"
              />
              
              <div className="grid grid-cols-3 gap-2 pt-2">
                {presetNominals.map(amount => (
                  <Button 
                    key={amount} 
                    type="button" 
                    variant="outline"
                    className="border-amber-200 hover:bg-amber-100 hover:text-amber-900"
                    onClick={() => setNominal(amount.toString())}
                  >
                    {amount / 1000}K
                  </Button>
                ))}
              </div>
            </div>
            
          </CardContent>
        </Card>

        {/* Display & Checkout Section */}
        <div className="space-y-6 flex flex-col">
          <Card className="bg-zinc-900 text-white shadow-xl flex-1 border-0">
            <CardContent className="p-8 flex flex-col items-center justify-center h-full text-center space-y-6">
              
              <div className="space-y-1">
                <p className="text-zinc-400 font-medium">BBM Terpilih</p>
                <h2 className="text-2xl font-bold text-amber-400">{selectedFuel?.name || 'Pilih BBM'}</h2>
                <p className="text-zinc-500 text-sm">{selectedFuel ? `${formatCurrency(Number(selectedFuel.sellingPrice))} per Liter` : '-'}</p>
              </div>

              <div className="w-full h-px bg-zinc-800 my-2"></div>

              <div className="space-y-1">
                <p className="text-zinc-400 font-medium flex items-center justify-center gap-1">
                  <Droplet size={14} /> Total Volume (Liter)
                </p>
                <div className="text-6xl font-black text-white tracking-tighter">
                  {calculatedLiters}
                </div>
              </div>

              <div className="w-full h-px bg-zinc-800 my-2"></div>

              <div className="space-y-1">
                <p className="text-zinc-400 font-medium">Total Harga</p>
                <div className="text-4xl font-bold text-emerald-400">
                  {formatCurrency(Number(nominal || 0))}
                </div>
              </div>

            </CardContent>
          </Card>

          <div className="grid grid-cols-2 gap-3">
            <Button 
              size="lg" 
              className="h-16 text-lg bg-emerald-600 hover:bg-emerald-700 shadow-lg"
              disabled={!nominal || Number(nominal) <= 0 || handleCreateSale.isPending}
              onClick={() => handleCreateSale.mutate('CASH')}
            >
              <Banknote size={24} className="mr-2" /> TUNAI
            </Button>
            <Button 
              size="lg" 
              variant="outline" 
              className="h-16 text-lg border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 hover:text-blue-800"
              disabled={!nominal || Number(nominal) <= 0 || handleCreateSale.isPending}
              onClick={() => handleCreateSale.mutate('QRIS')}
            >
              <CreditCard size={24} className="mr-2" /> QRIS
            </Button>
          </div>
        </div>

      </div>
    </div>
  );
}
