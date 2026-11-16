import React from 'react';
import { Link } from 'react-router-dom';
import { infoText, type InfoDoc } from '../../data/infoData';
import { ROUTES } from '../../data/routes';

interface InfoDocumentProps {
  readonly doc: InfoDoc;
}

const linkButton = 'h-10 px-5 inline-flex items-center rounded-xl border border-night-borderLight text-sm font-semibold text-fog-sub hover:text-white hover:bg-white/5 transition-colors';

/** 안내 문서 본문: 제목 · 요약 · 시행일 · 섹션(문단/목록). 고객지원 문서는 하단에 계정 찾기 링크를 붙입니다. */
export const InfoDocument: React.FC<InfoDocumentProps> = ({ doc }) => (
  <article className="flex-1 min-w-0 bg-night-surface border border-night-borderLight rounded-3xl p-6 sm:p-10 shadow-card-subtle">
    <header className="pb-6 mb-8 border-b border-night-borderLight">
      <div className="flex items-center gap-3 mb-3">
        <span className="w-10 h-10 rounded-xl bg-mercury/15 text-mercury-light flex items-center justify-center">
          <i className={`fa-solid ${doc.icon}`} />
        </span>
        <h1 className="text-2xl font-bold text-white">{doc.title}</h1>
      </div>
      <p className="text-sm text-fog-sub leading-relaxed">{doc.summary}</p>
      {doc.effectiveDate && (
        <p className="mt-2 text-xs text-fog-muted">
          {infoText.effectivePrefix} {doc.effectiveDate}
        </p>
      )}
    </header>

    <div className="flex flex-col gap-8">
      {doc.sections.map((section) => (
        <section key={section.id} className="flex flex-col gap-3">
          <h2 className="text-base font-bold text-fog-headline">{section.heading}</h2>
          {section.paragraphs?.map((p) => (
            <p key={p} className="text-sm text-fog-sub leading-relaxed">
              {p}
            </p>
          ))}
          {section.items && (
            <ul className="flex flex-col gap-2">
              {section.items.map((item) => (
                <li key={item} className="flex gap-2.5 text-sm text-fog-sub leading-relaxed">
                  <i className="fa-solid fa-circle text-[5px] text-mercury-light mt-2 shrink-0" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      ))}
    </div>

    {doc.id === 'support' && (
      <footer className="mt-10 rounded-2xl border border-night-borderLight bg-night-base/60 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="text-sm font-bold text-white">{infoText.contactTitle}</div>
          <div className="text-xs text-fog-muted mt-1">{infoText.contactBody}</div>
        </div>
        <div className="flex gap-2">
          <Link to={ROUTES.findId} className={linkButton}>
            {infoText.findId}
          </Link>
          <Link to={ROUTES.findPassword} className={linkButton}>
            {infoText.findPassword}
          </Link>
        </div>
      </footer>
    )}
  </article>
);

export default InfoDocument;
