import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import { ThemeProvider } from './context/ThemeContext.jsx';
import './styles.css';
import './animations.css';
import './ui.css';
import './pomodoro.css';
import './features.css';
import { installRipple } from './lib/ripple.js';

installRipple();

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ThemeProvider>
      <App />
    </ThemeProvider>
  </StrictMode>,
);
