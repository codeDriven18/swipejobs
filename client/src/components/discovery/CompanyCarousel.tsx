import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import type { Job } from '@/models/job';
import { getJobCardPreview } from '@/lib/jobPreview';
import { resolveMediaUrl } from '@/lib/mediaUrl';
import { CompanyInitial } from '@/components/jobs/CompanyInitial';
import styles from './CompanyCarousel.module.css';

interface CompanyCarouselProps {
  jobs: Job[];
}

function companyGlowColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i += 1) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = Math.abs(hash) % 360;
  return `hsl(${hue} 72% 52%)`;
}

interface CompanyEntry {
  name: string;
  slug?: string;
  count: number;
  logoUrl?: string;
  bannerUrl?: string;
}

function extractCompanies(jobs: Job[]): CompanyEntry[] {
  const map = new Map<string, CompanyEntry>();
  for (const job of jobs) {
    const preview = getJobCardPreview(job);
    const key = job.companySlug ?? preview.company;
    const existing = map.get(key);
    if (existing) {
      existing.count += 1;
      // Pick up logo/banner if not yet set
      if (!existing.logoUrl && job.companyLogoUrl) existing.logoUrl = job.companyLogoUrl;
      if (!existing.bannerUrl && job.companyBannerUrl) existing.bannerUrl = job.companyBannerUrl;
    } else {
      map.set(key, {
        name: preview.company,
        slug: job.companySlug,
        count: 1,
        logoUrl: job.companyLogoUrl,
        bannerUrl: job.companyBannerUrl,
      });
    }
  }
  return [...map.values()].sort((a, b) => b.count - a.count).slice(0, 10);
}

export function CompanyCarousel({ jobs }: CompanyCarouselProps) {
  const companies = extractCompanies(jobs);
  if (companies.length === 0) return null;

  return (
    <section className={styles.section}>
      <h2 className={styles.title}>Featured companies</h2>
      <div className={styles.scroll}>
        {companies.map((co, i) => {
          const glow = companyGlowColor(co.name);
          const bannerSrc = resolveMediaUrl(co.bannerUrl);
          const chipStyle = { '--company-glow': glow } as React.CSSProperties;

          const chip = (
            <div className={styles.chip} style={chipStyle}>
              {bannerSrc && (
                <img
                  src={bannerSrc}
                  alt=""
                  className={styles.coverImg}
                  aria-hidden
                />
              )}
              <div className={styles.coverOverlay} aria-hidden />
              <CompanyInitial name={co.name} size="sm" className={styles.avatar} />
              <span className={styles.name}>{co.name}</span>
              <span className={styles.count}>{co.count} {co.count === 1 ? 'role' : 'roles'}</span>
            </div>
          );

          return (
            <motion.div
              key={co.slug ?? co.name}
              className={styles.chipWrap}
              initial={{ opacity: 0, scale: 0.92 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.05, duration: 0.3 }}
            >
              {co.slug ? (
                <Link to={`/companies/${co.slug}`} className={styles.chipLink}>
                  {chip}
                </Link>
              ) : chip}
            </motion.div>
          );
        })}
      </div>
    </section>
  );
}
