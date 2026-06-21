import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ApiError } from '@/api/client';
import { useAuth } from '@/context/AuthContext';
import { PasswordField } from '@/components/forms/PasswordField';
import { AppIcon } from '@/components/brand/AppIcon';
import { getPostLoginDestination } from '@/lib/authRoutes';
import styles from './AuthPage.module.css';

function getErrorMessage(error: unknown): string {
  if (error instanceof ApiError && error.body && typeof error.body === 'object' && 'error' in error.body) {
    return String((error.body as { error: string }).error);
  }
  return error instanceof Error ? error.message : 'Something went wrong';
}

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from ?? '/';
  const isEmployerLogin = from.startsWith('/portal');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const user = await login({ email, password, rememberMe });
      navigate(getPostLoginDestination(user.role, from), { replace: true });
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className={styles.page}>
      <div className={styles.hero}>
        <AppIcon size="lg" className={styles.logoIcon} />
        <h1 className={styles.title}>{isEmployerLogin ? 'Sign in to hiring workspace' : 'Welcome back'}</h1>
        <p className={styles.subtitle}>
          {isEmployerLogin
            ? 'Review candidates, reply to conversations, and move your pipeline forward.'
            : 'Pick up where you left off — your saved roles and applications are waiting.'}
        </p>
      </div>

      <form className={styles.form} onSubmit={(e) => void handleSubmit(e)}>
        <div className={styles.field}>
          <label className={styles.label} htmlFor="email">Email</label>
          <input
            id="email"
            className={styles.input}
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>

        <div className={styles.field}>
          <label className={styles.label} htmlFor="password">Password</label>
          <PasswordField
            id="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            inputClassName={styles.input}
          />
        </div>

        <label className={styles.rememberRow}>
          <input
            type="checkbox"
            checked={rememberMe}
            onChange={(e) => setRememberMe(e.target.checked)}
          />
          <span>Keep me signed in for 90 days</span>
        </label>

        <Link to="/forgot-password" className={styles.forgot}>Forgot password?</Link>

        {error && <p className={styles.error}>{error}</p>}

        <button type="submit" className={styles.submit} disabled={loading}>
          {loading ? 'Signing in...' : 'Sign in'}
        </button>
      </form>

      <p className={styles.footer}>
        New here? <Link to="/register" className={styles.link}>Create an account</Link>
      </p>
    </section>
  );
}
