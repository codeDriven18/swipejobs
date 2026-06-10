import { useEffect, type ReactNode } from 'react';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { useTheme } from '@/theme/ThemeProvider';
import styles from './PwaShell.module.css';

function applyDisplayModeClass() {
  const standalone =
    window.matchMedia('(display-mode: standalone)').matches
    || (navigator as Navigator & { standalone?: boolean }).standalone === true;

  document.documentElement.dataset.displayMode = standalone ? 'standalone' : 'browser';
  document.documentElement.classList.toggle('pwa-standalone', standalone);
}

function hideBootSplash() {
  const splash = document.getElementById('pwa-splash');
  if (!splash) return;
  splash.classList.add('hidden');
  window.setTimeout(() => splash.remove(), 300);
}

export function PwaShell({ children }: { children: ReactNode }) {
  const online = useOnlineStatus();
  const { mode } = useTheme();

  useEffect(() => {
    applyDisplayModeClass();
    hideBootSplash();

    const mq = window.matchMedia('(display-mode: standalone)');
    const onChange = () => applyDisplayModeClass();
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  return (
    <div className={styles.pwaShell}>
      {!online && (
        <div className={styles.offlineBanner} data-theme={mode} role="status">
          You&apos;re offline — cached pages may be available; job data requires a connection.
        </div>
      )}
      {children}
    </div>
  );
}
