import React from 'react';
import type { PostDetail } from '../../data/postData';

interface PostTilesProps {
  readonly tiles: PostDetail['tiles'];
}

export const PostTiles: React.FC<PostTilesProps> = ({ tiles }) => (
  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
    {tiles.map((t) => (
      <div key={t.label} className="rounded-2xl border border-night-borderLight bg-night-surface p-4">
        <div className="text-[11px] text-fog-muted flex items-center gap-1.5"><i className={`${t.icon} text-mercury-light`} />{t.label}</div>
        <div className="text-lg font-bold text-white mt-1">{t.value}</div>
        <div className={`text-xs mt-0.5 ${t.noteTone === 'good' ? 'text-emerald-300' : 'text-fog-muted'}`}>{t.note}</div>
      </div>
    ))}
  </div>
);

export default PostTiles;
