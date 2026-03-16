"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteOrder = exports.updateOrder = exports.getOrders = exports.createOrder = void 0;
const client_js_1 = __importDefault(require("../prisma/client.js"));
const createOrder = async (req, res) => {
    try {
        const { firstName, lastName, email, phone, address, city, state, postalCode, country, product, quantity, unitPrice, status, createdBy } = req.body;
        if (quantity < 1) {
            res.status(400).json({ error: 'Quantity cannot be less than 1' });
            return;
        }
        const totalAmount = quantity * unitPrice;
        const order = await client_js_1.default.order.create({
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
exports.createOrder = createOrder;
const getOrders = async (req, res) => {
    try {
        const orders = await client_js_1.default.order.findMany({
            orderBy: { createdAt: 'desc' }
        });
        res.status(200).json(orders);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch orders' });
    }
};
exports.getOrders = getOrders;
const updateOrder = async (req, res) => {
    try {
        const { id } = req.params;
        const { firstName, lastName, email, phone, address, city, state, postalCode, country, product, quantity, unitPrice, status, createdBy } = req.body;
        if (quantity < 1) {
            res.status(400).json({ error: 'Quantity cannot be less than 1' });
            return;
        }
        const totalAmount = quantity * unitPrice;
        const order = await client_js_1.default.order.update({
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
exports.updateOrder = updateOrder;
const deleteOrder = async (req, res) => {
    try {
        const { id } = req.params;
        await client_js_1.default.order.delete({
            where: { id: Number(id) }
        });
        res.status(204).send();
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to delete order' });
    }
};
exports.deleteOrder = deleteOrder;
//# sourceMappingURL=orderController.js.map