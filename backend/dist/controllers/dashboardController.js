"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.saveDashboardWidgets = exports.getDashboard = void 0;
const client_js_1 = __importDefault(require("../prisma/client.js"));
const getDashboard = async (req, res) => {
    try {
        let dashboard = await client_js_1.default.dashboard.findFirst({
            include: { widgets: true }
        });
        if (!dashboard) {
            dashboard = await client_js_1.default.dashboard.create({
                data: { name: 'Main Dashboard' },
                include: { widgets: true }
            });
        }
        res.status(200).json(dashboard);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch dashboard' });
    }
};
exports.getDashboard = getDashboard;
const saveDashboardWidgets = async (req, res) => {
    try {
        const { id } = req.params;
        const { widgets } = req.body;
        await client_js_1.default.$transaction(async (tx) => {
            // Clear existing widgets for the dashboard
            await tx.widget.deleteMany({
                where: { dashboardId: Number(id) }
            });
            // Insert updated widgets
            if (widgets && widgets.length > 0) {
                await tx.widget.createMany({
                    data: widgets.map((w) => ({
                        dashboardId: Number(id),
                        type: w.type,
                        title: w.title || w.type,
                        width: w.width,
                        height: w.height,
                        positionX: w.positionX,
                        positionY: w.positionY,
                        config: w.config || {}
                    }))
                });
            }
        });
        res.status(200).json({ message: 'Dashboard layout saved successfully' });
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to save dashboard widgets' });
    }
};
exports.saveDashboardWidgets = saveDashboardWidgets;
//# sourceMappingURL=dashboardController.js.map