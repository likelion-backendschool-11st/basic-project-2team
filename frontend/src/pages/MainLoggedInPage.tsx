import React from 'react';
import LoggedInLayout from '../components/user/LoggedInLayout';
import CategorySidebar from '../components/home/CategorySidebar';
import HomeFeed from '../components/home/HomeFeed';
import HonorSidebar from '../components/home/HonorSidebar';
import { quickFilters } from '../data/homeData';
import { useMannerRanking } from '../hooks/useMannerRanking';

interface MainLoggedInPageProps {
  readonly className?: string;
}

/** Stitch screen: "메인 페이지 (로그인 상태)" (4ab0de7f99b247548df208300f2630c6) */
export const MainLoggedInPage: React.FC<MainLoggedInPageProps> = () => {
  const ranking = useMannerRanking();
  return (
    <LoggedInLayout>
      <div className="grid grid-cols-12 gap-5 xl:gap-6 items-start">
        <CategorySidebar quickFilters={quickFilters} />
        <HomeFeed />
        <HonorSidebar leaders={ranking.leaders} members={ranking.members} leadersNotice={ranking.notice} />
      </div>
    </LoggedInLayout>
  );
};

export default MainLoggedInPage;
