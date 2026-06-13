import { IconSmartphone } from '@/components/icons/Icons';
import { usePwaInstallPrompt } from '@/context/PwaInstallContext';
import styles from './PwaInstall.module.css';

interface InstallAppButtonProps {
  variant?: 'full' | 'compact';
  showFallback?: boolean;
  className?: string;
}

export function InstallAppButton({
  variant = 'full',
  showFallback = true,
  className = '',
}: InstallAppButtonProps) {
  const { canInstall, isInstalled, promptInstall, fallbackMessage } = usePwaInstallPrompt();

  if (isInstalled) {
    return null;
  }

  if (!canInstall) {
    if (!showFallback) return null;

    return <p className={`${styles.fallback} ${className}`.trim()}>{fallbackMessage}</p>;
  }

  return (
    <button
      type="button"
      className={`${styles.button} ${variant === 'compact' ? styles.compact : ''} ${variant === 'full' ? styles.block : ''} ${className}`.trim()}
      onClick={() => void promptInstall()}
    >
      <span className={styles.icon} aria-hidden="true"><IconSmartphone size={18} /></span>
      <span>Install SwipeJobs</span>
    </button>
  );
}
