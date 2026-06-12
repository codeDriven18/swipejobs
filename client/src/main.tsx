import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { ThemeProvider } from '@/theme/ThemeProvider';
import { AuthProvider } from '@/context/AuthContext';
import { ProfileProvider } from '@/context/ProfileContext';
import { ToastProvider } from '@/context/ToastContext';
import { PwaInstallProvider } from '@/context/PwaInstallContext';
import { PwaShell } from '@/components/pwa/PwaShell';
import App from '@/App';
import '@/styles/global.css';
import '@/styles/pwa.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <ThemeProvider>
        <PwaInstallProvider>
          <AuthProvider>
            <ProfileProvider>
              <ToastProvider>
                <PwaShell>
                  <App />
                </PwaShell>
              </ToastProvider>
            </ProfileProvider>
          </AuthProvider>
        </PwaInstallProvider>
      </ThemeProvider>
    </BrowserRouter>
  </StrictMode>,
);
