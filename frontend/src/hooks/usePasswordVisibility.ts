import { useCallback, useState } from 'react';

/** Toggles a password input between masked and visible. */
export function usePasswordVisibility(initialVisible = false) {
  const [visible, setVisible] = useState(initialVisible);
  const toggle = useCallback(() => setVisible((v) => !v), []);
  return { visible, toggle, inputType: visible ? 'text' : 'password' } as const;
}
