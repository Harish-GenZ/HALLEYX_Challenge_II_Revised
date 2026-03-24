import type { Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import prisma from '../prisma/client';

const REQUIRED_STRING_FIELDS = [
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

type RequiredStringField = (typeof REQUIRED_STRING_FIELDS)[number];

interface OrderPayload {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  product: string;
  status: string;
  createdBy: string;
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

function validateAndSanitizeOrder(body: Record<string, unknown>): {
  data?: OrderPayload;
  errors?: Record<string, string>;
} {
  const errors: Record<string, string> = {};
  const sanitized = {} as Record<RequiredStringField, string>;

  // Validate all required string fields
  for (const field of REQUIRED_STRING_FIELDS) {
    const value = body[field];
    if (value === undefined || value === null) {
      // Provide sensible defaults for some fields
      if (field === 'status') {
        sanitized[field] = 'Pending';
        continue;
      }
      if (field === 'createdBy') {
        sanitized[field] = 'System';
        continue;
      }
      errors[field] = `${field} is required`;
      continue;
    }

    const strValue = String(value).trim();
    if (strValue.length === 0) {
      if (field === 'status') {
        sanitized[field] = 'Pending';
        continue;
      }
      if (field === 'createdBy') {
        sanitized[field] = 'System';
        continue;
      }
      errors[field] = `${field} cannot be empty`;
      continue;
    }

    sanitized[field] = strValue;
  }

  // Parse and validate numeric fields
  const rawQuantity = body.quantity;
  const quantity = Number(rawQuantity);
  if (rawQuantity === undefined || rawQuantity === null || rawQuantity === '') {
    errors.quantity = 'Quantity is required';
  } else if (!Number.isFinite(quantity) || !Number.isInteger(quantity) || quantity < 1) {
    errors.quantity = 'Quantity must be an integer of at least 1';
  }

  const rawUnitPrice = body.unitPrice;
  const unitPrice = Number(rawUnitPrice);
  if (rawUnitPrice === undefined || rawUnitPrice === null || rawUnitPrice === '') {
    errors.unitPrice = 'Unit price is required';
  } else if (!Number.isFinite(unitPrice) || unitPrice <= 0) {
    errors.unitPrice = 'Unit price must be a positive number';
  }

  if (Object.keys(errors).length > 0) {
    return { errors };
  }

  const totalAmount = Number((quantity * unitPrice).toFixed(2));

  return {
    data: {
      ...sanitized,
      quantity,
      unitPrice,
      totalAmount,
    },
  };
}

function isOrderNotFoundError(error: unknown): error is Prisma.PrismaClientKnownRequestError {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025';
}

function getPrismaErrorMessage(error: unknown): string {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    return `Database error [${error.code}]: ${error.message}`;
  }
  if (error instanceof Prisma.PrismaClientValidationError) {
    return `Validation error: ${error.message}`;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return 'An unexpected error occurred';
}

// POST /api/orders
export const createOrder = async (req: Request, res: Response): Promise<void> => {
  try {
    const data = req.body;

    console.log("BACKEND RECEIVED:", data);

    const order = await prisma.order.create({
      data: {
        firstName: String(data.firstName || ""),
        lastName: String(data.lastName || ""),
        email: String(data.email || ""),
        phone: String(data.phone || ""),
        address: String(data.address || ""),
        city: String(data.city || ""),
        state: String(data.state || ""),
        postalCode: String(data.postalCode || ""),
        country: String(data.country || ""),
        product: String(data.product || ""),
        quantity: Number(data.quantity || 0),
        unitPrice: Number(data.unitPrice || 0),
        totalAmount: Number(data.totalAmount || 0),
        status: String(data.status || "pending"),
        createdBy: String(data.createdBy || "admin")
      }
    });

    res.status(201).json(order);

  } catch (err: any) {
    console.error("CREATE ORDER ERROR:", err);
    res.status(500).json({ error: err.message || "Failed to create order" });
  }
};

// GET /api/orders
export const getOrders = async (_req: Request, res: Response): Promise<void> => {
  try {
    const orders = await prisma.order.findMany({
      orderBy: { createdAt: 'desc' },
    });
    res.status(200).json(orders);
  } catch (error) {
    console.error('getOrders error:', error);
    res.status(500).json({
      error: 'Failed to fetch orders',
      message: getPrismaErrorMessage(error),
    });
  }
};

// PUT /api/orders/:id
export const updateOrder = async (req: Request, res: Response): Promise<void> => {
  const rawOrderId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const orderId = parseOrderId(rawOrderId ?? '');
  if (!orderId) {
    res.status(400).json({ error: 'Invalid order id' });
    return;
  }

  try {
    const body = (req.body ?? {}) as Record<string, unknown>;
    const validation = validateAndSanitizeOrder(body);

    if (!validation.data) {
      res.status(400).json({
        error: 'Invalid order data',
        details: validation.errors,
      });
      return;
    }

    const order = await prisma.order.update({
      where: { id: orderId },
      data: validation.data,
    });

    res.status(200).json(order);
  } catch (error) {
    if (isOrderNotFoundError(error)) {
      res.status(404).json({ error: 'Order not found' });
      return;
    }

    console.error('updateOrder error:', error);
    res.status(500).json({
      error: 'Failed to update order',
      message: getPrismaErrorMessage(error),
    });
  }
};

// DELETE /api/orders/:id
export const deleteOrder = async (req: Request, res: Response): Promise<void> => {
  const rawOrderId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const orderId = parseOrderId(rawOrderId ?? '');
  if (!orderId) {
    res.status(400).json({ error: 'Invalid order id' });
    return;
  }

  try {
    await prisma.order.delete({
      where: { id: orderId },
    });
    res.status(204).send();
  } catch (error) {
    if (isOrderNotFoundError(error)) {
      res.status(404).json({ error: 'Order not found' });
      return;
    }

    console.error('deleteOrder error:', error);
    res.status(500).json({
      error: 'Failed to delete order',
      message: getPrismaErrorMessage(error),
    });
  }
};
