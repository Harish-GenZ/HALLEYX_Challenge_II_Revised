import { useState } from 'react';
import { X } from 'lucide-react';
import {
  getDefaultWidgetConfig,
  TABLE_COLUMN_OPTIONS,
  TABLE_DEFAULT_COLUMNS,
  TABLE_PAGE_SIZE_OPTIONS,
  type TableColumnKey,
  type WidgetConfig,
} from './widgetConfig.ts';

interface Widget {
  id: string;
  type: string;
  title: string;
  width: number;
  height: number;
  positionX: number;
  positionY: number;
  config: WidgetConfig;
}

export default function WidgetSettingsModal({
  widget,
  onSave,
  onClose,
  isSaving = false
}: {
  widget: Widget,
  onSave: (updatedWidget: Widget) => Promise<void> | void,
  onClose: () => void,
  isSaving?: boolean
}) {
  const [formData, setFormData] = useState<Widget>(widget);
  const [configParams, setConfigParams] = useState<WidgetConfig>(() => ({
    ...getDefaultWidgetConfig(widget.type),
    ...(widget.config || {}),
  }));

  const handleBaseChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === 'width' || name === 'height' ? Number(value) : value
    }));
  };

  const handleConfigChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setConfigParams((prev) => ({
      ...prev,
      [name]: name === 'pageSize' ? Number(value) : value
    }));
  };

  const handleTableColumnToggle = (columnKey: TableColumnKey) => {
    setConfigParams((prev) => {
      const existingColumns = prev.columns && prev.columns.length > 0
        ? prev.columns
        : TABLE_DEFAULT_COLUMNS;
      const nextColumns = existingColumns.includes(columnKey)
        ? existingColumns.filter((column) => column !== columnKey)
        : [...existingColumns, columnKey];

      return {
        ...prev,
        columns: nextColumns.length > 0 ? nextColumns : existingColumns,
      };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSave({
      ...formData,
      config: configParams
    });
  };

  const isChart = ['Bar Chart', 'Line Chart', 'Pie Chart'].includes(widget.type);
  const isKPI = widget.type === 'KPI Card';
  const isTable = widget.type === 'Table';
  const selectedColumns = configParams.columns && configParams.columns.length > 0
    ? configParams.columns
    : TABLE_DEFAULT_COLUMNS;

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-end z-50 transition-all duration-300">
      <style>
        {`
          @keyframes slide-in-right {
            from { transform: translateX(100%); }
            to { transform: translateX(0); }
          }
        `}
      </style>
      <div className="bg-white shadow-2xl w-full max-w-md h-full overflow-hidden flex flex-col" style={{ animation: 'slide-in-right 0.3s ease-out' }}>
        <div className="flex justify-between items-center p-6 border-b border-gray-100 bg-white">
          <h2 className="text-xl font-semibold text-gray-800">
            {widget.type} Settings
          </h2>
          <button onClick={onClose} disabled={isSaving} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors disabled:cursor-not-allowed disabled:opacity-50">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1">
          <form id="widgetSettingsForm" onSubmit={handleSubmit} className="space-y-6">
            <div>
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">General</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Widget Title</label>
                  <input
                    type="text"
                    name="title"
                    value={formData.title}
                    onChange={handleBaseChange}
                    className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:ring-2 focus:ring-emerald-500 hover:border-emerald-300 outline-none transition-all shadow-sm"
                    required
                  />
                </div>
                <div className="flex space-x-4">
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Width (cols)</label>
                    <input
                      type="number"
                      name="width"
                      min="1"
                      max="12"
                      value={formData.width}
                      onChange={handleBaseChange}
                      className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:ring-2 focus:ring-emerald-500 hover:border-emerald-300 outline-none transition-all shadow-sm"
                      required
                    />
                  </div>
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Height (rows)</label>
                    <input
                      type="number"
                      name="height"
                      min="2"
                      value={formData.height}
                      onChange={handleBaseChange}
                      className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:ring-2 focus:ring-emerald-500 hover:border-emerald-300 outline-none transition-all shadow-sm"
                      required
                    />
                  </div>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4 border-t pt-4">Data Configuration</h3>
              <div className="space-y-4">
                {isChart && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">X-Axis Field (Grouping)</label>
                      <select
                        name="xAxis"
                        value={configParams.xAxis || 'product'}
                        onChange={handleConfigChange}
                        className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:ring-2 focus:ring-emerald-500 hover:border-emerald-300 outline-none transition-all shadow-sm bg-white"
                      >
                        <option value="product">Product</option>
                        <option value="status">Status</option>
                        <option value="city">City</option>
                        <option value="country">Country</option>
                        <option value="createdBy">Sales Rep</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Y-Axis Field (Metrics)</label>
                      <select
                        name="yAxis"
                        value={configParams.yAxis || 'totalAmount'}
                        onChange={handleConfigChange}
                        className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:ring-2 focus:ring-emerald-500 hover:border-emerald-300 outline-none transition-all shadow-sm bg-white"
                      >
                        <option value="totalAmount">Total Amount ($)</option>
                        <option value="quantity">Quantity</option>
                        <option value="unitPrice">Unit Price ($)</option>
                      </select>
                    </div>
                  </>
                )}

                {isKPI && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Metric Field</label>
                    <select
                      name="metric"
                      value={configParams.metric || 'totalAmount'}
                      onChange={handleConfigChange}
                      className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:ring-2 focus:ring-emerald-500 hover:border-emerald-300 outline-none transition-all shadow-sm bg-white"
                    >
                      <option value="totalAmount">Total Revenue</option>
                      <option value="quantity">Total Items Sold</option>
                      <option value="id">Order Count</option>
                    </select>
                  </div>
                )}

                {(isChart || isKPI) && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Aggregation</label>
                    <select
                      name="aggregation"
                      value={configParams.aggregation || 'sum'}
                      onChange={handleConfigChange}
                      className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:ring-2 focus:ring-emerald-500 hover:border-emerald-300 outline-none transition-all shadow-sm bg-white"
                    >
                      <option value="sum">Sum</option>
                      <option value="avg">Average</option>
                      <option value="count">Count</option>
                    </select>
                  </div>
                )}

                {(isChart || isKPI) && (
                  <div>
                    <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4 border-t pt-4">Visual Theme</h3>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Widget Theme Color</label>
                    <div className="flex items-center space-x-3">
                      <input
                        type="color"
                        name="color"
                        value={configParams.color || '#10b981'}
                        onChange={handleConfigChange}
                        className="w-14 h-12 p-1 rounded-lg border border-gray-200 cursor-pointer shadow-sm hover:border-emerald-300 transition-colors"
                      />
                      <span className="text-sm font-mono text-gray-600 bg-gray-50 px-3 py-1.5 rounded border border-gray-100">{configParams.color || '#10b981'}</span>
                    </div>
                  </div>
                )}

                {isTable && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Visible Columns</label>
                      <div className="grid grid-cols-2 gap-2 rounded-xl border border-gray-200 bg-gray-50 p-3">
                        {TABLE_COLUMN_OPTIONS.map((column) => (
                          <label key={column.key} className="flex items-center gap-2 text-sm text-gray-700">
                            <input
                              type="checkbox"
                              checked={selectedColumns.includes(column.key)}
                              onChange={() => handleTableColumnToggle(column.key)}
                              className="h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                            />
                            <span>{column.label}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Rows Per Page</label>
                      <select
                        name="pageSize"
                        value={configParams.pageSize || 10}
                        onChange={handleConfigChange}
                        className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:ring-2 focus:ring-emerald-500 hover:border-emerald-300 outline-none transition-all shadow-sm bg-white"
                      >
                        {TABLE_PAGE_SIZE_OPTIONS.map((pageSize) => (
                          <option key={pageSize} value={pageSize}>{pageSize} rows</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Default Status Filter</label>
                      <select
                        name="statusFilter"
                        value={configParams.statusFilter || 'all'}
                        onChange={handleConfigChange}
                        className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:ring-2 focus:ring-emerald-500 hover:border-emerald-300 outline-none transition-all shadow-sm bg-white"
                      >
                        <option value="all">All statuses</option>
                        <option value="Pending">Pending</option>
                        <option value="In progress">In progress</option>
                        <option value="Completed">Completed</option>
                      </select>
                    </div>
                  </>
                )}
              </div>
            </div>
          </form>
        </div>

        <div className="p-6 border-t border-gray-100 bg-gray-50 flex justify-end space-x-4">
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="px-6 py-2.5 rounded-lg font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 transition-colors shadow-sm disabled:cursor-not-allowed disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="widgetSettingsForm"
            disabled={isSaving}
            className="px-6 py-2.5 rounded-lg font-medium text-white bg-emerald-600 hover:bg-emerald-700 transition-colors shadow-sm disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isSaving ? 'Applying...' : 'Apply Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}
