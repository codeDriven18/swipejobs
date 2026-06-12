import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ApiError } from '@/api/client';
import { useAuth } from '@/context/AuthContext';
import { PasswordField } from '@/components/forms/PasswordField';
import { AppIcon } from '@/components/brand/AppIcon';
import type { AccountType } from '@/models/auth';
import styles from './AuthPage.module.css';

function getErrorMessage(error: unknown): string {
  if (error instanceof ApiError && error.body && typeof error.body === 'object' && 'error' in error.body) {
    return String((error.body as { error: string }).error);
  }
  return error instanceof Error ? error.message : 'Something went wrong';
}

export function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [accountType, setAccountType] = useState<AccountType>('jobseeker');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await register({
        email,
        password,
        firstName: firstName || undefined,
        lastName: lastName || undefined,
        accountType,
        companyName: accountType === 'company' ? companyName : undefined,
      });
      navigate(accountType === 'company' ? '/portal' : '/profile', { replace: true });
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
        <h1 className={styles.title}>Create account</h1>
        <p className={styles.subtitle}>
          {accountType === 'company'
            ? 'Register your company to post jobs and review applicants.'
            : 'Discover roles by swiping — save, apply, and track everything in one place.'}
        </p>
      </div>

      <form className={styles.form} onSubmit={(e) => void handleSubmit(e)}>
        <div className={styles.accountToggle} role="group" aria-label="Account type">
          <button
            type="button"
            className={`${styles.accountOption} ${accountType === 'jobseeker' ? styles.accountOptionActive : ''}`}
            onClick={() => setAccountType('jobseeker')}
          >
            Job seeker
          </button>
          <button
            type="button"
            className={`${styles.accountOption} ${accountType === 'company' ? styles.accountOptionActive : ''}`}
            onClick={() => setAccountType('company')}
          >
            Employer
          </button>
        </div>

        {accountType === 'company' ? (
          <div className={styles.field}>
            <label className={styles.label} htmlFor="companyName">Company name</label>
            <input
              id="companyName"
              className={styles.input}
              required
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
            />
          </div>
        ) : (
          <div className={styles.row}>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="firstName">First name</label>
              <input
                id="firstName"
                className={styles.input}
                autoComplete="given-name"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
              />
            </div>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="lastName">Last name</label>
              <input
                id="lastName"
                className={styles.input}
                autoComplete="family-name"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
              />
            </div>
          </div>
        )}

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
            autoComplete="new-password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            inputClassName={styles.input}
          />
        </div>

        {error && <p className={styles.error}>{error}</p>}

        <button type="submit" className={styles.submit} disabled={loading}>
          {loading ? 'Creating account...' : accountType === 'company' ? 'Create company account' : 'Create account'}
        </button>
      </form>

      <p className={styles.footer}>
        Already have an account? <Link to="/login" className={styles.link}>Sign in</Link>
      </p>
    </section>
  );
}
