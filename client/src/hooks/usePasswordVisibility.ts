import { useCallback, useState } from 'react';

export function usePasswordVisibility(initialVisible = false) {
  const [visible, setVisible] = useState(initialVisible);

  const toggleVisibility = useCallback(() => {
    setVisible((current) => !current);
  }, []);

  return {
    visible,
    inputType: visible ? 'text' : 'password',
    toggleVisibility,
  } as const;
}
