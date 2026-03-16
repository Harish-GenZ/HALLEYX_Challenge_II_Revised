import { useState } from 'react';
import { X } from 'lucide-react';

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
  positionX: number;
  positionY: number;
  config: WidgetConfig;
}

function getDefaultWidgetConfig(type: string) {
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

export default function WidgetSettingsModal({ 
  widget, 
  onSave, 
  onClose 
}: { 
  widget: Widget, 
  onSave: (updatedWidget: Widget) => void, 
  onClose: () => void 
}) {
  const [formData, setFormData] = useState<Widget>(widget);
  const [configParams, setConfigParams] = useState<WidgetConfig>(() => {
    return {
      ...getDefaultWidgetConfig(widget.type),
      ...(widget.config || {}),
    };
  });

  const handleBaseChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'width' || name === 'height' ? Number(value) : value
    }));
  };

  const handleConfigChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setConfigParams((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      ...formData,
      config: configParams
    });
  };

  const isChart = ['Bar Chart', 'Line Chart', 'Pie Chart'].includes(widget.type);
  const isKPI = widget.type === 'KPI Card';
  const isTable = widget.type === 'Table';

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
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1">
          <form id="widgetSettingsForm" onSubmit={handleSubmit} className="space-y-6">
            
            {/* General Settings */}
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

            {/* Data Settings */}
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
                  <div>
                    <p className="text-sm text-gray-500">
                      The table widget automatically displays the most recent orders. 
                      Further column configuration can be added here.
                    </p>
                  </div>
                )}
                
              </div>
            </div>

          </form>
        </div>

        <div className="p-6 border-t border-gray-100 bg-gray-50 flex justify-end space-x-4">
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2.5 rounded-lg font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 transition-colors shadow-sm"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="widgetSettingsForm"
            className="px-6 py-2.5 rounded-lg font-medium text-white bg-emerald-600 hover:bg-emerald-700 transition-colors shadow-sm"
          >
            Apply Changes
          </button>
        </div>
      </div>
    </div>
  );
}
