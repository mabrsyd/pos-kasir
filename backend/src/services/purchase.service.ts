import prisma from '../lib/prisma';
import { ValidationError, NotFoundError } from '../utils/errors';
import { createAuditLog } from './audit.service';

interface PurchaseItemInput {
  productId: string;
  quantity: number;
  purchasePrice: number;
}

interface CreatePurchaseInput {
  supplierId: string;
  items: PurchaseItemInput[];
  paidAmount?: number;
  notes?: string;
}

function generatePurchaseNumber(): string {
  const now = new Date();
  const y = now.getFullYear().toString().slice(-2);
  const m = (now.getMonth() + 1).toString().padStart(2, '0');
  const d = now.getDate().toString().padStart(2, '0');
  const h = now.getHours().toString().padStart(2, '0');
  const min = now.getMinutes().toString().padStart(2, '0');
  const s = now.getSeconds().toString().padStart(2, '0');
  return `PUR${y}${m}${d}${h}${min}${s}`;
}

export async function createPurchase(data: CreatePurchaseInput, userId: string) {
  if (!data.items || data.items.length === 0) {
    throw new ValidationError('Minimal 1 item pembelian diperlukan');
  }

  const supplier = await prisma.supplier.findUnique({ where: { id: data.supplierId } });
  if (!supplier) throw new NotFoundError('Supplier tidak ditemukan');

  // Calculate totals
  const items = data.items.map(item => ({
    ...item,
    subtotal: item.purchasePrice * item.quantity,
  }));
  const total = items.reduce((sum, i) => sum + i.subtotal, 0);
  const paidAmount = data.paidAmount || 0;
  const debtAmount = total - paidAmount;

  const result = await prisma.$transaction(async (tx) => {
    // 1. Create purchase
    const purchase = await tx.purchase.create({
      data: {
        purchaseNumber: generatePurchaseNumber(),
        supplierId: data.supplierId,
        userId,
        status: 'RECEIVED',
        subtotal: total,
        total,
        paidAmount,
        debtAmount,
        notes: data.notes,
        receivedAt: new Date(),
      },
    });

    // 2. Create purchase items
    for (const item of items) {
      const product = await tx.product.findUnique({ where: { id: item.productId } });
      if (!product) throw new NotFoundError('Produk tidak ditemukan');

      await tx.purchaseItem.create({
        data: {
          purchaseId: purchase.id,
          productId: item.productId,
          productName: product.name,
          quantity: item.quantity,
          purchasePrice: item.purchasePrice,
          subtotal: item.subtotal,
        },
      });

      // 3. Stock movement
      const stockBefore = Number(product.currentStock);
      const stockAfter = stockBefore + item.quantity;

      await tx.stockMovement.create({
        data: {
          productId: item.productId,
          movementType: 'PURCHASE',
          quantity: item.quantity,
          stockBefore,
          stockAfter,
          referenceId: purchase.id,
          referenceType: 'PURCHASE',
          userId,
        },
      });

      // 4. Update stock
      await tx.product.update({
        where: { id: item.productId },
        data: { currentStock: stockAfter },
      });
    }

    // 5. Update supplier debt
    if (debtAmount > 0) {
      await tx.supplier.update({
        where: { id: data.supplierId },
        data: { totalDebt: { increment: debtAmount } },
      });
    }

    return purchase;
  });

  return prisma.purchase.findUnique({
    where: { id: result.id },
    include: {
      items: true,
      supplier: true,
      user: { select: { id: true, fullName: true } },
    },
  });
}

export async function listPurchases(params: {
  page?: number;
  limit?: number;
  supplierId?: string;
  startDate?: string;
  endDate?: string;
}) {
  const page = params.page || 1;
  const limit = params.limit || 20;
  const skip = (page - 1) * limit;

  const where: Record<string, unknown> = {};
  if (params.supplierId) where.supplierId = params.supplierId;
  if (params.startDate || params.endDate) {
    where.createdAt = {};
    if (params.startDate) (where.createdAt as any).gte = new Date(params.startDate);
    if (params.endDate) (where.createdAt as any).lte = new Date(params.endDate + 'T23:59:59');
  }

  const [purchases, total] = await Promise.all([
    prisma.purchase.findMany({
      where,
      include: {
        supplier: { select: { id: true, name: true } },
        user: { select: { id: true, fullName: true } },
        _count: { select: { items: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.purchase.count({ where }),
  ]);

  return {
    purchases,
    meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
}

export async function getPurchase(id: string) {
  const purchase = await prisma.purchase.findUnique({
    where: { id },
    include: {
      items: { include: { product: { select: { id: true, name: true, sku: true } } } },
      supplier: true,
      user: { select: { id: true, fullName: true } },
    },
  });
  if (!purchase) throw new NotFoundError('Pembelian tidak ditemukan');
  return purchase;
}
