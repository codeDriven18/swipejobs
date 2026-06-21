import { useCallback, useEffect, useState } from 'react';
import {
  SettingsAccountSection,
  SettingsBillingSection,
  SettingsCompanySection,
  SettingsIntegrationsSection,
  SettingsNotificationsSection,
  SettingsSecuritySection,
  SettingsSessionsSection,
  SettingsTeamSection,
  SettingsWorkspaceSection,
} from '@/portal/components/SettingsSections';
import { SettingsThemePicker } from '@/portal/components/SettingsThemePicker';
import { PageFrame } from '@/portal/components/PageFrame';
import ws from '@/portal/workspace.module.css';

type SettingsSectionId =
  | 'account'
  | 'security'
  | 'sessions'
  | 'workspace'
  | 'notifications'
  | 'company'
  | 'team'
  | 'integrations'
  | 'billing';

interface SettingsSectionDef {
  id: SettingsSectionId;
  label: string;
  description: string;
}

interface SettingsNavGroup {
  label: string;
  items: SettingsSectionDef[];
}

const NAV_GROUPS: SettingsNavGroup[] = [
  {
    label: 'Account',
    items: [
      { id: 'account', label: 'Account', description: 'Profile, email, and sign-in.' },
      { id: 'security', label: 'Security', description: 'Password and account protection.' },
      { id: 'sessions', label: 'Sessions', description: 'Devices signed in to your account.' },
    ],
  },
  {
    label: 'Workspace',
    items: [
      { id: 'workspace', label: 'Workspace', description: 'Hiring defaults and recruiter preferences.' },
      { id: 'notifications', label: 'Notifications', description: 'Alerts for applicants and messages.' },
    ],
  },
  {
    label: 'Organization',
    items: [
      { id: 'company', label: 'Company', description: 'Employer brand and public profile.' },
      { id: 'team', label: 'Team members', description: 'Invite recruiters and manage access.' },
    ],
  },
  {
    label: 'Billing & integrations',
    items: [
      { id: 'billing', label: 'Billing', description: 'Plan, invoices, and payment methods.' },
      { id: 'integrations', label: 'Integrations', description: 'Calendar, ATS, and messaging tools.' },
    ],
  },
];

const ALL_SECTIONS = NAV_GROUPS.flatMap((group) => group.items);

const VALID_IDS = new Set(ALL_SECTIONS.map((s) => s.id));

function readSectionFromHash(): SettingsSectionId {
  const hash = window.location.hash.replace(/^#/, '') as SettingsSectionId;
  return VALID_IDS.has(hash) ? hash : 'account';
}

function renderSectionContent(id: SettingsSectionId) {
  switch (id) {
    case 'account':
      return <SettingsAccountSection />;
    case 'security':
      return <SettingsSecuritySection />;
    case 'sessions':
      return <SettingsSessionsSection />;
    case 'workspace':
      return <SettingsWorkspaceSection />;
    case 'notifications':
      return <SettingsNotificationsSection />;
    case 'company':
      return <SettingsCompanySection />;
    case 'team':
      return <SettingsTeamSection />;
    case 'integrations':
      return <SettingsIntegrationsSection />;
    case 'billing':
      return <SettingsBillingSection />;
    default:
      return null;
  }
}

export function SettingsPage() {
  const [active, setActive] = useState<SettingsSectionId>(readSectionFromHash);
  const current = ALL_SECTIONS.find((s) => s.id === active) ?? ALL_SECTIONS[0];

  const selectSection = useCallback((id: SettingsSectionId) => {
    setActive(id);
    const nextHash = `#${id}`;
    if (window.location.hash !== nextHash) {
      window.history.replaceState(null, '', nextHash);
    }
  }, []);

  useEffect(() => {
    const onHashChange = () => setActive(readSectionFromHash());
    window.addEventListener('hashchange', onHashChange);
    if (!window.location.hash) {
      window.history.replaceState(null, '', '#account');
    }
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  return (
    <PageFrame>
      <header className={ws.settingsPageHeader}>
        <div>
          <p className={ws.homeEyebrow}>Workspace</p>
          <h2 className={ws.settingsPageTitle}>Settings</h2>
          <p className={ws.settingsPageLead}>Account, hiring preferences, and organization controls.</p>
        </div>
      </header>

      <div className={ws.settingsShell}>
        <aside className={ws.settingsAside}>
          <nav className={ws.settingsNav} aria-label="Settings sections">
            {NAV_GROUPS.map((group) => (
              <div key={group.label} className={ws.settingsNavGroup}>
                <p className={ws.settingsNavGroupLabel}>{group.label}</p>
                {group.items.map((section) => (
                  <button
                    key={section.id}
                    type="button"
                    className={[ws.settingsNavItem, active === section.id ? ws.settingsNavItemActive : ''].filter(Boolean).join(' ')}
                    onClick={() => selectSection(section.id)}
                    aria-current={active === section.id ? 'page' : undefined}
                  >
                    {section.label}
                  </button>
                ))}
              </div>
            ))}
          </nav>
          <SettingsThemePicker />
        </aside>

        <section className={ws.settingsContent} aria-labelledby="settings-section-title">
          <header className={ws.settingsContentHeader}>
            <h3 id="settings-section-title" className={ws.settingsContentTitle}>{current.label}</h3>
            <p className={ws.settingsContentLead}>{current.description}</p>
          </header>
          {renderSectionContent(current.id)}
        </section>
      </div>
    </PageFrame>
  );
}
