import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './app/App.jsx';
import { ThemeProvider } from './core/context/ThemeContext.jsx';
import './styles/base.css';
import './styles/animations.css';
import './styles/ui.css';
import './styles/pomodoro.css';
import './styles/features.css';
import './styles/techniques.css';
import './styles/classnotes.css';
import './styles/redesign.css';
import './styles/mobile-nav.css';
import { installRipple } from './core/lib/ripple.js';

installRipple();

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ThemeProvider>
      <App />
    </ThemeProvider>
  </StrictMode>,
);
