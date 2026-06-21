import { Link } from 'react-router-dom';
import type { Job } from '@/models/job';
import { CompanyLogo } from '@/components/jobs/CompanyLogo';
import { ViewCompanyProfileButton } from '@/components/jobs/ViewCompanyProfileButton';
import styles from './CompanyIdentityStrip.module.css';

interface CompanyIdentityStripProps {
  job: Job;
  variant?: 'compact' | 'detail';
  onDark?: boolean;
}

export function CompanyIdentityStrip({ job, variant = 'compact', onDark = false }: CompanyIdentityStripProps) {
  const hasMeta = job.companyIndustry || job.companySize || job.companyWebsite || job.companyLinkedInUrl;

  return (
    <div className={`${styles.strip} ${styles[variant]} ${onDark ? styles.onDark : ''}`}>
      <div className={styles.primary}>
        <CompanyLogo name={job.company} logoUrl={job.companyLogoUrl} size={variant === 'detail' ? 'md' : 'sm'} />
        <div className={styles.text}>
          {job.companySlug ? (
            <Link to={`/companies/${job.companySlug}`} className={styles.name}>
              {job.company}
            </Link>
          ) : (
            <span className={styles.name}>{job.company}</span>
          )}
          {hasMeta && (
            <span className={styles.meta}>
              {[job.companyIndustry, job.companySize].filter(Boolean).join(' · ')}
            </span>
          )}
        </div>
      </div>
      {variant === 'detail' && job.companyDescription && (
        <p className={`${styles.description} copyable-content`}>{job.companyDescription}</p>
      )}
      {variant === 'detail' && (job.companyWebsite || job.companyLinkedInUrl) && (
        <div className={styles.links}>
          {job.companyWebsite && (
            <a href={job.companyWebsite} target="_blank" rel="noopener noreferrer" className={styles.link}>
              Website
            </a>
          )}
          {job.companyLinkedInUrl && (
            <a href={job.companyLinkedInUrl} target="_blank" rel="noopener noreferrer" className={styles.link}>
              LinkedIn
            </a>
          )}
        </div>
      )}
      {job.companySlug && (
        <ViewCompanyProfileButton slug={job.companySlug} variant="ghost" className={styles.profileBtn} />
      )}
    </div>
  );
}
