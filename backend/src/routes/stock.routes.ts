import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { validate, qs, qn } from '../middleware/validate';
import { authenticate, authorize } from '../middleware/auth';
import * as inventoryService from '../services/inventory.service';
import { successResponse } from '../utils/response';

const router = Router();
router.use(authenticate);

// GET /api/v1/stock/summary
router.get('/summary', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await inventoryService.getStockSummary({
      page: qn(req.query.page) || 1,
      limit: qn(req.query.limit) || 20,
      search: qs(req.query.search),
      lowStockOnly: qs(req.query.lowStockOnly) === 'true',
      categoryId: qs(req.query.categoryId),
    });
    res.json(successResponse(result.products, undefined, result.meta));
  } catch (error) {
    next(error);
  }
});

// GET /api/v1/stock/low
router.get('/low', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const products = await inventoryService.getLowStockProducts();
    res.json(successResponse(products));
  } catch (error) {
    next(error);
  }
});

// POST /api/v1/stock/adjustments
router.post('/adjustments', authorize('OWNER', 'ADMIN'), validate(z.object({
  productId: z.string(),
  physicalQuantity: z.number().min(0, 'Stok fisik tidak boleh negatif'),
  reason: z.string().min(1, 'Alasan wajib diisi'),
})), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await inventoryService.createStockAdjustment(req.body, req.user!.id);
    res.status(201).json(successResponse(result, 'Stok berhasil disesuaikan'));
  } catch (error) {
    next(error);
  }
});

// GET /api/v1/stock/movements
router.get('/movements', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await inventoryService.getStockMovements({
      productId: qs(req.query.productId),
      movementType: qs(req.query.movementType),
      page: qn(req.query.page) || 1,
      limit: qn(req.query.limit) || 20,
      startDate: qs(req.query.startDate),
      endDate: qs(req.query.endDate),
    });
    res.json(successResponse(result.movements, undefined, result.meta));
  } catch (error) {
    next(error);
  }
});

export default router;
