import { AccountSettingsPage } from '@/pages/Auth/AccountSettingsPage';
import { EmployerPageHeader } from '@/components/employer/EmployerPageHeader';
import ui from '@/components/employer/ui/employerUi.module.css';

export function PortalSettingsPage() {
  return (
    <section className={ui.page}>
      <EmployerPageHeader title="Settings" subtitle="Account and security — secondary to your hiring work." />
      <div className={ui.settingsWrap}>
        <AccountSettingsPage hideHeader />
      </div>
    </section>
  );
}
