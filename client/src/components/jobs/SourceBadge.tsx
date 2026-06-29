import type { Job } from '@/models/job';
import { SourceTrustLevel, SourceTrustLevelLabels } from '@/models/enums';
import styles from './SourceBadge.module.css';

interface SourceBadgeProps {
  job: Job;
  className?: string;
}

function resolveLogoUrl(logoUrl?: string | null): string | null {
  if (!logoUrl?.trim()) return null;
  const trimmed = logoUrl.trim();
  if (trimmed.startsWith('http') || trimmed.startsWith('/')) return trimmed;
  return `/sources/${trimmed}`;
}

export function SourceBadge({ job, className = '' }: SourceBadgeProps) {
  if (!job.sourceName?.trim()) return null;

  const level = job.sourceTrustLevel ?? SourceTrustLevel.Unknown;
  const logo = resolveLogoUrl(job.sourceLogoUrl);

  const inner = (
    <>
      {logo && (
        <img src={logo} alt="" className={styles.logo} loading="lazy" decoding="async" />
      )}
      <span className={styles.poweredBy}>via</span>
      <span className={styles.name}>{job.sourceName}</span>
      {level >= SourceTrustLevel.Verified && level !== SourceTrustLevel.Standard && (
        <span className={styles.trustDot} aria-label={SourceTrustLevelLabels[level]} />
      )}
    </>
  );

  return (
    <span className={`${styles.badge} ${styles[`level${level}`]} ${className}`} title={`Powered by ${job.sourceName}`}>
      {inner}
    </span>
  );
}
