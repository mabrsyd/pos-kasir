import { Router, Request, Response, NextFunction } from 'express';
import { authenticate, authorize } from '../middleware/auth';
import { qs } from '../middleware/validate';
import prisma from '../lib/prisma';
import { successResponse } from '../utils/response';

const router = Router();
router.use(authenticate);
router.use(authorize('OWNER', 'ADMIN'));

function getDateRange(startDate?: string, endDate?: string) {
  const start = startDate ? new Date(startDate) : new Date(new Date().setHours(0, 0, 0, 0));
  const end = endDate ? new Date(endDate + 'T23:59:59') : new Date();
  return { start, end };
}

// GET /api/v1/reports/sales
router.get('/sales', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { start, end } = getDateRange(qs(req.query.startDate), qs(req.query.endDate));
    
    const sales = await prisma.sale.findMany({
      where: { createdAt: { gte: start, lte: end }, status: 'COMPLETED' },
      include: { items: true, payments: true, cashier: { select: { fullName: true } } },
      orderBy: { createdAt: 'desc' },
    });

    const totalRevenue = sales.reduce((sum, s) => sum + Number(s.total), 0);
    const totalCOGS = sales.reduce((sum, s) =>
      sum + s.items.reduce((is, i) => is + (Number(i.costPrice) * Number(i.quantity)), 0), 0);
    const grossProfit = totalRevenue - totalCOGS;

    res.json(successResponse({
      sales,
      summary: { totalRevenue, totalCOGS, grossProfit, transactionCount: sales.length },
    }));
  } catch (error) {
    next(error);
  }
});

// GET /api/v1/reports/products
router.get('/products', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { start, end } = getDateRange(qs(req.query.startDate), qs(req.query.endDate));
    
    const saleItems = await prisma.saleItem.findMany({
      where: { sale: { createdAt: { gte: start, lte: end }, status: 'COMPLETED' } },
    });

    const productMap = new Map<string, { name: string; sku: string; quantity: number; revenue: number; cogs: number }>();
    for (const item of saleItems) {
      const existing = productMap.get(item.productId) || { name: item.productName, sku: item.productSku, quantity: 0, revenue: 0, cogs: 0 };
      existing.quantity += Number(item.quantity);
      existing.revenue += Number(item.total);
      existing.cogs += Number(item.costPrice) * Number(item.quantity);
      productMap.set(item.productId, existing);
    }

    const products = Array.from(productMap.entries())
      .map(([id, data]) => ({ productId: id, ...data, profit: data.revenue - data.cogs }))
      .sort((a, b) => b.revenue - a.revenue);

    res.json(successResponse(products));
  } catch (error) {
    next(error);
  }
});

// GET /api/v1/reports/stock
router.get('/stock', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const products = await prisma.product.findMany({
      where: { isActive: true },
      include: { category: true, unit: true },
      orderBy: { name: 'asc' },
    });

    const totalValue = products.reduce((sum, p) => sum + (Number(p.purchasePrice) * Number(p.currentStock)), 0);
    const lowStock = products.filter(p => Number(p.currentStock) <= Number(p.minimumStock));

    res.json(successResponse({
      products,
      summary: { totalProducts: products.length, totalValue, lowStockCount: lowStock.length },
    }));
  } catch (error) {
    next(error);
  }
});

// GET /api/v1/reports/purchases
router.get('/purchases', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { start, end } = getDateRange(qs(req.query.startDate), qs(req.query.endDate));
    
    const purchases = await prisma.purchase.findMany({
      where: { createdAt: { gte: start, lte: end } },
      include: { supplier: { select: { name: true } }, _count: { select: { items: true } } },
      orderBy: { createdAt: 'desc' },
    });

    const totalPurchases = purchases.reduce((sum, p) => sum + Number(p.total), 0);
    const totalPaid = purchases.reduce((sum, p) => sum + Number(p.paidAmount), 0);
    const totalDebt = purchases.reduce((sum, p) => sum + Number(p.debtAmount), 0);

    res.json(successResponse({
      purchases,
      summary: { totalPurchases, totalPaid, totalDebt, count: purchases.length },
    }));
  } catch (error) {
    next(error);
  }
});

// GET /api/v1/reports/expenses
router.get('/expenses', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { start, end } = getDateRange(qs(req.query.startDate), qs(req.query.endDate));
    
    const expenses = await prisma.expense.findMany({
      where: { expenseDate: { gte: start, lte: end } },
      include: { user: { select: { fullName: true } } },
      orderBy: { expenseDate: 'desc' },
    });

    const byCategory = expenses.reduce((acc: Record<string, number>, e) => {
      acc[e.category] = (acc[e.category] || 0) + Number(e.amount);
      return acc;
    }, {});

    const totalExpenses = expenses.reduce((sum, e) => sum + Number(e.amount), 0);

    res.json(successResponse({
      expenses,
      summary: { totalExpenses, count: expenses.length, byCategory },
    }));
  } catch (error) {
    next(error);
  }
});

// GET /api/v1/reports/profit
router.get('/profit', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { start, end } = getDateRange(qs(req.query.startDate), qs(req.query.endDate));
    
    const sales = await prisma.sale.findMany({
      where: { createdAt: { gte: start, lte: end }, status: 'COMPLETED' },
      include: { items: true },
    });

    const revenue = sales.reduce((sum, s) => sum + Number(s.total), 0);
    const cogs = sales.reduce((sum, s) =>
      sum + s.items.reduce((is, i) => is + (Number(i.costPrice) * Number(i.quantity)), 0), 0);
    const grossProfit = revenue - cogs;

    const expenses = await prisma.expense.findMany({
      where: { expenseDate: { gte: start, lte: end } },
    });
    const totalExpenses = expenses.reduce((sum, e) => sum + Number(e.amount), 0);
    const estimatedNetProfit = grossProfit - totalExpenses;

    res.json(successResponse({
      revenue, cogs, grossProfit, totalExpenses, estimatedNetProfit, transactionCount: sales.length,
    }));
  } catch (error) {
    next(error);
  }
});

// GET /api/v1/reports/cash
router.get('/cash', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { start, end } = getDateRange(qs(req.query.startDate), qs(req.query.endDate));
    
    const sessions = await prisma.cashSession.findMany({
      where: { openedAt: { gte: start, lte: end } },
      include: {
        user: { select: { fullName: true } },
        cashTransactions: { orderBy: { createdAt: 'asc' } },
      },
      orderBy: { openedAt: 'desc' },
    });

    res.json(successResponse(sessions));
  } catch (error) {
    next(error);
  }
});

// GET /api/v1/reports/fuel
router.get('/fuel', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { start, end } = getDateRange(qs(req.query.startDate), qs(req.query.endDate));
    
    const fuelSaleItems = await prisma.saleItem.findMany({
      where: {
        sale: { createdAt: { gte: start, lte: end }, status: 'COMPLETED' },
        product: { productType: 'FUEL' },
      },
      include: {
        product: { select: { name: true, unit: true } },
        sale: { select: { invoiceNumber: true, createdAt: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const totalLiters = fuelSaleItems.reduce((sum, i) => sum + Number(i.quantity), 0);
    const totalRevenue = fuelSaleItems.reduce((sum, i) => sum + Number(i.total), 0);

    res.json(successResponse({
      items: fuelSaleItems,
      summary: { totalLiters, totalRevenue, transactionCount: fuelSaleItems.length },
    }));
  } catch (error) {
    next(error);
  }
});

export default router;
