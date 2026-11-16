import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { toProfileSummary } from '../../api/mypageApi';
import { memberProfileText } from '../../data/myPageData';
import { paths } from '../../data/routes';
import { commentText } from '../../data/commentData';
import type { CommentAuthorProfile } from '../../hooks/useComments';
import ProfileSummaryCard from '../mypage/ProfileSummaryCard';

interface UserPopoverProps {
  /** GET /api/members/{memberId} 결과. 불러오는 중이면 'loading', 실패하면 'error' */
  readonly profile: CommentAuthorProfile;
  readonly onAction: (message: string) => void;
  readonly onClose: () => void;
}

/** 댓글 작성자 프로필 카드(작성자 줄 아래에 뜨는 창): 마이페이지 프로필 카드와 같은 구성 + 파티 초대하기 */
export const UserPopover: React.FC<UserPopoverProps> = ({ profile, onAction, onClose }) => {
  const t = commentText.popover;
  const summary = useMemo(() => (typeof profile === 'object' ? toProfileSummary(profile) : null), [profile]);
  return (
    <div role="dialog" aria-label={t.title} className="absolute inset-x-0 top-full z-30 mt-2 rounded-xl border border-mercury/30 bg-night-card p-5 shadow-2xl">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2 text-sm font-bold text-white">
          {t.title}
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-mercury/20 text-mercury-light font-semibold">{t.badge}</span>
        </div>
        <button type="button" aria-label="닫기" onClick={onClose} className="text-fog-sub hover:text-white"><i className="fa-solid fa-xmark" /></button>
      </div>
      {summary ? (
        <ProfileSummaryCard profile={summary} framed={false} />
      ) : (
        <p className={`py-6 text-center text-sm ${profile === 'error' ? 'text-rose-300' : 'text-fog-muted'}`}>
          {profile === 'error' ? t.loadFailed : t.loading}
        </p>
      )}
      <div className="mt-4 flex items-center justify-end gap-2">
        {typeof profile === 'object' && (
          <Link to={paths.memberProfile(profile.id)} className="flex items-center gap-2 rounded-lg border border-night-borderLight px-4 py-2 text-xs font-semibold text-fog-sub hover:text-white hover:bg-white/5">
            <i className="fa-regular fa-id-card" />{memberProfileText.viewProfile}
          </Link>
        )}
        {/* 초대 API 가 아직 없어 안내 토스트만 띄웁니다. */}
        <button
          type="button"
          disabled={!summary}
          onClick={() => { onAction(t.invited); onClose(); }}
          className="flex items-center gap-2 rounded-lg bg-mercury px-4 py-2 text-xs font-bold text-white hover:bg-mercury-light disabled:opacity-40 disabled:pointer-events-none"
        >
          <i className="fa-solid fa-user-plus" />{t.invite}
        </button>
      </div>
    </div>
  );
};

export default UserPopover;
