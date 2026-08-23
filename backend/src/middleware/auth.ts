import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { AuthenticationError, AuthorizationError } from '../utils/errors';
import prisma from '../lib/prisma';

export interface AuthUser {
  id: string;
  username: string;
  fullName: string;
  role: {
    id: string;
    name: string;
    permissions: string[];
  };
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

export async function authenticate(req: Request, _res: Response, next: NextFunction): Promise<void> {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AuthenticationError('Token tidak ditemukan');
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, config.jwt.secret) as { userId: string };

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      include: { role: true },
    });

    if (!user || !user.isActive) {
      throw new AuthenticationError('User tidak ditemukan atau tidak aktif');
    }

    req.user = {
      id: user.id,
      username: user.username,
      fullName: user.fullName,
      role: {
        id: user.role.id,
        name: user.role.name,
        permissions: user.role.permissions as string[],
      },
    };

    next();
  } catch (error) {
    if (error instanceof AuthenticationError) {
      next(error);
    } else if (error instanceof jwt.JsonWebTokenError) {
      next(new AuthenticationError('Token tidak valid'));
    } else if (error instanceof jwt.TokenExpiredError) {
      next(new AuthenticationError('Token sudah kedaluwarsa'));
    } else {
      next(error);
    }
  }
}

export function authorize(...roles: string[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      next(new AuthenticationError());
      return;
    }

    if (roles.length > 0 && !roles.includes(req.user.role.name)) {
      next(new AuthorizationError());
      return;
    }

    next();
  };
}

export function hasPermission(...permissions: string[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      next(new AuthenticationError());
      return;
    }

    const userPerms = req.user.role.permissions;
    const hasAll = permissions.every(p => userPerms.includes(p));

    if (!hasAll) {
      next(new AuthorizationError());
      return;
    }

    next();
  };
}
