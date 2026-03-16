export const TABLE_COLUMN_OPTIONS = [
  { key: 'id', label: 'ID' },
  { key: 'customer', label: 'Customer' },
  { key: 'email', label: 'Email' },
  { key: 'product', label: 'Product' },
  { key: 'quantity', label: 'Quantity' },
  { key: 'unitPrice', label: 'Unit Price' },
  { key: 'totalAmount', label: 'Total Amount' },
  { key: 'status', label: 'Status' },
  { key: 'city', label: 'City' },
  { key: 'country', label: 'Country' },
  { key: 'createdBy', label: 'Sales Rep' },
  { key: 'createdAt', label: 'Created' },
] as const;

export type TableColumnKey = (typeof TABLE_COLUMN_OPTIONS)[number]['key'];

export interface WidgetConfig {
  type?: string;
  xAxis?: string;
  yAxis?: string;
  metric?: string;
  aggregation?: string;
  color?: string;
  columns?: TableColumnKey[];
  pageSize?: number;
  statusFilter?: 'all' | 'Pending' | 'In progress' | 'Completed';
}

export const TABLE_DEFAULT_COLUMNS: TableColumnKey[] = [
  'id',
  'customer',
  'product',
  'totalAmount',
  'status',
];

export const TABLE_PAGE_SIZE_OPTIONS = [5, 10, 20, 50] as const;

export function getDefaultWidgetConfig(type: string): WidgetConfig {
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
      columns: [...TABLE_DEFAULT_COLUMNS],
      pageSize: 10,
      statusFilter: 'all',
    };
  }

  return {
    type: type.toLowerCase().replace(/\s+/g, '_'),
    xAxis: 'product',
    yAxis: 'totalAmount',
    aggregation: 'sum',
    color: '#10b981',
  };
}
