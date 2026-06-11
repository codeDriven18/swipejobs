import type { Company } from '@/models/company';
import styles from './CompanyAvatar.module.css';

interface CompanyAvatarProps {
  company: Pick<Company, 'name' | 'logoUrl'>;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const sizeClass = {
  sm: styles.sm,
  md: styles.md,
  lg: styles.lg,
} as const;

function getInitials(name: string): string {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase() || '?';
}

export function CompanyAvatar({ company, size = 'md', className = '' }: CompanyAvatarProps) {
  const initials = getInitials(company.name);

  if (company.logoUrl) {
    return (
      <img
        src={company.logoUrl}
        alt={`${company.name} logo`}
        className={`${styles.avatar} ${sizeClass[size]} ${className}`.trim()}
      />
    );
  }

  return (
    <span
      className={`${styles.avatar} ${styles.fallback} ${sizeClass[size]} ${className}`.trim()}
      aria-label={`${company.name} logo`}
      role="img"
    >
      {initials}
    </span>
  );
}
