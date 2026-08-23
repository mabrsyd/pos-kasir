import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { validate } from '../middleware/validate';
import { authenticate, authorize } from '../middleware/auth';
import prisma from '../lib/prisma';
import { successResponse } from '../utils/response';
import { hashPassword } from '../services/auth.service';

const router = Router();
router.use(authenticate);
router.use(authorize('OWNER'));

// GET /api/v1/users
router.get('/', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const users = await prisma.user.findMany({
      include: { role: { select: { id: true, name: true } } },
      orderBy: { fullName: 'asc' },
    });
    const sanitized = users.map(({ password, ...rest }) => rest);
    res.json(successResponse(sanitized));
  } catch (error) {
    next(error);
  }
});

const createUserSchema = z.object({
  username: z.string().min(3, 'Username minimal 3 karakter'),
  password: z.string().min(6, 'Password minimal 6 karakter'),
  fullName: z.string().min(1, 'Nama lengkap wajib diisi'),
  roleId: z.string(),
});

// POST /api/v1/users
router.post('/', validate(createUserSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { username, password, fullName, roleId } = req.body;
    const hashed = await hashPassword(password);
    const user = await prisma.user.create({
      data: { username, password: hashed, fullName, roleId },
      include: { role: { select: { id: true, name: true } } },
    });
    const { password: _, ...sanitized } = user;
    res.status(201).json(successResponse(sanitized, 'User berhasil ditambahkan'));
  } catch (error) {
    next(error);
  }
});

// PATCH /api/v1/users/:id
router.patch('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data: any = {};
    if (req.body.fullName) data.fullName = req.body.fullName;
    if (req.body.roleId) data.roleId = req.body.roleId;
    if (req.body.isActive !== undefined) data.isActive = req.body.isActive;
    if (req.body.password) data.password = await hashPassword(req.body.password);

    const user = await prisma.user.update({
      where: { id: req.params.id as string },
      data,
      include: { role: { select: { id: true, name: true } } },
    });
    const { password: _, ...sanitized } = user;
    res.json(successResponse(sanitized, 'User berhasil diperbarui'));
  } catch (error) {
    next(error);
  }
});

export default router;
