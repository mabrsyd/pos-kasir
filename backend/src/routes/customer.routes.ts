import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { validate, qs } from '../middleware/validate';
import { authenticate } from '../middleware/auth';
import prisma from '../lib/prisma';
import { successResponse } from '../utils/response';

const router = Router();
router.use(authenticate);

// GET /api/v1/customers
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const search = qs(req.query.search);
    const where: any = {};
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { phone: { contains: search } },
      ];
    }

    const customers = await prisma.customer.findMany({
      where,
      orderBy: { name: 'asc' },
      take: 50,
    });
    res.json(successResponse(customers));
  } catch (error) {
    next(error);
  }
});

// GET /api/v1/customers/:id
router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const customer = await prisma.customer.findUnique({
      where: { id: req.params.id as string },
      include: {
        sales: {
          orderBy: { createdAt: 'desc' },
          take: 10,
          select: { id: true, invoiceNumber: true, total: true, status: true, createdAt: true },
        },
      },
    });
    if (!customer) {
      res.status(404).json({ success: false, error: 'Pelanggan tidak ditemukan' });
      return;
    }
    res.json(successResponse(customer));
  } catch (error) {
    next(error);
  }
});

const customerSchema = z.object({
  name: z.string().min(1, 'Nama pelanggan wajib diisi'),
  phone: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

// POST /api/v1/customers
router.post('/', validate(customerSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const customer = await prisma.customer.create({ data: req.body });
    res.status(201).json(successResponse(customer, 'Pelanggan berhasil ditambahkan'));
  } catch (error) {
    next(error);
  }
});

// PATCH /api/v1/customers/:id
router.patch('/:id', validate(customerSchema.partial()), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const customer = await prisma.customer.update({
      where: { id: req.params.id as string },
      data: req.body,
    });
    res.json(successResponse(customer, 'Pelanggan berhasil diperbarui'));
  } catch (error) {
    next(error);
  }
});

export default router;
