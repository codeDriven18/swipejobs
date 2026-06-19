import { Link } from 'react-router-dom';
import { AccountSettingsPage } from '@/pages/Auth/AccountSettingsPage';
import ui from '@/components/employer/ui/employerUi.module.css';
import layout from '@/styles/employerComposition.module.css';

const SECONDARY_SETTINGS = [
  { title: 'Notifications', description: 'Email and in-app alerts for new applicants and messages.', status: 'Coming soon' },
  { title: 'Team members', description: 'Invite recruiters and assign roles to your hiring team.', status: 'Coming soon' },
  { title: 'Company preferences', description: 'Default pipeline rules and hiring templates.', status: 'Coming soon' },
  { title: 'Integrations', description: 'Calendar, email, and ATS connections.', status: 'Coming soon' },
  { title: 'Billing', description: 'Plans, invoices, and payment methods.', status: 'Coming soon' },
] as const;

export function PortalSettingsPage() {
  return (
    <section className={ui.page}>
      <header className={layout.workspaceSectionHeader}>
        <div>
          <h1 className={ui.workboardToolbarTitle}>Settings</h1>
          <p className={ui.workboardToolbarMeta}>Account and workspace configuration</p>
        </div>
        <Link to="/portal" className={ui.btnGhost}>Back to dashboard</Link>
      </header>

      <div className={`${layout.settingsGrid} ${layout.settingsGridWide}`}>
        <article className={ui.surface} style={{ padding: 'var(--employer-space-block)' }}>
          <h2 className={ui.profileSectionTitle}>Account & security</h2>
          <AccountSettingsPage hideHeader />
        </article>

        <div className={layout.workspaceSection}>
          {SECONDARY_SETTINGS.map((item) => (
            <article key={item.title} className={ui.surfaceMuted} style={{ padding: 'var(--employer-space-block)' }}>
              <h2 className={ui.candidateName}>{item.title}</h2>
              <p className={ui.candidateDetail}>{item.description}</p>
              <span className={ui.badgeMuted}>{item.status}</span>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
