import type { Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import prisma from '../prisma/client.js';

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

function validatePositiveInteger(value: unknown, fieldName: string, minimum: number): number | string {
  const parsedValue = Number(value);
  if (!Number.isInteger(parsedValue) || parsedValue < minimum) {
    return `${fieldName} must be an integer greater than or equal to ${minimum}`;
  }
  return parsedValue;
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

  for (const key of Object.keys(rawConfig)) {
    if (!allowedKeys.has(key)) {
      return { error: `config.${key} is not allowed for widget type ${type}` };
    }
  }

  const sanitizedConfig: Record<string, Prisma.InputJsonValue> = {
    ...defaultConfig,
  };

  if (rawConfig.type !== undefined) {
    if (rawConfig.type !== normalizeWidgetConfigType(type)) {
      return { error: `config.type must be ${normalizeWidgetConfigType(type)}` };
    }
    sanitizedConfig.type = rawConfig.type;
  }

  if (type === 'Table') {
    if (rawConfig.columns !== undefined) {
      if (!Array.isArray(rawConfig.columns) || rawConfig.columns.length === 0) {
        return { error: 'config.columns must contain at least one allowed column' };
      }

      const invalidColumn = rawConfig.columns.find((column) => typeof column !== 'string' || !ALLOWED_TABLE_COLUMNS.has(column));
      if (invalidColumn) {
        return { error: `config.columns contains unsupported column "${String(invalidColumn)}"` };
      }

      sanitizedConfig.columns = Array.from(new Set(rawConfig.columns as string[]));
    }

    if (rawConfig.pageSize !== undefined) {
      const pageSize = Number(rawConfig.pageSize);
      if (!Number.isInteger(pageSize) || !ALLOWED_PAGE_SIZES.has(pageSize)) {
        return { error: 'config.pageSize must be one of 5, 10, 20, or 50' };
      }
      sanitizedConfig.pageSize = pageSize;
    }

    if (rawConfig.statusFilter !== undefined) {
      if (typeof rawConfig.statusFilter !== 'string' || !ALLOWED_STATUS_FILTERS.has(rawConfig.statusFilter)) {
        return { error: 'config.statusFilter is invalid' };
      }
      sanitizedConfig.statusFilter = rawConfig.statusFilter;
    }

    return { config: sanitizedConfig };
  }

  if (type === 'KPI Card') {
    if (rawConfig.metric !== undefined) {
      if (typeof rawConfig.metric !== 'string' || !ALLOWED_KPI_FIELDS.has(rawConfig.metric)) {
        return { error: 'config.metric is invalid' };
      }
      sanitizedConfig.metric = rawConfig.metric;
    }
  } else {
    if (rawConfig.xAxis !== undefined) {
      if (typeof rawConfig.xAxis !== 'string' || !ALLOWED_GROUP_FIELDS.has(rawConfig.xAxis)) {
        return { error: 'config.xAxis is invalid' };
      }
      sanitizedConfig.xAxis = rawConfig.xAxis;
    }

    if (rawConfig.yAxis !== undefined) {
      if (typeof rawConfig.yAxis !== 'string' || !ALLOWED_VALUE_FIELDS.has(rawConfig.yAxis)) {
        return { error: 'config.yAxis is invalid' };
      }
      sanitizedConfig.yAxis = rawConfig.yAxis;
    }
  }

  if (rawConfig.aggregation !== undefined) {
    if (typeof rawConfig.aggregation !== 'string' || !ALLOWED_AGGREGATIONS.has(rawConfig.aggregation)) {
      return { error: 'config.aggregation is invalid' };
    }
    sanitizedConfig.aggregation = rawConfig.aggregation;
  }

  if (rawConfig.color !== undefined) {
    if (typeof rawConfig.color !== 'string' || !COLOR_PATTERN.test(rawConfig.color)) {
      return { error: 'config.color must be a valid hex color' };
    }
    sanitizedConfig.color = rawConfig.color;
  }

  return { config: sanitizedConfig };
}

function validateWidgetsPayload(rawWidgets: unknown): { widgets?: SanitizedWidget[]; error?: string } {
  if (!Array.isArray(rawWidgets)) {
    return { error: 'widgets must be an array' };
  }

  const sanitizedWidgets: SanitizedWidget[] = [];

  for (const [index, rawWidget] of rawWidgets.entries()) {
    if (!isPlainObject(rawWidget)) {
      return { error: `widgets[${index}] must be an object` };
    }

    if (typeof rawWidget.type !== 'string' || !ALLOWED_WIDGET_TYPES.has(rawWidget.type)) {
      return { error: `widgets[${index}].type is invalid` };
    }

    const width = validatePositiveInteger(rawWidget.width, `widgets[${index}].width`, 1);
    if (typeof width === 'string') return { error: width };
    if (width > 12) return { error: `widgets[${index}].width cannot exceed 12` };

    const height = validatePositiveInteger(rawWidget.height, `widgets[${index}].height`, 2);
    if (typeof height === 'string') return { error: height };

    const positionX = validatePositiveInteger(rawWidget.positionX, `widgets[${index}].positionX`, 0);
    if (typeof positionX === 'string') return { error: positionX };

    const positionY = validatePositiveInteger(rawWidget.positionY, `widgets[${index}].positionY`, 0);
    if (typeof positionY === 'string') return { error: positionY };

    if (positionX + width > 12) {
      return { error: `widgets[${index}] exceeds the 12-column grid` };
    }

    const configValidation = validateWidgetConfig(rawWidget.type, rawWidget.config);
    if (!configValidation.config) {
      return { error: `widgets[${index}].${configValidation.error}` };
    }

    const title = typeof rawWidget.title === 'string' && rawWidget.title.trim().length > 0
      ? rawWidget.title.trim()
      : rawWidget.type;

    sanitizedWidgets.push({
      type: rawWidget.type,
      title,
      width,
      height,
      positionX,
      positionY,
      config: configValidation.config,
    });
  }

  return { widgets: sanitizedWidgets };
}

export const getDashboard = async (_req: Request, res: Response): Promise<void> => {
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
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch dashboard' });
  }
};

export const saveDashboardWidgets = async (req: Request, res: Response): Promise<void> => {
  const rawDashboardId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const dashboardId = Number(rawDashboardId);
  if (!Number.isInteger(dashboardId) || dashboardId <= 0) {
    res.status(400).json({ error: 'Invalid dashboard id' });
    return;
  }

  const validation = validateWidgetsPayload((req.body as { widgets?: unknown }).widgets);
  if (!validation.widgets) {
    res.status(400).json({ error: validation.error });
    return;
  }
  const sanitizedWidgets = validation.widgets;

  try {
    const dashboard = await prisma.dashboard.findUnique({
      where: { id: dashboardId },
      select: { id: true }
    });

    if (!dashboard) {
      res.status(404).json({ error: 'Dashboard not found' });
      return;
    }

    await prisma.$transaction(async (tx) => {
      await tx.widget.deleteMany({
        where: { dashboardId }
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
            config: widget.config
          }))
        });
      }
    });

    res.status(200).json({ message: 'Dashboard layout saved successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to save dashboard widgets' });
  }
};
