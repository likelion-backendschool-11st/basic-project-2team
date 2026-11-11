import React from 'react';
import { boardText, type BoardPost } from '../../data/boardData';
import PostRow from './PostRow';

interface PostTableProps {
  readonly posts: readonly BoardPost[];
  /** Row number of the first post (1-based). */
  readonly startNo: number;
  readonly highlight?: string;
}

const th = 'py-3.5 px-4 text-center';

export const PostTable: React.FC<PostTableProps> = ({ posts, startNo, highlight }) => (
  <div className="bg-night-surface border border-night-border rounded-2xl overflow-hidden shadow-xl">
    <div className="overflow-x-auto">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="bg-night-deep/80 text-fog-muted text-xs font-semibold uppercase tracking-wider border-b border-night-border">
            <th className={`${th} w-14`} scope="col">{boardText.columns.no}</th>
            <th className="py-3.5 px-6" scope="col">{boardText.columns.title}</th>
            <th className={`${th} w-28`} scope="col">{boardText.columns.author}</th>
            <th className={`${th} w-24`} scope="col">{boardText.columns.date}</th>
            <th className={`${th} w-20`} scope="col">{boardText.columns.views}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-night-border text-sm">
          {posts.length === 0 ? (
            <tr>
              <td colSpan={5} className="py-12 text-center text-sm text-fog-muted">
                {boardText.empty}
              </td>
            </tr>
          ) : (
            posts.map((p, i) => <PostRow key={p.id} post={p} no={startNo + i} highlight={highlight} />)
          )}
        </tbody>
      </table>
    </div>
  </div>
);

export default PostTable;
