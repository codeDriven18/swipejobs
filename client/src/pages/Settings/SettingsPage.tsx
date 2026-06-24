import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { UserRole } from '@/models/auth';
import { ThemeAppearancePicker } from '@/components/theme/ThemeAppearancePicker';
import { InstallAppButton } from '@/components/pwa/InstallAppButton';
import { resetOnboarding } from '@/lib/onboardingStorage';
import { PageHeader } from '@/components/ui/PageHeader';
import {
  IconBriefcase,
  IconChevronRight,
  IconSettings,
  IconSmartphone,
  IconSpark,
  IconUser,
  IconBell,
} from '@/components/icons/Icons';
import styles from './SettingsPage.module.css';

export function SettingsPage() {
  const { isAuthenticated, user } = useAuth();
  const navigate = useNavigate();

  return (
    <section className={styles.section}>
      <PageHeader title="Settings" subtitle="App preferences." />

      {isAuthenticated && user?.role === UserRole.Admin && (
        <div className={styles.group}>
          <Link to="/admin" className={styles.row}>
            <span className={styles.rowIcon} aria-hidden>
              <IconBriefcase size={20} />
            </span>
            <span className={styles.rowBody}>
              <span className={styles.rowTitle}>Admin console</span>
              <span className={styles.rowDesc}>Users, companies, jobs, and platform settings</span>
            </span>
            <IconChevronRight size={18} className={styles.rowChevron} aria-hidden />
          </Link>
        </div>
      )}

      {isAuthenticated && (
        <div className={styles.group}>
          <Link to="/profile/notifications" className={styles.row}>
            <span className={styles.rowIcon} aria-hidden>
              <IconBell size={20} />
            </span>
            <span className={styles.rowBody}>
              <span className={styles.rowTitle}>Notifications</span>
              <span className={styles.rowDesc}>Email, push, and job alerts</span>
            </span>
            <IconChevronRight size={18} className={styles.rowChevron} aria-hidden />
          </Link>
        </div>
      )}

      {isAuthenticated && (
        <div className={styles.group}>
          <Link to="/account" className={styles.row}>
            <span className={styles.rowIcon} aria-hidden>
              <IconUser size={20} />
            </span>
            <span className={styles.rowBody}>
              <span className={styles.rowTitle}>Account</span>
              <span className={styles.rowDesc}>Password, sign out, and security</span>
            </span>
            <IconChevronRight size={18} className={styles.rowChevron} aria-hidden />
          </Link>
        </div>
      )}

      {isAuthenticated && (
        <div className={styles.group}>
          <div className={styles.rowStatic}>
            <span className={styles.rowIcon} aria-hidden>
              <IconSpark size={20} />
            </span>
            <span className={styles.rowBody}>
              <span className={styles.rowTitle}>Appearance</span>
              <span className={styles.rowDesc}>Light, dark, or match your system</span>
            </span>
          </div>
          <div className={styles.rowContent}>
            <ThemeAppearancePicker />
          </div>
        </div>
      )}

      {isAuthenticated && (
        <div className={styles.group}>
          <Link to="/profile/app" className={styles.row}>
            <span className={styles.rowIcon} aria-hidden>
              <IconSmartphone size={20} />
            </span>
            <span className={styles.rowBody}>
              <span className={styles.rowTitle}>App & install</span>
              <span className={styles.rowDesc}>Install, updates, and version info</span>
            </span>
            <IconChevronRight size={18} className={styles.rowChevron} aria-hidden />
          </Link>
          <div style={{ padding: '0 1rem 1rem' }}>
            <InstallAppButton variant="compact" showFallback={false} />
          </div>
        </div>
      )}

      <div className={styles.group}>
        <Link to="/landing" className={styles.row}>
          <span className={styles.rowIcon} aria-hidden>
            <IconSettings size={20} />
          </span>
          <span className={styles.rowBody}>
            <span className={styles.rowTitle}>About SwipeJobs</span>
            <span className={styles.rowDesc}>Features, pricing, and our mission</span>
          </span>
          <IconChevronRight size={18} className={styles.rowChevron} aria-hidden />
        </Link>
      </div>

      <div className={styles.group}>
        <button
          type="button"
          className={styles.row}
          onClick={() => {
            resetOnboarding();
            navigate('/welcome');
          }}
        >
          <span className={styles.rowIcon} aria-hidden>
            <IconSpark size={20} />
          </span>
          <span className={styles.rowBody}>
            <span className={styles.rowTitle}>Onboarding</span>
            <span className={styles.rowDesc}>Replay the welcome tour and swipe tutorial</span>
          </span>
          <IconChevronRight size={18} className={styles.rowChevron} aria-hidden />
        </button>
      </div>
    </section>
  );
}
