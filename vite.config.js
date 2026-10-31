import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // Las herramientas pesadas se cargan solo al abrirlas. Si Vite las descubre a media sesión, vuelve a optimizar
  // y la pantalla muestra «Amati se actualizó» (Failed to fetch dynamically imported module). Se preparan al arrancar.
  optimizeDeps: {
    include: [
      'kekule', 'three', 'mermaid', 'mathjs', 'nerdamer', 'sql.js', 'tesseract.js', 'katex', 'recharts',
      '@excalidraw/excalidraw', '@xyflow/react', 'markmap-lib', 'markmap-view', '@formulajs/formulajs', 'xlsx',
      'echarts/core', 'echarts/charts', 'echarts/components', 'echarts/renderers',
    ],
  },
});
