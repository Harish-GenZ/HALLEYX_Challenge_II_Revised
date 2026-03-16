import { useState, useEffect, useMemo, useRef } from 'react';
import type React from 'react';
import { Responsive, WidthProvider } from 'react-grid-layout/legacy';
// Define the layout interface locally to bypass broken library exports
interface RGLLayout {
  i: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

type Breakpoint = 'lg' | 'md' | 'sm' | 'xs' | 'xxs';
type LayoutMap = Record<Breakpoint, RGLLayout[]>;

import axios from 'axios';
import { Settings, Trash2, GripHorizontal, Layout as LayoutIcon, CheckCircle2, AlertCircle, Menu, X } from 'lucide-react';
import WidgetSettingsModal from './WidgetSettingsModal.tsx';
import WidgetRenderer from '../widgets/WidgetRenderer.tsx';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';

const ResponsiveGridLayout = WidthProvider(Responsive);
const BREAKPOINTS: Breakpoint[] = ['lg', 'md', 'sm', 'xs', 'xxs'];
const WIDGET_TYPES = [
  { type: 'KPI Card', label: 'KPI Card' },
  { type: 'Bar Chart', label: 'Bar Chart' },
  { type: 'Line Chart', label: 'Line Chart' },
  { type: 'Pie Chart', label: 'Pie Chart' },
  { type: 'Table', label: 'Table' }
];

interface WidgetConfig {
  type?: string;
  xAxis?: string;
  yAxis?: string;
  metric?: string;
  aggregation?: string;
  color?: string;
}

interface Widget {
  id: string; // Used for RGL and frontend mapping
  type: string;
  title: string;
  width: number;
  height: number;
  positionX: number;
  positionY: number;
  config: WidgetConfig;
}

interface DashboardWidgetRecord {
  id: number;
  type: string;
  title: string;
  width: number;
  height: number;
  positionX: number;
  positionY: number;
  config?: WidgetConfig;
}

interface DashboardResponse {
  id: number;
  widgets: DashboardWidgetRecord[];
}

interface DashboardOrder {
  id: number;
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

function areLayoutsEqual(a: readonly RGLLayout[], b: readonly RGLLayout[]) {
  if (!a || !b) return false;
  if (a.length !== b.length) return false;

  return a.every((item) => {
    const other = b.find(l => l.i === item.i);
    return (
      other &&
      item.x === other.x &&
      item.y === other.y &&
      item.w === other.w &&
      item.h === other.h
    );
  });
}

function cloneLayout(layout: readonly RGLLayout[]): RGLLayout[] {
  return layout.map((item) => ({ ...item }));
}

function createResponsiveLayouts(layout: readonly RGLLayout[]): LayoutMap {
  return BREAKPOINTS.reduce((acc, breakpoint) => {
    acc[breakpoint] = cloneLayout(layout);
    return acc;
  }, {} as LayoutMap);
}

function mergeLayouts(current: LayoutMap, next: Partial<LayoutMap>): LayoutMap {
  return {
    lg: next.lg ? cloneLayout(next.lg) : current.lg,
    md: next.md ? cloneLayout(next.md) : current.md,
    sm: next.sm ? cloneLayout(next.sm) : current.sm,
    xs: next.xs ? cloneLayout(next.xs) : current.xs,
    xxs: next.xxs ? cloneLayout(next.xxs) : current.xxs,
  };
}

export default function DashboardBuilder() {
  const [dashboardId, setDashboardId] = useState<number | null>(null);
  const [widgets, setWidgets] = useState<Widget[]>([]);
  const [orders, setOrders] = useState<DashboardOrder[]>([]);
  const [layouts, setLayouts] = useState<LayoutMap>(createResponsiveLayouts([]));
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingWidget, setEditingWidget] = useState<Widget | null>(null);
  const [dateRange, setDateRange] = useState('all');
  const [loadingWidgets, setLoadingWidgets] = useState<string[]>([]);
  const [isConfigMode, setIsConfigMode] = useState(false);
  const [toastMsg, setToastMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [currentBreakpoint, setCurrentBreakpoint] = useState<Breakpoint>('lg');
  const canvasRef = useRef<HTMLDivElement | null>(null);

  const filteredOrders = useMemo(() => {
    if (dateRange === 'all') return orders;

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    return orders.filter(order => {
      if (!order.createdAt) return true; // fallback if no date
      const orderDate = new Date(order.createdAt);

      if (dateRange === 'today') {
        return orderDate >= startOfToday;
      }

      const diffTime = now.getTime() - orderDate.getTime();
      const diffDays = diffTime / (1000 * 60 * 60 * 24);

      if (dateRange === '7') return diffDays <= 7;
      if (dateRange === '30') return diffDays <= 30;
      if (dateRange === '90') return diffDays <= 90;

      return true;
    });
  }, [orders, dateRange]);

  useEffect(() => {
    fetchDashboard();
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      const response = await axios.get('http://localhost:5000/orders');
      setOrders(response.data);
    } catch (error) {
      console.error('Failed to fetch orders', error);
    }
  };

  const fetchDashboard = async () => {
    try {
      const response = await axios.get<DashboardResponse>('http://localhost:5000/dashboard');
      setDashboardId(response.data.id);

      const loadedWidgets = response.data.widgets.map((w) => ({
        id: w.id.toString(), // Convert DB ID to string for layout key
        type: w.type,
        title: w.title,
        width: w.width,
        height: w.height,
        positionX: w.positionX,
        positionY: w.positionY,
        config: {
          ...getDefaultWidgetConfig(w.type),
          ...(w.config || {}),
        }
      }));
      setWidgets(loadedWidgets);

      const lgLayout = loadedWidgets.map((w: Widget) => ({
        i: w.id,
        x: w.positionX,
        y: w.positionY,
        w: w.width,
        h: w.height
      }));

      setLayouts(createResponsiveLayouts(lgLayout));
    } catch (error) {
      console.error('Failed to load dashboard', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDragStart = (e: React.DragEvent, type: string) => {
    e.dataTransfer.setData('text/plain', type);
    e.dataTransfer.setData('widgetType', type);
    e.dataTransfer.effectAllowed = 'copy';
  };

  const addWidgetAtPosition = (type: string, x: number, y: number) => {
    const newId = `temp_${Date.now()}`;
    const newWidget: Widget = {
      id: newId,
      type,
      title: `${type} Title`,
      width: 4,
      height: 3,
      positionX: x,
      positionY: y,
      config: getDefaultWidgetConfig(type)
    };

    setWidgets(prev => [...prev, newWidget]);

    setLayouts((prev) => ({
      ...prev,
      lg: [...prev.lg, { i: newId, x, y, w: 4, h: 3 }],
      md: [...prev.md, { i: newId, x, y, w: Math.min(4, 10), h: 3 }],
      sm: [...prev.sm, { i: newId, x, y, w: Math.min(4, 6), h: 3 }],
      xs: [...prev.xs, { i: newId, x: 0, y, w: Math.min(4, 4), h: 3 }],
      xxs: [...prev.xxs, { i: newId, x: 0, y, w: Math.min(2, 2), h: 3 }]
    }));

    setLoadingWidgets(prev => [...prev, newId]);
    setTimeout(() => {
      setLoadingWidgets(prev => prev.filter(id => id !== newId));
    }, 1200);
  };

  const handleCanvasDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  };

  const handleCanvasDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();

    const type = e.dataTransfer.getData('widgetType');
    if (!type || !canvasRef.current) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const relativeX = Math.max(0, e.clientX - rect.left - 16);
    const relativeY = Math.max(0, e.clientY - rect.top - 16);
    const gridWidth = rect.width - 32;
    const colWidth = gridWidth > 0 ? gridWidth / 12 : 1;

    const x = Math.max(0, Math.min(8, Math.floor(relativeX / colWidth)));
    const y = Math.max(
      0,
      Math.floor(relativeY / 110)
    );

    addWidgetAtPosition(type, x, y);
  };

  const syncLayoutState = (currentLayout: readonly RGLLayout[], breakpoint: Breakpoint) => {
    const nextLayout = cloneLayout(currentLayout);

    setLayouts((prev) => {
      const currentBreakpointLayout = prev[breakpoint] || [];
      if (areLayoutsEqual(currentBreakpointLayout, nextLayout)) {
        return prev;
      }
      return { ...prev, [breakpoint]: nextLayout };
    });

    if (breakpoint !== 'lg') {
      return;
    }

    setWidgets(prev => {
      let changed = false;

      const nextWidgets = prev.map(widget => {
        const layoutItem = nextLayout.find(l => l.i === widget.id);
        if (!layoutItem) {
          return widget;
        }

        if (
          widget.positionX === layoutItem.x &&
          widget.positionY === layoutItem.y &&
          widget.width === layoutItem.w &&
          widget.height === layoutItem.h
        ) {
          return widget;
        }

        changed = true;
        return {
          ...widget,
          positionX: layoutItem.x,
          positionY: layoutItem.y,
          width: layoutItem.w,
          height: layoutItem.h
        };
      });

      return changed ? nextWidgets : prev;
    });
  };

  const handleLayoutCommit = (currentLayout: readonly RGLLayout[]) => {
    if (!isConfigMode) {
      return;
    }
    syncLayoutState(currentLayout, currentBreakpoint);
  };

  const handleLayoutChange = (_currentLayout: readonly RGLLayout[], allLayouts: Partial<LayoutMap>) => {
    if (!isConfigMode) {
      return;
    }

    setLayouts((prev) => mergeLayouts(prev, allLayouts));
  };

  const handleRemoveWidget = (id: string) => {
    setWidgets(prev => prev.filter(w => w.id !== id));
    setLayouts((prev) => ({
      lg: prev.lg.filter((l) => l.i !== id),
      md: prev.md.filter((l) => l.i !== id),
      sm: prev.sm.filter((l) => l.i !== id),
      xs: prev.xs.filter((l) => l.i !== id),
      xxs: prev.xxs.filter((l) => l.i !== id),
    }));
  };

  const handleSaveLayout = async () => {
    if (!dashboardId) return;
    setSaving(true);
    try {
      await axios.post(`http://localhost:5000/dashboard/${dashboardId}/widgets`, {
        widgets: widgets
      });
      setToastMsg({ type: 'success', text: 'Layout Saved!' });
      setTimeout(() => setToastMsg(null), 3000);
    } catch (error) {
      console.error('Failed to save dashboard', error);
      setToastMsg({ type: 'error', text: 'Save Failed' });
      setTimeout(() => setToastMsg(null), 3000);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveWidgetSettings = (updatedWidget: Widget) => {
    setWidgets(prev => prev.map(w => w.id === updatedWidget.id ? {
      ...updatedWidget,
      config: {
        ...getDefaultWidgetConfig(updatedWidget.type),
        ...(updatedWidget.config || {}),
      }
    } : w));

    // Also update RGL Layout immediately to reflect size changes if width/height changed
    setLayouts((prev) => ({
      lg: prev.lg.map((l) => l.i === updatedWidget.id ? { ...l, w: updatedWidget.width, h: updatedWidget.height } : l),
      md: prev.md.map((l) => l.i === updatedWidget.id ? { ...l, w: Math.min(updatedWidget.width, 10), h: updatedWidget.height } : l),
      sm: prev.sm.map((l) => l.i === updatedWidget.id ? { ...l, w: Math.min(updatedWidget.width, 6), h: updatedWidget.height } : l),
      xs: prev.xs.map((l) => l.i === updatedWidget.id ? { ...l, w: Math.min(updatedWidget.width, 4), h: updatedWidget.height } : l),
      xxs: prev.xxs.map((l) => l.i === updatedWidget.id ? { ...l, w: Math.min(updatedWidget.width, 2), h: updatedWidget.height } : l),
    }));

    setEditingWidget(null);
  };

  if (loading) return <div className="p-8">Loading Dashboard...</div>;

  return (
    <div className="flex h-full bg-slate-50 relative overflow-hidden">
      {/* Sidebar Overlay on Mobile */}
      {isConfigMode && mobileMenuOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40 lg:hidden" onClick={() => setMobileMenuOpen(false)}></div>
      )}

      {/* Sidebar */}
      {isConfigMode && (
        <div className={`fixed lg:relative top-0 w-72 bg-white border-r border-gray-200 p-6 flex flex-col h-full shrink-0 transition-transform duration-300 shadow-[2px_0_8px_-3px_rgba(0,0,0,0.1)] z-50 lg:z-20 ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Widget Library</h3>
            <button className="lg:hidden text-gray-400" onClick={() => setMobileMenuOpen(false)}>
              <X size={20} />
            </button>
          </div>
          <p className="text-sm text-gray-500 mb-6 hidden lg:block">Drag widgets onto the grid</p>
          <p className="text-sm text-gray-500 mb-6 lg:hidden">Click widgets to add</p>
          <div className="space-y-3 overflow-y-auto">
            {WIDGET_TYPES.map(widget => (
              <div
                key={widget.type}
                draggable
                onClick={() => {
                  if (window.innerWidth < 1024) addWidgetAtPosition(widget.type, 0, Infinity);
                }}
                onDragStart={(e) => handleDragStart(e, widget.type)}
                className="px-4 py-3 bg-white text-gray-700 rounded-xl border border-gray-200 flex items-center justify-between cursor-pointer lg:cursor-grab hover:border-emerald-500 hover:shadow-md hover:text-emerald-700 transition-all group"
              >
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:bg-emerald-100 transition-colors">
                    <LayoutIcon size={16} />
                  </div>
                  <span className="font-medium text-sm">{widget.label}</span>
                </div>
                <GripHorizontal size={18} className="text-gray-300 group-hover:text-emerald-500 transition-colors flex-shrink-0 hidden lg:block" />
              </div>
            ))}
          </div>

          <div className="mt-auto pt-6 border-t border-gray-100">
            <p className="text-[10px] uppercase tracking-widest text-gray-400 font-bold mb-1">Author</p>
            <p className="text-xs text-gray-600 font-medium leading-relaxed">done by Balaharish alais yogesh N with the genre</p>
          </div>
        </div>
      )}

      {/* Main Grid Area */}
      <div className="flex-1 overflow-auto flex flex-col relative w-full">
        <div className="sticky top-0 z-[60] bg-white/80 backdrop-blur-md border-b border-gray-200 px-4 md:px-8 py-4 flex flex-col lg:flex-row justify-between items-start lg:items-center space-y-4 lg:space-y-0">
          <div className="flex items-center justify-between w-full lg:w-auto">
            <div className="flex items-center space-x-3">
              {isConfigMode && (
                <button className="lg:hidden p-2 text-gray-600 hover:bg-gray-100 rounded-lg mr-2" onClick={() => setMobileMenuOpen(true)}>
                  <Menu size={20} />
                </button>
              )}
              <div>
                <div className="flex items-center space-x-3">
                  <h2 className="text-xl md:text-2xl font-bold text-gray-900 truncate">Dashboard</h2>
                  {toastMsg && (
                    <div className={`hidden sm:flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-bold animate-in fade-in slide-in-from-left-2 duration-300 ${toastMsg.type === 'success'
                      ? 'bg-emerald-100 text-emerald-700'
                      : 'bg-rose-100 text-rose-700'
                      }`}>
                      {toastMsg.type === 'success' ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}
                      <span>{toastMsg.text}</span>
                    </div>
                  )}
                </div>
                <p className="text-xs md:text-sm text-gray-500 mt-1">View metrics and widgets.</p>
              </div>
            </div>
          </div>
          <div className="flex flex-wrap gap-3 items-center w-full lg:w-auto">
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              className="px-4 py-2.5 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 shadow-sm focus:ring-2 focus:ring-emerald-500 hover:border-gray-400 outline-none transition-all cursor-pointer"
            >
              <option value="all">All time</option>
              <option value="today">Today</option>
              <option value="7">Last 7 Days</option>
              <option value="30">Last 30 Days</option>
              <option value="90">Last 90 Days</option>
            </select>
            <button
              onClick={() => setIsConfigMode(!isConfigMode)}
              className="px-5 py-2.5 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 hover:text-gray-900 transition-all"
            >
              {isConfigMode ? 'Done Configuring' : 'Configure Dashboard'}
            </button>
            {isConfigMode && (
              <button
                onClick={handleSaveLayout}
                disabled={saving}
                className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-lg font-medium shadow-sm transition-all disabled:opacity-70 flex items-center"
              >
                {saving ? 'Saving...' : 'Save Layout'}
              </button>
            )}
          </div>
        </div>

        <div
          ref={canvasRef}
          className="p-4 min-h-screen"
          onDragOver={handleCanvasDragOver}
          onDrop={handleCanvasDrop}
        >
          <ResponsiveGridLayout
            className={`layout ${isConfigMode ? 'config-mode' : ''}`}
            style={{ minHeight: 'calc(100vh - 150px)' }}
            layouts={layouts}
            breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }}
            cols={{ lg: 12, md: 10, sm: 6, xs: 4, xxs: 2 }}
            rowHeight={100}
            onBreakpointChange={(newBreakpoint) => setCurrentBreakpoint(newBreakpoint as Breakpoint)}
            onLayoutChange={handleLayoutChange}
            onDragStop={handleLayoutCommit}
            onResizeStop={handleLayoutCommit}
            isDraggable={isConfigMode}
            isResizable={isConfigMode}
            useCSSTransforms={true}
          >
            {layouts.lg.map((l) => {
              const widget = widgets.find(w => w.id === l.i);
              if (!widget) return <div key={l.i}></div>;

              return (
                <div key={l.i} className="bg-white rounded-xl shadow-md border border-gray-100 flex flex-col group transition-all duration-200 hover:shadow-lg relative hover:z-50">
                  <div className={`bg-white rounded-t-xl border-b border-gray-100 px-4 md:px-5 py-2.5 md:py-3 flex justify-between items-center transition-colors ${isConfigMode ? 'cursor-move group-hover:bg-slate-50' : ''}`}>
                    <h4 className="text-sm md:text-base font-semibold text-gray-800 truncate pr-2">{widget.title}</h4>
                    {isConfigMode && (
                      <div className="flex space-x-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                        <button onClick={(e) => { e.stopPropagation(); setEditingWidget(widget); }} className="p-1.5 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors" title="Settings">
                          <Settings size={16} />
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); handleRemoveWidget(widget.id); }} className="p-1.5 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors" title="Remove">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    )}
                  </div>
                  <div className="flex-1 p-4 bg-white rounded-b-xl overflow-visible relative" onPointerDownCapture={(e) => e.stopPropagation()}>
                    {loadingWidgets.includes(widget.id) && (
                      <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-50/80 backdrop-blur-sm z-10 w-full h-full">
                        <div className="w-8 h-8 rounded-full border-4 border-emerald-100 border-t-emerald-600 animate-spin mb-3"></div>
                        <span className="text-sm font-medium text-gray-500 animate-pulse">Initializing widget...</span>
                      </div>
                    )}
                    <WidgetRenderer widget={widget} orders={filteredOrders} />
                  </div>
                </div>
              );
            })}
          </ResponsiveGridLayout>

          {widgets.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none px-64">
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-50 mb-4 text-emerald-500 border border-emerald-100">
                  <LayoutIcon size={32} />
                </div>
                <h3 className="text-lg font-medium text-gray-900">Your dashboard is empty</h3>
                <p className="mt-2 text-sm text-gray-500 max-w-sm mx-auto">Click "Configure Dashboard" and drag widgets from the sidebar to start building.</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {editingWidget && (
        <WidgetSettingsModal
          widget={{
            ...editingWidget,
            config: {
              ...getDefaultWidgetConfig(editingWidget.type),
              ...(editingWidget.config || {}),
            }
          }}
          onSave={handleSaveWidgetSettings}
          onClose={() => setEditingWidget(null)}
        />
      )}
    </div>
  );
}
