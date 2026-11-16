import React from 'react';
import { Link } from 'react-router-dom';
import { infoDocOrder, infoDocs, infoText, type InfoDocId } from '../../data/infoData';

interface InfoNavProps {
  readonly active: InfoDocId;
}

/** 안내 문서 4개 사이를 오가는 좌측(모바일에서는 상단) 메뉴 */
export const InfoNav: React.FC<InfoNavProps> = ({ active }) => (
  <nav aria-label={infoText.navLabel} className="w-full lg:w-64 shrink-0">
    <div className="bg-night-surface border border-night-borderLight rounded-3xl p-3 grid grid-cols-2 lg:grid-cols-1 gap-1.5 lg:sticky lg:top-24">
      {infoDocOrder.map((id) => {
        const doc = infoDocs[id];
        const on = id === active;
        return (
          <Link
            key={id}
            to={doc.to}
            aria-current={on ? 'page' : undefined}
            className={`flex items-center gap-2.5 px-3.5 py-3 text-sm font-semibold rounded-xl transition-all ${
              on ? 'bg-mercury text-white shadow-glow-mercury' : 'text-fog-sub hover:text-white hover:bg-white/5'
            }`}
          >
            <i className={`fa-solid ${doc.icon} w-4 text-center`} />
            {doc.label}
          </Link>
        );
      })}
    </div>
  </nav>
);

export default InfoNav;
