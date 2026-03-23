import 'dotenv/config';
import express from 'express';
import cors from 'cors';

import orderRoutes from './routes/orderRoutes';
import dashboardRoutes from './routes/dashboardRoutes';

const app = express();

// CORS: allow the Vercel frontend URL in production, or all origins in dev
const allowedOrigin = process.env.FRONTEND_URL;
app.use(
  cors({
    origin: allowedOrigin
      ? (origin, callback) => {
          // Allow requests with no origin (e.g. server-to-server, curl)
          if (!origin || origin === allowedOrigin) {
            callback(null, true);
          } else {
            callback(new Error(`CORS: Origin ${origin} not allowed`));
          }
        }
      : true, // allow all origins in dev (no FRONTEND_URL set)
    credentials: true,
  })
);

app.use(express.json());

// Health check for Railway
app.get('/health', (_req, res) => {
  res.status(200).json({ status: 'ok' });
});

app.use('/api/orders', orderRoutes);
app.use('/api/dashboard', dashboardRoutes);

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
