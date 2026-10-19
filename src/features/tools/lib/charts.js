// ECharts en modo modular (solo lo que usamos) y utilidades comunes.
import * as echarts from 'echarts/core';
import { BarChart, LineChart, PieChart, ScatterChart } from 'echarts/charts';
import { GridComponent, LegendComponent, TitleComponent, TooltipComponent, ToolboxComponent, DataZoomComponent } from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';

echarts.use([BarChart, LineChart, PieChart, ScatterChart, GridComponent, LegendComponent, TitleComponent, TooltipComponent, ToolboxComponent, DataZoomComponent, CanvasRenderer]);

export { echarts };
export const PALETTE = ['#4f5bd5', '#e5683c', '#0d9488', '#c026d3', '#ca8a04', '#2563eb', '#db2777', '#16a34a', '#8b5cf6', '#64748b'];

const css = (name, fb) => getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fb;

// Colores del tema de Amati (claro/oscuro) para texto y líneas
export function themeColors() {
  return { text: css('--text', '#1b1f3b'), muted: css('--muted', '#646a8a'), line: css('--line', '#e2e4f1'), surface: css('--surface', '#fff') };
}

export const compact = (n) => {
  if (n === null || n === undefined || Number.isNaN(n)) return '—';
  const a = Math.abs(n);
  if (a >= 1e12) return `${(n / 1e12).toFixed(2)} bill.`; // billones (10^12)
  if (a >= 1e9) return `${(n / 1e9).toFixed(1)} mil M`;
  if (a >= 1e6) return `${(n / 1e6).toFixed(1)} M`;
  if (a >= 1e3) return `${(n / 1e3).toFixed(1)} mil`;
  return Number.isInteger(n) ? String(n) : n.toFixed(2);
};
