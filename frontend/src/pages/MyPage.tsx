import React from 'react';
import LoggedInLayout from '../components/user/LoggedInLayout';
import AccountMenu from '../components/mypage/AccountMenu';
import ProfileSummaryCard from '../components/mypage/ProfileSummaryCard';
import ActivitySection from '../components/mypage/ActivitySection';
import FavoriteUsersSection from '../components/mypage/FavoriteUsersSection';
import ReviewModal from '../components/review/ReviewModal';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import Toast from '../components/ui/Toast';
import { accountMenu, completeText, profileText } from '../data/myPageData';
import { reviewEmptyDefaults } from '../data/reviewData';
import { useMyPage } from '../hooks/useMyPage';

interface MyPageProps {
  readonly className?: string;
}

/** Stitch screen: "마이페이지" (039af8fe5b43489da44f096130276df6) */
export const MyPage: React.FC<MyPageProps> = () => {
  const page = useMyPage();
  const { profile, activity, favorites, review, complete } = page;

  return (
    <LoggedInLayout contained={false}>
      <div className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col md:flex-row gap-6">
          <AccountMenu title={accountMenu.title} ariaLabel={accountMenu.ariaLabel} items={accountMenu.items} />
          <section aria-label={accountMenu.contentAriaLabel} className="flex-1 flex flex-col gap-6 min-w-0">
            {profile.profile ? (
              <ProfileSummaryCard profile={profile.profile} />
            ) : (
              <div className="bg-night-surface border border-night-borderLight rounded-2xl p-10 text-center text-sm text-slate-400">
                {profile.error ?? profileText.loading}
                {profile.error && (
                  <button type="button" onClick={profile.reload} className="ml-3 text-mercury-light font-semibold hover:underline">
                    {profileText.retry}
                  </button>
                )}
              </div>
            )}
            <ActivitySection
              tab={activity.tab}
              isActive={activity.isActive}
              onSelectTab={activity.selectTab}
              posts={activity.posts}
              comments={activity.comments}
              totalCount={activity.totalCount}
              loading={activity.loading}
              error={activity.error}
              actionDisabled={review.opening}
              onPostAction={page.onPostAction}
              pager={activity.pager}
            />
            <FavoriteUsersSection users={favorites.users} loading={favorites.loading} onRemove={(u) => void favorites.remove(u)} />
          </section>
        </div>
      </div>
      <ConfirmDialog
        isOpen={complete.isOpen}
        title={completeText.title}
        description={completeText.description}
        confirmLabel={complete.completing ? completeText.confirming : completeText.confirm}
        cancelLabel={completeText.cancel}
        icon="fa-flag-checkered"
        tone="brand"
        onConfirm={complete.confirm}
        onCancel={complete.cancel}
      />
      <ReviewModal
        isOpen={review.isOpen}
        onClose={review.close}
        onComplete={review.complete}
        members={review.members}
        tags={review.tags}
        initialValues={reviewEmptyDefaults}
        onSubmitted={review.submit}
        errorMessage={review.errorMessage}
      />
      <Toast message={page.toast.message} />
    </LoggedInLayout>
  );
};

export default MyPage;
