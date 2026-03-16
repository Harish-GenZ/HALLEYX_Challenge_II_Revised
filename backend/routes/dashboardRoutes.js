import { Router } from 'express';
import { getDashboard, saveDashboardWidgets } from '../controllers/dashboardController.js';
const router = Router();
router.get('/', getDashboard);
router.post('/:id/widgets', saveDashboardWidgets);
export default router;
//# sourceMappingURL=dashboardRoutes.js.map