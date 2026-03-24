import type { Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import prisma from '../prisma/client';

const ALLOWED_WIDGET_TYPES = new Set(['KPI Card', 'Bar Chart', 'Line Chart', 'Pie Chart', 'Table']);
const ALLOWED_GROUP_FIELDS = new Set(['product', 'status', 'city', 'country', 'createdBy']);
const ALLOWED_VALUE_FIELDS = new Set(['totalAmount', 'quantity', 'unitPrice']);
const ALLOWED_KPI_FIELDS = new Set(['totalAmount', 'quantity', 'id']);
const ALLOWED_AGGREGATIONS = new Set(['sum', 'avg', 'count']);
const ALLOWED_TABLE_COLUMNS = new Set([
  'id',
  'customer',
  'email',
  'product',
  'quantity',
  'unitPrice',
  'totalAmount',
  'status',
  'city',
  'country',
  'createdBy',
  'createdAt',
]);
const ALLOWED_STATUS_FILTERS = new Set(['all', 'Pending', 'In progress', 'Completed']);
const ALLOWED_PAGE_SIZES = new Set([5, 10, 20, 50]);
const COLOR_PATTERN = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

interface SanitizedWidget {
  type: string;
  title: string;
  width: number;
  height: number;
  positionX: number;
  positionY: number;
  config: Prisma.InputJsonValue;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function normalizeWidgetConfigType(type: string) {
  return type.toLowerCase().replace(/\s+/g, '_');
}

function getDefaultWidgetConfig(type: string): Record<string, Prisma.InputJsonValue> {
  if (type === 'KPI Card') {
    return {
      type: 'kpi_card',
      metric: 'totalAmount',
      aggregation: 'sum',
      color: '#10b981',
    };
  }

  if (type === 'Table') {
    return {
      type: 'table',
      columns: ['id', 'customer', 'product', 'totalAmount', 'status'],
      pageSize: 10,
      statusFilter: 'all',
    };
  }

  return {
    type: normalizeWidgetConfigType(type),
    xAxis: 'product',
    yAxis: 'totalAmount',
    aggregation: 'sum',
    color: '#10b981',
  };
}

function safeInt(value: unknown, fallback: number, min: number): number {
  const num = Number(value);
  if (!Number.isFinite(num) || !Number.isInteger(num)) return fallback;
  return num < min ? fallback : num;
}

function validateWidgetConfig(type: string, rawConfig: unknown): { config?: Prisma.InputJsonValue; error?: string } {
  if (rawConfig === undefined || rawConfig === null) {
    return { config: getDefaultWidgetConfig(type) };
  }

  if (!isPlainObject(rawConfig)) {
    return { error: 'config must be a JSON object' };
  }

  const defaultConfig = getDefaultWidgetConfig(type);
  const allowedKeys = new Set<string>(['type']);

  if (type === 'Table') {
    ['columns', 'pageSize', 'statusFilter'].forEach((key) => allowedKeys.add(key));
  } else if (type === 'KPI Card') {
    ['metric', 'aggregation', 'color'].forEach((key) => allowedKeys.add(key));
  } else {
    ['xAxis', 'yAxis', 'aggregation', 'color'].forEach((key) => allowedKeys.add(key));
  }

  // Strip unknown keys instead of rejecting (more forgiving)
  const sanitizedConfig: Record<string, Prisma.InputJsonValue> = {
    ...defaultConfig,
  };

  if (rawConfig.type !== undefined) {
    const expected = normalizeWidgetConfigType(type);
    // Auto-correct the type instead of rejecting
    sanitizedConfig.type = expected;
  }

  if (type === 'Table') {
    if (rawConfig.columns !== undefined) {
      if (Array.isArray(rawConfig.columns) && rawConfig.columns.length > 0) {
        const validColumns = rawConfig.columns.filter(
          (col) => typeof col === 'string' && ALLOWED_TABLE_COLUMNS.has(col)
        );
        if (validColumns.length > 0) {
          sanitizedConfig.columns = Array.from(new Set(validColumns as string[]));
        }
        // If no valid columns, keep the default
      }
    }

    if (rawConfig.pageSize !== undefined) {
      const pageSize = Number(rawConfig.pageSize);
      if (Number.isInteger(pageSize) && ALLOWED_PAGE_SIZES.has(pageSize)) {
        sanitizedConfig.pageSize = pageSize;
      }
      // If invalid, keep the default
    }

    if (rawConfig.statusFilter !== undefined) {
      if (typeof rawConfig.statusFilter === 'string' && ALLOWED_STATUS_FILTERS.has(rawConfig.statusFilter)) {
        sanitizedConfig.statusFilter = rawConfig.statusFilter;
      }
    }

    return { config: sanitizedConfig };
  }

  if (type === 'KPI Card') {
    if (rawConfig.metric !== undefined) {
      if (typeof rawConfig.metric === 'string' && ALLOWED_KPI_FIELDS.has(rawConfig.metric)) {
        sanitizedConfig.metric = rawConfig.metric;
      }
    }
  } else {
    if (rawConfig.xAxis !== undefined) {
      if (typeof rawConfig.xAxis === 'string' && ALLOWED_GROUP_FIELDS.has(rawConfig.xAxis)) {
        sanitizedConfig.xAxis = rawConfig.xAxis;
      }
    }

    if (rawConfig.yAxis !== undefined) {
      if (typeof rawConfig.yAxis === 'string' && ALLOWED_VALUE_FIELDS.has(rawConfig.yAxis)) {
        sanitizedConfig.yAxis = rawConfig.yAxis;
      }
    }
  }

  if (rawConfig.aggregation !== undefined) {
    if (typeof rawConfig.aggregation === 'string' && ALLOWED_AGGREGATIONS.has(rawConfig.aggregation)) {
      sanitizedConfig.aggregation = rawConfig.aggregation;
    }
  }

  if (rawConfig.color !== undefined) {
    if (typeof rawConfig.color === 'string' && COLOR_PATTERN.test(rawConfig.color)) {
      sanitizedConfig.color = rawConfig.color;
    }
  }

  return { config: sanitizedConfig };
}

function sanitizeWidget(rawWidget: unknown, index: number): { widget?: SanitizedWidget; error?: string } {
  if (!isPlainObject(rawWidget)) {
    return { error: `widgets[${index}] must be an object` };
  }

  // Type: required, must be a valid widget type
  const type = typeof rawWidget.type === 'string' ? rawWidget.type.trim() : '';
  if (!ALLOWED_WIDGET_TYPES.has(type)) {
    return { error: `widgets[${index}].type "${type}" is not a valid widget type` };
  }

  // Layout fields: provide defaults for missing/invalid values
  const width = safeInt(rawWidget.width, 4, 1);
  const clampedWidth = Math.min(width, 12);
  const height = safeInt(rawWidget.height, 4, 2);
  const positionX = safeInt(rawWidget.positionX, 0, 0);
  const positionY = safeInt(rawWidget.positionY, 0, 0);

  // Clamp positionX so widget fits in 12-column grid
  const safePositionX = positionX + clampedWidth > 12 ? Math.max(0, 12 - clampedWidth) : positionX;

  // Title: default to the widget type if missing
  const title =
    typeof rawWidget.title === 'string' && rawWidget.title.trim().length > 0
      ? rawWidget.title.trim()
      : type;

  // Config: validate and provide defaults
  const configValidation = validateWidgetConfig(type, rawWidget.config);
  if (!configValidation.config) {
    return { error: `widgets[${index}]: ${configValidation.error}` };
  }

  return {
    widget: {
      type,
      title,
      width: clampedWidth,
      height,
      positionX: safePositionX,
      positionY,
      config: configValidation.config,
    },
  };
}

function sanitizeWidgetsArray(rawWidgets: unknown): { widgets?: SanitizedWidget[]; error?: string } {
  if (!Array.isArray(rawWidgets)) {
    // If not provided, treat as empty array (no widgets)
    if (rawWidgets === undefined || rawWidgets === null) {
      return { widgets: [] };
    }
    return { error: 'widgets must be an array' };
  }

  const sanitizedWidgets: SanitizedWidget[] = [];

  for (const [index, rawWidget] of rawWidgets.entries()) {
    const result = sanitizeWidget(rawWidget, index);
    if (!result.widget) {
      return { error: result.error };
    }
    sanitizedWidgets.push(result.widget);
  }

  return { widgets: sanitizedWidgets };
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

// GET /api/dashboard
export const getDashboard = async (_req: Request, res: Response): Promise<void> => {
  try {
    let dashboard = await prisma.dashboard.findFirst({
      include: { widgets: true },
    });

    if (!dashboard) {
      dashboard = await prisma.dashboard.create({
        data: { name: 'Main Dashboard' },
        include: { widgets: true },
      });
    }

    res.status(200).json(dashboard);
  } catch (error) {
    console.error('getDashboard error:', error);
    res.status(500).json({
      error: 'Failed to fetch dashboard',
      message: getPrismaErrorMessage(error),
    });
  }
};

// POST /api/dashboard/:id/widgets
export const saveDashboardWidgets = async (req: Request, res: Response): Promise<void> => {
  // Parse and validate dashboard ID
  const rawDashboardId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const dashboardId = Number(rawDashboardId);
  if (!Number.isFinite(dashboardId) || !Number.isInteger(dashboardId) || dashboardId <= 0) {
    res.status(400).json({ error: 'Invalid dashboard id. Must be a positive integer.' });
    return;
  }

  // Parse and validate widgets
  const body = (req.body ?? {}) as Record<string, unknown>;
  const validation = sanitizeWidgetsArray(body.widgets);
  if (!validation.widgets) {
    res.status(400).json({ error: validation.error });
    return;
  }
  const sanitizedWidgets = validation.widgets;

  try {
    // Verify dashboard exists
    const dashboard = await prisma.dashboard.findUnique({
      where: { id: dashboardId },
      select: { id: true },
    });

    if (!dashboard) {
      res.status(404).json({ error: 'Dashboard not found' });
      return;
    }

    // Replace all widgets in a transaction
    await prisma.$transaction(async (tx: any) => {
      await tx.widget.deleteMany({
        where: { dashboardId },
      });

      if (sanitizedWidgets.length > 0) {
        await tx.widget.createMany({
          data: sanitizedWidgets.map((widget) => ({
            dashboardId,
            type: widget.type,
            title: widget.title,
            width: widget.width,
            height: widget.height,
            positionX: widget.positionX,
            positionY: widget.positionY,
            config: widget.config,
          })),
        });
      }
    });

    res.status(200).json({ message: 'Dashboard layout saved successfully' });
  } catch (error) {
    console.error('saveDashboardWidgets error:', error);
    res.status(500).json({
      error: 'Failed to save dashboard widgets',
      message: getPrismaErrorMessage(error),
    });
  }
};
