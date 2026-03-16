import { useState, useMemo } from 'react';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import { ArrowUp, ArrowDown, ArrowUpDown } from 'lucide-react';

interface Order {
  id: number;
  product: string;
  quantity: number;
  unitPrice: number;
  totalAmount: number;
  status: string;
  city: string;
  country: string;
  createdBy: string;
  [key: string]: string | number | undefined;
}

interface WidgetConfig {
  type?: string;
  xAxis?: string;
  yAxis?: string;
  metric?: string;
  aggregation?: string;
  color?: string;
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

function TableWidget({ orders }: { orders: Order[] }) {
  const [sortConfig, setSortConfig] = useState<{ key: keyof Order; direction: 'asc' | 'desc' } | null>(null);

  const handleSort = (key: keyof Order) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const sortedOrders = useMemo(() => {
    const sortableItems = [...orders];
    if (sortConfig !== null) {
      const sortKey = sortConfig.key;
      sortableItems.sort((a, b) => {
        const aValue = a[sortKey] ?? '';
        const bValue = b[sortKey] ?? '';

        if (aValue < bValue) {
          return sortConfig.direction === 'asc' ? -1 : 1;
        }
        if (aValue > bValue) {
          return sortConfig.direction === 'asc' ? 1 : -1;
        }
        return 0;
      });
    }
    return sortableItems;
  }, [orders, sortConfig]);

  const renderSortIcon = (columnKey: keyof Order) => {
    if (!sortConfig || sortConfig.key !== columnKey) return <ArrowUpDown size={14} className="text-gray-300 ml-1" />;
    return sortConfig.direction === 'asc' ? <ArrowUp size={14} className="text-emerald-500 ml-1" /> : <ArrowDown size={14} className="text-emerald-500 ml-1" />;
  };

  return (
    <div className="overflow-auto h-full w-full">
      <table className="w-full text-left text-sm whitespace-nowrap min-w-[500px]">
        <thead className="sticky top-0 bg-slate-50 uppercase text-xs text-gray-400 font-bold tracking-wider z-10 border-b border-gray-100">
          <tr>
            <th className="p-4 cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => handleSort('id')}>
              <div className="flex items-center">ID {renderSortIcon('id')}</div>
            </th>
            <th className="p-4 cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => handleSort('firstName')}>
              <div className="flex items-center">Customer {renderSortIcon('firstName')}</div>
            </th>
            <th className="p-4 cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => handleSort('product')}>
              <div className="flex items-center">Product {renderSortIcon('product')}</div>
            </th>
            <th className="p-4 cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => handleSort('totalAmount')}>
              <div className="flex items-center">Amount {renderSortIcon('totalAmount')}</div>
            </th>
            <th className="p-4 cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => handleSort('status')}>
              <div className="flex items-center">Status {renderSortIcon('status')}</div>
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {sortedOrders.slice(0, 50).map(order => (
            <tr key={order.id} className="hover:bg-slate-50/80 transition-colors">
              <td className="p-4 text-gray-500 font-medium">#{order.id}</td>
              <td className="p-4 text-gray-900 font-medium">{order.firstName} {order.lastName}</td>
              <td className="p-4 text-gray-600">{order.product}</td>
              <td className="p-4 text-gray-900 font-semibold">${order.totalAmount.toFixed(2)}</td>
              <td className="p-4">
                <span className={`px-2.5 py-1 text-xs font-semibold rounded-full ${
                  order.status === 'Completed' ? 'bg-emerald-100 text-emerald-700' :
                  order.status === 'In progress' ? 'bg-blue-100 text-blue-700' :
                  'bg-amber-100 text-amber-700'
                }`}>
                  {order.status}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function WidgetRenderer({ widget, orders }: WidgetRendererProps) {
  const { type } = widget;
  const config = getChartDefaults(widget);
  const chartContainerClass = 'flex h-full w-full items-center justify-center overflow-visible min-h-[200px] pb-2';

  // Aggregate data for charts
  const chartData = useMemo(() => {
    if (!orders || orders.length === 0) return [];
    const grouped: Record<string, { sum: number; count: number }> = {};

    orders.forEach(order => {
      const xValue = String(order[config.xAxis as keyof Order] || 'Unknown');
      const yValue = Number(order[config.yAxis as keyof Order] || 0);

      if (!grouped[xValue]) {
        grouped[xValue] = { sum: 0, count: 0 };
      }
      grouped[xValue].sum += yValue;
      grouped[xValue].count += 1;
    });

    return Object.entries(grouped).map(([key, val]) => {
      let finalValue = 0;
      if (config.aggregation === 'avg') finalValue = val.sum / val.count;
      else if (config.aggregation === 'count') finalValue = val.count;
      else finalValue = val.sum; // default sum

      return {
        name: key,
        value: Number(finalValue.toFixed(2))
      };
    });
  }, [orders, config.xAxis, config.yAxis, config.aggregation]);

  // Handle KPI Calculation
  const kpiValue = useMemo(() => {
    if (!orders || orders.length === 0) return 0;
    const metricField = config.metric || 'totalAmount';
    
    let total = 0;
    orders.forEach(order => {
      total += Number(order[metricField] || 0);
    });

    if (config.aggregation === 'avg') return total / orders.length;
    if (config.aggregation === 'count') return orders.length;
    return total; // default sum
  }, [orders, config.metric, config.aggregation]);

  const color = config.color || '#10b981';
  const formattedKpiValue = useMemo(() => (
    config.metric === 'totalAmount' || config.metric === 'unitPrice'
      ? `$${kpiValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
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
    
    // For PieChart, the `name` argument contains the category name (X-axis equivalent).
    // For other charts, `name` might be the datakey like "value".
    // We can conditionally display the category name instead of "ValueLabel" if this is a PieChart
    // or if `name` doesn't strictly equal 'value'.
    const renderLabel = (type === 'Pie Chart' && name !== 'value') ? String(name) : valueLabel;

    if (config.aggregation === 'count') {
      return [Math.round(numericValue).toLocaleString(), renderLabel];
    }

    const isCurrency = 
      (type === 'KPI Card' && (config.metric === 'totalAmount' || config.metric === 'unitPrice')) ||
      (type !== 'KPI Card' && (config.yAxis === 'totalAmount' || config.yAxis === 'unitPrice'));

    if (isCurrency) {
      return [`$${numericValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, renderLabel];
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
      <div className="flex h-full w-full items-center justify-center overflow-hidden p-4">
        <div className="flex w-full flex-col items-center text-center">
          <span className="mb-1 max-w-full text-xs font-medium uppercase tracking-wide text-gray-500 md:mb-2 md:text-sm">
            {config.aggregation || 'sum'} of {config.metric || 'totalAmount'}
          </span>
          <span
            className="max-w-full overflow-hidden text-[clamp(1.8rem,5vw,4rem)] font-extrabold leading-none tracking-tight [overflow-wrap:anywhere]"
            style={{ color }}
          >
            {formattedKpiValue}
          </span>
        </div>
      </div>
    );
  }

  if (type === 'Table') {
    return <TableWidget orders={orders} />;
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
