import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import type { ReactNode } from 'react';
import { AppIcon } from '@/components/brand/AppIcon';
import {
  APP_URL,
  FEATURES,
  HOW_IT_WORKS,
  SHOWCASE_JOBS,
  STATS,
  TESTIMONIALS,
} from './constants';
import { useCountUp } from './hooks/useCountUp';
import { useReveal } from './hooks/useReveal';
import { HeroJobCard } from './HeroJobCard';
import { LandingBackground } from './LandingBackground';
import { LandingNav } from './LandingNav';
import styles from './LandingSite.module.css';

function RevealSection({
  children,
  className = '',
  delay = 0,
  id,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
  id?: string;
}) {
  const { ref, visible } = useReveal<HTMLElement>();
  return (
    <motion.section
      ref={ref}
      id={id}
      className={className}
      initial={{ opacity: 0, y: 28 }}
      animate={visible ? { opacity: 1, y: 0 } : { opacity: 0, y: 28 }}
      transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1], delay }}
    >
      {children}
    </motion.section>
  );
}

function StatItem({ value, suffix, label, active }: {
  value: number;
  suffix: string;
  label: string;
  active: boolean;
}) {
  const count = useCountUp(value, active);
  const formatted = suffix === '%' ? count : count.toLocaleString();
  return (
    <div className={styles.statItem}>
      <span className={styles.statValue}>{formatted}{suffix !== '%' ? suffix : `${suffix}`}</span>
      <span className={styles.statLabel}>{label}</span>
    </div>
  );
}

