"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteOrder = exports.updateOrder = exports.getOrders = exports.createOrder = void 0;
const client_1 = require("@prisma/client");
const client_2 = __importDefault(require("../prisma/client"));
const REQUIRED_ORDER_FIELDS = [
    'firstName',
    'lastName',
    'email',
    'phone',
    'address',
    'city',
    'state',
    'postalCode',
    'country',
    'product',
    'status',
    'createdBy',
];
function parseOrderId(value) {
    const parsedId = Number(value);
    if (!Number.isInteger(parsedId) || parsedId <= 0) {
        return null;
    }
    return parsedId;
}
function validateOrderPayload(payload) {
    const errors = {};
    const sanitizedStrings = {};
    REQUIRED_ORDER_FIELDS.forEach((field) => {
        const value = payload[field];
        if (typeof value !== 'string' || value.trim().length === 0) {
            errors[field] = 'This field is required';
            return;
        }
        sanitizedStrings[field] = value.trim();
    });
    const quantity = Number(payload.quantity);
    if (!Number.isInteger(quantity) || quantity < 1) {
        errors.quantity = 'Quantity must be at least 1';
    }
    const unitPrice = Number(payload.unitPrice);
    if (!Number.isFinite(unitPrice) || unitPrice <= 0) {
        errors.unitPrice = 'Unit price must be greater than 0';
    }
    if (Object.keys(errors).length > 0) {
        return { errors };
    }
    return {
        data: {
            ...sanitizedStrings,
            quantity,
            unitPrice,
            totalAmount: Number((quantity * unitPrice).toFixed(2)),
        }
    };
}
function isOrderNotFoundError(error) {
    return error instanceof client_1.Prisma.PrismaClientKnownRequestError && error.code === 'P2025';
}
const createOrder = async (req, res) => {
    try {
        const validation = validateOrderPayload(req.body);
        if (!validation.data) {
            res.status(400).json({ error: 'Invalid order payload', details: validation.errors });
            return;
        }
        const order = await client_2.default.order.create({
            data: validation.data
        });
        res.status(201).json(order);
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to create order' });
    }
};
exports.createOrder = createOrder;
const getOrders = async (_req, res) => {
    try {
        const orders = await client_2.default.order.findMany({
            orderBy: { createdAt: 'desc' }
        });
        res.status(200).json(orders);
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to fetch orders' });
    }
};
exports.getOrders = getOrders;
const updateOrder = async (req, res) => {
    const rawOrderId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const orderId = parseOrderId(rawOrderId ?? '');
    if (!orderId) {
        res.status(400).json({ error: 'Invalid order id' });
        return;
    }
    try {
        const validation = validateOrderPayload(req.body);
        if (!validation.data) {
            res.status(400).json({ error: 'Invalid order payload', details: validation.errors });
            return;
        }
        const order = await client_2.default.order.update({
            where: { id: orderId },
            data: validation.data
        });
        res.status(200).json(order);
    }
    catch (error) {
        if (isOrderNotFoundError(error)) {
            res.status(404).json({ error: 'Order not found' });
            return;
        }
        console.error(error);
        res.status(500).json({ error: 'Failed to update order' });
    }
};
exports.updateOrder = updateOrder;
const deleteOrder = async (req, res) => {
    const rawOrderId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const orderId = parseOrderId(rawOrderId ?? '');
    if (!orderId) {
        res.status(400).json({ error: 'Invalid order id' });
        return;
    }
    try {
        await client_2.default.order.delete({
            where: { id: orderId }
        });
        res.status(204).send();
    }
    catch (error) {
        if (isOrderNotFoundError(error)) {
            res.status(404).json({ error: 'Order not found' });
            return;
        }
        console.error(error);
        res.status(500).json({ error: 'Failed to delete order' });
    }
};
exports.deleteOrder = deleteOrder;
//# sourceMappingURL=orderController.js.map