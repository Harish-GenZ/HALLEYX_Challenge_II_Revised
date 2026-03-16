import 'dotenv/config';
import express from 'express';
import cors from 'cors';

const app = express();

import orderRoutes from './routes/orderRoutes';
import dashboardRoutes from './routes/dashboardRoutes';

app.use(cors());
app.use(express.json());

app.use('/api/orders', orderRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/orders', orderRoutes);
app.use('/dashboard', dashboardRoutes);

// Routes will be added here

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
