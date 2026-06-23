import type { UnsavedChangesAction } from '@/hooks/useUnsavedChanges';
import styles from './UnsavedChangesModal.module.css';

interface UnsavedChangesModalProps {
  open: boolean;
  saving?: boolean;
  onAction: (action: UnsavedChangesAction) => void;
}

export function UnsavedChangesModal({ open, saving, onAction }: UnsavedChangesModalProps) {
  if (!open) return null;

  return (
    <div
      className={styles.overlay}
      role="dialog"
      aria-modal="true"
      aria-labelledby="unsaved-title"
      onClick={() => onAction('continue')}
    >
      <div className={styles.dialog} onClick={(e) => e.stopPropagation()}>
        <h2 id="unsaved-title" className={styles.title}>Unsaved changes</h2>
        <p className={styles.body}>
          You have unsaved changes. What would you like to do?
        </p>
        <div className={styles.actions}>
          <button
            type="button"
            className={styles.btnPrimary}
            disabled={saving}
            onClick={() => onAction('continue')}
          >
            Continue editing
          </button>
          <button
            type="button"
            className={styles.btnDanger}
            disabled={saving}
            onClick={() => onAction('discard')}
          >
            Discard changes
          </button>
        </div>
      </div>
    </div>
  );
}
