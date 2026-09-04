import { Router, Request, Response, NextFunction } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { authenticate, authorize } from '../middleware/auth';
import { successResponse } from '../utils/response';
import { config } from '../config';

const router = Router();
router.use(authenticate);

// Ensure upload directory exists
const uploadDir = path.join(__dirname, '../../public/uploads/products');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: function (_req, _file, cb) {
    cb(null, uploadDir);
  },
  filename: function (_req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, 'product-' + uniqueSuffix + ext);
  }
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Hanya file gambar yang diperbolehkan'));
    }
  }
});

// POST /api/v1/upload/image
router.post('/image', authorize('OWNER', 'ADMIN'), upload.single('image'), (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'Tidak ada file yang diunggah' });
    }
    
    const baseUrl = config.nodeEnv === 'development' ? 'http://localhost:3001' : ''; 
    const imageUrl = `${baseUrl}/uploads/products/${req.file.filename}`;
    
    res.json(successResponse({ url: imageUrl }, 'Gambar berhasil diunggah'));
  } catch (error) {
    next(error);
  }
});

export default router;
