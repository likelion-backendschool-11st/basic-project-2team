import React from 'react';
import type { UrgentPost } from '../../data/homeData';
import { homeText } from '../../data/homeData';

interface UrgentPostCardProps {
  readonly post: UrgentPost;
  readonly onApply?: (id: string) => void;
}

export const UrgentPostCard: React.FC<UrgentPostCardProps> = ({ post, onApply }) => {
  const critical = post.critical === true;
  return (
    <article
      className={
        critical
          ? 'p-3.5 rounded-xl bg-night-card/70 border border-amberAccent/30 hover:border-amberAccent hover:bg-night-card transition-all duration-150 cursor-pointer group relative overflow-hidden'
          : 'p-3.5 rounded-xl bg-night-card/70 border border-night-border hover:border-amberAccent/50 hover:bg-night-card transition-all duration-150 cursor-pointer group'
      }
    >
      {critical && (
        <div className="absolute top-0 right-0 w-16 h-16 pointer-events-none overflow-hidden">
          <div className="bg-rose-500/20 text-rose-300 text-[9px] font-extrabold uppercase py-0.5 text-center rotate-45 translate-x-4 translate-y-2 border-b border-rose-500/40">
            {homeText.lastSlotRibbon}
          </div>
        </div>
      )}
      <div className="flex items-center justify-between text-xs mb-1.5">
        <span
          className={`px-2 py-0.5 rounded-md font-bold text-[10px] flex items-center gap-1 ${
            critical ? 'bg-roseAccent/20 text-roseAccent' : 'bg-amberAccent/20 text-amberAccent'
          }`}
        >
          <i className={`fa-solid ${post.icon} text-[9px]`} /> {post.deadline}
        </span>
        <span className={critical ? 'text-amberAccent font-medium text-[11px] mr-7' : 'text-fog-sub text-[11px]'}>{post.slotsLabel}</span>
      </div>
      <h3
        className={`text-sm font-semibold text-fog-headline line-clamp-1 mb-2 ${
          critical ? 'group-hover:text-amber-200' : 'group-hover:text-indigo-200'
        }`}
      >
        {post.title}
      </h3>
      <div className="flex items-center justify-between text-xs text-fog-sub pt-2 border-t border-white/[0.04]">
        <span className="text-[11px] text-fog-muted">{post.meta}</span>
        <button
          type="button"
          onClick={() => onApply?.(post.id)}
          className={
            critical
              ? 'px-3 py-1 bg-amber-500 hover:bg-amber-400 text-black font-bold text-[11px] rounded-lg transition-colors'
              : 'px-3 py-1 bg-night-borderLight hover:bg-mercury text-white font-medium text-[11px] rounded-lg transition-colors'
          }
        >
          {post.actionLabel}
        </button>
      </div>
    </article>
  );
};

export default UrgentPostCard;
