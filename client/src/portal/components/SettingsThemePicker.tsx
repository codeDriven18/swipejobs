import { useTheme } from '@/theme/ThemeProvider';
import type { ThemePreference } from '@/theme/theme';
import ws from '@/portal/workspace.module.css';

const OPTIONS: { id: ThemePreference; label: string; hint: string }[] = [
  { id: 'light', label: 'Light', hint: 'Bright workspace' },
  { id: 'dark', label: 'Dark', hint: 'Low-glare focus' },
  { id: 'system', label: 'System', hint: 'Match device' },
];

export function SettingsThemePicker() {
  const { preference, setPreference } = useTheme();

  return (
    <div className={ws.settingsNavTheme}>
      <p className={ws.settingsNavThemeLabel}>Theme</p>
      <div className={ws.settingsThemeSegment} role="group" aria-label="Interface theme">
        {OPTIONS.map((option) => (
          <button
            key={option.id}
            type="button"
            className={[ws.settingsThemeChip, preference === option.id ? ws.settingsThemeChipActive : ''].filter(Boolean).join(' ')}
            onClick={() => setPreference(option.id)}
            aria-pressed={preference === option.id}
            title={option.hint}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}
