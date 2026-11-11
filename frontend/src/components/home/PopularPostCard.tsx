import React from 'react';
import type { PopularPost } from '../../data/homeData';
import { homeText } from '../../data/homeData';
import { tagStyles } from '../../data/accentStyles';

interface PopularPostCardProps {
  readonly post: PopularPost;
  readonly onSelect?: (id: string) => void;
}

export const PopularPostCard: React.FC<PopularPostCardProps> = ({ post, onSelect }) => (
  <article
    onClick={() => onSelect?.(post.id)}
    className="p-3.5 rounded-xl bg-night-card/70 border border-night-border hover:border-mercury/50 hover:bg-night-card transition-all duration-150 cursor-pointer group"
  >
    <div className="flex items-center justify-between text-xs mb-1.5">
      <span className={`px-2 py-0.5 rounded-md font-semibold text-[11px] ${tagStyles[post.accent]}`}>{post.category}</span>
      <span className="text-fog-muted text-[11px]">
        <i className="fa-regular fa-clock mr-1" />
        {post.time}
      </span>
    </div>
    <h3 className="text-sm font-semibold text-fog-headline group-hover:text-indigo-200 line-clamp-1 mb-2">{post.title}</h3>
    <div className="flex items-center justify-between text-xs text-fog-sub pt-2 border-t border-white/[0.04]">
      <div className="flex items-center gap-2">
        <span
          className={
            post.voice.highlight
              ? 'inline-flex items-center gap-1 text-[11px] text-emeraldAccent bg-emerald-500/10 px-1.5 py-0.5 rounded'
              : 'inline-flex items-center gap-1 text-[11px] text-fog-sub bg-white/5 px-1.5 py-0.5 rounded'
          }
        >
          <i className={`${post.voice.icon} text-xs`} /> {post.voice.label}
        </span>
        <span className="text-fog-muted text-[11px]">
          {homeText.authorPrefix}
          {post.author}
        </span>
      </div>
      <div className="flex items-center font-bold text-mercury-light">
        <span>{post.members}</span>
      </div>
    </div>
  </article>
);

export default PopularPostCard;
