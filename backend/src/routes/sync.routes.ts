import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { validate, qs } from '../middleware/validate';
import { authenticate } from '../middleware/auth';
import prisma from '../lib/prisma';
import { successResponse } from '../utils/response';

const router = Router();
router.use(authenticate);

// POST /api/v1/sync/push
router.post('/push', validate(z.object({
  operations: z.array(z.object({
    clientTransactionId: z.string(),
    operationType: z.string(),
    payload: z.any(),
    deviceId: z.string().optional(),
  })),
})), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { operations } = req.body;
    const results: { clientTransactionId: string; status: string; error?: string }[] = [];

    for (const op of operations) {
      try {
        const existing = await prisma.syncOperation.findUnique({
          where: { clientTransactionId: op.clientTransactionId },
        });

        if (existing && existing.status === 'SYNCED') {
          results.push({ clientTransactionId: op.clientTransactionId, status: 'SYNCED' });
          continue;
        }

        const syncOp = await prisma.syncOperation.upsert({
          where: { clientTransactionId: op.clientTransactionId },
          update: { status: 'SYNCING', retryCount: { increment: 1 } },
          create: {
            deviceId: op.deviceId || 'unknown',
            clientTransactionId: op.clientTransactionId,
            operationType: op.operationType,
            payload: op.payload,
            status: 'SYNCING',
          },
        });

        await prisma.syncOperation.update({
          where: { id: syncOp.id },
          data: { status: 'SYNCED', syncedAt: new Date() },
        });

        results.push({ clientTransactionId: op.clientTransactionId, status: 'SYNCED' });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        
        try {
          await prisma.syncOperation.upsert({
            where: { clientTransactionId: op.clientTransactionId },
            update: { status: 'FAILED', errorMessage },
            create: {
              deviceId: op.deviceId || 'unknown',
              clientTransactionId: op.clientTransactionId,
              operationType: op.operationType,
              payload: op.payload,
              status: 'FAILED',
              errorMessage,
            },
          });
        } catch (_) { /* ignore */ }

        results.push({ clientTransactionId: op.clientTransactionId, status: 'FAILED', error: errorMessage });
      }
    }

    res.json(successResponse(results, 'Sinkronisasi selesai'));
  } catch (error) {
    next(error);
  }
});

// GET /api/v1/sync/status
router.get('/status', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const deviceId = qs(req.query.deviceId);
    const where: any = {};
    if (deviceId) where.deviceId = deviceId;

    const operations = await prisma.syncOperation.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    const summary = {
      total: operations.length,
      pending: operations.filter(o => o.status === 'PENDING').length,
      syncing: operations.filter(o => o.status === 'SYNCING').length,
      synced: operations.filter(o => o.status === 'SYNCED').length,
      failed: operations.filter(o => o.status === 'FAILED').length,
      conflict: operations.filter(o => o.status === 'CONFLICT').length,
    };

    res.json(successResponse({ operations, summary }));
  } catch (error) {
    next(error);
  }
});

export default router;
