import { Router } from 'express';
import { getDashboard, saveDashboardWidgets } from '../controllers/dashboardController';

const router = Router();

router.get('/', getDashboard);
router.post('/:id/widgets', saveDashboardWidgets);

export default router;
