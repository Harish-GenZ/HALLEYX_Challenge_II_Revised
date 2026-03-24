import 'dotenv/config';
import express from 'express';
import cors from 'cors';

import orderRoutes from './routes/orderRoutes';
import dashboardRoutes from './routes/dashboardRoutes';

const app = express();

// CORS configuration
const allowedOrigins = [
  'https://halleyx-challenge-ii-revised.vercel.app',
  'http://localhost:5173'
];
if (process.env.FRONTEND_URL) {
  allowedOrigins.push(process.env.FRONTEND_URL);
}

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error(`CORS: Origin ${origin} not allowed`));
      }
    },
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
