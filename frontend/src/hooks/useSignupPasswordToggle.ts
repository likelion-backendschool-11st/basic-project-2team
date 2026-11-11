import { useState } from 'react';

/** Masks/unmasks a signup password input. */
export function useSignupPasswordToggle(initialVisible = false) {
  const [visible, setVisible] = useState(initialVisible);
  const toggle = () => setVisible((v) => !v);
  return { visible, toggle };
}
