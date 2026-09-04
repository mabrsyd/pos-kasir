import prisma from '../lib/prisma';
import { ValidationError, NotFoundError, InsufficientStockError, InsufficientPaymentError } from '../utils/errors';
import { createAuditLog } from './audit.service';
import { Decimal } from '@prisma/client/runtime/library';

interface SaleItemInput {
  productId: string;
  quantity: number;
  discount?: number;
}

interface CreateSaleInput {
  clientTransactionId?: string;
  deviceId?: string;
  customerId?: string;
  cashSessionId?: string;
  items: SaleItemInput[];
  paymentMethod: 'CASH' | 'DIGITAL';
  amountReceived?: number; // for cash
  paymentReference?: string; // for digital
  discountAmount?: number;
  notes?: string;
}

function generateInvoiceNumber(): string {
  const now = new Date();
  const y = now.getFullYear().toString().slice(-2);
  const m = (now.getMonth() + 1).toString().padStart(2, '0');
  const d = now.getDate().toString().padStart(2, '0');
  const h = now.getHours().toString().padStart(2, '0');
  const min = now.getMinutes().toString().padStart(2, '0');
  const s = now.getSeconds().toString().padStart(2, '0');
  const ms = now.getMilliseconds().toString().padStart(3, '0');
  return `INV${y}${m}${d}${h}${min}${s}${ms}`;
}

export async function createSale(data: CreateSaleInput, userId: string) {
  // Idempotency: check clientTransactionId
  if (data.clientTransactionId) {
    const existing = await prisma.sale.findUnique({
      where: { clientTransactionId: data.clientTransactionId },
      include: { items: true, payments: true },
    });
    if (existing) return existing; // Idempotent return
  }

  if (!data.items || data.items.length === 0) {
    throw new ValidationError('Minimal 1 item diperlukan');
  }

  // Fetch all products
  const productIds = data.items.map(i => i.productId);
  const products = await prisma.product.findMany({
    where: { id: { in: productIds } },
    include: { unit: true },
  });

  const productMap = new Map(products.map(p => [p.id, p]));

  // Validate items
  for (const item of data.items) {
    const product = productMap.get(item.productId);
    if (!product) throw new NotFoundError(`Produk tidak ditemukan`);
    if (!product.isActive) throw new ValidationError(`Produk ${product.name} tidak aktif`);
    if (item.quantity <= 0) throw new ValidationError(`Jumlah harus lebih dari 0`);
    
    // Stock check (FUEL allows decimal, RETAIL integer)
    if (Number(product.currentStock) < item.quantity) {
      throw new InsufficientStockError(product.name);
    }
  }

  // Calculate totals
  let subtotal = 0;
  const saleItems = data.items.map(item => {
    const product = productMap.get(item.productId)!;
    const itemSubtotal = Number(product.sellingPrice) * item.quantity;
    const discount = item.discount || 0;
    const total = itemSubtotal - discount;
    subtotal += total;

    return {
      productId: item.productId,
      productName: product.name,
      productSku: product.sku,
      unitName: product.unit.name,
      sellingPrice: Number(product.sellingPrice),
      costPrice: Number(product.purchasePrice),
      quantity: item.quantity,
      subtotal: itemSubtotal,
      discount,
      total,
    };
  });

  const discountAmount = data.discountAmount || 0;
  const total = subtotal - discountAmount;

  // Payment validation
  if (data.paymentMethod === 'CASH') {
    const received = data.amountReceived || 0;
    if (received < total) {
      throw new InsufficientPaymentError();
    }
  }

  // Execute in transaction
  const result = await prisma.$transaction(async (tx) => {
    // 1. Create sale
    const sale = await tx.sale.create({
      data: {
        invoiceNumber: generateInvoiceNumber(),
        clientTransactionId: data.clientTransactionId || null,
        deviceId: data.deviceId || null,
        cashierId: userId,
        customerId: data.customerId || null,
        cashSessionId: data.cashSessionId || null,
        subtotal,
        discountAmount,
        taxAmount: 0,
        total,
        status: 'COMPLETED',
        notes: data.notes,
      },
    });

    // 2. Create sale items
    await tx.saleItem.createMany({
      data: saleItems.map(item => ({
        saleId: sale.id,
        ...item,
      })),
    });

    // 3. Create payment
    const paymentData: Record<string, unknown> = {
      saleId: sale.id,
      method: data.paymentMethod,
      amount: total,
    };
    if (data.paymentMethod === 'CASH') {
      paymentData.amountReceived = data.amountReceived;
      paymentData.change = (data.amountReceived || 0) - total;
    }
    if (data.paymentMethod === 'DIGITAL') {
      paymentData.reference = data.paymentReference || null;
    }
    await tx.payment.create({ data: paymentData as any });

    // 4. Stock movements + update stock
    for (const item of data.items) {
      const product = productMap.get(item.productId)!;
      const stockBefore = Number(product.currentStock);
      const stockAfter = stockBefore - item.quantity;

      await tx.stockMovement.create({
        data: {
          productId: item.productId,
          movementType: 'SALE',
          quantity: -item.quantity,
          stockBefore,
          stockAfter,
          referenceId: sale.id,
          referenceType: 'SALE',
          userId,
        },
      });

      await tx.product.update({
        where: { id: item.productId },
        data: { currentStock: stockAfter },
      });
    }

    // 5. Cash transaction (only for cash payments)
    if (data.paymentMethod === 'CASH' && data.cashSessionId) {
      await tx.cashTransaction.create({
        data: {
          cashSessionId: data.cashSessionId,
          type: 'SALE',
          amount: total,
          referenceId: sale.id,
          referenceType: 'SALE',
          description: `Penjualan ${sale.invoiceNumber}`,
        },
      });

      // Update expected balance
      await tx.cashSession.update({
        where: { id: data.cashSessionId },
        data: { expectedBalance: { increment: total } },
      });
    }

    return sale;
  });

  // Fetch complete sale
  return prisma.sale.findUnique({
    where: { id: result.id },
    include: {
      items: true,
      payments: true,
      cashier: { select: { id: true, fullName: true } },
      customer: true,
    },
  });
}

