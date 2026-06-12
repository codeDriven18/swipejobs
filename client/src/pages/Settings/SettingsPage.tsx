import { useNavigate, Link } from 'react-router-dom';
import { useTheme } from '@/theme/ThemeProvider';
import { useAuth } from '@/context/AuthContext';
import { UserRole } from '@/models/auth';
import { resetOnboarding } from '@/lib/onboardingStorage';
import { PageHeader } from '@/components/ui/PageHeader';
import styles from './SettingsPage.module.css';

export function SettingsPage() {
  const { mode, toggleMode, setMode } = useTheme();
  const { isAuthenticated, user } = useAuth();
  const navigate = useNavigate();

  return (
    <section className={styles.section}>
      <PageHeader title="Settings" subtitle="App preferences." />

      {isAuthenticated && user?.role === UserRole.Admin && (
        <div className={styles.card}>
          <h2 className={styles.cardTitle}>Admin console</h2>
          <p className={styles.cardDesc}>Manage users, companies, jobs, and platform settings.</p>
          <Link to="/admin" className={styles.btnAccent} style={{ display: 'inline-block', textAlign: 'center' }}>
            Open admin panel
          </Link>
        </div>
      )}

      {isAuthenticated && (
        <div className={styles.card}>
          <h2 className={styles.cardTitle}>Account</h2>
          <p className={styles.cardDesc}>Password, sign out, and security.</p>
          <Link to="/account" className={styles.btnAccent} style={{ display: 'inline-block', textAlign: 'center' }}>
            Account settings
          </Link>
        </div>
      )}

      <div className={styles.card}>
        <h2 className={styles.cardTitle}>Appearance</h2>
        <p className={styles.cardDesc}>Current theme: {mode}</p>
        <div className={styles.actions}>
          <button type="button" className={styles.btn} onClick={() => setMode('light')}>
            Light
          </button>
          <button type="button" className={styles.btn} onClick={() => setMode('dark')}>
            Dark
          </button>
          <button type="button" className={styles.btnAccent} onClick={toggleMode}>
            Toggle
          </button>
        </div>
      </div>

      <div className={styles.card}>
        <h2 className={styles.cardTitle}>About SwipeJobs</h2>
        <p className={styles.cardDesc}>Learn more about features, pricing, and our mission.</p>
        <Link to="/landing" className={styles.btn} style={{ display: 'inline-block', textAlign: 'center' }}>
          Visit marketing site
        </Link>
      </div>

      {isAuthenticated && (
        <div className={styles.card}>
          <h2 className={styles.cardTitle}>App</h2>
          <p className={styles.cardDesc}>Install, version info, and update checks.</p>
          <Link to="/profile/app" className={styles.btn} style={{ display: 'inline-block', textAlign: 'center' }}>
            Open app settings
          </Link>
        </div>
      )}

      <div className={styles.card}>
        <h2 className={styles.cardTitle}>Onboarding</h2>
        <p className={styles.cardDesc}>Replay the welcome tour and swipe tutorial.</p>
        <button
          type="button"
          className={styles.btn}
          onClick={() => {
            resetOnboarding();
            navigate('/welcome');
          }}
        >
          Replay welcome
        </button>
      </div>
    </section>
  );
}
