import prisma from '../prisma/client.js';
export const getDashboard = async (req, res) => {
    try {
        let dashboard = await prisma.dashboard.findFirst({
            include: { widgets: true }
        });
        if (!dashboard) {
            dashboard = await prisma.dashboard.create({
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
export const saveDashboardWidgets = async (req, res) => {
    try {
        const { id } = req.params;
        const { widgets } = req.body;
        await prisma.$transaction(async (tx) => {
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
//# sourceMappingURL=dashboardController.js.map