export async function getSale(id: string) {
  const sale = await prisma.sale.findUnique({
    where: { id },
    include: {
      items: true,
      payments: true,
      cashier: { select: { id: true, fullName: true } },
      customer: true,
      returns: { include: { items: true } },
    },
  });
  if (!sale) throw new NotFoundError('Transaksi tidak ditemukan');
  return sale;
}

export async function listSales(params: {
  page?: number;
  limit?: number;
  status?: string;
  cashierId?: string;
  startDate?: string;
  endDate?: string;
}) {
  const page = params.page || 1;
  const limit = params.limit || 20;
  const skip = (page - 1) * limit;

  const where: Record<string, unknown> = {};
  if (params.status) where.status = params.status;
  if (params.cashierId) where.cashierId = params.cashierId;
  if (params.startDate || params.endDate) {
    where.createdAt = {};
    if (params.startDate) (where.createdAt as any).gte = new Date(params.startDate);
    if (params.endDate) (where.createdAt as any).lte = new Date(params.endDate + 'T23:59:59');
  }

  const [sales, total] = await Promise.all([
    prisma.sale.findMany({
      where,
      include: {
        items: true,
        payments: true,
        cashier: { select: { id: true, fullName: true } },
        customer: { select: { id: true, name: true } },
        _count: { select: { items: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.sale.count({ where }),
  ]);

  return {
    sales,
    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

export async function voidSale(saleId: string, reason: string, userId: string) {
  const sale = await prisma.sale.findUnique({
    where: { id: saleId },
    include: { items: true, payments: true },
  });

  if (!sale) throw new NotFoundError('Transaksi tidak ditemukan');
  if (sale.status === 'VOIDED') throw new ValidationError('Transaksi sudah di-void');

  await prisma.$transaction(async (tx) => {
    // 1. Update sale status
    await tx.sale.update({
      where: { id: saleId },
      data: {
        status: 'VOIDED',
        voidReason: reason,
        voidedAt: new Date(),
        voidedBy: userId,
      },
    });

    // 2. Reverse stock
    for (const item of sale.items) {
      const product = await tx.product.findUnique({ where: { id: item.productId } });
      if (!product) continue;

      const stockBefore = Number(product.currentStock);
      const stockAfter = stockBefore + Number(item.quantity);

      await tx.stockMovement.create({
        data: {
          productId: item.productId,
          movementType: 'VOID_REVERSAL',
          quantity: Number(item.quantity),
          stockBefore,
          stockAfter,
          referenceId: saleId,
          referenceType: 'VOID',
          reason: `Void: ${reason}`,
          userId,
        },
      });

      await tx.product.update({
        where: { id: item.productId },
        data: { currentStock: stockAfter },
      });
    }

    // 3. Reverse cash if cash payment
    const cashPayment = sale.payments.find(p => p.method === 'CASH');
    if (cashPayment && sale.cashSessionId) {
      await tx.cashTransaction.create({
        data: {
          cashSessionId: sale.cashSessionId,
          type: 'VOID_REVERSAL',
          amount: -Number(sale.total),
          referenceId: saleId,
          referenceType: 'VOID',
          description: `Void transaksi ${sale.invoiceNumber}: ${reason}`,
        },
      });

      await tx.cashSession.update({
        where: { id: sale.cashSessionId },
        data: { expectedBalance: { decrement: Number(sale.total) } },
      });
    }

    // 4. Audit log
    await tx.auditLog.create({
      data: {
        userId,
        action: 'VOID',
        entityType: 'SALE',
        entityId: saleId,
        oldValues: { status: 'COMPLETED' },
        newValues: { status: 'VOIDED', reason },
        description: `Void transaksi ${sale.invoiceNumber}: ${reason}`,
      },
    });
  });

  return getSale(saleId);
}
