import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { AuthProvider } from './lib/auth';
import { listenForInstallPrompt } from './lib/install';
import { registerServiceWorker } from './lib/push';
import { ThemeProvider } from './lib/theme';
import { Toaster } from './components/ui/sonner';
import { TooltipProvider } from './components/ui/tooltip';
import './i18n';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <ThemeProvider>
        <TooltipProvider delayDuration={200}>
          <AuthProvider>
            <App />
          </AuthProvider>
          <Toaster
            richColors
            closeButton
            position="bottom-right"
            offset={{ bottom: 88, right: 24 }}
            mobileOffset={{ bottom: 88 }}
          />
        </TooltipProvider>
      </ThemeProvider>
    </BrowserRouter>
  </StrictMode>,
);

listenForInstallPrompt();
registerServiceWorker();
