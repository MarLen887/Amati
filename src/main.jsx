import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './app/App.jsx';
import { ThemeProvider } from './core/context/ThemeContext.jsx';
import ErrorBoundary from './core/components/ErrorBoundary.jsx';
import { ConfirmProvider } from './core/components/ConfirmDialog.jsx';
import './styles/base.css';
import './styles/animations.css';
import './styles/ui.css';
import './styles/pomodoro.css';
import './styles/features.css';
import './styles/techniques.css';
import './styles/classnotes.css';
import './styles/redesign.css';
import './styles/mobile-nav.css';
import './styles/buttons.css';
import './styles/resilience.css';
import './styles/bird.css';
import './styles/subjects-fx.css';
import { installRipple } from './core/lib/ripple.js';
import { initPwa } from './core/lib/pwa.js';
import { installChunkReload } from './core/lib/chunkReload.js';

installRipple();
initPwa();
installChunkReload();

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ThemeProvider>
      <ErrorBoundary>
        <ConfirmProvider>
          <App />
        </ConfirmProvider>
      </ErrorBoundary>
    </ThemeProvider>
  </StrictMode>,
);
