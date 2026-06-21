import { Link } from 'react-router-dom';
import { IconBuilding } from '@/components/icons/Icons';
import { companyPath } from '@/components/jobs/CompanyLink';
import styles from './ViewCompanyProfileButton.module.css';

interface ViewCompanyProfileButtonProps {
  slug?: string;
  variant?: 'primary' | 'ghost' | 'inline';
  className?: string;
  onClick?: (e: React.MouseEvent) => void;
}

export function ViewCompanyProfileButton({
  slug,
  variant = 'ghost',
  className = '',
  onClick,
}: ViewCompanyProfileButtonProps) {
  if (!slug) return null;

  return (
    <Link
      to={companyPath(slug)}
      className={[styles.btn, styles[variant], className].filter(Boolean).join(' ')}
      onClick={(e) => {
        e.stopPropagation();
        onClick?.(e);
      }}
    >
      <IconBuilding size={16} aria-hidden />
      View company profile
    </Link>
  );
}
