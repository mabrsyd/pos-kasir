import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { validate, qs, qn } from '../middleware/validate';
import { authenticate, authorize } from '../middleware/auth';
import * as productService from '../services/product.service';
import { successResponse } from '../utils/response';

const router = Router();
router.use(authenticate);

const productCreateSchema = z.object({
  name: z.string().min(1, 'Nama produk wajib diisi'),
  sku: z.string().optional(),
  barcode: z.string().optional().nullable(),
  image: z.string().url('URL gambar tidak valid').optional().or(z.literal('')),
  categoryId: z.string().uuid('Category ID tidak valid'),
  unitId: z.string().uuid('Unit ID tidak valid'),
  productType: z.enum(['RETAIL', 'FUEL', 'OTHER']).optional(),
  purchasePrice: z.number().min(0, 'Harga beli tidak boleh negatif'),
  sellingPrice: z.number().min(0, 'Harga jual tidak boleh negatif'),
  minimumStock: z.number().min(0).optional(),
  currentStock: z.number().min(0).optional(),
});

const productUpdateSchema = z.object({
  name: z.string().min(1).optional(),
  sku: z.string().min(1).optional(),
  barcode: z.string().optional().nullable(),
  image: z.string().url('URL gambar tidak valid').optional().or(z.literal('')),
  categoryId: z.string().uuid().optional(),
  unitId: z.string().uuid().optional(),
  productType: z.enum(['RETAIL', 'FUEL', 'OTHER']).optional(),
  purchasePrice: z.number().min(0).optional(),
  sellingPrice: z.number().min(0).optional(),
  minimumStock: z.number().min(0).optional(),
  isActive: z.boolean().optional(),
});

// GET /api/v1/products
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { products, meta } = await productService.listProducts({
      page: qn(req.query.page) || 1,
      limit: qn(req.query.limit) || 20,
      search: qs(req.query.search),
      categoryId: qs(req.query.categoryId),
      productType: qs(req.query.productType),
      isActive: qs(req.query.isActive) !== undefined ? qs(req.query.isActive) === 'true' : undefined,
    });
    res.json(successResponse(products, undefined, meta));
  } catch (error) {
    next(error);
  }
});

// GET /api/v1/products/search?q=...
router.get('/search', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const q = qs(req.query.q) || '';
    const products = await productService.searchProducts(q);
    res.json(successResponse(products));
  } catch (error) {
    next(error);
  }
});

// GET /api/v1/products/barcode/:barcode
router.get('/barcode/:barcode', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const product = await productService.getProductByBarcode(req.params.barcode as string);
    res.json(successResponse(product));
  } catch (error) {
    next(error);
  }
});

// GET /api/v1/products/:id
router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const product = await productService.getProduct(req.params.id as string);
    res.json(successResponse(product));
  } catch (error) {
    next(error);
  }
});

// POST /api/v1/products
router.post('/', authorize('OWNER', 'ADMIN'), validate(productCreateSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const product = await productService.createProduct(req.body, req.user!.id);
    res.status(201).json(successResponse(product, 'Produk berhasil ditambahkan'));
  } catch (error) {
    next(error);
  }
});

// PATCH /api/v1/products/:id
router.patch('/:id', authorize('OWNER', 'ADMIN'), validate(productUpdateSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const product = await productService.updateProduct(req.params.id as string, req.body, req.user!.id);
    res.json(successResponse(product, 'Produk berhasil diperbarui'));
  } catch (error) {
    next(error);
  }
});

export default router;
