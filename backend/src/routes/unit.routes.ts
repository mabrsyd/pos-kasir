import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { validate, qs, qn } from '../middleware/validate';
import { authenticate, authorize } from '../middleware/auth';
import prisma from '../lib/prisma';
import { successResponse } from '../utils/response';
import { ConflictError } from '../utils/errors';

const router = Router();
router.use(authenticate);

// GET /api/v1/units
router.get('/', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const units = await prisma.unit.findMany({ orderBy: { name: 'asc' } });
    res.json(successResponse(units));
  } catch (error) {
    next(error);
  }
});

const unitSchema = z.object({
  name: z.string().min(1, 'Nama satuan wajib diisi').max(50),
  description: z.string().optional(),
});

// POST /api/v1/units
router.post('/', authorize('OWNER', 'ADMIN'), validate(unitSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, description } = req.body;
    const existing = await prisma.unit.findUnique({ where: { name } });
    if (existing) throw new ConflictError('Satuan dengan nama tersebut sudah ada');
    const unit = await prisma.unit.create({ data: { name, description } });
    res.status(201).json(successResponse(unit, 'Satuan berhasil ditambahkan'));
  } catch (error) {
    next(error);
  }
});

// PATCH /api/v1/units/:id
router.patch('/:id', authorize('OWNER', 'ADMIN'), validate(unitSchema.partial()), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const unit = await prisma.unit.update({ where: { id: req.params.id as string }, data: req.body });
    res.json(successResponse(unit, 'Satuan berhasil diperbarui'));
  } catch (error) {
    next(error);
  }
});

// DELETE /api/v1/units/:id
router.delete('/:id', authorize('OWNER', 'ADMIN'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const productCount = await prisma.product.count({ where: { unitId: req.params.id as string } });
    if (productCount > 0) {
      res.status(400).json({ success: false, error: 'Satuan masih digunakan oleh produk. Tidak dapat dihapus.' });
      return;
    }
    await prisma.unit.delete({ where: { id: req.params.id as string } });
    res.json(successResponse(null, 'Satuan berhasil dihapus'));
  } catch (error) {
    next(error);
  }
});

export default router;
