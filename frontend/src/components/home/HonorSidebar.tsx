import React from 'react';
import { homeText, type MannerLeader, type MannerMember } from '../../data/homeData';
import PanelCard from './PanelCard';
import MannerLeaderCard from './MannerLeaderCard';
import MannerMemberCard from './MannerMemberCard';

interface HonorSidebarProps {
  /** 매너 온도 랭킹 상위 3명 (useMannerRanking) */
  readonly leaders: readonly MannerLeader[];
  /** 매너 온도 랭킹 4~6위 (useMannerRanking). 없으면 패널을 숨깁니다. */
  readonly members: readonly MannerMember[];
  /** 랭킹이 비었을 때 안내 (불러오는 중·실패·평가 없음) */
  readonly leadersNotice?: string | null;
  /** Optional block rendered above the honor panels (e.g. logged-in profile card). */
  readonly topSlot?: React.ReactNode;
}

export const HonorSidebar: React.FC<HonorSidebarProps> = ({ leaders, members, leadersNotice, topSlot }) => (
  <aside className="col-span-12 lg:col-span-3 flex flex-col gap-5">
    {topSlot}
    <PanelCard
      title={homeText.leaderTitle}
      badge={homeText.leaderBadge}
      marker={
        <span className="w-7 h-7 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center text-xs">
          <i className="fa-solid fa-crown" />
        </span>
      }
    >
      {leaders.map((l) => (
        <MannerLeaderCard key={l.id} leader={l} />
      ))}
      {leadersNotice && <p className="py-3 text-center text-xs text-fog-muted">{leadersNotice}</p>}
    </PanelCard>
    {members.length > 0 && (
      <PanelCard
        title={homeText.memberTitle}
        badge={homeText.memberBadge}
        marker={
          <span className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emeraldAccent flex items-center justify-center text-xs">
            <i className="fa-solid fa-thumbs-up" />
          </span>
        }
      >
        {members.map((m) => (
          <MannerMemberCard key={m.id} member={m} />
        ))}
      </PanelCard>
    )}
  </aside>
);

export default HonorSidebar;
