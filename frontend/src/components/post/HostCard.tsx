import React from 'react';
import { Link } from 'react-router-dom';
import { paths } from '../../data/routes';
import type { HostProfile, PostDetail } from '../../data/postData';
import { postText } from '../../data/postData';
import { Avatar } from '../ui/Avatar';

interface HostCardProps {
  readonly host: PostDetail['host'];
  /** 작성자 공개 프로필. 불러오기 전이거나 프로필을 설정하지 않은 항목은 비워 둡니다. */
  readonly profile: HostProfile | null;
  readonly following: boolean;
  readonly onFollow: () => void;
}

/** 매너 온도(0~100℃)를 게이지 폭(%)으로 */
const mannerPercent = (temp: number) => Math.min(100, Math.max(0, temp));

export const HostCard: React.FC<HostCardProps> = ({ host, profile, following, onFollow }) => (
  <section className="rounded-2xl border border-night-borderLight bg-night-surface p-5 flex flex-col gap-3">
    <h2 className="text-sm font-bold text-white">{postText.hostProfile}</h2>
    <div className="flex items-center gap-3">
      <Avatar url={host.avatarUrl} name={host.name} className="w-12 h-12 shrink-0 rounded-full bg-night-card flex items-center justify-center text-lg font-bold text-white" />
      <div className="min-w-0">
        <Link to={paths.memberProfile(host.id)} className="font-bold text-white text-lg break-words hover:text-mercury-light hover:underline">{host.name}</Link>
        {profile?.gameLine && <div className="text-xs text-fog-muted break-words">{profile.gameLine}</div>}
      </div>
    </div>
    <div>
      <div className="flex justify-between text-xs"><span className="text-fog-muted">{postText.mannerTemp}</span><span className="font-bold text-emerald-300">{host.manner}</span></div>
      <div className="h-2 rounded-full bg-night-base mt-1.5 overflow-hidden"><div className="h-full bg-emeraldAccent" style={{ width: `${mannerPercent(host.mannerTemp)}%` }} /></div>
    </div>
    {profile?.bio && <p className="text-xs italic text-fog-sub bg-night-base/60 rounded-lg p-3 break-words whitespace-pre-line">&ldquo;{profile.bio}&rdquo;</p>}
    <button type="button" aria-pressed={following} onClick={onFollow} className={`h-10 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 ${following ? 'bg-mercury/20 text-white' : 'bg-night-base/60 text-fog-sub hover:text-white'}`}>
      <i className={following ? 'fa-solid fa-bell' : 'fa-regular fa-bell'} />{following ? postText.followOn : postText.hostFollow}
    </button>
  </section>
);

export default HostCard;
