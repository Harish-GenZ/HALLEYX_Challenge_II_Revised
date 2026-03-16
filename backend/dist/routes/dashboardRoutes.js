"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const dashboardController_1 = require("../controllers/dashboardController");
const router = (0, express_1.Router)();
router.get('/', dashboardController_1.getDashboard);
router.post('/:id/widgets', dashboardController_1.saveDashboardWidgets);
exports.default = router;
//# sourceMappingURL=dashboardRoutes.js.map