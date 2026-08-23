import prisma from '../lib/prisma';
import { ValidationError, NotFoundError } from '../utils/errors';
import { createAuditLog } from './audit.service';

interface StockAdjustmentInput {
  productId: string;
  physicalQuantity: number;
  reason: string;
}

export async function getStockSummary(params: {
  page?: number;
  limit?: number;
  search?: string;
  lowStockOnly?: boolean;
  categoryId?: string;
}) {
  const page = params.page || 1;
  const limit = params.limit || 20;
  const skip = (page - 1) * limit;

  const where: Record<string, unknown> = { isActive: true };
  
  if (params.search) {
    where.OR = [
      { name: { contains: params.search } },
      { sku: { contains: params.search } },
    ];
  }
  if (params.categoryId) where.categoryId = params.categoryId;

  if (params.lowStockOnly) {
    // Products where currentStock <= minimumStock
    where.currentStock = { lte: prisma.product.fields.minimumStock };
  }

  const [products, total] = await Promise.all([
    prisma.product.findMany({
      where: params.lowStockOnly
        ? {
            ...where,
            // Raw query for comparing two columns
          }
        : where,
      include: { category: true, unit: true },
      orderBy: { name: 'asc' },
      skip,
      take: limit,
    }),
    prisma.product.count({ where: params.lowStockOnly ? where : where }),
  ]);

  // Filter low stock in application if needed
  const filtered = params.lowStockOnly
    ? products.filter(p => Number(p.currentStock) <= Number(p.minimumStock))
    : products;

  return {
    products: filtered,
    meta: {
      page,
      limit,
      total: params.lowStockOnly ? filtered.length : total,
      totalPages: Math.ceil((params.lowStockOnly ? filtered.length : total) / limit),
    },
  };
}

export async function createStockAdjustment(input: StockAdjustmentInput, userId: string) {
  const product = await prisma.product.findUnique({ where: { id: input.productId } });
  if (!product) throw new NotFoundError('Produk tidak ditemukan');

  if (!input.reason || input.reason.trim() === '') {
    throw new ValidationError('Alasan penyesuaian stok wajib diisi');
  }

  const stockBefore = Number(product.currentStock);
  const difference = input.physicalQuantity - stockBefore;

  if (difference === 0) {
    throw new ValidationError('Stok fisik sama dengan stok saat ini. Tidak ada perubahan.');
  }

  const result = await prisma.$transaction(async (tx) => {
    // Update product stock
    await tx.product.update({
      where: { id: input.productId },
      data: { currentStock: input.physicalQuantity },
    });

    // Create stock movement
    const movement = await tx.stockMovement.create({
      data: {
        productId: input.productId,
        movementType: 'ADJUSTMENT',
        quantity: difference,
        stockBefore,
        stockAfter: input.physicalQuantity,
        reason: input.reason,
        userId,
      },
    });

    // Audit log
    await tx.auditLog.create({
      data: {
        userId,
        action: 'STOCK_ADJUSTMENT',
        entityType: 'PRODUCT',
        entityId: input.productId,
        oldValues: { currentStock: stockBefore },
        newValues: { currentStock: input.physicalQuantity, difference },
        description: `Penyesuaian stok ${product.name}: ${stockBefore} → ${input.physicalQuantity} (${difference > 0 ? '+' : ''}${difference}). Alasan: ${input.reason}`,
      },
    });

    return movement;
  });

  return result;
}

export async function getStockMovements(params: {
  productId?: string;
  movementType?: string;
  page?: number;
  limit?: number;
  startDate?: string;
  endDate?: string;
}) {
  const page = params.page || 1;
  const limit = params.limit || 20;
  const skip = (page - 1) * limit;

  const where: Record<string, unknown> = {};
  if (params.productId) where.productId = params.productId;
  if (params.movementType) where.movementType = params.movementType;
  if (params.startDate || params.endDate) {
    where.createdAt = {};
    if (params.startDate) (where.createdAt as any).gte = new Date(params.startDate);
    if (params.endDate) (where.createdAt as any).lte = new Date(params.endDate + 'T23:59:59');
  }

  const [movements, total] = await Promise.all([
    prisma.stockMovement.findMany({
      where,
      include: {
        product: { select: { id: true, name: true, sku: true } },
        user: { select: { id: true, fullName: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.stockMovement.count({ where }),
  ]);

  return {
    movements,
    meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
}

export async function getLowStockProducts() {
  const products = await prisma.product.findMany({
    where: { isActive: true },
    include: { category: true, unit: true },
    orderBy: { name: 'asc' },
  });

  return products.filter(p => Number(p.currentStock) <= Number(p.minimumStock));
}
