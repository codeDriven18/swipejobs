import { usePwaInstallPrompt } from '@/context/PwaInstallContext';
import styles from './ProfileAppPanel.module.css';

function updateStatusLabel(status: string): string {
  switch (status) {
    case 'checking':
      return 'Checking…';
    case 'upToDate':
      return 'Up to date';
    case 'updateAvailable':
      return 'Update available';
    case 'unsupported':
      return 'Not available';
    case 'error':
      return 'Check failed';
    default:
      return 'Not checked yet';
  }
}

function pwaStatusLabel(installStatus: string, offlineReady: boolean): string {
  if (installStatus === 'Installed') {
    return offlineReady ? 'Installed · offline ready' : 'Installed';
  }
  if (installStatus === 'Available') return 'Install available';
  return 'Browser mode';
}

export function ProfileAppPanel() {
  const {
    canInstall,
    isInstalled,
    isIos,
    installStatus,
    fallbackMessage,
    appVersion,
    offlineReady,
    updateStatus,
    promptInstall,
    checkForUpdates,
    applyUpdate,
  } = usePwaInstallPrompt();

  return (
    <div className={styles.panel}>
      <div className={styles.row}>
        <div>
          <p className={styles.rowLabel}>Installation</p>
          {isInstalled ? (
            <p className={styles.rowValue}>Installed on this device</p>
          ) : canInstall ? (
            <p className={styles.rowHint}>Add SwipeJobs to your home screen for quick access.</p>
          ) : (
            <p className={styles.rowHint}>{fallbackMessage}</p>
          )}
        </div>
        {isInstalled ? (
          <span className={styles.badgeInstalled}>Installed</span>
        ) : canInstall ? (
          <button type="button" className={styles.actionBtn} onClick={() => void promptInstall()}>
            Install App
          </button>
        ) : isIos ? (
          <span className={styles.badgeMuted}>Manual</span>
        ) : null}
      </div>

      <div className={styles.divider} />

      <div className={styles.metaRow}>
        <span className={styles.metaLabel}>App version</span>
        <span className={styles.metaValue}>v{appVersion}</span>
      </div>

      <div className={styles.metaRow}>
        <span className={styles.metaLabel}>PWA status</span>
        <span className={styles.metaValue}>{pwaStatusLabel(installStatus, offlineReady)}</span>
      </div>

      <div className={styles.metaRow}>
        <span className={styles.metaLabel}>Offline support</span>
        <span className={styles.metaValue}>
          {offlineReady ? 'Cached pages available' : 'Requires connection'}
        </span>
      </div>

      <div className={styles.metaRow}>
        <span className={styles.metaLabel}>Update status</span>
        <span className={styles.metaValue}>{updateStatusLabel(updateStatus)}</span>
      </div>

      <div className={styles.actions}>
        <button
          type="button"
          className={styles.actionBtn}
          disabled={updateStatus === 'checking'}
          onClick={() => void checkForUpdates()}
        >
          {updateStatus === 'checking' ? 'Checking…' : 'Check for Updates'}
        </button>
        {updateStatus === 'updateAvailable' && (
          <button type="button" className={styles.actionBtnPrimary} onClick={() => void applyUpdate()}>
            Reload to Update
          </button>
        )}
      </div>
    </div>
  );
}
