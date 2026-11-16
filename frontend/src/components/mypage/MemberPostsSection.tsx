import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getMemberPosts, type MemberPostItem } from '../../api/mypageApi';
import { memberProfileText } from '../../data/myPageData';
import { paths } from '../../data/routes';

const SIZE = 5;

interface MemberPostsSectionProps {
  readonly memberId: number;
}

/** 이 회원이 쓴 공고 (최신순, 「더 보기」로 5개씩 이어 붙임) */
export const MemberPostsSection: React.FC<MemberPostsSectionProps> = ({ memberId }) => {
  const [items, setItems] = useState<readonly MemberPostItem[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setItems([]);
    setPage(1);
  }, [memberId]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getMemberPosts(memberId, page, SIZE)
      .then((res) => {
        if (cancelled) return;
        setItems((prev) => (page === 1 ? res.items : [...prev, ...res.items]));
        setTotalPages(res.totalPages);
        setTotalCount(res.totalCount);
      })
      .catch(() => undefined) // 보조 정보라 실패해도 화면을 막지 않고 빈 목록으로 둡니다.
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [memberId, page]);

  return (
    <section className="rounded-2xl border border-night-borderLight bg-night-surface p-6">
      <h2 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
        <i className="fa-solid fa-pen-to-square text-mercury-light" />
        {memberProfileText.postsTitle}
        <span className="text-xs font-normal text-fog-muted">{totalCount}</span>
      </h2>
      {items.length === 0 && !loading ? (
        <p className="text-sm text-fog-muted">{memberProfileText.postsEmpty}</p>
      ) : (
        <ul className="divide-y divide-night-borderLight/60">
          {items.map((p) => (
            <li key={p.id} className="py-3 flex items-center gap-3 text-sm">
              <span className="shrink-0 text-xs px-2 py-0.5 rounded-full bg-mercury/15 text-mercury-light border border-mercury/30">{p.gameName}</span>
              <Link to={paths.postDetail(String(p.id))} className="flex-1 truncate text-slate-200 hover:text-mercury-light transition-colors">
                {p.title} <span className="text-xs text-fog-muted">{p.current}/{p.max}</span>
              </Link>
              <span className="shrink-0 text-xs text-slate-400 font-mono">{p.createdAt.slice(0, 10)}</span>
            </li>
          ))}
        </ul>
      )}
      {page < totalPages && (
        <button
          type="button"
          onClick={() => setPage((n) => n + 1)}
          disabled={loading}
          className="mt-3 w-full h-9 rounded-xl border border-night-borderLight text-xs font-semibold text-fog-sub hover:text-white hover:bg-white/5 disabled:opacity-60"
        >
          {memberProfileText.postsMore}
        </button>
      )}
    </section>
  );
};

export default MemberPostsSection;
