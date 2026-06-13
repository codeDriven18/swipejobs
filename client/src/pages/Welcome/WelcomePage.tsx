import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { IconArrowUp, IconChevronLeft, IconChevronRight } from '@/components/icons/Icons';
import { setOnboardingComplete } from '@/lib/onboardingStorage';
import styles from './WelcomePage.module.css';
import type { ReactNode } from 'react';

const gestures: { icon: ReactNode; label: string; desc: string; className: string }[] = [
  { icon: <IconChevronLeft size={22} />, label: 'Skip', desc: 'Not interested? Swipe left to pass.', className: styles.skip },
  { icon: <IconChevronRight size={22} />, label: 'Save', desc: 'Like it? Swipe right to bookmark for later.', className: styles.save },
  { icon: <IconArrowUp size={22} />, label: 'Quick Apply', desc: 'Great match? Swipe up to apply instantly.', className: styles.apply },
];

export function WelcomePage() {
  const navigate = useNavigate();

  const finish = (destination: '/swipe' | '/profile') => {
    setOnboardingComplete();
    navigate(destination);
  };

  return (
    <section className={styles.page}>
      <motion.div
        className={styles.hero}
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
      >
        <div className={styles.logo} />
        <h1 className={styles.title}>Welcome to SwipeJobs</h1>
        <p className={styles.subtitle}>
          Find gigs and IT jobs the modern way. Set up your profile once, then swipe to discover.
        </p>
      </motion.div>

      <motion.div
        className={styles.card}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 0.35 }}
      >
        <h2 className={styles.cardTitle}>How swiping works</h2>
        <ul className={styles.gestures}>
          {gestures.map((g, i) => (
            <motion.li
              key={g.label}
              className={styles.gesture}
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.15 + i * 0.08 }}
            >
              <span className={`${styles.gestureIcon} ${g.className}`}>{g.icon}</span>
              <div>
                <strong>{g.label}</strong>
                <p>{g.desc}</p>
              </div>
            </motion.li>
          ))}
        </ul>
        <p className={styles.tapHint}>Tap any card to view full job details.</p>
      </motion.div>

      <motion.div
        className={styles.actions}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.35 }}
      >
        <button type="button" className={styles.primaryBtn} onClick={() => finish('/profile')}>
          Set up profile first
        </button>
        <button type="button" className={styles.secondaryBtn} onClick={() => finish('/swipe')}>
          Start swiping <IconChevronRight size={18} />
        </button>
      </motion.div>
    </section>
  );
}
