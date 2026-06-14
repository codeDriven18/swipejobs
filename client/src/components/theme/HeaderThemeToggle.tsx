import { useTheme } from '@/theme/ThemeProvider';
import styles from './HeaderThemeToggle.module.css';

export function HeaderThemeToggle() {
  const { mode, toggleMode } = useTheme();

  return (
    <button
      type="button"
      className={styles.toggle}
      onClick={toggleMode}
      aria-label={mode === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
      title={mode === 'dark' ? 'Light mode' : 'Dark mode'}
    >
      <span aria-hidden="true">{mode === 'dark' ? '☀' : '☾'}</span>
    </button>
  );
}
