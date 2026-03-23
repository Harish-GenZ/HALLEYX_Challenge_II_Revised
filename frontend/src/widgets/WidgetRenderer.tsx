import { useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import { ArrowUp, ArrowDown, ArrowUpDown } from 'lucide-react';
import {
  TABLE_COLUMN_OPTIONS,
  TABLE_DEFAULT_COLUMNS,
  TABLE_PAGE_SIZE_OPTIONS,
  type TableColumnKey,
  type WidgetConfig,
} from '../dashboard/widgetConfig.ts';

interface Order {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  product: string;
  quantity: number;
  unitPrice: number;
  totalAmount: number;
  status: string;
  city: string;
  country: string;
  createdBy: string;
  createdAt?: string;
  [key: string]: string | number | undefined;
}

interface Widget {
  id: string;
  type: string;
  title: string;
  width: number;
  height: number;
  config: WidgetConfig;
}

interface WidgetRendererProps {
  widget: Widget;
  orders: Order[];
}

type SortDirection = 'asc' | 'desc';

const CHART_MARGIN = { top: 10, right: 10, left: 0, bottom: 0 };
const TICK_STYLE = { fontSize: 12, fill: '#6B7280' };
const TOOLTIP_CURSOR = { fill: '#F3F4F6' };
const TOOLTIP_CONTENT_STYLE = {
  borderRadius: '10px',
  border: '1px solid #E5E7EB',
  boxShadow: '0 10px 30px -12px rgb(0 0 0 / 0.25)',
  backgroundColor: '#FFFFFF',
  color: '#111827',
  fontSize: '13px',
  lineHeight: '1.4',
};
const TOOLTIP_LABEL_STYLE = { color: '#111827', fontWeight: 700, marginBottom: '4px' };
const TOOLTIP_ITEM_STYLE = { color: '#374151', padding: 0 };
const ACTIVE_DOT_STYLE = { r: 6 };
const RADIUS_ARRAY: [number, number, number, number] = [4, 4, 0, 0];
const PIE_COLORS = ['#4f46e5', '#0f766e', '#ea580c', '#0891b2', '#dc2626', '#65a30d'];

function getChartDefaults(widget: Widget) {
  return {
    xAxis: widget.config.xAxis || 'product',
    yAxis: widget.config.yAxis || 'totalAmount',
    aggregation: widget.config.aggregation || 'sum',
    color: widget.config.color || '#10b981',
    metric: widget.config.metric || 'totalAmount',
  };
}

function formatCurrency(value: number) {
  return `$${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatDate(value?: string) {
  if (!value) return 'N/A';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'N/A';
  return date.toLocaleDateString();
}

function getStatusBadge(status: string) {
  if (status === 'Completed') return 'bg-emerald-100 text-emerald-700';
  if (status === 'In progress') return 'bg-blue-100 text-blue-700';
  return 'bg-amber-100 text-amber-700';
}

function normalizeColumns(columns?: TableColumnKey[]) {
  const allowedKeys = new Set<TableColumnKey>(TABLE_COLUMN_OPTIONS.map((column) => column.key));
  const nextColumns = (columns || TABLE_DEFAULT_COLUMNS).filter((column): column is TableColumnKey => allowedKeys.has(column));
  return nextColumns.length > 0 ? Array.from(new Set(nextColumns)) : [...TABLE_DEFAULT_COLUMNS];
}

function normalizePageSize(pageSize?: number): number {
  return typeof pageSize === 'number' && TABLE_PAGE_SIZE_OPTIONS.includes(pageSize as (typeof TABLE_PAGE_SIZE_OPTIONS)[number])
    ? pageSize
    : 10;
}

const TABLE_COLUMNS: Record<TableColumnKey, {
  label: string;
  getSortValue: (order: Order) => string | number;
  render: (order: Order) => ReactNode;
}> = {
  id: {
    label: 'ID',
    getSortValue: (order) => order.id,
    render: (order) => <span className="text-gray-500 font-medium">#{order.id}</span>,
  },
  customer: {
    label: 'Customer',
    getSortValue: (order) => `${order.firstName} ${order.lastName}`.trim(),
    render: (order) => <span className="text-gray-900 font-medium">{order.firstName} {order.lastName}</span>,
  },
  email: {
    label: 'Email',
    getSortValue: (order) => order.email,
    render: (order) => <span className="text-gray-600">{order.email}</span>,
  },
  product: {
    label: 'Product',
    getSortValue: (order) => order.product,
    render: (order) => <span className="text-gray-600">{order.product}</span>,
  },
  quantity: {
    label: 'Quantity',
    getSortValue: (order) => order.quantity,
    render: (order) => <span className="text-gray-900 font-medium">{order.quantity}</span>,
  },
  unitPrice: {
    label: 'Unit Price',
    getSortValue: (order) => order.unitPrice,
    render: (order) => <span className="text-gray-900 font-medium">{formatCurrency(order.unitPrice)}</span>,
  },
  totalAmount: {
    label: 'Total Amount',
    getSortValue: (order) => order.totalAmount,
    render: (order) => <span className="text-gray-900 font-semibold">{formatCurrency(order.totalAmount)}</span>,
  },
  status: {
    label: 'Status',
    getSortValue: (order) => order.status,
    render: (order) => (
      <span className={`px-2.5 py-1 text-xs font-semibold rounded-full ${getStatusBadge(order.status)}`}>
        {order.status}
      </span>
    ),
  },
  city: {
    label: 'City',
    getSortValue: (order) => order.city,
    render: (order) => <span className="text-gray-600">{order.city}</span>,
  },
  country: {
    label: 'Country',
    getSortValue: (order) => order.country,
    render: (order) => <span className="text-gray-600">{order.country}</span>,
  },
  createdBy: {
    label: 'Sales Rep',
    getSortValue: (order) => order.createdBy,
    render: (order) => <span className="text-gray-600">{order.createdBy}</span>,
  },
  createdAt: {
    label: 'Created',
    getSortValue: (order) => order.createdAt ? new Date(order.createdAt).getTime() : 0,
    render: (order) => <span className="text-gray-600">{formatDate(order.createdAt)}</span>,
  },
};

function TableWidget({ orders, config }: { orders: Order[]; config: WidgetConfig }) {
  const [sortConfig, setSortConfig] = useState<{ key: TableColumnKey; direction: SortDirection } | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<NonNullable<WidgetConfig['statusFilter']>>(config.statusFilter || 'all');
  const [pageSize, setPageSize] = useState<number>(normalizePageSize(config.pageSize));
  const [currentPage, setCurrentPage] = useState(1);
  const [visibleColumns, setVisibleColumns] = useState<TableColumnKey[]>(normalizeColumns(config.columns));

  useEffect(() => {
    setVisibleColumns(normalizeColumns(config.columns));
  }, [config.columns]);

  useEffect(() => {
    setStatusFilter(config.statusFilter || 'all');
  }, [config.statusFilter]);

  useEffect(() => {
    setPageSize(normalizePageSize(config.pageSize));
  }, [config.pageSize]);

  useEffect(() => {
    setCurrentPage(1);
  }, [orders, pageSize, searchTerm, sortConfig, statusFilter, visibleColumns]);

  const handleSort = (key: TableColumnKey) => {
    let direction: SortDirection = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const handleColumnToggle = (columnKey: TableColumnKey) => {
    setVisibleColumns((prev) => {
      if (prev.includes(columnKey)) {
        return prev.length > 1 ? prev.filter((column) => column !== columnKey) : prev;
      }
      return [...prev, columnKey];
    });
  };

  const filteredOrders = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    return orders.filter((order) => {
      if (statusFilter !== 'all' && order.status !== statusFilter) {
        return false;
      }

      if (!normalizedSearch) {
        return true;
      }

      const searchableValues = [
        order.firstName,
        order.lastName,
        order.email,
        order.product,
        order.status,
        order.city,
        order.country,
        order.createdBy,
      ];

      return searchableValues.some((value) => value.toLowerCase().includes(normalizedSearch));
    });
  }, [orders, searchTerm, statusFilter]);

  const sortedOrders = useMemo(() => {
    const sortableItems = [...filteredOrders];

    if (!sortConfig) {
      return sortableItems;
    }

    sortableItems.sort((a, b) => {
      const aValue = TABLE_COLUMNS[sortConfig.key].getSortValue(a);
      const bValue = TABLE_COLUMNS[sortConfig.key].getSortValue(b);

      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return sortConfig.direction === 'asc' ? aValue - bValue : bValue - aValue;
      }

      return sortConfig.direction === 'asc'
        ? String(aValue).localeCompare(String(bValue))
        : String(bValue).localeCompare(String(aValue));
    });

    return sortableItems;
  }, [filteredOrders, sortConfig]);

  const totalPages = Math.max(1, Math.ceil(sortedOrders.length / pageSize));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const paginatedOrders = useMemo(() => {
    const startIndex = (safeCurrentPage - 1) * pageSize;
    return sortedOrders.slice(startIndex, startIndex + pageSize);
  }, [pageSize, safeCurrentPage, sortedOrders]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const renderSortIcon = (columnKey: TableColumnKey) => {
    if (!sortConfig || sortConfig.key !== columnKey) {
      return <ArrowUpDown size={14} className="text-gray-300 ml-1" />;
    }
    return sortConfig.direction === 'asc'
      ? <ArrowUp size={14} className="text-emerald-500 ml-1" />
      : <ArrowDown size={14} className="text-emerald-500 ml-1" />;
  };

  const summaryStart = sortedOrders.length === 0 ? 0 : (safeCurrentPage - 1) * pageSize + 1;
  const summaryEnd = Math.min(safeCurrentPage * pageSize, sortedOrders.length);

  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <input
          type="search"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Filter orders"
          className="min-w-[180px] flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 outline-none transition-all focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/20"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as NonNullable<WidgetConfig['statusFilter']>)}
          className="rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 outline-none transition-all focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/20"
        >
          <option value="all">All statuses</option>
          <option value="Pending">Pending</option>
          <option value="In progress">In progress</option>
          <option value="Completed">Completed</option>
        </select>
        <select
          value={pageSize}
          onChange={(e) => setPageSize(Number(e.target.value))}
          className="rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 outline-none transition-all focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/20"
        >
          {TABLE_PAGE_SIZE_OPTIONS.map((size) => (
            <option key={size} value={size}>{size} / page</option>
          ))}
        </select>
        <details className="relative">
          <summary className="list-none cursor-pointer rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 transition-all hover:border-emerald-300 hover:text-emerald-700">
            Columns
          </summary>
          <div className="absolute right-0 top-11 z-20 w-56 rounded-xl border border-gray-200 bg-white p-3 shadow-xl">
            <div className="grid grid-cols-2 gap-2">
              {TABLE_COLUMN_OPTIONS.map((column) => (
                <label key={column.key} className="flex items-center gap-2 text-xs text-gray-700">
                  <input
                    type="checkbox"
                    checked={visibleColumns.includes(column.key)}
                    onChange={() => handleColumnToggle(column.key)}
                    className="h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                  />
                  <span>{column.label}</span>
                </label>
              ))}
            </div>
          </div>
        </details>
      </div>

      <div className="min-h-0 flex-1 overflow-auto rounded-xl border border-gray-100">
        <table className="w-full min-w-[640px] whitespace-nowrap text-left text-sm">
          <thead className="sticky top-0 z-10 border-b border-gray-100 bg-slate-50 uppercase text-xs font-bold tracking-wider text-gray-400">
            <tr>
              {visibleColumns.map((columnKey) => (
                <th
                  key={columnKey}
                  className="cursor-pointer p-4 transition-colors hover:bg-slate-100"
                  onClick={() => handleSort(columnKey)}
                >
                  <div className="flex items-center">
                    {TABLE_COLUMNS[columnKey].label}
                    {renderSortIcon(columnKey)}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {paginatedOrders.length === 0 && (
              <tr>
                <td colSpan={visibleColumns.length} className="p-6 text-center text-sm text-gray-500">
                  No orders match the current filters.
                </td>
              </tr>
            )}
            {paginatedOrders.map((order) => (
              <tr key={order.id} className="transition-colors hover:bg-slate-50/80">
                {visibleColumns.map((columnKey) => (
                  <td key={`${order.id}-${columnKey}`} className="p-4 align-middle">
                    {TABLE_COLUMNS[columnKey].render(order)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-gray-100 pt-2 text-xs text-gray-500">
        <span>
          Showing {summaryStart}-{summaryEnd} of {sortedOrders.length}
        </span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
            disabled={safeCurrentPage === 1}
            className="rounded-lg border border-gray-200 px-3 py-1.5 font-medium text-gray-600 transition-all disabled:cursor-not-allowed disabled:opacity-50"
          >
            Previous
          </button>
          <span className="font-medium text-gray-600">
            Page {safeCurrentPage} / {totalPages}
          </span>
          <button
            type="button"
            onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
            disabled={safeCurrentPage === totalPages}
            className="rounded-lg border border-gray-200 px-3 py-1.5 font-medium text-gray-600 transition-all disabled:cursor-not-allowed disabled:opacity-50"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}

export default function WidgetRenderer({ widget, orders }: WidgetRendererProps) {
  const { type } = widget;
  const config = getChartDefaults(widget);
  const chartContainerClass = 'flex h-full w-full items-center justify-center overflow-visible min-h-[200px] pb-2';

  const chartData = useMemo(() => {
    if (!orders || orders.length === 0) return [];
    const grouped: Record<string, { sum: number; count: number }> = {};

    orders.forEach((order) => {
      const xValue = String(order[config.xAxis as keyof Order] || 'Unknown');
      const yValue = Number(order[config.yAxis as keyof Order] || 0);

      if (!grouped[xValue]) {
        grouped[xValue] = { sum: 0, count: 0 };
      }
      grouped[xValue].sum += yValue;
      grouped[xValue].count += 1;
    });

    return Object.entries(grouped).map(([key, value]) => {
      let finalValue = 0;
      if (config.aggregation === 'avg') finalValue = value.sum / value.count;
      else if (config.aggregation === 'count') finalValue = value.count;
      else finalValue = value.sum;

      return {
        name: key,
        value: Number(finalValue.toFixed(2))
      };
    });
  }, [orders, config.xAxis, config.yAxis, config.aggregation]);

  const kpiValue = useMemo(() => {
    if (!orders || orders.length === 0) return 0;
    const metricField = config.metric || 'totalAmount';

    let total = 0;
    orders.forEach((order) => {
      total += Number(order[metricField] || 0);
    });

    if (config.aggregation === 'avg') return total / orders.length;
    if (config.aggregation === 'count') return orders.length;
    return total;
  }, [orders, config.metric, config.aggregation]);

  const color = config.color || '#10b981';
  const formattedKpiValue = useMemo(() => (
    config.metric === 'totalAmount' || config.metric === 'unitPrice'
      ? formatCurrency(kpiValue)
      : kpiValue.toLocaleString(undefined, { maximumFractionDigits: 2 })
  ), [config.metric, kpiValue]);

  const valueLabel = useMemo(() => {
    if (config.aggregation === 'count') return 'Count';
    if (config.yAxis === 'totalAmount' || config.metric === 'totalAmount' || config.yAxis === 'unitPrice') {
      return config.aggregation === 'avg' ? 'Average Value' : 'Value';
    }
    if (config.yAxis === 'quantity' || config.metric === 'quantity') {
      return config.aggregation === 'avg' ? 'Average Quantity' : 'Quantity';
    }
    return 'Value';
  }, [config.aggregation, config.metric, config.yAxis]);

  const tooltipFormatter = (value: number | string, name: string | number) => {
    const numericValue = Number(value);
    const renderLabel = (type === 'Pie Chart' && name !== 'value') ? String(name) : valueLabel;

    if (config.aggregation === 'count') {
      return [Math.round(numericValue).toLocaleString(), renderLabel];
    }

    const isCurrency =
      (type === 'KPI Card' && (config.metric === 'totalAmount' || config.metric === 'unitPrice')) ||
      (type !== 'KPI Card' && (config.yAxis === 'totalAmount' || config.yAxis === 'unitPrice'));

    if (isCurrency) {
      return [formatCurrency(numericValue), renderLabel];
    }

    return [numericValue.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 }), renderLabel];
  };

  const dotStyle = useMemo(() => ({ r: 4, fill: color, strokeWidth: 2, stroke: '#fff' }), [color]);
  const hasChartData = chartData.length > 0;

  const renderEmptyChartState = () => (
    <div className="flex h-full w-full items-center justify-center text-sm text-gray-500">
      No chart data available for the current settings.
    </div>
  );

  if (type === 'KPI Card') {
    return (
      <div className="flex h-full w-full items-center justify-center overflow-hidden p-2 sm:p-4 @container">
        <div className="flex w-full flex-col items-center text-center">
          <span className="mb-0.5 sm:mb-1 max-w-[90%] sm:max-w-full text-[10px] sm:text-xs font-medium uppercase tracking-wide text-gray-500 md:mb-2 md:text-sm">
            {config.aggregation || 'sum'} of {config.metric || 'totalAmount'}
          </span>
          <span
            className="max-w-full overflow-hidden text-[clamp(1.5rem,15cqw,3rem)] sm:text-[clamp(1.8rem,5vw,4rem)] font-extrabold leading-tight tracking-tight [overflow-wrap:anywhere]"
            style={{ color }}
          >
            {formattedKpiValue}
          </span>
        </div>
      </div>
    );
  }

  if (type === 'Table') {
    return <TableWidget orders={orders} config={widget.config} />;
  }

  if (type === 'Bar Chart') {
    if (!hasChartData) return renderEmptyChartState();

    return (
      <div className={chartContainerClass}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={CHART_MARGIN}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
            <XAxis dataKey="name" tick={TICK_STYLE} tickLine={false} axisLine={false} />
            <YAxis tick={TICK_STYLE} tickLine={false} axisLine={false} />
            <Tooltip
              cursor={TOOLTIP_CURSOR}
              contentStyle={TOOLTIP_CONTENT_STYLE}
              labelStyle={TOOLTIP_LABEL_STYLE}
              itemStyle={TOOLTIP_ITEM_STYLE}
              formatter={tooltipFormatter}
              wrapperStyle={{ zIndex: 100 }}
            />
            <Bar dataKey="value" fill={color} radius={RADIUS_ARRAY} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    );
  }

  if (type === 'Line Chart') {
    if (!hasChartData) return renderEmptyChartState();

    return (
      <div className={chartContainerClass}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={CHART_MARGIN}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
            <XAxis dataKey="name" tick={TICK_STYLE} tickLine={false} axisLine={false} />
            <YAxis tick={TICK_STYLE} tickLine={false} axisLine={false} />
            <Tooltip
              contentStyle={TOOLTIP_CONTENT_STYLE}
              labelStyle={TOOLTIP_LABEL_STYLE}
              itemStyle={TOOLTIP_ITEM_STYLE}
              formatter={tooltipFormatter}
              wrapperStyle={{ zIndex: 100 }}
            />
            <Line type="monotone" dataKey="value" stroke={color} strokeWidth={3} dot={dotStyle} activeDot={ACTIVE_DOT_STYLE} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    );
  }

  if (type === 'Pie Chart') {
    if (!hasChartData) return renderEmptyChartState();

    return (
      <div className={chartContainerClass}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Tooltip
              contentStyle={TOOLTIP_CONTENT_STYLE}
              labelStyle={TOOLTIP_LABEL_STYLE}
              itemStyle={TOOLTIP_ITEM_STYLE}
              formatter={tooltipFormatter}
              wrapperStyle={{ zIndex: 100 }}
            />
            <Pie
              data={chartData}
              nameKey="name"
              cx="50%"
              cy="50%"
              innerRadius="50%"
              outerRadius="80%"
              paddingAngle={2}
              dataKey="value"
            >
              {chartData.map((_entry, index) => (
                <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
      </div>
    );
  }

  return <div className="p-4 text-center text-gray-500">Preview not available</div>;
}
