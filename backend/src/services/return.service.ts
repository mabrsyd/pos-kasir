import prisma from '../lib/prisma';
import { ValidationError, NotFoundError } from '../utils/errors';

interface ReturnItemInput {
  productId: string;
  quantity: number;
  condition: 'GOOD' | 'DAMAGED' | 'LOST';
}

interface CreateReturnInput {
  saleId: string;
  items: ReturnItemInput[];
  reason?: string;
}

function generateReturnNumber(): string {
  const now = new Date();
  const y = now.getFullYear().toString().slice(-2);
  const m = (now.getMonth() + 1).toString().padStart(2, '0');
  const d = now.getDate().toString().padStart(2, '0');
  const h = now.getHours().toString().padStart(2, '0');
  const min = now.getMinutes().toString().padStart(2, '0');
  const s = now.getSeconds().toString().padStart(2, '0');
  return `RET${y}${m}${d}${h}${min}${s}`;
}

export async function createReturn(data: CreateReturnInput, userId: string) {
  const sale = await prisma.sale.findUnique({
    where: { id: data.saleId },
    include: {
      items: true,
      returns: { include: { items: true } },
    },
  });

  if (!sale) throw new NotFoundError('Transaksi tidak ditemukan');
  if (sale.status === 'VOIDED') throw new ValidationError('Tidak dapat melakukan return pada transaksi yang sudah di-void');

  if (!data.items || data.items.length === 0) {
    throw new ValidationError('Minimal 1 item return diperlukan');
  }

  // Validate return quantities
  for (const returnItem of data.items) {
    const saleItem = sale.items.find(si => si.productId === returnItem.productId);
    if (!saleItem) {
      throw new ValidationError('Produk tidak ditemukan dalam transaksi asli');
    }

    // Calculate already returned quantity
    const alreadyReturned = sale.returns.reduce((sum, ret) => {
      const retItem = ret.items.find(ri => ri.productId === returnItem.productId);
      return sum + (retItem ? Number(retItem.quantity) : 0);
    }, 0);

    const maxReturnable = Number(saleItem.quantity) - alreadyReturned;
    if (returnItem.quantity > maxReturnable) {
      throw new ValidationError(
        `Jumlah return melebihi batas. Maksimal return: ${maxReturnable}`
      );
    }
  }

  const result = await prisma.$transaction(async (tx) => {
    let totalRefund = 0;

    // Calculate refund
    for (const item of data.items) {
      const saleItem = sale.items.find(si => si.productId === item.productId)!;
      totalRefund += Number(saleItem.sellingPrice) * item.quantity;
    }

    // 1. Create return
    const returnRecord = await tx.return.create({
      data: {
        returnNumber: generateReturnNumber(),
        saleId: data.saleId,
        userId,
        totalRefund,
        reason: data.reason,
      },
    });

    // 2. Create return items and handle stock
    for (const item of data.items) {
      const saleItem = sale.items.find(si => si.productId === item.productId)!;

      await tx.returnItem.create({
        data: {
          returnId: returnRecord.id,
          productId: item.productId,
          productName: saleItem.productName,
          quantity: item.quantity,
          sellingPrice: Number(saleItem.sellingPrice),
          subtotal: Number(saleItem.sellingPrice) * item.quantity,
          condition: item.condition,
        },
      });

      // Only GOOD returns go back to sellable stock
      if (item.condition === 'GOOD') {
        const product = await tx.product.findUnique({ where: { id: item.productId } });
        if (product) {
          const stockBefore = Number(product.currentStock);
          const stockAfter = stockBefore + item.quantity;

          await tx.stockMovement.create({
            data: {
              productId: item.productId,
              movementType: 'RETURN',
              quantity: item.quantity,
              stockBefore,
              stockAfter,
              referenceId: returnRecord.id,
              referenceType: 'RETURN',
              reason: `Return: ${item.condition}`,
              userId,
            },
          });

          await tx.product.update({
            where: { id: item.productId },
            data: { currentStock: stockAfter },
          });
        }
      } else {
        // DAMAGED/LOST — create movement but don't add to sellable stock
        const product = await tx.product.findUnique({ where: { id: item.productId } });
        if (product) {
          await tx.stockMovement.create({
            data: {
              productId: item.productId,
              movementType: 'RETURN',
              quantity: 0, // doesn't affect sellable stock
              stockBefore: Number(product.currentStock),
              stockAfter: Number(product.currentStock),
              referenceId: returnRecord.id,
              referenceType: 'RETURN',
              reason: `Return (${item.condition}): tidak masuk stok jual`,
              userId,
            },
          });
        }
      }
    }

    // 3. Cash refund if sale was cash
    if (sale.cashSessionId) {
      // Find current open session for refund
      const currentSession = await tx.cashSession.findFirst({
        where: { userId, status: 'OPEN' },
      });

      if (currentSession) {
        await tx.cashTransaction.create({
          data: {
            cashSessionId: currentSession.id,
            type: 'REFUND',
            amount: -totalRefund,
            referenceId: returnRecord.id,
            referenceType: 'RETURN',
            description: `Refund return ${returnRecord.returnNumber}`,
          },
        });

        await tx.cashSession.update({
          where: { id: currentSession.id },
          data: { expectedBalance: { decrement: totalRefund } },
        });
      }
    }

    // 4. Audit log
    await tx.auditLog.create({
      data: {
        userId,
        action: 'RETURN',
        entityType: 'SALE',
        entityId: data.saleId,
        newValues: {
          returnId: returnRecord.id,
          totalRefund,
          items: data.items,
        } as any,
        description: `Return dari transaksi ${sale.invoiceNumber}`,
      },
    });

    return returnRecord;
  });

  return prisma.return.findUnique({
    where: { id: result.id },
    include: {
      items: true,
      sale: { select: { id: true, invoiceNumber: true } },
      user: { select: { id: true, fullName: true } },
    },
  });
}

export async function listReturns(params: {
  page?: number;
  limit?: number;
  startDate?: string;
  endDate?: string;
}) {
  const page = params.page || 1;
  const limit = params.limit || 20;
  const skip = (page - 1) * limit;

  const where: Record<string, unknown> = {};
  if (params.startDate || params.endDate) {
    where.createdAt = {};
    if (params.startDate) (where.createdAt as any).gte = new Date(params.startDate);
    if (params.endDate) (where.createdAt as any).lte = new Date(params.endDate + 'T23:59:59');
  }

  const [returns, total] = await Promise.all([
    prisma.return.findMany({
      where,
      include: {
        sale: { select: { id: true, invoiceNumber: true } },
        user: { select: { id: true, fullName: true } },
        _count: { select: { items: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.return.count({ where }),
  ]);

  return {
    returns,
    meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
}

export async function getReturn(id: string) {
  const ret = await prisma.return.findUnique({
    where: { id },
    include: {
      items: true,
      sale: { select: { id: true, invoiceNumber: true } },
      user: { select: { id: true, fullName: true } },
    },
  });
  if (!ret) throw new NotFoundError('Data return tidak ditemukan');
  return ret;
}
