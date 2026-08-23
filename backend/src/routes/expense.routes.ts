import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { validate, qs, qn } from '../middleware/validate';
import { authenticate, authorize } from '../middleware/auth';
import prisma from '../lib/prisma';
import { successResponse } from '../utils/response';

const router = Router();
router.use(authenticate);

const expenseSchema = z.object({
  category: z.string().min(1, 'Kategori wajib diisi'),
  amount: z.number().positive('Nominal harus lebih dari 0'),
  description: z.string().optional(),
  paymentMethod: z.enum(['CASH', 'DIGITAL']).default('CASH'),
  expenseDate: z.string().min(1, 'Tanggal wajib diisi'),
});

// GET /api/v1/expenses
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = qn(req.query.page) || 1;
    const limit = qn(req.query.limit) || 20;

    const where: any = {};
    if (qs(req.query.category)) where.category = qs(req.query.category);
    if (qs(req.query.startDate) || qs(req.query.endDate)) {
      where.expenseDate = {};
      if (qs(req.query.startDate)) where.expenseDate.gte = new Date(qs(req.query.startDate)!);
      if (qs(req.query.endDate)) where.expenseDate.lte = new Date(qs(req.query.endDate)!);
    }

    const [expenses, total] = await Promise.all([
      prisma.expense.findMany({
        where,
        include: { user: { select: { id: true, fullName: true } } },
        orderBy: { expenseDate: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.expense.count({ where }),
    ]);

    res.json(successResponse(expenses, undefined, {
      page, limit, total, totalPages: Math.ceil(total / limit),
    }));
  } catch (error) {
    next(error);
  }
});

// POST /api/v1/expenses
router.post('/', authorize('OWNER', 'ADMIN'), validate(expenseSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { category, amount, description, paymentMethod, expenseDate } = req.body;

    const result = await prisma.$transaction(async (tx) => {
      const expense = await tx.expense.create({
        data: {
          category,
          amount,
          description,
          paymentMethod,
          userId: req.user!.id,
          expenseDate: new Date(expenseDate),
        },
        include: { user: { select: { id: true, fullName: true } } },
      });

      if (paymentMethod === 'CASH') {
        const currentSession = await tx.cashSession.findFirst({
          where: { userId: req.user!.id, status: 'OPEN' },
        });

        if (currentSession) {
          await tx.cashTransaction.create({
            data: {
              cashSessionId: currentSession.id,
              type: 'EXPENSE',
              amount: -amount,
              referenceId: expense.id,
              referenceType: 'EXPENSE',
              description: `Pengeluaran: ${category} - ${description || ''}`,
            },
          });

          await tx.cashSession.update({
            where: { id: currentSession.id },
            data: { expectedBalance: { decrement: amount } },
          });
        }
      }

      return expense;
    });

    res.status(201).json(successResponse(result, 'Pengeluaran berhasil dicatat'));
  } catch (error) {
    next(error);
  }
});

export default router;
