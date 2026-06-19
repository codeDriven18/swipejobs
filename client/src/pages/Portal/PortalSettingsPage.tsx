import { AccountSettingsPage } from '@/pages/Auth/AccountSettingsPage';
import ui from '@/components/employer/ui/employerUi.module.css';

export function PortalSettingsPage() {
  return (
    <section className={ui.page}>
      <h1 className={ui.sectionTitle}>Settings</h1>
      <div className={ui.settingsWrap}>
        <AccountSettingsPage hideHeader />
      </div>
    </section>
  );
}
