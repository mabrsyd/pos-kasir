import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { validate } from '../middleware/validate';
import { authenticate } from '../middleware/auth';
import * as cashSessionService from '../services/cashSession.service';
import { successResponse } from '../utils/response';

const router = Router();
router.use(authenticate);

// POST /api/v1/cash-sessions (open)
router.post('/', validate(z.object({
  openingBalance: z.number().min(0, 'Saldo awal tidak boleh negatif'),
})), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const session = await cashSessionService.openCashSession(req.user!.id, req.body.openingBalance);
    res.status(201).json(successResponse(session, 'Sesi kasir berhasil dibuka'));
  } catch (error) {
    next(error);
  }
});

// GET /api/v1/cash-sessions/current
router.get('/current', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const session = await cashSessionService.getCurrentSession(req.user!.id);
    res.json(successResponse(session));
  } catch (error) {
    next(error);
  }
});

// POST /api/v1/cash-sessions/:id/close
router.post('/:id/close', validate(z.object({
  actualBalance: z.number().min(0, 'Saldo aktual tidak boleh negatif'),
  notes: z.string().optional(),
})), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const session = await cashSessionService.closeCashSession(
      req.params.id as string,
      req.body.actualBalance,
      req.body.notes,
      req.user!.id
    );
    res.json(successResponse(session, 'Sesi kasir berhasil ditutup'));
  } catch (error) {
    next(error);
  }
});

// POST /api/v1/cash-sessions/:id/transactions
router.post('/:id/transactions', validate(z.object({
  type: z.enum(['CASH_IN', 'CASH_OUT']),
  amount: z.number().positive('Nominal harus lebih dari 0'),
  description: z.string().min(1, 'Keterangan wajib diisi'),
})), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tx = await cashSessionService.addCashTransaction(
      req.params.id as string,
      req.body.type,
      req.body.amount,
      req.body.description,
      req.user!.id
    );
    res.status(201).json(successResponse(tx, 'Transaksi kas berhasil ditambahkan'));
  } catch (error) {
    next(error);
  }
});

export default router;
