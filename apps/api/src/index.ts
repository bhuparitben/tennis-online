import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import multer from 'multer';
import { requireAuth, requireRole } from './middleware/auth.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

// ===== Import Routes =====
import authRoutes from './routes/auth.js';
import referenceRoutes from './routes/reference.js';
import courtRoutes from './routes/courts.js';
import submissionRoutes from './routes/submissions.js';
import ambassadorRoutes from './routes/ambassadors.js';

const app = express();
const PORT = process.env.PORT ?? 3001;

// ===== Middleware =====
app.use(cors({ origin: 'http://localhost:5173', credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// ===== Static: uploaded images =====
const uploadsDir = path.join(__dirname, '../uploads');
app.use('/uploads', express.static(uploadsDir));

// ===== File Upload Endpoint =====
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadsDir),
  filename: (_req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const ext = path.extname(file.originalname);
    cb(null, `${unique}${ext}`);
  },
});
const upload = multer({
  storage,
  limits: { fileSize: (Number(process.env.MAX_FILE_SIZE_MB) || 10) * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('Only image files are allowed'));
  },
});

app.post(
  '/api/upload',
  requireAuth,
  requireRole('ambassador', 'admin'),
  upload.single('file'),
  (req, res) => {
    if (!req.file) {
      res.status(400).json({ error: 'No file uploaded' });
      return;
    }
    const url = `/uploads/${req.file.filename}`;
    res.json({ url });
  },
);

// ===== API Routes =====
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/api/auth', authRoutes);
app.use('/api/provinces', referenceRoutes);
app.use('/api/districts', referenceRoutes);
app.use('/api/surface-types', referenceRoutes);
app.use('/api/courts', courtRoutes);
app.use('/api/submissions', submissionRoutes);
app.use('/api/ambassadors', ambassadorRoutes);

// ===== Error Handler =====
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err);
  res.status(500).json({ error: err.message ?? 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`🎾 Tennis Online API running at http://localhost:${PORT}`);
  console.log(`   ENV: ${process.env.NODE_ENV ?? 'development'}`);
  console.log(`   DB:  ${process.env.DATABASE_URL?.split('@')[1] ?? '(no DATABASE_URL)'}`);
});

export default app;
