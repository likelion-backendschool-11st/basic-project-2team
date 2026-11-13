import React from 'react';
import AppLayout from '../components/layout/AppLayout';
import CategorySidebar from '../components/home/CategorySidebar';
import HomeFeed from '../components/home/HomeFeed';
import HonorSidebar from '../components/home/HonorSidebar';
import { quickFilters } from '../data/homeData';
import { useMannerRanking } from '../hooks/useMannerRanking';

interface MainPageProps {
  readonly className?: string;
}

/** Stitch screen: "OurParty 메인 페이지" (bf7a8121fcba4d2e973fbf71e18ba176) */
export const MainPage: React.FC<MainPageProps> = () => {
  const ranking = useMannerRanking();
  return (
    <AppLayout>
      <div className="grid grid-cols-12 gap-5 xl:gap-6 items-start">
        <CategorySidebar quickFilters={quickFilters} />
        <HomeFeed />
        <HonorSidebar leaders={ranking.leaders} members={ranking.members} leadersNotice={ranking.notice} />
      </div>
    </AppLayout>
  );
};

export default MainPage;
