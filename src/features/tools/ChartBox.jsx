import { useEffect, useRef } from 'react';
import { echarts, themeColors } from './lib/charts.js';

// Contenedor de ECharts: crea el gráfico, lo redimensiona con el contenedor y lo libera al salir.
// `option` se vuelve a aplicar cada vez que cambia; `onReady(chart)` da acceso (p. ej. para exportar PNG).
export default function ChartBox({ option, height = 380, onReady, label = 'Gráfico' }) {
  const host = useRef(null);
  const chart = useRef(null);

  useEffect(() => {
    const c = echarts.init(host.current, null, { renderer: 'canvas' });
    chart.current = c;
    onReady?.(c);
    const ro = new ResizeObserver(() => c.resize());
    ro.observe(host.current);
    return () => { ro.disconnect(); c.dispose(); chart.current = null; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!chart.current) return;
    const t = themeColors();
    chart.current.setOption({
      backgroundColor: 'transparent',
      textStyle: { color: t.text, fontFamily: 'inherit' },
      legend: { textStyle: { color: t.text }, type: 'scroll' },
      ...option,
    }, true);
  }, [option]);

  return <div ref={host} style={{ width: '100%', height }} role="img" aria-label={label} />;
}
