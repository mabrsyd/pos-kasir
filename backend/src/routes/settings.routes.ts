import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { validate } from '../middleware/validate';
import { authenticate, authorize } from '../middleware/auth';
import prisma from '../lib/prisma';
import { successResponse } from '../utils/response';

const router = Router();
router.use(authenticate);

// GET /api/v1/settings
router.get('/', authorize('OWNER', 'ADMIN'), async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const settings = await prisma.setting.findMany();
    const settingsMap = settings.reduce((acc: Record<string, string>, s) => {
      acc[s.key] = s.value;
      return acc;
    }, {});
    res.json(successResponse(settingsMap));
  } catch (error) {
    next(error);
  }
});

const settingsSchema = z.object({
  settings: z.record(z.string(), z.string()),
});

// PATCH /api/v1/settings
router.patch('/', authorize('OWNER'), validate(settingsSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { settings } = req.body;
    for (const [key, value] of Object.entries(settings)) {
      await prisma.setting.upsert({
        where: { key },
        update: { value: value as string },
        create: { key, value: value as string },
      });
    }
    res.json(successResponse(null, 'Pengaturan berhasil disimpan'));
  } catch (error) {
    next(error);
  }
});

export default router;
