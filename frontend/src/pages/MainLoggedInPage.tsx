import React from 'react';
import LoggedInLayout from '../components/user/LoggedInLayout';
import CategorySidebar from '../components/home/CategorySidebar';
import HomeFeed from '../components/home/HomeFeed';
import HonorSidebar from '../components/home/HonorSidebar';
import { categories, quickFilters } from '../data/homeData';

interface MainLoggedInPageProps {
  readonly className?: string;
}

/** Stitch screen: "메인 페이지 (로그인 상태)" (4ab0de7f99b247548df208300f2630c6) */
export const MainLoggedInPage: React.FC<MainLoggedInPageProps> = () => (
  <LoggedInLayout>
    <div className="grid grid-cols-12 gap-5 xl:gap-6 items-start">
      <CategorySidebar categories={categories} quickFilters={quickFilters} />
      <HomeFeed />
      <HonorSidebar />
    </div>
  </LoggedInLayout>
);

export default MainLoggedInPage;
