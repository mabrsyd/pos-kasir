import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/errors';
import { errorResponse } from '../utils/response';
import { Prisma } from '@prisma/client';

export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  console.error('Error:', err);

  // Custom AppError
  if (err instanceof AppError) {
    res.status(err.statusCode).json(errorResponse(err.message));
    return;
  }

  // Prisma errors — translate to human-readable Indonesian
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    switch (err.code) {
      case 'P2002': {
        const target = (err.meta?.target as string[])?.join(', ') || 'data';
        res.status(409).json(errorResponse(`${target} sudah digunakan.`));
        return;
      }
      case 'P2025':
        res.status(404).json(errorResponse('Data tidak ditemukan.'));
        return;
      case 'P2003':
        res.status(400).json(errorResponse('Data terkait tidak ditemukan.'));
        return;
      default:
        res.status(500).json(errorResponse('Terjadi kesalahan pada database.'));
        return;
    }
  }

  if (err instanceof Prisma.PrismaClientValidationError) {
    res.status(400).json({
      success: false,
      error: 'Data yang dikirim tidak valid.',
      details: err.message,
    });
    return;
  }

  // Zod validation errors
  if (err.name === 'ZodError') {
    res.status(400).json(errorResponse('Data yang dikirim tidak valid.'));
    return;
  }

  // JSON parse error
  if (err instanceof SyntaxError && 'body' in err) {
    res.status(400).json(errorResponse('Format data tidak valid.'));
    return;
  }

  // Generic fallback — never expose internals
  res.status(500).json(errorResponse('Terjadi kesalahan pada server.'));
}
