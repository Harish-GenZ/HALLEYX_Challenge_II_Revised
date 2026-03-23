import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type React from 'react';
import { Responsive, WidthProvider } from 'react-grid-layout/legacy';
import { Settings, Trash2, GripHorizontal, Layout as LayoutIcon, CheckCircle2, AlertCircle, Menu, X } from 'lucide-react';
import WidgetSettingsModal from './WidgetSettingsModal.tsx';
import WidgetRenderer from '../widgets/WidgetRenderer.tsx';
import { getDefaultWidgetConfig, type WidgetConfig } from './widgetConfig.ts';
import { api, getApiErrorMessage } from '../lib/api.ts';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';

interface RGLLayout {
  i: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

type Breakpoint = 'lg' | 'md' | 'sm';
type LayoutMap = Record<Breakpoint, RGLLayout[]>;
const LAYOUT_BREAKPOINTS: Breakpoint[] = ['lg', 'md', 'sm'];

const ResponsiveGridLayout = WidthProvider(Responsive);
const GRID_BREAKPOINTS: Record<Breakpoint, number> = { lg: 960, md: 640, sm: 0 };
const GRID_COLS: Record<Breakpoint, number> = { lg: 12, md: 8, sm: 1 };
const DEFAULT_WIDGET_WIDTH = 4;
const DEFAULT_WIDGET_HEIGHT = 3;
const WIDGET_TYPES = [
  { type: 'KPI Card', label: 'KPI Card' },
  { type: 'Bar Chart', label: 'Bar Chart' },
  { type: 'Line Chart', label: 'Line Chart' },
  { type: 'Pie Chart', label: 'Pie Chart' },
  { type: 'Table', label: 'Table' }
];

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

function areLayoutsEqual(a: readonly RGLLayout[], b: readonly RGLLayout[]) {
  if (!a || !b) return false;
  if (a.length !== b.length) return false;

  return a.every((item) => {
    const other = b.find((layoutItem) => layoutItem.i === item.i);
    return (
      other &&
      item.x === other.x &&
      item.y === other.y &&
      item.w === other.w &&
      item.h === other.h
    );
  });
}

function createLayoutItem(id: string, x: number, y: number, w: number, h: number, cols: number): RGLLayout {
  const width = Math.max(1, Math.min(w, cols));
  const normalizedX = Number.isFinite(x) ? x : 0;
  const normalizedY = Number.isFinite(y) ? y : 0;

  return {
    i: id,
    x: Math.max(0, Math.min(normalizedX, Math.max(0, cols - width))),
    y: Math.max(0, normalizedY),
    w: width,
    h: Math.max(2, h),
  };
}

function adaptLayoutForCols(layout: readonly RGLLayout[], cols: number): RGLLayout[] {
  return layout.map((item) => createLayoutItem(item.i, item.x, item.y, item.w, item.h, cols));
}

function scaleLayoutBetweenCols(layout: readonly RGLLayout[], fromCols: number, toCols: number): RGLLayout[] {
  if (fromCols === toCols) {
    return adaptLayoutForCols(layout, toCols);
  }

  const ratio = toCols / fromCols;

  return layout.map((item) => {
    const scaledWidth = Math.max(1, Math.min(toCols, Math.round(item.w * ratio)));
    const scaledX = Math.max(0, Math.min(toCols - scaledWidth, Math.round(item.x * ratio)));

    return createLayoutItem(item.i, scaledX, item.y, scaledWidth, item.h, toCols);
  });
}

function createResponsiveLayoutsFromSource(layout: readonly RGLLayout[], sourceBreakpoint: Breakpoint): LayoutMap {
  const sourceCols = GRID_COLS[sourceBreakpoint];
  const compactedSource = compactLayout(layout, sourceCols);
  const lgLayout = sourceBreakpoint === 'lg'
    ? compactLayout(compactedSource, GRID_COLS.lg)
    : compactLayout(scaleLayoutBetweenCols(compactedSource, sourceCols, GRID_COLS.lg), GRID_COLS.lg);

  return {
    lg: lgLayout,
    md: compactLayout(scaleLayoutBetweenCols(lgLayout, GRID_COLS.lg, GRID_COLS.md), GRID_COLS.md),
    sm: compactLayout(scaleLayoutBetweenCols(lgLayout, GRID_COLS.lg, GRID_COLS.sm), GRID_COLS.sm),
  };
}

function createResponsiveLayouts(layout: readonly RGLLayout[]): LayoutMap {
  return createResponsiveLayoutsFromSource(layout, 'lg');
}

function areLayoutMapsEqual(a: LayoutMap, b: LayoutMap) {
  return LAYOUT_BREAKPOINTS.every((breakpoint) => areLayoutsEqual(a[breakpoint], b[breakpoint]));
}

function mergeLayouts(current: LayoutMap, next: Partial<LayoutMap>): LayoutMap {
  return {
    lg: next.lg ? adaptLayoutForCols(next.lg, GRID_COLS.lg) : current.lg,
    md: next.md ? adaptLayoutForCols(next.md, GRID_COLS.md) : current.md,
    sm: next.sm ? adaptLayoutForCols(next.sm, GRID_COLS.sm) : current.sm,
  };
}

function getLayoutBottom(layout: readonly RGLLayout[]) {
  return layout.reduce((max, item) => Math.max(max, item.y + item.h), 0);
}

function doLayoutsCollide(a: RGLLayout, b: RGLLayout) {
  return (
    a.i !== b.i &&
    a.x < b.x + b.w &&
    a.x + a.w > b.x &&
    a.y < b.y + b.h &&
    a.y + a.h > b.y
  );
}

function compactLayout(layout: readonly RGLLayout[], cols: number): RGLLayout[] {
  const sortedLayout = [...layout]
    .map((item) => createLayoutItem(item.i, item.x, item.y, item.w, item.h, cols))
    .sort((a, b) => a.y - b.y || a.x - b.x || a.i.localeCompare(b.i));
  const placedItems: RGLLayout[] = [];

  return sortedLayout.map((item) => {
    const maxY = getLayoutBottom(placedItems) + item.h + 1;

    for (let y = 0; y <= maxY; y += 1) {
      for (let x = 0; x <= cols - item.w; x += 1) {
        const candidate = { ...item, x, y };
        const hasCollision = placedItems.some((placedItem) => doLayoutsCollide(candidate, placedItem));

        if (!hasCollision) {
          placedItems.push(candidate);
          return candidate;
        }
      }
    }

    placedItems.push(item);
    return item;
  });
}

function getDropDimensions(breakpoint: Breakpoint) {
  return {
    w: Math.min(DEFAULT_WIDGET_WIDTH, GRID_COLS[breakpoint]),
    h: DEFAULT_WIDGET_HEIGHT,
  };
}

export default function DashboardBuilder() {
  const initialLayouts = useMemo(() => createResponsiveLayouts([]), []);
  const [dashboardId, setDashboardId] = useState<number | null>(null);
  const [widgets, setWidgets] = useState<Widget[]>([]);
  const [orders, setOrders] = useState<DashboardOrder[]>([]);
  const [layouts, setLayouts] = useState<LayoutMap>(initialLayouts);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [widgetSettingsSaving, setWidgetSettingsSaving] = useState(false);
  const [editingWidget, setEditingWidget] = useState<Widget | null>(null);
  const [dateRange, setDateRange] = useState('all');
  const [loadingWidgets, setLoadingWidgets] = useState<string[]>([]);
  const [isConfigMode, setIsConfigMode] = useState(false);
  const [toastMsg, setToastMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [currentBreakpoint, setCurrentBreakpoint] = useState<Breakpoint>('lg');
  const [draggingWidgetType, setDraggingWidgetType] = useState<string | null>(null);
  const layoutsRef = useRef<LayoutMap>(initialLayouts);

  const filteredOrders = useMemo(() => {
    if (dateRange === 'all') return orders;

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    return orders.filter((order) => {
      if (!order.createdAt) return true;
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

  const activeDropDimensions = useMemo(
    () => getDropDimensions(currentBreakpoint),
    [currentBreakpoint]
  );

  const droppingItem = useMemo(
    () => draggingWidgetType ? { i: '__dropping__', x: 0, y: 0, ...activeDropDimensions } : undefined,
    [activeDropDimensions, draggingWidgetType]
  );
  const handleDropDragOver = useCallback(
    () => draggingWidgetType ? activeDropDimensions : false,
    [activeDropDimensions, draggingWidgetType]
  );

  useEffect(() => {
    fetchDashboard();
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      const response = await api.get('/orders');
      setOrders(response.data);
    } catch (error) {
      console.error('Failed to fetch orders', error);
      setLoadError((current) => current ?? getApiErrorMessage(error, 'dashboard data'));
    }
  };

  const fetchDashboard = async () => {
    try {
      setLoadError(null);
      const response = await api.get<DashboardResponse>('/dashboard');
      setDashboardId(response.data.id);

      const loadedWidgets = response.data.widgets.map((widgetRecord) => ({
        id: widgetRecord.id.toString(),
        type: widgetRecord.type,
        title: widgetRecord.title,
        width: widgetRecord.width,
        height: widgetRecord.height,
        positionX: widgetRecord.positionX,
        positionY: widgetRecord.positionY,
        config: {
          ...getDefaultWidgetConfig(widgetRecord.type),
          ...(widgetRecord.config || {}),
        }
      }));

      setWidgets(loadedWidgets);

      const lgLayout = loadedWidgets.map((widget) => createLayoutItem(
        widget.id,
        widget.positionX,
        widget.positionY,
        widget.width,
        widget.height,
        GRID_COLS.lg
      ));

      const nextLayouts = createResponsiveLayouts(lgLayout);
      layoutsRef.current = nextLayouts;
      setLayouts(nextLayouts);
    } catch (error) {
      console.error('Failed to load dashboard', error);
      setLoadError(getApiErrorMessage(error, 'dashboard'));
    } finally {
      setLoading(false);
    }
  };

  const addWidgetAtPosition = (type: string, x: number, y: number) => {
    const newId = `temp_${Date.now()}`;
    const normalizedY = Number.isFinite(y) ? y : getLayoutBottom(layoutsRef.current.lg);
    const lgLayoutItem = createLayoutItem(
      newId,
      x,
      normalizedY,
      DEFAULT_WIDGET_WIDTH,
      DEFAULT_WIDGET_HEIGHT,
      GRID_COLS.lg
    );

    const newWidget: Widget = {
      id: newId,
      type,
      title: `${type} Title`,
      width: lgLayoutItem.w,
      height: lgLayoutItem.h,
      positionX: lgLayoutItem.x,
      positionY: lgLayoutItem.y,
      config: getDefaultWidgetConfig(type)
    };

    setWidgets((prev) => [...prev, newWidget]);

    const nextLayouts: LayoutMap = {
      lg: [...layoutsRef.current.lg, lgLayoutItem],
      md: [...layoutsRef.current.md, createLayoutItem(newId, lgLayoutItem.x, lgLayoutItem.y, lgLayoutItem.w, lgLayoutItem.h, GRID_COLS.md)],
      sm: [...layoutsRef.current.sm, createLayoutItem(newId, lgLayoutItem.x, lgLayoutItem.y, lgLayoutItem.w, lgLayoutItem.h, GRID_COLS.sm)],
    };
    layoutsRef.current = nextLayouts;
    setLayouts(nextLayouts);

    setLoadingWidgets((prev) => [...prev, newId]);
    setTimeout(() => {
      setLoadingWidgets((prev) => prev.filter((widgetId) => widgetId !== newId));
    }, 1200);
  };

  const handleDragStart = (e: React.DragEvent, type: string) => {
    e.dataTransfer.setData('text/plain', type);
    e.dataTransfer.setData('widgetType', type);
    e.dataTransfer.effectAllowed = 'copy';
    setDraggingWidgetType(type);
  };

  const handleSidebarDragEnd = () => {
    setDraggingWidgetType(null);
  };

  const handleGridDrop = (_layout: readonly RGLLayout[], item?: RGLLayout) => {
    if (!draggingWidgetType) {
      return;
    }

    addWidgetAtPosition(
      draggingWidgetType,
      item?.x ?? 0,
      item?.y ?? getLayoutBottom(layoutsRef.current.lg)
    );
    setDraggingWidgetType(null);
  };

  const syncLayoutState = (currentLayout: readonly RGLLayout[], breakpoint: Breakpoint) => {
    const nextLayout = adaptLayoutForCols(currentLayout, GRID_COLS[breakpoint]);
    const nextLayouts: LayoutMap = {
      ...layoutsRef.current,
      [breakpoint]: nextLayout,
    };
    if (!areLayoutMapsEqual(layoutsRef.current, nextLayouts)) {
      layoutsRef.current = nextLayouts;
      setLayouts(nextLayouts);
    }

    if (breakpoint !== 'lg') {
      return;
    }

    setWidgets((prev) => {
      let changed = false;

      const nextWidgets = prev.map((widget) => {
        const layoutItem = nextLayout.find((item) => item.i === widget.id);
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

    const nextLayouts = mergeLayouts(layoutsRef.current, allLayouts);
    if (!areLayoutMapsEqual(layoutsRef.current, nextLayouts)) {
      layoutsRef.current = nextLayouts;
    }
  };

  const handleRemoveWidget = (id: string) => {
    setWidgets((prev) => prev.filter((widget) => widget.id !== id));
    const nextLayouts: LayoutMap = {
      lg: layoutsRef.current.lg.filter((layoutItem) => layoutItem.i !== id),
      md: layoutsRef.current.md.filter((layoutItem) => layoutItem.i !== id),
      sm: layoutsRef.current.sm.filter((layoutItem) => layoutItem.i !== id),
    };
    layoutsRef.current = nextLayouts;
    setLayouts(nextLayouts);
  };

  const persistWidgets = async (widgetsToPersist: Widget[], successText: string) => {
    if (!dashboardId) {
      setToastMsg({ type: 'error', text: 'Dashboard unavailable' });
      setTimeout(() => setToastMsg(null), 3000);
      return false;
    }

    setSaving(true);
    try {
      await api.post(`/dashboard/${dashboardId}/widgets`, {
        widgets: widgetsToPersist
      });
      setToastMsg({ type: 'success', text: successText });
      setTimeout(() => setToastMsg(null), 3000);
      return true;
    } catch (error) {
      console.error('Failed to save dashboard', error);
      setToastMsg({ type: 'error', text: 'Save Failed' });
      setTimeout(() => setToastMsg(null), 3000);
      return false;
    } finally {
      setSaving(false);
    }
  };

  const handleSaveLayout = async () => {
    const normalizedLayouts = isConfigMode
      ? createResponsiveLayoutsFromSource(layoutsRef.current[currentBreakpoint], currentBreakpoint)
      : layoutsRef.current;
    const normalizedWidgets = widgets.map((widget) => {
      const layoutItem = normalizedLayouts.lg.find((item) => item.i === widget.id);
      if (!layoutItem) {
        return widget;
      }

      return {
        ...widget,
        positionX: layoutItem.x,
        positionY: layoutItem.y,
        width: layoutItem.w,
        height: layoutItem.h,
      };
    });

    if (!areLayoutMapsEqual(layoutsRef.current, normalizedLayouts)) {
      layoutsRef.current = normalizedLayouts;
      setLayouts(normalizedLayouts);
    }

    await persistWidgets(normalizedWidgets, 'Layout Saved!');
  };

  const finalizeConfiguration = () => {
    const finalizedLayouts = createResponsiveLayoutsFromSource(
      layoutsRef.current[currentBreakpoint],
      currentBreakpoint
    );
    const finalizedLgLayout = finalizedLayouts.lg;

    layoutsRef.current = finalizedLayouts;
    setLayouts(finalizedLayouts);
    setWidgets((prev) => prev.map((widget) => {
      const layoutItem = finalizedLgLayout.find((item) => item.i === widget.id);
      if (!layoutItem) {
        return widget;
      }

      return {
        ...widget,
        positionX: layoutItem.x,
        positionY: layoutItem.y,
        width: layoutItem.w,
        height: layoutItem.h,
      };
    }));
    setMobileMenuOpen(false);
    setIsConfigMode(false);
  };

  const addWidgetToEnd = (type: string) => {
    addWidgetAtPosition(type, 0, getLayoutBottom(layoutsRef.current.lg));
    setMobileMenuOpen(false);
  };

  const handleSaveWidgetSettings = async (updatedWidget: Widget) => {
    const nextWidget = {
      ...updatedWidget,
      config: {
        ...getDefaultWidgetConfig(updatedWidget.type),
        ...(updatedWidget.config || {}),
      }
    };

    const previousWidgets = widgets;
    const previousLayouts = layoutsRef.current;
    const nextWidgets = widgets.map((widget) => widget.id === nextWidget.id ? nextWidget : widget);
    const nextLayouts: LayoutMap = {
      lg: layoutsRef.current.lg.map((layoutItem) => layoutItem.i === nextWidget.id
        ? createLayoutItem(nextWidget.id, layoutItem.x, layoutItem.y, nextWidget.width, nextWidget.height, GRID_COLS.lg)
        : layoutItem),
      md: layoutsRef.current.md.map((layoutItem) => layoutItem.i === nextWidget.id
        ? createLayoutItem(nextWidget.id, layoutItem.x, layoutItem.y, nextWidget.width, nextWidget.height, GRID_COLS.md)
        : layoutItem),
      sm: layoutsRef.current.sm.map((layoutItem) => layoutItem.i === nextWidget.id
        ? createLayoutItem(nextWidget.id, layoutItem.x, layoutItem.y, nextWidget.width, nextWidget.height, GRID_COLS.sm)
        : layoutItem),
    };

    setWidgets(nextWidgets);
    layoutsRef.current = nextLayouts;
    setLayouts(nextLayouts);
    setWidgetSettingsSaving(true);

    const saved = await persistWidgets(nextWidgets, 'Widget updated');
    setWidgetSettingsSaving(false);

    if (saved) {
      setEditingWidget(null);
      return;
    }

    setWidgets(previousWidgets);
    layoutsRef.current = previousLayouts;
    setLayouts(previousLayouts);
  };

  if (loading) return <div className="p-8">Loading Dashboard...</div>;

  return (
    <div className="flex h-full bg-slate-50 relative overflow-hidden">
      {isConfigMode && mobileMenuOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40 lg:hidden" onClick={() => setMobileMenuOpen(false)}></div>
      )}

      {isConfigMode && (
        <div className={`fixed lg:relative top-0 w-[85vw] max-w-[280px] lg:w-72 bg-white border-r border-gray-200 p-6 flex flex-col h-full shrink-0 transition-transform duration-300 shadow-[2px_0_8px_-3px_rgba(0,0,0,0.1)] z-50 lg:z-20 ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Widget Library</h3>
            <button className="lg:hidden text-gray-400" onClick={() => setMobileMenuOpen(false)}>
              <X size={20} />
            </button>
          </div>
          <p className="text-sm text-gray-500 mb-6 hidden lg:block">Drag widgets onto the grid</p>
          <p className="text-sm text-gray-500 mb-6 lg:hidden">Click widgets to add</p>
          <div className="space-y-3 overflow-y-auto">
            {WIDGET_TYPES.map((widgetType) => (
              <div
                key={widgetType.type}
                draggable={window.innerWidth >= 1024}
                onClick={() => {
                  if (window.innerWidth < 1024) addWidgetToEnd(widgetType.type);
                }}
                onDragStart={(e) => handleDragStart(e, widgetType.type)}
                onDragEnd={handleSidebarDragEnd}
                className="px-4 py-3 bg-white text-gray-700 rounded-xl border border-gray-200 flex items-center justify-between cursor-pointer lg:cursor-grab hover:border-emerald-500 hover:shadow-md hover:text-emerald-700 transition-all group"
              >
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:bg-emerald-100 transition-colors">
                    <LayoutIcon size={16} />
                  </div>
                  <span className="font-medium text-sm">{widgetType.label}</span>
                </div>
                <GripHorizontal size={18} className="text-gray-300 group-hover:text-emerald-500 transition-colors flex-shrink-0 hidden lg:block" />
              </div>
            ))}
          </div>

         
        </div>
      )}

      <div className="flex-1 overflow-auto flex flex-col relative w-full">
        <div className="sticky top-0 z-[60] bg-white/80 backdrop-blur-md border-b border-gray-200 px-4 md:px-8 py-4 flex flex-col lg:flex-row justify-between items-start lg:items-center space-y-4 lg:space-y-0">
          <div className="flex items-center justify-between w-full lg:w-auto">
            <div className="flex items-center space-x-3">
              {isConfigMode && (
                <button className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg mr-2" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
                  <Menu size={20} />
                </button>
              )}
              <div>
                <div className="flex items-center space-x-3">
                  <h2 className="text-xl md:text-2xl font-bold text-gray-900 truncate">Dashboard</h2>
                  {toastMsg && (
                    <div className={`hidden sm:flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-bold animate-in fade-in slide-in-from-left-2 duration-300 ${toastMsg?.type === 'success'
                      ? 'bg-emerald-100 text-emerald-700'
                      : 'bg-rose-100 text-rose-700'
                      }`}>
                      {toastMsg?.type === 'success' ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}
                      <span>{toastMsg?.text}</span>
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
              onClick={() => {
                if (isConfigMode) {
                  finalizeConfiguration();
                  return;
                }

                setIsConfigMode(true);
              }}
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

        <div className="p-4 min-h-screen">
          {loadError && (
            <div className="mb-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 shadow-sm">
              {loadError}
            </div>
          )}
          <ResponsiveGridLayout
            className={`layout ${isConfigMode ? 'config-mode' : ''}`}
            style={{ minHeight: 'calc(100vh - 150px)' }}
            layouts={layouts}
            breakpoints={GRID_BREAKPOINTS}
            cols={GRID_COLS}
            rowHeight={currentBreakpoint === 'sm' ? 65 : 100}
            compactType="vertical"
            preventCollision={false}
            onBreakpointChange={(newBreakpoint) => setCurrentBreakpoint(newBreakpoint as Breakpoint)}
            onLayoutChange={handleLayoutChange}
            onDragStop={handleLayoutCommit}
            onResizeStop={handleLayoutCommit}
            onDrop={handleGridDrop}
            onDropDragOver={handleDropDragOver}
            isDroppable={isConfigMode}
            droppingItem={droppingItem}
            isDraggable={isConfigMode}
            isResizable={isConfigMode}
            useCSSTransforms={true}
          >
            {widgets.map((widget) => {
              return (
                <div key={widget.id} className="bg-white rounded-xl shadow-md border border-gray-100 flex flex-col group transition-all duration-200 hover:shadow-lg relative hover:z-50">
                  <div className={`bg-white rounded-t-xl border-b border-gray-100 px-4 md:px-5 py-2.5 md:py-3 flex justify-between items-center transition-colors ${isConfigMode ? 'cursor-move group-hover:bg-slate-50' : ''}`}>
                    <h4 className="text-sm md:text-base font-semibold text-gray-800 truncate pr-2">{widget.title}</h4>
                    {isConfigMode && (
                      <div className="flex space-x-2 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 lg:group-focus-within:opacity-100 transition-opacity duration-200">
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
                      <div className="absolute inset-0 z-10 flex h-full w-full items-center justify-center bg-[radial-gradient(circle_at_top,_rgba(16,185,129,0.12),_transparent_55%),linear-gradient(180deg,rgba(255,255,255,0.96),rgba(248,250,252,0.94))] backdrop-blur-sm">
                        <div className="w-[min(260px,85%)] rounded-2xl border border-emerald-100 bg-white/90 p-5 shadow-[0_24px_50px_-24px_rgba(16,185,129,0.45)]">
                          <div className="flex items-center gap-3">
                            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
                              <div className="h-5 w-5 rounded-full border-2 border-emerald-200 border-t-emerald-600 animate-spin"></div>
                            </div>
                            <div className="min-w-0">
                              <p className="truncate text-sm font-semibold text-gray-800">Preparing {widget.type}</p>
                              <p className="text-xs text-gray-500">Rendering data and layout controls...</p>
                            </div>
                          </div>
                          <div className="mt-4 space-y-2">
                            <div className="h-2.5 w-2/3 animate-pulse rounded-full bg-emerald-100"></div>
                            <div className="h-2.5 w-full animate-pulse rounded-full bg-gray-100"></div>
                            <div className="h-2.5 w-4/5 animate-pulse rounded-full bg-gray-100"></div>
                          </div>
                        </div>
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
              ...(editingWidget?.config || {}),
            }
          } as any}
          onSave={handleSaveWidgetSettings}
          isSaving={widgetSettingsSaving}
          onClose={() => setEditingWidget(null)}
        />
      )}
    </div>
  );
}
