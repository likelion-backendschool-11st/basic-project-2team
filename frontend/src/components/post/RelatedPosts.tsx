import React from 'react';
import { Link } from 'react-router-dom';
import type { RelatedPost } from '../../data/postData';
import { postText } from '../../data/postData';
import { ROUTES } from '../../data/routes';

interface RelatedPostsProps {
  readonly posts: readonly RelatedPost[];
}

export const RelatedPosts: React.FC<RelatedPostsProps> = ({ posts }) => (
  <section className="rounded-2xl border border-night-borderLight bg-night-surface p-5">
    <div className="flex items-center justify-between mb-3"><h2 className="text-sm font-bold text-white">{postText.related}</h2><Link to={ROUTES.board} className="text-[11px] text-fog-muted hover:text-white">{postText.more}</Link></div>
    <ul className="space-y-2">
      {posts.map((p) => (
        <li key={p.id}>
          <Link to={p.to} className="block rounded-xl bg-night-base/60 hover:bg-night-card p-3 transition-colors">
            <div className="flex justify-between text-[10px]"><span className="px-1.5 rounded bg-mercury/15 text-mercury-light">{p.game}</span><span className={p.state === '마감임박' ? 'text-rose-300' : 'text-emerald-300'}>{p.state}</span></div>
            <div className="text-xs font-semibold text-white mt-1.5 line-clamp-1">{p.title}</div>
            <div className="text-[11px] text-fog-muted mt-0.5">{p.meta}</div>
          </Link>
        </li>
      ))}
    </ul>
  </section>
);

export default RelatedPosts;
