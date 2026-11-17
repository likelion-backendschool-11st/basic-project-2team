import React from 'react';
import { Link } from 'react-router-dom';
import type { InvitablePost, InviteTarget } from '../../data/myPageData';
import { inviteText } from '../../data/myPageData';
import { ROUTES, paths } from '../../data/routes';
import Modal from '../ui/Modal';
import GameBadge from './GameBadge';

interface PartyInviteModalProps {
  readonly target: InviteTarget | null;
  readonly posts: readonly InvitablePost[];
  readonly loading: boolean;
  readonly error: string | null;
  readonly sendingPostId: number | null;
  readonly isInvited: (postId: number) => boolean;
  readonly onInvite: (postId: number) => void;
  readonly onClose: () => void;
}

/** 최근 함께한 플레이어 · 댓글 작성자를 모집 중인 내 공고에 초대하는 모달 */
export const PartyInviteModal: React.FC<PartyInviteModalProps> = ({ target, posts, loading, error, sendingPostId, isInvited, onInvite, onClose }) => {
  const t = inviteText;
  let body: React.ReactNode;
  if (loading) body = <p className="py-8 text-center text-sm text-slate-400">{t.loading}</p>;
  else if (error) body = <p className="py-8 text-center text-sm text-rose-300">{error}</p>;
  else if (posts.length === 0) {
    body = (
      <div className="py-8 flex flex-col items-center gap-3 text-sm text-slate-400">
        {t.empty}
        <Link to={ROUTES.postWrite} className="text-mercury-light font-semibold hover:underline">
          {t.write}
        </Link>
      </div>
    );
  } else {
    body = (
      <ul className="flex flex-col gap-2 max-h-80 overflow-y-auto pr-1">
        {posts.map((post) => {
          const invited = isInvited(post.id);
          const sending = sendingPostId === post.id;
          return (
            <li key={post.id} className="flex items-center gap-3 rounded-xl border border-night-borderLight bg-night-card px-3 py-2.5">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <GameBadge label={post.game} accent={post.accent} />
                  <span className="text-[11px] text-slate-400">{post.members}</span>
                </div>
                <Link to={paths.postDetail(String(post.id))} className="mt-1 block text-sm font-semibold text-slate-200 truncate hover:text-mercury-light" title={post.title}>
                  {post.title}
                </Link>
              </div>
              <button
                type="button"
                onClick={() => onInvite(post.id)}
                disabled={invited || sendingPostId !== null}
                className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                  invited ? 'bg-emerald-500/15 text-emerald-300 cursor-default' : 'bg-mercury hover:bg-mercury-light text-white disabled:opacity-60'
                }`}
              >
                {invited ? t.invited : sending ? t.inviting : t.invite}
              </button>
            </li>
          );
        })}
      </ul>
    );
  }

  return (
    <Modal isOpen={target !== null} onClose={onClose} ariaLabel={t.ariaLabel} widthClass="max-w-lg">
      <div className="flex flex-col gap-2">
        <h2 className="text-lg font-bold text-white flex items-center gap-2">
          <i className="fa-solid fa-paper-plane text-mercury-light" aria-hidden />
          {target ? t.title(target.name) : t.ariaLabel}
        </h2>
        <p className="text-xs text-fog-sub leading-relaxed">{t.description}</p>
      </div>
      <div className="mt-5">{body}</div>
      <button
        type="button"
        onClick={onClose}
        className="mt-5 w-full h-11 rounded-xl border border-night-borderLight text-sm font-semibold text-fog-sub hover:text-white hover:bg-white/5"
      >
        {t.close}
      </button>
    </Modal>
  );
};

export default PartyInviteModal;
