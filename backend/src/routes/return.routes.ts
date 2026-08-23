import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { validate, qs, qn } from '../middleware/validate';
import { authenticate, authorize } from '../middleware/auth';
import * as returnService from '../services/return.service';
import { successResponse } from '../utils/response';

const router = Router();
router.use(authenticate);

const createReturnSchema = z.object({
  saleId: z.string(),
  items: z.array(z.object({
    productId: z.string(),
    quantity: z.number().positive(),
    condition: z.enum(['GOOD', 'DAMAGED', 'LOST']),
  })).min(1),
  reason: z.string().optional(),
});

// POST /api/v1/returns
router.post('/', authorize('OWNER', 'ADMIN'), validate(createReturnSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await returnService.createReturn(req.body, req.user!.id);
    res.status(201).json(successResponse(result, 'Return berhasil dicatat'));
  } catch (error) {
    next(error);
  }
});

// GET /api/v1/returns
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await returnService.listReturns({
      page: qn(req.query.page) || 1,
      limit: qn(req.query.limit) || 20,
      startDate: qs(req.query.startDate),
      endDate: qs(req.query.endDate),
    });
    res.json(successResponse(result.returns, undefined, result.meta));
  } catch (error) {
    next(error);
  }
});

// GET /api/v1/returns/:id
router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await returnService.getReturn(req.params.id as string);
    res.json(successResponse(result));
  } catch (error) {
    next(error);
  }
});

export default router;
