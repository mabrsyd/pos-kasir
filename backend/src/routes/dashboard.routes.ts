import { Router, Request, Response, NextFunction } from 'express';
import { authenticate, authorize } from '../middleware/auth';
import prisma from '../lib/prisma';
import { successResponse } from '../utils/response';

const router = Router();
router.use(authenticate);
router.use(authorize('OWNER', 'ADMIN'));

// GET /api/v1/dashboard
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Sales today
    const salesToday = await prisma.sale.findMany({
      where: {
        createdAt: { gte: today, lt: tomorrow },
        status: 'COMPLETED',
      },
      include: { items: true, payments: true },
    });

    const totalSalesToday = salesToday.reduce((sum, s) => sum + Number(s.total), 0);
    const transactionCount = salesToday.length;
    const itemsSold = salesToday.reduce((sum, s) => sum + s.items.reduce((is, i) => is + Number(i.quantity), 0), 0);

    // COGS
    const cogsTodayVal = salesToday.reduce((sum, s) =>
      sum + s.items.reduce((is, i) => is + (Number(i.costPrice) * Number(i.quantity)), 0)
    , 0);
    const grossProfit = totalSalesToday - cogsTodayVal;

    // Expenses today
    const expensesToday = await prisma.expense.findMany({
      where: { expenseDate: { gte: today, lt: tomorrow } },
    });
    const totalExpenses = expensesToday.reduce((sum, e) => sum + Number(e.amount), 0);

    // Low stock products
    const allActiveProducts = await prisma.product.findMany({
      where: { isActive: true },
      include: { category: true, unit: true },
    });
    const lowStockProducts = allActiveProducts.filter(p => Number(p.currentStock) <= Number(p.minimumStock));

    // Supplier debt
    const suppliers = await prisma.supplier.findMany({
      where: { totalDebt: { gt: 0 } },
      select: { id: true, name: true, totalDebt: true },
    });
    const totalSupplierDebt = suppliers.reduce((sum, s) => sum + Number(s.totalDebt), 0);

    // Sales by payment method today
    const cashSales = salesToday.filter(s => s.payments.some(p => p.method === 'CASH'));
    const digitalSales = salesToday.filter(s => s.payments.some(p => p.method === 'DIGITAL'));

    // Sales trend (last 7 days)
    const sevenDaysAgo = new Date(today);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    const recentSales = await prisma.sale.findMany({
      where: {
        createdAt: { gte: sevenDaysAgo },
        status: 'COMPLETED',
      },
      select: { total: true, createdAt: true },
    });

    const salesTrend: { date: string; total: number; count: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const daySales = recentSales.filter(s => s.createdAt.toISOString().split('T')[0] === dateStr);
      salesTrend.push({
        date: dateStr,
        total: daySales.reduce((sum, s) => sum + Number(s.total), 0),
        count: daySales.length,
      });
    }

    // Top products today
    const productSalesMap = new Map<string, { name: string; quantity: number; total: number }>();
    for (const sale of salesToday) {
      for (const item of sale.items) {
        const existing = productSalesMap.get(item.productId) || { name: item.productName, quantity: 0, total: 0 };
        existing.quantity += Number(item.quantity);
        existing.total += Number(item.total);
        productSalesMap.set(item.productId, existing);
      }
    }
    const topProducts = Array.from(productSalesMap.entries())
      .map(([id, data]) => ({ productId: id, ...data }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 10);

    // Fuel sales today
    const fuelSalesToday = salesToday.flatMap(s => s.items).filter(i => {
      const prod = allActiveProducts.find(p => p.id === i.productId);
      return prod?.productType === 'FUEL';
    });
    const fuelLitersToday = fuelSalesToday.reduce((sum, i) => sum + Number(i.quantity), 0);
    const fuelRevenueToday = fuelSalesToday.reduce((sum, i) => sum + Number(i.total), 0);

    const cashTotal = cashSales.reduce((s, sale) => {
      const cashPay = sale.payments.find(p => p.method === 'CASH');
      return s + (cashPay ? Number(cashPay.amount) : 0);
    }, 0);
    const digitalTotal = digitalSales.reduce((s, sale) => {
      const digPay = sale.payments.find(p => p.method === 'DIGITAL');
      return s + (digPay ? Number(digPay.amount) : 0);
    }, 0);

    res.json(successResponse({
      summary: {
        revenue: totalSalesToday,
        cogs: cogsTodayVal,
        grossProfit,
        transactionCount,
        itemsSold,
        lowStockCount: lowStockProducts.length,
      },
      salesToday: {
        total: totalSalesToday,
        transactionCount,
        itemsSold,
        cogs: cogsTodayVal,
        grossProfit,
        cashTotal,
        digitalTotal,
      },
      fuelToday: {
        liters: fuelLitersToday,
        revenue: fuelRevenueToday,
        count: fuelSalesToday.length,
      },
      expenses: {
        total: totalExpenses,
        count: expensesToday.length,
      },
      estimatedNetProfit: grossProfit - totalExpenses,
      lowStockProducts: lowStockProducts.slice(0, 10),
      lowStockCount: lowStockProducts.length,
      supplierDebt: {
        total: totalSupplierDebt,
        suppliers: suppliers.slice(0, 5),
      },
      salesTrend,
      topProducts,
    }));
  } catch (error) {
    next(error);
  }
});

export default router;
