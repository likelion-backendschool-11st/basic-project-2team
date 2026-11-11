import { useState } from 'react';

export function useCategory(initialId: string) {
  const [activeId, setActiveId] = useState(initialId);
  return { activeId, select: setActiveId };
}
