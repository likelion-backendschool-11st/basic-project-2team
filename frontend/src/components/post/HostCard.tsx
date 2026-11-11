import React from 'react';
import type { PostDetail } from '../../data/postData';
import { postText } from '../../data/postData';

interface HostCardProps {
  readonly host: PostDetail['host'];
  readonly following: boolean;
  readonly onFollow: () => void;
}

export const HostCard: React.FC<HostCardProps> = ({ host, following, onFollow }) => (
  <section className="rounded-2xl border border-night-borderLight bg-night-surface p-5 flex flex-col gap-3">
    <div className="flex items-center justify-between"><h2 className="text-sm font-bold text-white">{postText.hostProfile}</h2><span className="text-[10px] font-bold px-2 py-0.5 rounded bg-mercury/15 text-mercury-light">{postText.topLeader}</span></div>
    <div className="flex items-center gap-3">
      <span className="w-12 h-12 rounded-full bg-night-card flex items-center justify-center text-lg font-bold text-white">{host.name[0]}</span>
      <div><div className="font-bold text-white text-lg">{host.name}</div><div className="text-xs text-fog-muted">로스트아크 카제로스 서버</div></div>
    </div>
    <div>
      <div className="flex justify-between text-xs"><span className="text-fog-muted">{postText.mannerTemp}</span><span className="font-bold text-emerald-300">{host.manner} (극상)</span></div>
      <div className="h-2 rounded-full bg-night-base mt-1.5 overflow-hidden"><div className="h-full w-[99%] bg-emeraldAccent" /></div>
    </div>
    <p className="text-xs italic text-fog-sub bg-night-base/60 rounded-lg p-3">{postText.hostQuote}</p>
    <button type="button" aria-pressed={following} onClick={onFollow} className={`h-10 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 ${following ? 'bg-mercury/20 text-white' : 'bg-night-base/60 text-fog-sub hover:text-white'}`}>
      <i className={following ? 'fa-solid fa-bell' : 'fa-regular fa-bell'} />{following ? postText.followOn : postText.hostFollow}
    </button>
  </section>
);

export default HostCard;
