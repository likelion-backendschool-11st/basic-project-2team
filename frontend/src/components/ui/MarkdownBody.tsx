import React from 'react';
import ReactMarkdown, { type Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';

/**
 * 마크다운을 화면 스타일에 맞춰 보여줍니다 (공고 상세 본문, 작성 화면 미리보기).
 * react-markdown 은 본문의 HTML 태그를 렌더링하지 않고 위험한 링크 주소(javascript: 등)도 걸러 주므로 작성자가 스크립트를 넣을 수 없습니다.
 * 문단 안에서 한 번 줄바꿈한 곳도 줄바꿈으로 보이도록 문단(p)에만 pre-line 을 씁니다(전체에 쓰면 태그 사이 줄바꿈이 빈 줄로 보임).
 */
const components: Components = {
  p: (p) => <p className="whitespace-pre-line" {...strip(p)} />,
  h1: (p) => <h3 className="mt-5 mb-2 text-xl font-bold text-white" {...strip(p)} />,
  h2: (p) => <h3 className="mt-5 mb-2 text-lg font-bold text-white" {...strip(p)} />,
  h3: (p) => <h4 className="mt-4 mb-2 text-base font-bold text-white" {...strip(p)} />,
  h4: (p) => <h5 className="mt-4 mb-1.5 text-sm font-bold text-white" {...strip(p)} />,
  h5: (p) => <h5 className="mt-3 mb-1 text-sm font-bold text-white" {...strip(p)} />,
  h6: (p) => <h5 className="mt-3 mb-1 text-sm font-bold text-white" {...strip(p)} />,
  strong: (p) => <strong className="font-bold text-white" {...strip(p)} />,
  em: (p) => <em className="italic" {...strip(p)} />,
  del: (p) => <del className="text-fog-muted" {...strip(p)} />,
  // 위험한 주소(javascript: 등)는 react-markdown 이 href 를 비우므로 링크 대신 글자로만 보여줍니다.
  a: ({ href, children }) => !href ? <span>{children}</span> : (
    <a href={href} target="_blank" rel="noopener noreferrer nofollow" className="text-mercury-light underline underline-offset-2 hover:text-white break-all">{children}</a>
  ),
  ul: (p) => <ul className="list-disc pl-5 space-y-1" {...strip(p)} />,
  ol: (p) => <ol className="list-decimal pl-5 space-y-1" {...strip(p)} />,
  blockquote: (p) => <blockquote className="border-l-4 border-mercury/50 bg-night-base/60 pl-4 pr-3 py-2 text-fog-sub rounded-r-lg" {...strip(p)} />,
  table: (p) => <div className="overflow-x-auto"><table className="w-full border-collapse text-[13px]" {...strip(p)} /></div>,
  th: (p) => <th className="border border-night-borderLight bg-night-base px-3 py-1.5 text-left font-bold text-white" {...strip(p)} />,
  td: (p) => <td className="border border-night-borderLight px-3 py-1.5" {...strip(p)} />,
  hr: () => <hr className="border-night-borderLight" />,
  pre: (p) => <pre className="overflow-x-auto rounded-xl bg-night-base p-4 text-[13px] leading-6 text-fog-headline whitespace-pre" {...strip(p)} />,
  code: ({ className, children }) =>
    className ? <code className={className}>{children}</code> : <code className="rounded bg-night-base px-1.5 py-0.5 text-[13px] text-indigo-200">{children}</code>,
  img: ({ src, alt }) => <img src={src} alt={alt ?? ''} loading="lazy" className="max-h-96 max-w-full rounded-xl border border-night-borderLight" />,
};

/** react-markdown 이 넘기는 node 같은 내부 속성을 DOM 에 퍼뜨리지 않고 children 만 전달합니다. */
function strip({ children }: { children?: React.ReactNode }) {
  return { children };
}

export const MarkdownBody: React.FC<{ readonly source: string; readonly className?: string }> = ({ source, className = '' }) => (
  <div className={`space-y-3 break-words text-sm leading-7 text-fog-headline ${className}`}>
    <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>{source}</ReactMarkdown>
  </div>
);

export default MarkdownBody;
