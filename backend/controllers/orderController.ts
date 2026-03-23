import type { Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import prisma from '../prisma/client';

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
] as const;

type RequiredOrderField = (typeof REQUIRED_ORDER_FIELDS)[number];

interface ValidatedOrderPayload extends Record<RequiredOrderField, string> {
  quantity: number;
  unitPrice: number;
  totalAmount: number;
}

function parseOrderId(value: string): number | null {
  const parsedId = Number(value);
  if (!Number.isInteger(parsedId) || parsedId <= 0) {
    return null;
  }
  return parsedId;
}

function validateOrderPayload(payload: Record<string, unknown>): {
  data?: ValidatedOrderPayload;
  errors?: Record<string, string>;
} {
  const errors: Record<string, string> = {};
  const sanitizedStrings = {} as Record<RequiredOrderField, string>;

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

function isOrderNotFoundError(error: unknown): error is Prisma.PrismaClientKnownRequestError {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025';
}

export const createOrder = async (req: Request, res: Response): Promise<void> => {
  try {
    const validation = validateOrderPayload(req.body as Record<string, unknown>);
    if (!validation.data) {
      res.status(400).json({ error: 'Invalid order payload', details: validation.errors });
      return;
    }

    const order = await prisma.order.create({
      data: validation.data
    });

    res.status(201).json(order);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create order' });
  }
};

export const getOrders = async (_req: Request, res: Response): Promise<void> => {
  try {
    const orders = await prisma.order.findMany({
      orderBy: { createdAt: 'desc' }
    });
    res.status(200).json(orders);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
};

export const updateOrder = async (req: Request, res: Response): Promise<void> => {
  const rawOrderId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const orderId = parseOrderId(rawOrderId ?? '');
  if (!orderId) {
    res.status(400).json({ error: 'Invalid order id' });
    return;
  }

  try {
    const validation = validateOrderPayload(req.body as Record<string, unknown>);
    if (!validation.data) {
      res.status(400).json({ error: 'Invalid order payload', details: validation.errors });
      return;
    }

    const order = await prisma.order.update({
      where: { id: orderId },
      data: validation.data
    });

    res.status(200).json(order);
  } catch (error) {
    if (isOrderNotFoundError(error)) {
      res.status(404).json({ error: 'Order not found' });
      return;
    }

    console.error(error);
    res.status(500).json({ error: 'Failed to update order' });
  }
};

export const deleteOrder = async (req: Request, res: Response): Promise<void> => {
  const rawOrderId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const orderId = parseOrderId(rawOrderId ?? '');
  if (!orderId) {
    res.status(400).json({ error: 'Invalid order id' });
    return;
  }

  try {
    await prisma.order.delete({
      where: { id: orderId }
    });
    res.status(204).send();
  } catch (error) {
    if (isOrderNotFoundError(error)) {
      res.status(404).json({ error: 'Order not found' });
      return;
    }

    console.error(error);
    res.status(500).json({ error: 'Failed to delete order' });
  }
};
