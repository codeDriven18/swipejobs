import type { ReactNode } from 'react';
import ws from '@/portal/workspace.module.css';

export function SettingsField({
  label,
  description,
  children,
}: {
  label: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <div className={ws.settingsField}>
      <div className={ws.settingsFieldMeta}>
        <p className={ws.settingsFieldLabel}>{label}</p>
        {description && <p className={ws.settingsFieldDesc}>{description}</p>}
      </div>
      <div className={ws.settingsFieldControl}>{children}</div>
    </div>
  );
}

export function SettingsFields({ children }: { children: ReactNode }) {
  return <div className={ws.settingsFields}>{children}</div>;
}

export function SettingsSoonBadge() {
  return <span className={ws.settingsSoonBadge}>Coming soon</span>;
}
