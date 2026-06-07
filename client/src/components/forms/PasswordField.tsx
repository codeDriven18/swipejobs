import type { InputHTMLAttributes } from 'react';
import { forwardRef } from 'react';
import { usePasswordVisibility } from '@/hooks/usePasswordVisibility';
import styles from './PasswordField.module.css';

function EyeIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className={styles.icon}>
      <path
        d="M2.25 12S5.75 5.25 12 5.25 21.75 12 21.75 12 18.25 18.75 12 18.75 2.25 12 2.25 12Z"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M12 15.25A3.25 3.25 0 1 0 12 8.75a3.25 3.25 0 0 0 0 6.5Z"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className={styles.icon}>
      <path
        d="M3 3l18 18"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M10.58 10.58A3.25 3.25 0 0 0 12 15.25c.42 0 .83-.08 1.2-.22"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M6.23 6.23C4.2 7.67 2.84 9.78 2.25 12c0 0 3.5 6.75 9.75 6.75 1.48 0 2.84-.27 4.08-.73"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M9.88 4.64A10.28 10.28 0 0 1 12 4.25C18.25 4.25 21.75 12 21.75 12a18.19 18.19 0 0 1-3.17 4.58"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export interface PasswordFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  inputClassName?: string;
  wrapperClassName?: string;
}

export const PasswordField = forwardRef<HTMLInputElement, PasswordFieldProps>(function PasswordField(
  { inputClassName = '', wrapperClassName = '', style, ...props },
  ref,
) {
  const { visible, inputType, toggleVisibility } = usePasswordVisibility();

  return (
    <div className={`${styles.wrapper} ${wrapperClassName}`.trim()}>
      <input
        {...props}
        ref={ref}
        type={inputType}
        className={`${styles.input} ${inputClassName}`.trim()}
        style={{ paddingRight: '5rem', ...style }}
      />
      <button
        type="button"
        className={styles.toggle}
        onClick={toggleVisibility}
        aria-label={visible ? 'Hide password' : 'Show password'}
        aria-pressed={visible}
      >
        {visible ? <EyeOffIcon /> : <EyeIcon />}
        <span className={styles.label}>{visible ? 'Hide' : 'Show'}</span>
      </button>
    </div>
  );
});
