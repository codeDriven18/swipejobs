import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ApiError } from '@/api/client';
import { authApi } from '@/api/authApi';
import { useAuth } from '@/context/AuthContext';
import { useProfile } from '@/hooks/useProfile';
import { UserRole } from '@/models/auth';
import { PasswordField } from '@/components/forms/PasswordField';
import { SettingsField, SettingsFields, SettingsSoonBadge } from '@/portal/components/SettingsField';
import ws from '@/portal/workspace.module.css';

function getErrorMessage(error: unknown): string {
  if (error instanceof ApiError && error.body && typeof error.body === 'object' && 'error' in error.body) {
    return String((error.body as { error: string }).error);
  }
  return error instanceof Error ? error.message : 'Something went wrong';
}

export function SettingsAccountSection() {
  const { user, logout } = useAuth();
  const { profile, loading: profileLoading } = useProfile();
  const navigate = useNavigate();

  const displayName = (() => {
    if (user?.role === UserRole.Company) {
      return user.companyName?.trim() || null;
    }
    const first = profile?.firstName?.trim() ?? '';
    const last = profile?.lastName?.trim() ?? '';
    return `${first} ${last}`.trim() || null;
  })();

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  return (
    <SettingsFields>
      <SettingsField
        label="Profile"
        description="Your recruiter identity in the SwipeJobs workspace."
      >
        {profileLoading ? (
          <p className={ws.settingsInlineMuted}>Loading…</p>
        ) : (
          <div className={ws.settingsIdentity}>
            {displayName && <p className={ws.settingsIdentityName}>{displayName}</p>}
            <p className={ws.settingsIdentityEmail}>{user?.email}</p>
          </div>
        )}
      </SettingsField>

      <SettingsField
        label="Account type"
        description="How you access the employer portal."
      >
        <span className={ws.settingsPill}>
          {user?.role === UserRole.Company ? 'Company account' : 'Recruiter account'}
        </span>
      </SettingsField>

      <SettingsField
        label="Sign out"
        description="End your session on this device."
      >
        <button type="button" className={ws.btnGhost} onClick={() => void handleLogout()}>
          Sign out
        </button>
      </SettingsField>
    </SettingsFields>
  );
}

export function SettingsSecuritySection() {
  const { logout } = useAuth();
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

  return (
    <SettingsFields>
      <SettingsField
        label="Password"
        description="Use at least 8 characters. You will be signed out after updating."
      >
        <form className={ws.settingsFormStack} onSubmit={(e) => void handleChangePassword(e)}>
          <div className={ws.field}>
            <label htmlFor="current-password">Current password</label>
            <PasswordField
              id="current-password"
              inputClassName={ws.input}
              autoComplete="current-password"
              required
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
            />
          </div>
          <div className={ws.fieldRow}>
            <div className={ws.field}>
              <label htmlFor="new-password">New password</label>
              <PasswordField
                id="new-password"
                inputClassName={ws.input}
                autoComplete="new-password"
                required
                minLength={8}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
            </div>
            <div className={ws.field}>
              <label htmlFor="confirm-password">Confirm</label>
              <PasswordField
                id="confirm-password"
                inputClassName={ws.input}
                autoComplete="new-password"
                required
                minLength={8}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>
          </div>
          {error && <p className={ws.formError} role="alert">{error}</p>}
          {message && <p className={ws.notice}>{message}</p>}
          <button type="submit" className={ws.btnPrimary} disabled={loading}>
            {loading ? 'Updating…' : 'Update password'}
          </button>
        </form>
      </SettingsField>
    </SettingsFields>
  );
}

export function SettingsSessionsSection() {
  return (
    <SettingsFields>
      <SettingsField
        label="Active sessions"
        description="Review devices signed in to your recruiter account."
      >
        <SettingsSoonBadge />
      </SettingsField>
      <SettingsField
        label="Remote sign-out"
        description="Sign out from other browsers and devices when you leave a shared machine."
      >
        <p className={ws.settingsInlineMuted}>Session management will appear here.</p>
      </SettingsField>
    </SettingsFields>
  );
}

export function SettingsWorkspaceSection() {
  return (
    <SettingsFields>
      <SettingsField
        label="Default pipeline view"
        description="Choose how the hiring board opens for your team."
      >
        <SettingsSoonBadge />
      </SettingsField>
      <SettingsField
        label="Applicant sorting"
        description="Set the default order for new candidates in lists and queues."
      >
        <SettingsSoonBadge />
      </SettingsField>
      <SettingsField
        label="Review reminders"
        description="Surface candidates waiting longer than your target response time."
      >
        <SettingsSoonBadge />
      </SettingsField>
    </SettingsFields>
  );
}

export function SettingsNotificationsSection() {
  const rows = [
    { label: 'New applicants', description: 'When someone applies to an active role.' },
    { label: 'Candidate messages', description: 'When a candidate replies in your inbox.' },
    { label: 'Interview reminders', description: 'Before scheduled interviews on your calendar.' },
    { label: 'Weekly hiring digest', description: 'Pipeline summary and roles needing attention.' },
  ];

  return (
    <SettingsFields>
      {rows.map((row) => (
        <SettingsField key={row.label} label={row.label} description={row.description}>
          <div className={ws.settingsTogglePlaceholder}>
            <span className={ws.settingsToggleTrack} aria-hidden />
            <SettingsSoonBadge />
          </div>
        </SettingsField>
      ))}
    </SettingsFields>
  );
}

export function SettingsCompanySection() {
  return (
    <SettingsFields>
      <SettingsField
        label="Employer brand"
        description="Logo, cover image, culture, benefits, and your hiring story."
      >
        <Link to="/portal/company" className={ws.btnPrimary}>Edit company profile</Link>
      </SettingsField>
      <SettingsField
        label="Public company page"
        description="Candidates see this when they view your roles and applications."
      >
        <ul className={ws.settingsFeatureList}>
          <li>Logo & cover image</li>
          <li>Culture, benefits & hiring philosophy</li>
          <li>Website & social links</li>
        </ul>
      </SettingsField>
    </SettingsFields>
  );
}

export function SettingsTeamSection() {
  return (
    <SettingsFields>
      <SettingsField
        label="Team members"
        description="Invite recruiters and hiring managers to your workspace."
      >
        <SettingsSoonBadge />
      </SettingsField>
      <SettingsField
        label="Roles & permissions"
        description="Control who can publish jobs, move pipeline stages, and message candidates."
      >
        <p className={ws.settingsInlineMuted}>Team management will appear here.</p>
      </SettingsField>
    </SettingsFields>
  );
}

export function SettingsIntegrationsSection() {
  return (
    <SettingsFields>
      <SettingsField
        label="Calendar"
        description="Sync interview schedules with Google Calendar or Outlook."
      >
        <SettingsSoonBadge />
      </SettingsField>
      <SettingsField
        label="Applicant tracking"
        description="Export candidates or connect external ATS tools."
      >
        <SettingsSoonBadge />
      </SettingsField>
      <SettingsField
        label="Messaging"
        description="Extend inbox with email forwarding and templates."
      >
        <SettingsSoonBadge />
      </SettingsField>
    </SettingsFields>
  );
}

export function SettingsBillingSection() {
  return (
    <SettingsFields>
      <SettingsField
        label="Plan & usage"
        description="Your subscription tier and active job campaign limits."
      >
        <SettingsSoonBadge />
      </SettingsField>
      <SettingsField
        label="Invoices"
        description="Download receipts and manage payment methods."
      >
        <p className={ws.settingsInlineMuted}>Billing details will appear here.</p>
      </SettingsField>
    </SettingsFields>
  );
}
