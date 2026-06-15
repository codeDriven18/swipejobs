import styles from './Skeleton.module.css';

interface SkeletonProps {
  className?: string;
  variant?: 'block' | 'line' | 'lineShort' | 'lineTitle' | 'card' | 'avatar' | 'hero' | 'swipeCard';
}

export function Skeleton({ className = '', variant = 'block' }: SkeletonProps) {
  const variantClass = styles[variant] ?? styles.block;
  return (
    <span
      className={`${styles.skeleton} ${variantClass} ${className}`.trim()}
      aria-hidden="true"
    />
  );
}

export function JobCardSkeletonList({ count = 4 }: { count?: number }) {
  return (
    <div className={styles.list} aria-busy="true" aria-label="Loading jobs">
      {Array.from({ length: count }, (_, i) => (
        <Skeleton key={i} variant="card" />
      ))}
    </div>
  );
}

export function ProfileSkeleton() {
  return (
    <div className={styles.list} aria-busy="true" aria-label="Loading profile">
      <Skeleton variant="lineTitle" />
      <Skeleton variant="line" />
      <Skeleton variant="lineShort" />
      <Skeleton variant="card" />
      <Skeleton variant="card" />
    </div>
  );
}

export function JobDetailSkeleton() {
  return (
    <div className={styles.list} aria-busy="true" aria-label="Loading job">
      <Skeleton variant="lineShort" />
      <Skeleton variant="hero" />
      <Skeleton variant="line" />
      <Skeleton variant="line" />
      <Skeleton variant="lineShort" />
    </div>
  );
}

export function SwipeCardSkeleton() {
  return (
    <div className={styles.list} aria-busy="true" aria-label="Loading swipe deck">
      <Skeleton variant="swipeCard" className={styles.swipeCardSkeleton} />
    </div>
  );
}

export function DiscoveryRailSkeleton({ title = 'Loading' }: { title?: string }) {
  return (
    <section className={styles.railSkeleton} aria-busy="true" aria-label={`${title} loading`}>
      <div className={styles.railSkeletonHeader}>
        <Skeleton variant="lineTitle" />
      </div>
      <div className={styles.railSkeletonScroll}>
        {Array.from({ length: 4 }, (_, index) => (
          <Skeleton key={index} variant="card" className={styles.railSkeletonCard} />
        ))}
      </div>
    </section>
  );
}

export function DashboardSkeleton() {
  return (
    <div className={styles.list} aria-busy="true" aria-label="Loading dashboard">
      <Skeleton variant="lineTitle" />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.625rem' }}>
        <Skeleton variant="card" />
        <Skeleton variant="card" />
        <Skeleton variant="card" />
      </div>
      <Skeleton variant="card" />
      <Skeleton variant="card" />
    </div>
  );
}
