import React from 'react';
import LoggedInLayout from '../components/user/LoggedInLayout';
import AccountMenu from '../components/mypage/AccountMenu';
import ProfileSummaryCard from '../components/mypage/ProfileSummaryCard';
import ActivitySection from '../components/mypage/ActivitySection';
import FavoriteUsersSection from '../components/mypage/FavoriteUsersSection';
import ReviewModal from '../components/review/ReviewModal';
import { accountMenu, activityComments, activityPosts, favoriteUsers, profileSummary } from '../data/myPageData';
import { useModal } from '../hooks/useModal';
import { useActivityPosts } from '../hooks/useActivityPosts';

interface MyPageProps {
  readonly className?: string;
}

/** Stitch screen: "마이페이지" (039af8fe5b43489da44f096130276df6) */
export const MyPage: React.FC<MyPageProps> = () => {
  const review = useModal();
  const { posts, completePost } = useActivityPosts(activityPosts, review.open);

  return (
    <LoggedInLayout contained={false}>
      <div className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col md:flex-row gap-6">
          <AccountMenu title={accountMenu.title} ariaLabel={accountMenu.ariaLabel} items={accountMenu.items} />
          <section aria-label={accountMenu.contentAriaLabel} className="flex-1 flex flex-col gap-6 min-w-0">
            <ProfileSummaryCard profile={profileSummary} />
            <ActivitySection posts={posts} comments={activityComments} onCompletePost={completePost} />
            <FavoriteUsersSection users={favoriteUsers} />
          </section>
        </div>
      </div>
      <ReviewModal isOpen={review.isOpen} onClose={review.close} />
    </LoggedInLayout>
  );
};

export default MyPage;
