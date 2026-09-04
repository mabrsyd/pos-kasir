import express from 'express';
import path from 'path';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import { config } from './config';
import { errorHandler } from './middleware/errorHandler';

// Routes
import authRoutes from './routes/auth.routes';
import categoryRoutes from './routes/category.routes';
import unitRoutes from './routes/unit.routes';
import productRoutes from './routes/product.routes';
import saleRoutes from './routes/sale.routes';
import stockRoutes from './routes/stock.routes';
import cashSessionRoutes from './routes/cashSession.routes';
import supplierRoutes from './routes/supplier.routes';
import purchaseRoutes from './routes/purchase.routes';
import expenseRoutes from './routes/expense.routes';
import customerRoutes from './routes/customer.routes';
import returnRoutes from './routes/return.routes';
import dashboardRoutes from './routes/dashboard.routes';
import reportRoutes from './routes/report.routes';
import userRoutes from './routes/user.routes';
import auditLogRoutes from './routes/auditLog.routes';
import settingsRoutes from './routes/settings.routes';
import syncRoutes from './routes/sync.routes';
import uploadRoutes from './routes/upload.routes';

const app = express();

// Security
app.use(helmet({ crossOriginResourcePolicy: false }));
app.use(cors({
  origin: config.cors.origin,
  credentials: true,
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.max,
  message: { success: false, error: 'Terlalu banyak permintaan. Silakan coba lagi nanti.' },
});
app.use('/api/', limiter);

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Logging
if (config.nodeEnv === 'development') {
  app.use(morgan('dev'));
}

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Static files
app.use('/uploads', express.static(path.join(__dirname, '../public/uploads')));

// API Routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/categories', categoryRoutes);
app.use('/api/v1/units', unitRoutes);
app.use('/api/v1/products', productRoutes);
app.use('/api/v1/sales', saleRoutes);
app.use('/api/v1/stock', stockRoutes);
app.use('/api/v1/cash-sessions', cashSessionRoutes);
app.use('/api/v1/suppliers', supplierRoutes);
app.use('/api/v1/purchases', purchaseRoutes);
app.use('/api/v1/expenses', expenseRoutes);
app.use('/api/v1/customers', customerRoutes);
app.use('/api/v1/returns', returnRoutes);
app.use('/api/v1/dashboard', dashboardRoutes);
app.use('/api/v1/reports', reportRoutes);
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/audit-logs', auditLogRoutes);
app.use('/api/v1/settings', settingsRoutes);
app.use('/api/v1/sync', syncRoutes);
app.use('/api/v1/upload', uploadRoutes);

// 404
app.use((_req, res) => {
  res.status(404).json({ success: false, error: 'Endpoint tidak ditemukan' });
});

// Error handler
app.use(errorHandler);

export default app;
