import React from 'react';
import type { PostDetail } from '../../data/postData';
import { postText } from '../../data/postData';

interface PostDescriptionProps {
  readonly detail: PostDetail;
}

export const PostDescription: React.FC<PostDescriptionProps> = ({ detail }) => (
  <section className="rounded-2xl border border-night-borderLight bg-night-surface p-6">
    <h2 className="text-sm font-bold text-white flex items-center gap-2 mb-4"><i className="fa-regular fa-file-lines text-mercury-light" />{postText.detailTitle}</h2>
    <div className="space-y-3 text-sm leading-7 text-fog-headline">
      {detail.intro.map((p) => <p key={p}>{p}</p>)}
      <ul className="list-disc pl-5 space-y-1 text-fog-sub">{detail.steps.map((s) => <li key={s}>{s}</li>)}</ul>
    </div>
    <div className="mt-5 rounded-xl border border-mercury/20 bg-mercury/5 p-4">
      <div className="text-sm font-bold text-mercury-light flex items-center gap-2"><i className="fa-regular fa-face-smile" />{detail.pledgeTitle}</div>
      <p className="mt-1.5 text-xs leading-relaxed text-fog-sub">{detail.pledge}</p>
    </div>
    <div className="mt-4 flex flex-wrap gap-2">{detail.tags.map((t) => <span key={t} className="text-[11px] px-2.5 py-1 rounded-md bg-night-card text-fog-sub">#{t}</span>)}</div>
  </section>
);

export default PostDescription;