export function LandingSite() {
  const statsReveal = useReveal<HTMLElement>();

  return (
    <div className={styles.site}>
      <LandingBackground />
      <LandingNav />

      <main>
        <section id="home" className={styles.hero}>
          <div className={styles.heroInner}>
            <motion.div
              className={styles.heroCopy}
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            >
              <p className={styles.eyebrow}>The future of job discovery</p>
              <h1 className={styles.headline}>
                Discover opportunities.
                <br />
                <span>Not job boards.</span>
              </h1>
              <p className={styles.subheadline}>
                SwipeJobs helps people discover relevant jobs faster through intelligent matching,
                mobile-first experiences, and real-time opportunities.
              </p>
              <div className={styles.heroCtas}>
                <a href={APP_URL} className={styles.btnPrimary}>Open SwipeJobs</a>
                <a href="#how-it-works" className={styles.btnSecondary}>Learn More</a>
              </div>
            </motion.div>
            <HeroJobCard />
          </div>
        </section>

        <RevealSection id="how-it-works" className={`${styles.section} ${styles.howSection}`}>
          <div className={styles.sectionHead}>
            <p className={styles.sectionEyebrow}>How it works</p>
            <h2 className={styles.sectionTitle}>Three steps to your next role</h2>
          </div>
          <div className={styles.howGrid}>
            {HOW_IT_WORKS.map((item, i) => (
              <motion.article
                key={item.title}
                className={styles.howCard}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-10%' }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
              >
                <span className={styles.howStep}>{item.step}</span>
                <h3>{item.title}</h3>
                <p>{item.text}</p>
              </motion.article>
            ))}
          </div>
        </RevealSection>

        <RevealSection id="features" className={styles.section}>
          <div className={styles.sectionHead}>
            <p className={styles.sectionEyebrow}>Features</p>
            <h2 className={styles.sectionTitle}>Everything you need to move faster</h2>
          </div>
          <div className={styles.featureGrid}>
            {FEATURES.map((feature, i) => (
              <motion.article
                key={feature.title}
                className={styles.featureCard}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-8%' }}
                transition={{ duration: 0.45, delay: (i % 3) * 0.08 }}
              >
                <h3>{feature.title}</h3>
                <p>{feature.text}</p>
              </motion.article>
            ))}
          </div>
        </RevealSection>

        <RevealSection id="job-seekers" className={`${styles.section} ${styles.splitSection}`}>
          <div className={styles.splitCopy}>
            <p className={styles.sectionEyebrow}>For job seekers</p>
            <h2 className={styles.sectionTitle}>Your career, in your pocket</h2>
            <p className={styles.splitText}>
              Stop scrolling through irrelevant listings. SwipeJobs learns what you want and
              delivers roles that match your skills, salary expectations, and work style —
              all from a beautiful mobile experience.
            </p>
            <ul className={styles.splitList}>
              <li>Personalized job feed updated in real time</li>
              <li>One-tap apply with your complete profile</li>
              <li>Track every application from a single dashboard</li>
            </ul>
            <a href={APP_URL} className={styles.btnPrimary}>Start discovering</a>
          </div>
          <div className={styles.splitVisual} aria-hidden>
            <div className={styles.phoneFrame}>
              <div className={styles.phoneScreen}>
                <span className={styles.phoneBadge}>Match 94%</span>
                <p className={styles.phoneTitle}>Lead iOS Engineer</p>
                <p className={styles.phoneSalary}>$135k – $160k</p>
                <p className={styles.phoneLoc}>Remote · Global</p>
              </div>
            </div>
          </div>
        </RevealSection>

        <RevealSection id="employers" className={`${styles.section} ${styles.splitSection} ${styles.splitReverse}`}>
          <div className={styles.splitCopy}>
            <p className={styles.sectionEyebrow}>For employers</p>
            <h2 className={styles.sectionTitle}>Reach talent where they already are</h2>
            <p className={styles.splitText}>
              Post roles, review applicants, and manage your pipeline from the SwipeJobs employer
              portal. Connect with engaged candidates who have already matched with your
              requirements.
            </p>
            <ul className={styles.splitList}>
              <li>Company profiles with verified branding</li>
              <li>Applicant tracking with resume access</li>
              <li>Real-time notifications on new applications</li>
            </ul>
            <a href={APP_URL} className={styles.btnSecondary}>Explore employer tools</a>
          </div>
          <div className={styles.splitVisual} aria-hidden>
            <div className={styles.portalPreview}>
              <div className={styles.portalRow}><span>Active jobs</span><strong>12</strong></div>
              <div className={styles.portalRow}><span>New applicants</span><strong>47</strong></div>
              <div className={styles.portalRow}><span>Interviews scheduled</span><strong>8</strong></div>
              <div className={styles.portalChart} />
            </div>
          </div>
        </RevealSection>

        <RevealSection className={`${styles.section} ${styles.showcaseSection}`}>
          <div className={styles.sectionHead}>
            <p className={styles.sectionEyebrow}>Live opportunities</p>
            <h2 className={styles.sectionTitle}>Roles waiting to be discovered</h2>
          </div>
          <div className={styles.showcaseTrack} aria-label="Sample job listings">
            {[...SHOWCASE_JOBS, ...SHOWCASE_JOBS].map((job, i) => (
              <article key={`${job.title}-${i}`} className={styles.showcaseCard}>
                <p className={styles.showcaseCompany}>{job.company}</p>
                <h3>{job.title}</h3>
                <p className={styles.showcaseSalary}>{job.salary}</p>
                <p className={styles.showcaseLoc}>{job.location}</p>
              </article>
            ))}
          </div>
        </RevealSection>

        <section
          ref={statsReveal.ref}
          className={`${styles.section} ${styles.statsSection}`}
          aria-label="Platform statistics"
        >
          <div className={styles.statsGrid}>
            {STATS.map((stat) => (
              <StatItem
                key={stat.label}
                value={stat.value}
                suffix={stat.suffix}
                label={stat.label}
                active={statsReveal.visible}
              />
            ))}
          </div>
        </section>

        <RevealSection className={`${styles.section} ${styles.testimonialsSection}`}>
          <div className={styles.sectionHead}>
            <p className={styles.sectionEyebrow}>Testimonials</p>
            <h2 className={styles.sectionTitle}>Trusted by seekers and teams</h2>
          </div>
          <div className={styles.testimonialGrid}>
            {TESTIMONIALS.map((item, i) => (
              <motion.blockquote
                key={item.name}
                className={styles.testimonialCard}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
              >
                <p>&ldquo;{item.quote}&rdquo;</p>
                <footer>
                  <strong>{item.name}</strong>
                  <span>{item.role}</span>
                </footer>
              </motion.blockquote>
            ))}
          </div>
        </RevealSection>

        <RevealSection id="about" className={`${styles.section} ${styles.aboutSection}`}>
          <div className={styles.aboutInner}>
            <p className={styles.sectionEyebrow}>About SwipeJobs</p>
            <h2 className={styles.sectionTitle}>Job search, rebuilt for how people actually live</h2>
            <p className={styles.aboutText}>
              We believe finding work should feel as natural as discovering anything else on your
              phone — fast, personal, and even enjoyable. SwipeJobs combines intelligent matching
              with a premium mobile experience so you spend less time searching and more time
              moving forward.
            </p>
          </div>
        </RevealSection>

        <RevealSection className={`${styles.section} ${styles.finalCta}`}>
          <h2>Ready to discover your next opportunity?</h2>
          <p>Join thousands of professionals who find roles faster with SwipeJobs.</p>
          <a href={APP_URL} className={styles.btnPrimary}>Open SwipeJobs</a>
        </RevealSection>
      </main>

      <footer id="contact" className={styles.footer}>
        <div className={styles.footerInner}>
          <div className={styles.footerBrand}>
            <AppIcon size="sm" showShadow={false} />
            <span>SwipeJobs</span>
            <p>Discover opportunities. Not job boards.</p>
          </div>
          <div className={styles.footerCols}>
            <div>
              <h4>Product</h4>
              <a href="#features">Features</a>
              <a href={APP_URL}>Open App</a>
            </div>
            <div>
              <h4>Company</h4>
              <a href="#about">About</a>
              <a href="#contact">Contact</a>
            </div>
            <div>
              <h4>Legal</h4>
              <Link to="/privacy">Privacy</Link>
              <Link to="/terms">Terms</Link>
            </div>
            <div className={`copyable-content ${styles.footerContact}`}>
              <h4>Connect</h4>
              <a href="https://twitter.com" target="_blank" rel="noopener noreferrer">Twitter</a>
              <a href="https://linkedin.com" target="_blank" rel="noopener noreferrer">LinkedIn</a>
              <a href="mailto:hello@swipejobs.app">hello@swipejobs.app</a>
            </div>
          </div>
        </div>
        <p className={styles.copyright}>© {new Date().getFullYear()} SwipeJobs. All rights reserved.</p>
      </footer>
    </div>
  );
}
