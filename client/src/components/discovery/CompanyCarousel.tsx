import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import type { Job } from '@/models/job';
import { CompanyInitial } from '@/components/jobs/CompanyInitial';
import styles from './CompanyCarousel.module.css';

interface CompanyCarouselProps {
  jobs: Job[];
}

function extractCompanies(jobs: Job[]) {
  const map = new Map<string, { name: string; slug?: string; count: number }>();
  for (const job of jobs) {
    const key = job.companySlug ?? job.company;
    const existing = map.get(key);
    if (existing) {
      existing.count += 1;
    } else {
      map.set(key, { name: job.company, slug: job.companySlug, count: 1 });
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
        {companies.map((co, i) => (
          <motion.div
            key={co.slug ?? co.name}
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.05, duration: 0.3 }}
          >
            {co.slug ? (
              <Link to={`/companies/${co.slug}`} className={styles.chip}>
                <CompanyInitial name={co.name} size="sm" />
                <span className={styles.name}>{co.name}</span>
                <span className={styles.count}>{co.count} roles</span>
              </Link>
            ) : (
              <div className={styles.chip}>
                <CompanyInitial name={co.name} size="sm" />
                <span className={styles.name}>{co.name}</span>
                <span className={styles.count}>{co.count} roles</span>
              </div>
            )}
          </motion.div>
        ))}
      </div>
    </section>
  );
}
