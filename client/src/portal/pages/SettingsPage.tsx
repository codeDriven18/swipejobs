import { Link } from 'react-router-dom';
import { AccountSettingsPage } from '@/pages/Auth/AccountSettingsPage';
import { PageFrame, Panel } from '@/portal/components/PageFrame';
import ws from '@/portal/workspace.module.css';

const SECONDARY_SETTINGS = [
  { title: 'Notifications', description: 'Email and in-app alerts for new applicants and messages.', status: 'Coming soon' },
  { title: 'Team members', description: 'Invite recruiters and assign roles to your hiring team.', status: 'Coming soon' },
  { title: 'Company preferences', description: 'Default pipeline rules and hiring templates.', status: 'Coming soon' },
  { title: 'Integrations', description: 'Calendar, email, and ATS connections.', status: 'Coming soon' },
  { title: 'Billing', description: 'Plans, invoices, and payment methods.', status: 'Coming soon' },
] as const;

export function SettingsPage() {
  return (
    <PageFrame
      meta="Account and workspace configuration"
      actions={<Link to="/portal" className={ws.btnGhost}>Command center</Link>}
    >
      <div className={ws.settingsGrid}>
        <Panel title="Account & security">
          <AccountSettingsPage hideHeader />
        </Panel>

        {SECONDARY_SETTINGS.map((item) => (
          <Panel key={item.title} muted>
            <h3 className={ws.candidateName}>{item.title}</h3>
            <p className={ws.candidateSub}>{item.description}</p>
            <span className={ws.badgeMuted}>{item.status}</span>
          </Panel>
        ))}
      </div>
    </PageFrame>
  );
}
