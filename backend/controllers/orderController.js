import prisma from '../prisma/client.js';
export const createOrder = async (req, res) => {
    try {
        const { firstName, lastName, email, phone, address, city, state, postalCode, country, product, quantity, unitPrice, status, createdBy } = req.body;
        if (quantity < 1) {
            res.status(400).json({ error: 'Quantity cannot be less than 1' });
            return;
        }
        const totalAmount = quantity * unitPrice;
        const order = await prisma.order.create({
            data: {
                firstName, lastName, email, phone, address, city, state, postalCode, country, product, quantity, unitPrice, totalAmount, status, createdBy
            }
        });
        res.status(201).json(order);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to create order' });
    }
};
export const getOrders = async (req, res) => {
    try {
        const orders = await prisma.order.findMany({
            orderBy: { createdAt: 'desc' }
        });
        res.status(200).json(orders);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch orders' });
    }
};
export const updateOrder = async (req, res) => {
    try {
        const { id } = req.params;
        const { firstName, lastName, email, phone, address, city, state, postalCode, country, product, quantity, unitPrice, status, createdBy } = req.body;
        if (quantity < 1) {
            res.status(400).json({ error: 'Quantity cannot be less than 1' });
            return;
        }
        const totalAmount = quantity * unitPrice;
        const order = await prisma.order.update({
            where: { id: Number(id) },
            data: {
                firstName, lastName, email, phone, address, city, state, postalCode, country, product, quantity, unitPrice, totalAmount, status, createdBy
            }
        });
        res.status(200).json(order);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to update order' });
    }
};
export const deleteOrder = async (req, res) => {
    try {
        const { id } = req.params;
        await prisma.order.delete({
            where: { id: Number(id) }
        });
        res.status(204).send();
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to delete order' });
    }
};
//# sourceMappingURL=orderController.js.map