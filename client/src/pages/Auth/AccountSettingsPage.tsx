import { useState } from 'react';
import type { FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { ApiError } from '@/api/client';
import { authApi } from '@/api/authApi';
import { useAuth } from '@/context/AuthContext';
import { PasswordField } from '@/components/forms/PasswordField';
import { PageHeader } from '@/components/ui/PageHeader';
import styles from '../Settings/SettingsPage.module.css';
import authStyles from './AuthPage.module.css';

function getErrorMessage(error: unknown): string {
  if (error instanceof ApiError && error.body && typeof error.body === 'object' && 'error' in error.body) {
    return String((error.body as { error: string }).error);
  }
  return error instanceof Error ? error.message : 'Something went wrong';
}

export function AccountSettingsPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleChangePassword = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setMessage(null);

    if (newPassword !== confirmPassword) {
      setError('New passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      await authApi.changePassword({ currentPassword, newPassword });
      setMessage('Password updated. Please sign in again.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      await logout();
      navigate('/login', { replace: true });
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  return (
    <section className={styles.section}>
      <PageHeader title="Account" subtitle="Manage your sign-in and security." />

      <div className={styles.card}>
        <h2 className={styles.cardTitle}>Signed in as</h2>
        <p className={styles.cardDesc}>{user?.email}</p>
        <button type="button" className={styles.btnAccent} onClick={() => void handleLogout()}>
          Sign out
        </button>
      </div>

      <div className={styles.card}>
        <h2 className={styles.cardTitle}>Change password</h2>
        <p className={styles.cardDesc}>Use at least 8 characters.</p>
        <form onSubmit={(e) => void handleChangePassword(e)} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <PasswordField
            inputClassName={authStyles.input}
            placeholder="Current password"
            autoComplete="current-password"
            required
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
          />
          <PasswordField
            inputClassName={authStyles.input}
            placeholder="New password"
            autoComplete="new-password"
            required
            minLength={8}
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
          />
          <PasswordField
            inputClassName={authStyles.input}
            placeholder="Confirm new password"
            autoComplete="new-password"
            required
            minLength={8}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
          />
          {error && <p className={authStyles.error}>{error}</p>}
          {message && <p className={authStyles.success}>{message}</p>}
          <button type="submit" className={styles.btnAccent} disabled={loading}>
            {loading ? 'Updating...' : 'Update password'}
          </button>
        </form>
      </div>
    </section>
  );
}
