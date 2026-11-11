import { useState } from 'react';

export function useTabs<T extends string>(initial: T) {
  const [activeTab, setActiveTab] = useState<T>(initial);
  return {
    activeTab,
    selectTab: setActiveTab,
    isActive: (id: T) => id === activeTab,
  };
}
