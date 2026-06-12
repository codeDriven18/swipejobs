import styles from './CompanyInitial.module.css';

interface CompanyInitialProps {
  name: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

function hashName(name: string): number {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return Math.abs(hash);
}

const HUES = [220, 260, 320, 180, 40, 200, 280];

export function CompanyInitial({ name, size = 'md', className = '' }: CompanyInitialProps) {
  const initial = (name.trim()[0] ?? '?').toUpperCase();
  const hue = HUES[hashName(name) % HUES.length];

  return (
    <span
      className={`${styles.logo} ${styles[size]} ${className}`}
      style={{ background: `hsl(${hue} 65% 92%)`, color: `hsl(${hue} 55% 35%)` }}
      aria-hidden
    >
      {initial}
    </span>
  );
}
