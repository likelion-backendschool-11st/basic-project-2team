import React from 'react';
import { adminText } from '../../data/adminData';
import type { ListView, useSelection } from '../../hooks/useAdminList';
import Pagination from '../board/Pagination';

export interface Column<T> {
  readonly header: string;
  readonly cell: (row: T) => React.ReactNode;
  readonly className?: string;
}

interface AdminTableProps<T extends { readonly id: number }> {
  readonly title: string;
  readonly list: ListView<T>;
  readonly columns: readonly Column<T>[];
  readonly selection?: ReturnType<typeof useSelection>;
  readonly actions?: React.ReactNode;
  readonly rowClass?: (row: T) => string;
  readonly unit?: string;
}

/** Titled result table: count, sort, optional checkbox column + bulk actions, pager. */
export function AdminTable<T extends { readonly id: number }>({ title, list, columns, selection, actions, rowClass, unit = '건' }: AdminTableProps<T>) {
  const ids = list.visible.map((r) => r.id);
  const all = ids.length > 0 && ids.every((i) => selection?.selected.has(i));
  return (
    <section className="rounded-3xl border border-night-borderLight bg-night-surface p-6">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <h2 className="text-lg font-bold text-white flex items-center gap-2">{title}<span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-mercury/15 text-indigo-300">총 {list.total.toLocaleString()}{unit}</span></h2>
        <div className="flex items-center gap-2 text-xs">
          <label className="flex items-center gap-2 text-fog-muted">{adminText.sort}
            <select value={list.sort} onChange={(e) => list.setSort(e.target.value as ListView<T>['sort'])} className="h-9 rounded-lg border border-night-borderLight bg-night-base px-3 text-xs">
              <option value="desc">최신순</option><option value="asc">오래된순</option>
            </select>
          </label>
          {actions}
        </div>
      </div>
      <div aria-busy={list.loading} className={`overflow-x-auto rounded-2xl border border-night-borderLight transition-opacity ${list.loading && list.visible.length > 0 ? 'opacity-60' : ''}`}>
        <table className="w-full text-sm">
          <thead className="bg-night-base/70 text-xs text-fog-muted">
            <tr>
              {selection && <th className="w-10 px-3 py-3"><input type="checkbox" aria-label="전체 선택" checked={all} onChange={(e) => selection.setAll(ids, e.target.checked)} className="rounded border-night-borderLight bg-night-card text-mercury" /></th>}
              {columns.map((c) => <th key={c.header} className={`px-3 py-3 text-left font-semibold whitespace-nowrap ${c.className ?? ''}`}>{c.header}</th>)}
            </tr>
          </thead>
          <tbody className="divide-y divide-night-borderLight">
            {list.error ? (
              <tr><td colSpan={columns.length + 1} className="py-12 text-center text-rose-300">
                {list.error}
                <button type="button" onClick={list.reload} className="ml-3 text-xs underline text-fog-sub hover:text-white">{adminText.retry}</button>
              </td></tr>
            ) : list.visible.length === 0 && (
              <tr><td colSpan={columns.length + 1} className="py-12 text-center text-fog-muted">{list.loading ? adminText.loading : adminText.empty}</td></tr>
            )}
            {!list.error && list.visible.map((r) => (
              <tr key={r.id} className={`hover:bg-white/[0.03] ${rowClass?.(r) ?? ''}`}>
                {selection && <td className="px-3 py-3"><input type="checkbox" aria-label={`${r.id}번 선택`} checked={selection.selected.has(r.id)} onChange={() => selection.toggle(r.id)} className="rounded border-night-borderLight bg-night-card text-mercury" /></td>}
                {columns.map((c) => <td key={c.header} className={`px-3 py-3 ${c.className ?? ''}`}>{c.cell(r)}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-5 flex justify-center">
        <Pagination page={list.paging.page} pages={list.paging.pages} hasPrev={list.paging.hasPrev} hasNext={list.paging.hasNext} onPrev={list.paging.prev} onNext={list.paging.next} onGoTo={list.paging.goTo} />
      </div>
    </section>
  );
}

export default AdminTable;
