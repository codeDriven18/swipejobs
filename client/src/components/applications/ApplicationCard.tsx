import { Link } from 'react-router-dom';
import { useMemo } from 'react';
import { motion } from 'framer-motion';
import type { JobApplication } from '@/models/application';
import { JobHeroImage } from '@/components/jobs/JobHeroImage';
import { CompanyLogo } from '@/components/jobs/CompanyLogo';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Button } from '@/components/ui/Button';
import { ApplicationStatusTimeline } from '@/components/applications/ApplicationStatusTimeline';
import { canWithdrawApplication } from '@/lib/applicationHelpers';
import { isMessagingUnlocked } from '@/lib/messagingHelpers';
import { getJobCardPreview } from '@/lib/jobPreview';
import { getWorkType } from '@/lib/jobCardMeta';
import { resolveJobImage } from '@/lib/resolveJobImage';
import styles from './ApplicationCard.module.css';

interface ApplicationCardProps {
  application: JobApplication;
  index?: number;
  onClick?: () => void;
  onWithdraw?: (applicationId: string) => void;
  withdrawing?: boolean;
}

function formatAppliedDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function ApplicationCard({
  application,
  index = 0,
  onClick,
  onWithdraw,
  withdrawing = false,
}: ApplicationCardProps) {
  const job = application.job;
  const heroImage = useMemo(() => (job ? resolveJobImage(job) : null), [job]);
  const preview = useMemo(() => (job ? getJobCardPreview(job) : null), [job]);
  const showWithdraw = canWithdrawApplication(application.status) && Boolean(onWithdraw);
  const showMessages = Boolean(application.conversationId) && isMessagingUnlocked(application.status);

  if (!job || !heroImage || !preview) {
    return (
      <article className={styles.card} onClick={onClick} role="button" tabIndex={0}>
        <div className={styles.fallbackBody}>
          <h3 className={styles.title}>Application</h3>
          <StatusBadge status={application.status} />
        </div>
      </article>
    );
  }

  const workType = getWorkType(job);
  const locationLine = `${preview.location} · ${workType}`;

  return (
    <motion.article
      className={styles.card}
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && onClick?.()}
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, delay: index * 0.05, ease: [0.22, 1, 0.36, 1] }}
      whileHover={{ y: -3 }}
      whileTap={{ scale: 0.99 }}
    >
      <div className={styles.hero}>
        <div className={styles.heroMedia}>
          <JobHeroImage
            image={heroImage}
            alt={`${preview.title} at ${preview.company}`}
            className={styles.heroImage}
          />
          <div className={styles.heroFade} aria-hidden />
        </div>
        <div className={styles.heroOverlay}>
          <div className={styles.heroTop}>
            <StatusBadge status={application.status} compact />
          </div>
        </div>
      </div>

      <div className={styles.body}>
        <div className={styles.logoOverlap}>
          <CompanyLogo
            name={preview.company}
            logoUrl={job.companyLogoUrl}
            size="md"
          />
        </div>
        <h3 className={styles.title}>{preview.title}</h3>
        <p className={styles.company}>{preview.company}</p>
        <p className={styles.salary}>{preview.salary}</p>
        <p className={styles.location}>{locationLine}</p>
        <p className={styles.appliedDate}>Applied {formatAppliedDate(application.appliedAt)}</p>

        <ApplicationStatusTimeline
          currentStatus={application.status}
          statusHistory={application.statusHistory}
          appliedAt={application.appliedAt}
        />

        {(showWithdraw || showMessages) && (
          <div className={styles.actions}>
            {showMessages && application.conversationId && (
              <Link
                to={`/messages/${application.conversationId}`}
                className={styles.messageLink}
                onClick={(event) => event.stopPropagation()}
              >
                Open messages
              </Link>
            )}
            {showWithdraw && (
            <Button
              type="button"
              variant="ghost"
              size="compact"
              fullWidth
              loading={withdrawing}
              disabled={withdrawing}
              onClick={(event) => {
                event.stopPropagation();
                onWithdraw?.(application.id);
              }}
            >
              Withdraw application
            </Button>
            )}
          </div>
        )}
      </div>
    </motion.article>
  );
}
