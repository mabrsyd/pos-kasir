import { Router, Request, Response, NextFunction } from 'express';
import { authenticate, authorize } from '../middleware/auth';
import { qs, qn } from '../middleware/validate';
import prisma from '../lib/prisma';
import { successResponse } from '../utils/response';

const router = Router();
router.use(authenticate);
router.use(authorize('OWNER', 'ADMIN'));

// GET /api/v1/audit-logs
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = qn(req.query.page) || 1;
    const limit = qn(req.query.limit) || 20;

    const where: any = {};
    if (qs(req.query.action)) where.action = qs(req.query.action);
    if (qs(req.query.entityType)) where.entityType = qs(req.query.entityType);
    if (qs(req.query.userId)) where.userId = qs(req.query.userId);
    if (qs(req.query.startDate) || qs(req.query.endDate)) {
      where.createdAt = {};
      if (qs(req.query.startDate)) where.createdAt.gte = new Date(qs(req.query.startDate)!);
      if (qs(req.query.endDate)) where.createdAt.lte = new Date(qs(req.query.endDate)! + 'T23:59:59');
    }

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        include: { user: { select: { id: true, fullName: true } } },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.auditLog.count({ where }),
    ]);

    res.json(successResponse(logs, undefined, {
      page, limit, total, totalPages: Math.ceil(total / limit),
    }));
  } catch (error) {
    next(error);
  }
});

export default router;
