import styles from './EmptyIllustration.module.css';

export type EmptyIllustrationVariant =
  | 'saved'
  | 'applications'
  | 'profile'
  | 'swipe'
  | 'generic';

interface EmptyIllustrationProps {
  variant: EmptyIllustrationVariant;
}

export function EmptyIllustration({ variant }: EmptyIllustrationProps) {
  return (
    <div className={styles.wrap} aria-hidden>
      {variant === 'saved' && (
        <svg className={styles.svg} viewBox="0 0 120 120" fill="none">
          <circle cx="60" cy="60" r="52" className={styles.bgCircle} />
          <path d="M60 88 34 62V38a8 8 0 0 1 8-8h36a8 8 0 0 1 8 8v24L60 88Z" className={styles.accent} strokeWidth="3" stroke="currentColor" />
          <circle cx="48" cy="50" r="4" className={styles.dot} />
          <circle cx="72" cy="50" r="4" className={styles.dot} />
        </svg>
      )}
      {variant === 'applications' && (
        <svg className={styles.svg} viewBox="0 0 120 120" fill="none">
          <circle cx="60" cy="60" r="52" className={styles.bgCircle} />
          <rect x="32" y="36" width="56" height="48" rx="10" className={styles.accent} strokeWidth="3" stroke="currentColor" />
          <path d="m44 58 10 10 22-22" className={styles.check} strokeWidth="3.5" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}
      {variant === 'profile' && (
        <svg className={styles.svg} viewBox="0 0 120 120" fill="none">
          <circle cx="60" cy="60" r="52" className={styles.bgCircle} />
          <circle cx="60" cy="48" r="14" className={styles.accent} strokeWidth="3" stroke="currentColor" />
          <path d="M36 92c0-14 10.8-22 24-22s24 8 24 22" className={styles.accent} strokeWidth="3" stroke="currentColor" strokeLinecap="round" />
        </svg>
      )}
      {variant === 'swipe' && (
        <svg className={styles.svg} viewBox="0 0 120 120" fill="none">
          <circle cx="60" cy="60" r="52" className={styles.bgCircle} />
          <rect x="38" y="30" width="44" height="60" rx="8" className={styles.accent} strokeWidth="3" stroke="currentColor" />
          <path d="M46 46h28M46 58h20M46 70h24" className={styles.line} strokeWidth="2.5" stroke="currentColor" strokeLinecap="round" />
        </svg>
      )}
      {variant === 'generic' && (
        <svg className={styles.svg} viewBox="0 0 120 120" fill="none">
          <circle cx="60" cy="60" r="52" className={styles.bgCircle} />
          <circle cx="60" cy="60" r="20" className={styles.accent} strokeWidth="3" stroke="currentColor" />
        </svg>
      )}
    </div>
  );
}
