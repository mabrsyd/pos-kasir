import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { validate, qs, qn } from '../middleware/validate';
import { authenticate, authorize } from '../middleware/auth';
import prisma from '../lib/prisma';
import { successResponse } from '../utils/response';

const router = Router();
router.use(authenticate);

// GET /api/v1/suppliers
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = qn(req.query.page) || 1;
    const limit = qn(req.query.limit) || 20;
    const search = qs(req.query.search);

    const where: any = {};
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { phone: { contains: search } },
      ];
    }

    const [suppliers, total] = await Promise.all([
      prisma.supplier.findMany({
        where,
        orderBy: { name: 'asc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.supplier.count({ where }),
    ]);

    res.json(successResponse(suppliers, undefined, {
      page, limit, total, totalPages: Math.ceil(total / limit),
    }));
  } catch (error) {
    next(error);
  }
});

// GET /api/v1/suppliers/:id
router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const supplier = await prisma.supplier.findUnique({
      where: { id: req.params.id as string },
      include: {
        purchases: {
          orderBy: { createdAt: 'desc' },
          take: 10,
          select: { id: true, purchaseNumber: true, total: true, paidAmount: true, debtAmount: true, status: true, createdAt: true },
        },
      },
    });
    if (!supplier) {
      res.status(404).json({ success: false, error: 'Supplier tidak ditemukan' });
      return;
    }
    res.json(successResponse(supplier));
  } catch (error) {
    next(error);
  }
});

const supplierSchema = z.object({
  name: z.string().min(1, 'Nama supplier wajib diisi'),
  phone: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

// POST /api/v1/suppliers
router.post('/', authorize('OWNER', 'ADMIN'), validate(supplierSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const supplier = await prisma.supplier.create({ data: req.body });
    res.status(201).json(successResponse(supplier, 'Supplier berhasil ditambahkan'));
  } catch (error) {
    next(error);
  }
});

// PATCH /api/v1/suppliers/:id
router.patch('/:id', authorize('OWNER', 'ADMIN'), validate(supplierSchema.partial()), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const supplier = await prisma.supplier.update({
      where: { id: req.params.id as string },
      data: req.body,
    });
    res.json(successResponse(supplier, 'Supplier berhasil diperbarui'));
  } catch (error) {
    next(error);
  }
});

export default router;
