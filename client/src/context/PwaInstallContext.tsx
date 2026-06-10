import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
}

interface PwaInstallContextValue {
  canInstall: boolean;
  isInstalled: boolean;
  isStandalone: boolean;
  isIos: boolean;
  installStatus: string;
  fallbackMessage: string;
  promptInstall: () => Promise<boolean>;
}

const PwaInstallContext = createContext<PwaInstallContextValue | null>(null);

export function isStandaloneDisplayMode(): boolean {
  if (typeof window === 'undefined') return false;

  const standaloneNavigator = navigator as Navigator & { standalone?: boolean };
  return window.matchMedia('(display-mode: standalone)').matches || standaloneNavigator.standalone === true;
}

export function PwaInstallProvider({ children }: { children: ReactNode }) {
  const deferredPrompt = useRef<BeforeInstallPromptEvent | null>(null);
  const [canInstall, setCanInstall] = useState(false);
  const [isInstalled, setIsInstalled] = useState(() => isStandaloneDisplayMode());

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      deferredPrompt.current = event as BeforeInstallPromptEvent;
      setCanInstall(true);
      if (import.meta.env.DEV) {
        console.info('[PWA] Install prompt captured.');
      }
    };

    const handleAppInstalled = () => {
      deferredPrompt.current = null;
      setCanInstall(false);
      setIsInstalled(true);
      if (import.meta.env.DEV) {
        console.info('[PWA] App installed.');
      }
    };

    const mediaQuery = window.matchMedia('(display-mode: standalone)');
    const handleDisplayModeChange = () => {
      if (isStandaloneDisplayMode()) {
        handleAppInstalled();
      }
    };

    if (isStandaloneDisplayMode()) {
      setIsInstalled(true);
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);
    mediaQuery.addEventListener('change', handleDisplayModeChange);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
      mediaQuery.removeEventListener('change', handleDisplayModeChange);
    };
  }, []);

  const promptInstall = useCallback(async (): Promise<boolean> => {
    const event = deferredPrompt.current;
    if (!event) {
      if (import.meta.env.DEV) {
        console.warn('[PWA] Install prompt unavailable.');
      }
      return false;
    }

    await event.prompt();
    const choice = await event.userChoice;
    deferredPrompt.current = null;
    setCanInstall(false);

    if (choice.outcome === 'accepted') {
      setIsInstalled(true);
      return true;
    }

    return false;
  }, []);

  const isIos =
    typeof navigator !== 'undefined'
    && /iphone|ipad|ipod/i.test(navigator.userAgent)
    && !isStandaloneDisplayMode();

  const value = useMemo<PwaInstallContextValue>(
    () => ({
      canInstall: canInstall && !isInstalled,
      isInstalled,
      isStandalone: isInstalled || isStandaloneDisplayMode(),
      isIos,
      installStatus: isInstalled ? 'Installed' : canInstall ? 'Available' : 'Not Installed',
      fallbackMessage: isIos
        ? "Tap Share, then 'Add to Home Screen' to install SwipeJobs."
        : "Use the browser menu and choose 'Install app' or 'Install SwipeJobs'.",
      promptInstall,
    }),
    [canInstall, isInstalled, isIos, promptInstall],
  );

  return <PwaInstallContext.Provider value={value}>{children}</PwaInstallContext.Provider>;
}

export function usePwaInstallPrompt(): PwaInstallContextValue {
  const context = useContext(PwaInstallContext);
  if (!context) {
    throw new Error('usePwaInstallPrompt must be used within PwaInstallProvider');
  }
  return context;
}
