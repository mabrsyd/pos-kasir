import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { validate, qs, qn } from '../middleware/validate';
import { authenticate, authorize } from '../middleware/auth';
import * as saleService from '../services/sale.service';
import { successResponse } from '../utils/response';

const router = Router();
router.use(authenticate);

const createSaleSchema = z.object({
  clientTransactionId: z.string().optional(),
  deviceId: z.string().optional(),
  customerId: z.string().optional().nullable(),
  cashSessionId: z.string().optional().nullable(),
  items: z.array(z.object({
    productId: z.string(),
    quantity: z.number().positive('Jumlah harus lebih dari 0'),
    discount: z.number().min(0).optional(),
  })).min(1, 'Minimal 1 item'),
  paymentMethod: z.enum(['CASH', 'DIGITAL']),
  amountReceived: z.number().optional(),
  paymentReference: z.string().optional(),
  discountAmount: z.number().min(0).optional(),
  notes: z.string().optional(),
});

// POST /api/v1/sales
router.post('/', validate(createSaleSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const sale = await saleService.createSale(req.body, req.user!.id);
    res.status(201).json(successResponse(sale, 'Transaksi berhasil'));
  } catch (error) {
    next(error);
  }
});

// GET /api/v1/sales
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await saleService.listSales({
      page: qn(req.query.page) || 1,
      limit: qn(req.query.limit) || 20,
      status: qs(req.query.status),
      cashierId: qs(req.query.cashierId),
      startDate: qs(req.query.startDate),
      endDate: qs(req.query.endDate),
    });
    res.json(successResponse(result.sales, undefined, result.meta));
  } catch (error) {
    next(error);
  }
});

// GET /api/v1/sales/:id
router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const sale = await saleService.getSale(req.params.id as string);
    res.json(successResponse(sale));
  } catch (error) {
    next(error);
  }
});

// GET /api/v1/sales/:id/receipt
router.get('/:id/receipt', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const sale = await saleService.getSale(req.params.id as string);
    res.json(successResponse(sale));
  } catch (error) {
    next(error);
  }
});

// POST /api/v1/sales/:id/void
router.post('/:id/void', authorize('OWNER', 'ADMIN'), validate(z.object({
  reason: z.string().min(1, 'Alasan void wajib diisi'),
})), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const sale = await saleService.voidSale(req.params.id as string, req.body.reason, req.user!.id);
    res.json(successResponse(sale, 'Transaksi berhasil di-void'));
  } catch (error) {
    next(error);
  }
});

export default router;
