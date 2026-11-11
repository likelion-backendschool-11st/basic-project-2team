import React from 'react';
import { Link } from 'react-router-dom';
import type { BoardPost } from '../../data/boardData';
import { paths } from '../../data/routes';
import { gameToneStyles, membersToneStyles, postBadgeStyles } from './postStyles';
import HighlightedText from './HighlightedText';

interface PostRowProps {
  readonly post: BoardPost;
  readonly no: number;
  readonly highlight?: string;
}

const cell = 'py-3.5 px-4 text-center';

export const PostRow: React.FC<PostRowProps> = ({ post, no, highlight }) => (
  <tr className="hover:bg-night-card/80 transition-colors group cursor-pointer">
    <td className={`${cell} text-xs font-mono text-fog-muted`}>{no}</td>
    <td className="py-3.5 px-6">
      <div className="flex items-center gap-2.5 flex-wrap">
        <span className={`px-2 py-0.5 text-[11px] font-bold rounded border ${gameToneStyles[post.gameTone]}`}>{post.game}</span>
        <Link to={paths.postDetail(post.id)} className="font-medium text-fog-headline group-hover:text-mercury-light transition-colors">
          <HighlightedText text={post.title} highlight={highlight} />
        </Link>
        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${membersToneStyles[post.membersTone]}`}>
          {post.current}/{post.max}
          {post.membersNote && ` ${post.membersNote}`}
        </span>
        {post.badge && (
          <span className={`text-[10px] px-1.5 rounded border ${postBadgeStyles[post.badge.tone]}`}>
            {post.badge.icon && <i className={`${post.badge.icon} text-[9px] mr-1 text-emerald-400`} />}
            {post.badge.label}
          </span>
        )}
      </div>
    </td>
    <td className={cell}>
      <span className="font-medium text-xs text-fog-sub">{post.author}</span>
    </td>
    <td className={`${cell} text-xs text-fog-muted font-mono`}>{post.date}</td>
    <td className={`${cell} text-xs font-mono text-fog-muted`}>{post.views}</td>
  </tr>
);

export default PostRow;
