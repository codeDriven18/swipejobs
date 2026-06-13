import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { IconSpark } from '@/components/icons/Icons';
import { EmptyIllustration, type EmptyIllustrationVariant } from './EmptyIllustration';
import styles from './EmptyState.module.css';
import type { ReactNode } from 'react';

interface EmptyStateAction {
  label: string;
  to?: string;
  onClick?: () => void;
  primary?: boolean;
}

interface EmptyStateProps {
  icon?: ReactNode;
  illustration?: EmptyIllustrationVariant;
  title: string;
  description: string;
  actions?: EmptyStateAction[];
}

export function EmptyState({
  icon,
  illustration,
  title,
  description,
  actions = [],
}: EmptyStateProps) {
  return (
    <motion.div
      className={styles.wrapper}
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
    >
      {illustration ? (
        <EmptyIllustration variant={illustration} />
      ) : (
        <div className={styles.iconRing}>
          <span className={styles.icon}>{icon ?? <IconSpark size={28} />}</span>
        </div>
      )}
      <h3 className={styles.title}>{title}</h3>
      <p className={styles.description}>{description}</p>
      {actions.length > 0 && (
        <div className={styles.actions}>
          {actions.map((action) =>
            action.to ? (
              <Link
                key={action.label}
                to={action.to}
                className={action.primary ? styles.primaryBtn : styles.secondaryBtn}
              >
                {action.label}
              </Link>
            ) : (
              <button
                key={action.label}
                type="button"
                className={action.primary ? styles.primaryBtn : styles.secondaryBtn}
                onClick={action.onClick}
              >
                {action.label}
              </button>
            ),
          )}
        </div>
      )}
    </motion.div>
  );
}
