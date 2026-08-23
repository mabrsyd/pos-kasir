import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { validate, qs, qn } from '../middleware/validate';
import { authenticate, authorize } from '../middleware/auth';
import prisma from '../lib/prisma';
import { successResponse } from '../utils/response';
import { ConflictError } from '../utils/errors';

const router = Router();
router.use(authenticate);

// GET /api/v1/categories
router.get('/', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const categories = await prisma.category.findMany({ orderBy: { name: 'asc' } });
    res.json(successResponse(categories));
  } catch (error) {
    next(error);
  }
});

const categorySchema = z.object({
  name: z.string().min(1, 'Nama kategori wajib diisi').max(100),
  description: z.string().optional(),
});

// POST /api/v1/categories
router.post('/', authorize('OWNER', 'ADMIN'), validate(categorySchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, description } = req.body;
    const existing = await prisma.category.findUnique({ where: { name } });
    if (existing) throw new ConflictError('Kategori dengan nama tersebut sudah ada');
    const category = await prisma.category.create({ data: { name, description } });
    res.status(201).json(successResponse(category, 'Kategori berhasil ditambahkan'));
  } catch (error) {
    next(error);
  }
});

// PATCH /api/v1/categories/:id
router.patch('/:id', authorize('OWNER', 'ADMIN'), validate(categorySchema.partial()), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const category = await prisma.category.update({
      where: { id: req.params.id as string },
      data: req.body,
    });
    res.json(successResponse(category, 'Kategori berhasil diperbarui'));
  } catch (error) {
    next(error);
  }
});

// DELETE /api/v1/categories/:id (soft delete)
router.delete('/:id', authorize('OWNER', 'ADMIN'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const productCount = await prisma.product.count({ where: { categoryId: req.params.id as string } });
    if (productCount > 0) {
      const category = await prisma.category.update({
        where: { id: req.params.id as string },
        data: { isActive: false },
      });
      res.json(successResponse(category, 'Kategori dinonaktifkan karena masih memiliki produk'));
      return;
    }
    await prisma.category.delete({ where: { id: req.params.id as string } });
    res.json(successResponse(null, 'Kategori berhasil dihapus'));
  } catch (error) {
    next(error);
  }
});

export default router;
