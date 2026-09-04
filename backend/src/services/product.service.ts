import { Decimal } from '@prisma/client/runtime/library';
import prisma from '../lib/prisma';
import { NotFoundError, ConflictError, ValidationError } from '../utils/errors';
import { createAuditLog } from './audit.service';
import { paginationMeta, PaginationMeta } from '../utils/response';

interface ProductCreateInput {
  name: string;
  sku?: string;
  barcode?: string | null;
  image?: string | null;
  categoryId: string;
  unitId: string;
  productType?: 'RETAIL' | 'FUEL' | 'OTHER';
  purchasePrice: number;
  sellingPrice: number;
  minimumStock?: number;
  currentStock?: number;
}

interface ProductUpdateInput {
  name?: string;
  sku?: string;
  barcode?: string | null;
  image?: string | null;
  categoryId?: string;
  unitId?: string;
  productType?: 'RETAIL' | 'FUEL' | 'OTHER';
  purchasePrice?: number;
  sellingPrice?: number;
  minimumStock?: number;
  isActive?: boolean;
}

interface ProductListParams {
  page?: number;
  limit?: number;
  search?: string;
  categoryId?: string;
  productType?: string;
  isActive?: boolean;
}

export async function listProducts(params: ProductListParams) {
  const page = params.page || 1;
  const limit = params.limit || 20;
  const skip = (page - 1) * limit;

  const where: Record<string, unknown> = {};
  
  if (params.search) {
    where.OR = [
      { name: { contains: params.search } },
      { sku: { contains: params.search } },
      { barcode: { contains: params.search } },
    ];
  }
  if (params.categoryId) where.categoryId = params.categoryId;
  if (params.productType) where.productType = params.productType;
  if (params.isActive !== undefined) where.isActive = params.isActive;

  const [products, total] = await Promise.all([
    prisma.product.findMany({
      where,
      include: { category: true, unit: true },
      orderBy: { name: 'asc' },
      skip,
      take: limit,
    }),
    prisma.product.count({ where }),
  ]);

  return { products, meta: paginationMeta(page, limit, total) };
}

export async function getProduct(id: string) {
  const product = await prisma.product.findUnique({
    where: { id },
    include: { category: true, unit: true },
  });
  if (!product) throw new NotFoundError('Produk tidak ditemukan');
  return product;
}

export async function getProductByBarcode(barcode: string) {
  const product = await prisma.product.findUnique({
    where: { barcode },
    include: { category: true, unit: true },
  });
  if (!product) throw new NotFoundError('Produk dengan barcode tersebut tidak ditemukan');
  if (!product.isActive) throw new ValidationError('Produk tidak aktif');
  return product;
}

export async function createProduct(data: ProductCreateInput, userId: string) {
  let sku = data.sku;
  if (!sku) {
    const randomStr = Math.random().toString(36).substring(2, 6).toUpperCase();
    sku = `SKU-${Date.now().toString().slice(-4)}-${randomStr}`;
  }

  // Validate unique constraints
  const existingSku = await prisma.product.findUnique({ where: { sku } });
  if (existingSku) throw new ConflictError('SKU sudah digunakan oleh produk lain');

  if (data.barcode) {
    const existingBarcode = await prisma.product.findUnique({ where: { barcode: data.barcode } });
    if (existingBarcode) throw new ConflictError('Barcode sudah digunakan oleh produk lain');
  }

  const product = await prisma.product.create({
    data: {
      name: data.name,
      sku,
      barcode: data.barcode || null,
      image: data.image || null,
      categoryId: data.categoryId,
      unitId: data.unitId,
      productType: data.productType || 'RETAIL',
      purchasePrice: data.purchasePrice,
      sellingPrice: data.sellingPrice,
      minimumStock: data.minimumStock || 0,
      currentStock: data.currentStock || 0,
    },
    include: { category: true, unit: true },
  });

  // Create initial stock movement if stock > 0
  if (data.currentStock && data.currentStock > 0) {
    await prisma.stockMovement.create({
      data: {
        productId: product.id,
        movementType: 'OPENING',
        quantity: data.currentStock,
        stockBefore: 0,
        stockAfter: data.currentStock,
        reason: 'Stok awal',
        userId,
      },
    });
  }

  // Record initial price history
  await prisma.priceHistory.create({
    data: {
      productId: product.id,
      purchasePrice: data.purchasePrice,
      sellingPrice: data.sellingPrice,
      changedBy: userId,
      reason: 'Harga awal',
    },
  });

  return product;
}

export async function updateProduct(id: string, data: ProductUpdateInput, userId: string) {
  const existing = await prisma.product.findUnique({ where: { id } });
  if (!existing) throw new NotFoundError('Produk tidak ditemukan');

  // Check unique constraints
  if (data.sku && data.sku !== existing.sku) {
    const existingSku = await prisma.product.findUnique({ where: { sku: data.sku } });
    if (existingSku) throw new ConflictError('SKU sudah digunakan oleh produk lain');
  }

  if (data.barcode !== undefined && data.barcode !== existing.barcode) {
    if (data.barcode) {
      const existingBarcode = await prisma.product.findUnique({ where: { barcode: data.barcode } });
      if (existingBarcode) throw new ConflictError('Barcode sudah digunakan oleh produk lain');
    }
  }

  // Track price changes for audit
  const priceChanged = (data.purchasePrice !== undefined && data.purchasePrice !== Number(existing.purchasePrice)) ||
                       (data.sellingPrice !== undefined && data.sellingPrice !== Number(existing.sellingPrice));

  const product = await prisma.product.update({
    where: { id },
    data: {
      ...(data.name !== undefined && { name: data.name }),
      ...(data.sku !== undefined && { sku: data.sku }),
      ...(data.barcode !== undefined && { barcode: data.barcode }),
      ...(data.image !== undefined && { image: data.image === '' ? null : data.image }),
      ...(data.categoryId !== undefined && { categoryId: data.categoryId }),
      ...(data.unitId !== undefined && { unitId: data.unitId }),
      ...(data.productType !== undefined && { productType: data.productType }),
      ...(data.purchasePrice !== undefined && { purchasePrice: data.purchasePrice }),
      ...(data.sellingPrice !== undefined && { sellingPrice: data.sellingPrice }),
      ...(data.minimumStock !== undefined && { minimumStock: data.minimumStock }),
      ...(data.isActive !== undefined && { isActive: data.isActive }),
    },
    include: { category: true, unit: true },
  });

  if (priceChanged) {
    await prisma.priceHistory.create({
      data: {
        productId: id,
        purchasePrice: data.purchasePrice ?? Number(existing.purchasePrice),
        sellingPrice: data.sellingPrice ?? Number(existing.sellingPrice),
        changedBy: userId,
        reason: 'Perubahan harga',
      },
    });

    await createAuditLog({
      userId,
      action: 'PRICE_CHANGE',
      entityType: 'PRODUCT',
      entityId: id,
      oldValues: {
        purchasePrice: Number(existing.purchasePrice),
        sellingPrice: Number(existing.sellingPrice),
      },
      newValues: {
        purchasePrice: data.purchasePrice ?? Number(existing.purchasePrice),
        sellingPrice: data.sellingPrice ?? Number(existing.sellingPrice),
      },
    });
  }

  return product;
}

export async function searchProducts(query: string) {
  return prisma.product.findMany({
    where: {
      isActive: true,
      OR: [
        { name: { contains: query } },
        { sku: { contains: query } },
        { barcode: { contains: query } },
      ],
    },
    include: { category: true, unit: true },
    take: 20,
    orderBy: { name: 'asc' },
  });
}
