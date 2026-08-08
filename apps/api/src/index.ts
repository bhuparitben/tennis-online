import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

const app = express();
const PORT = process.env.PORT ?? 3001;

// Middleware
app.use(cors({ origin: 'http://localhost:5173', credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static uploads
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Routes (will be added per phase)
// app.use('/api/auth', authRoutes);
// app.use('/api/provinces', provinceRoutes);
// app.use('/api/courts', courtRoutes);

app.listen(PORT, () => {
  console.log(`🎾 Tennis Online API running at http://localhost:${PORT}`);
});

export default app;
