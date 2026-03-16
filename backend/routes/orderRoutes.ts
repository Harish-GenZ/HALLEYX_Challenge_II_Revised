import { Router } from 'express';
import { createOrder, getOrders, updateOrder, deleteOrder } from '../controllers/orderController';

const router = Router();

router.post('/', createOrder);
router.get('/', getOrders);
router.put('/:id', updateOrder);
router.delete('/:id', deleteOrder);

export default router;
