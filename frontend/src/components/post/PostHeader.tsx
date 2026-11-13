import React from 'react';
import { Link } from 'react-router-dom';
import type { PostDetail } from '../../data/postData';
import { postText } from '../../data/postData';
import { ROUTES } from '../../data/routes';
import type { PartyState } from '../../hooks/usePostDetail';

interface PostHeaderProps {
  readonly detail: PostDetail;
  readonly filled: number;
  readonly state: PartyState;
  readonly scrapped: boolean;
  readonly onScrap: () => void;
  readonly onShare: () => void;
  readonly onEdit: () => void;
  readonly onRemove: () => void;
}

const chip = 'px-2.5 py-1 rounded-md text-[11px] font-bold border';

export const PostHeader: React.FC<PostHeaderProps> = ({ detail, filled, state, scrapped, onScrap, onShare, onEdit, onRemove }) => (
  <section className="rounded-2xl border border-night-borderLight bg-night-surface p-6">
    <div className="flex items-center justify-between gap-3 mb-4">
      <Link to={ROUTES.board} className="text-sm text-fog-sub hover:text-white flex items-center gap-2"><i className="fa-solid fa-arrow-left" />{postText.back}</Link>
      {detail.isOwner ? (
        <div className="flex items-center gap-2">
          <button type="button" onClick={onEdit} className="px-4 py-2 rounded-xl border border-night-borderLight text-sm font-semibold text-white hover:bg-white/5 flex items-center gap-2"><i className="fa-solid fa-pen text-mercury-light" />{postText.edit}</button>
          <button type="button" onClick={onRemove} className="px-4 py-2 rounded-xl border border-roseAccent/40 bg-roseAccent/10 text-sm font-semibold text-rose-300 hover:bg-roseAccent/20 flex items-center gap-2"><i className="fa-regular fa-trash-can" />{postText.remove}</button>
        </div>
      ) : (
        <div className="flex items-center gap-2 text-xs">
          <button type="button" onClick={onShare} className="px-3 py-2 rounded-lg border border-night-borderLight text-fog-headline hover:bg-white/5 flex items-center gap-1.5"><i className="fa-solid fa-share-nodes" />{postText.share}</button>
          <button type="button" aria-pressed={scrapped} onClick={onScrap} className={`px-3 py-2 rounded-lg border flex items-center gap-1.5 ${scrapped ? 'border-mercury bg-mercury/20 text-white' : 'border-night-borderLight text-fog-headline hover:bg-white/5'}`}><i className="fa-solid fa-bookmark" />{detail.scrapCount}</button>
        </div>
      )}
    </div>
    <div className="flex flex-wrap items-center gap-2 mb-3">
      <span className={`${chip} bg-indigo-500/15 text-indigo-300 border-indigo-500/30`}>{detail.game}</span>
      <span className={`${chip} bg-rose-500/15 text-rose-300 border-rose-500/30`}>{detail.raid}</span>
      {state === 'open' && <span className={`${chip} bg-emerald-500/10 text-emerald-300 border-emerald-500/20`}>● {postText.recruiting(filled, detail.max)}</span>}
      {state === 'closed' && <span className={`${chip} bg-slate-500/20 text-slate-300 border-slate-500/30`}>{postText.closedBadge}</span>}
      {state === 'open' && filled === detail.max - 1 && <span className={`${chip} bg-rose-500/10 text-rose-300 border-rose-500/20`}>⏰ {postText.almostFull}</span>}
    </div>
    <h1 className="text-2xl md:text-3xl font-bold text-white leading-snug">{detail.title}</h1>
    <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-xs text-fog-muted">
      <div className="flex items-center gap-3">
        <span className="w-10 h-10 rounded-xl bg-night-card flex items-center justify-center text-mercury-light"><i className="fa-solid fa-shield-halved" /></span>
        <div>
          <div className="text-sm text-white font-semibold flex items-center gap-2">
            {detail.isOwner && <span className="text-fog-muted font-normal">{postText.hostLabel}</span>}
            {detail.host.name}
            <span className="text-[10px] px-1.5 rounded bg-mercury/20 text-mercury-light">Lv.{detail.host.level}</span>
            <span className="text-[10px] px-1.5 rounded bg-emeraldAccent/15 text-emerald-300">매너 {detail.host.manner}</span>
          </div>
          <div>{detail.host.record}</div>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <span><i className="fa-regular fa-eye mr-1" />{detail.views}회</span>
        <span><i className="fa-regular fa-clock mr-1" />{detail.postedAgo} 등록</span>
      </div>
    </div>
  </section>
);

export default PostHeader;
