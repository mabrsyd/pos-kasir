import { Request, Response, NextFunction } from 'express';
import { ZodSchema } from 'zod';
import { errorResponse } from '../utils/response';

export function validate(schema: ZodSchema) {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      schema.parse(req.body);
      next();
    } catch (error: any) {
      if (error?.issues) {
        const messages = error.issues.map((e: any) => {
          const path = e.path?.join('.') || '';
          return path ? `${path}: ${e.message}` : e.message;
        });
        res.status(400).json(errorResponse(messages.join('; '), 'Validasi gagal'));
        return;
      }
      next(error);
    }
  };
}

export function validateQuery(schema: ZodSchema) {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      const parsed = schema.parse(req.query);
      // Assign parsed values back
      Object.assign(req.query, parsed);
      next();
    } catch (error: any) {
      if (error?.issues) {
        const messages = error.issues.map((e: any) => {
          const path = e.path?.join('.') || '';
          return path ? `${path}: ${e.message}` : e.message;
        });
        res.status(400).json(errorResponse(messages.join('; '), 'Parameter tidak valid'));
        return;
      }
      next(error);
    }
  };
}

// Helper to safely get a query string parameter
export function qs(val: unknown): string | undefined {
  if (typeof val === 'string') return val;
  if (Array.isArray(val) && typeof val[0] === 'string') return val[0];
  return undefined;
}

export function qsRequired(val: unknown): string {
  return qs(val) || '';
}

export function qn(val: unknown): number | undefined {
  const s = qs(val);
  if (!s) return undefined;
  const n = parseInt(s, 10);
  return isNaN(n) ? undefined : n;
}
