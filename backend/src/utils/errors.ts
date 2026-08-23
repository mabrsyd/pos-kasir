export class AppError extends Error {
  public statusCode: number;
  public isOperational: boolean;

  constructor(message: string, statusCode: number = 500, isOperational: boolean = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

export class ValidationError extends AppError {
  constructor(message: string) {
    super(message, 400);
  }
}

export class AuthenticationError extends AppError {
  constructor(message: string = 'Autentikasi diperlukan') {
    super(message, 401);
  }
}

export class AuthorizationError extends AppError {
  constructor(message: string = 'Anda tidak memiliki akses untuk melakukan ini') {
    super(message, 403);
  }
}

export class NotFoundError extends AppError {
  constructor(message: string = 'Data tidak ditemukan') {
    super(message, 404);
  }
}

export class ConflictError extends AppError {
  constructor(message: string = 'Data sudah ada') {
    super(message, 409);
  }
}

export class InsufficientStockError extends AppError {
  constructor(productName: string) {
    super(`Stok ${productName} tidak mencukupi`, 400);
  }
}

export class InsufficientPaymentError extends AppError {
  constructor() {
    super('Pembayaran tidak mencukupi', 400);
  }
}
