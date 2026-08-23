import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { validate, qs, qn } from '../middleware/validate';
import { authenticate, authorize } from '../middleware/auth';
import * as purchaseService from '../services/purchase.service';
import { successResponse } from '../utils/response';

const router = Router();
router.use(authenticate);

const createPurchaseSchema = z.object({
  supplierId: z.string(),
  items: z.array(z.object({
    productId: z.string(),
    quantity: z.number().positive(),
    purchasePrice: z.number().min(0),
  })).min(1, 'Minimal 1 item'),
  paidAmount: z.number().min(0).optional(),
  notes: z.string().optional(),
});

// POST /api/v1/purchases
router.post('/', authorize('OWNER', 'ADMIN'), validate(createPurchaseSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const purchase = await purchaseService.createPurchase(req.body, req.user!.id);
    res.status(201).json(successResponse(purchase, 'Pembelian berhasil dicatat'));
  } catch (error) {
    next(error);
  }
});

// GET /api/v1/purchases
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await purchaseService.listPurchases({
      page: qn(req.query.page) || 1,
      limit: qn(req.query.limit) || 20,
      supplierId: qs(req.query.supplierId),
      startDate: qs(req.query.startDate),
      endDate: qs(req.query.endDate),
    });
    res.json(successResponse(result.purchases, undefined, result.meta));
  } catch (error) {
    next(error);
  }
});

// GET /api/v1/purchases/:id
router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const purchase = await purchaseService.getPurchase(req.params.id as string);
    res.json(successResponse(purchase));
  } catch (error) {
    next(error);
  }
});

export default router;
