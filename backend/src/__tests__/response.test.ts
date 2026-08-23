import { describe, it, expect } from 'vitest';
import { successResponse, errorResponse } from '../utils/response';

describe('Response Utility', () => {
  it('should format success response correctly', () => {
    const data = { id: 1, name: 'Test' };
    const response = successResponse(data, 'Berhasil');

    expect(response).toEqual({
      success: true,
      message: 'Berhasil',
      data: data,
    });
  });

  it('should format success response with meta correctly', () => {
    const data = [{ id: 1 }];
    const meta = { page: 1, limit: 10, total: 100, totalPages: 10 };
    const response = successResponse(data, undefined, meta);

    expect(response).toEqual({
      success: true,
      message: undefined,
      data: data,
      meta: meta,
    });
  });

  it('should format error response correctly', () => {
    const response = errorResponse('Invalid input', 'Terjadi kesalahan');

    expect(response).toEqual({
      success: false,
      error: 'Invalid input',
      message: 'Terjadi kesalahan',
    });
  });
});
