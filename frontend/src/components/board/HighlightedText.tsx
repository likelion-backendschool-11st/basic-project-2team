import React from 'react';

interface HighlightedTextProps {
  readonly text: string;
  readonly highlight?: string;
}

const escapeRegExp = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Wraps every case-insensitive occurrence of `highlight` in a <mark>. */
export const HighlightedText: React.FC<HighlightedTextProps> = ({ text, highlight }) => {
  const needle = highlight?.trim();
  if (!needle) return <>{text}</>;
  const parts = text.split(new RegExp(`(${escapeRegExp(needle)})`, 'gi'));
  return (
    <>
      {parts.map((part, i) =>
        part.toLowerCase() === needle.toLowerCase() ? (
          <mark key={i} className="bg-mercury/30 text-white rounded px-1 py-0.5">
            {part}
          </mark>
        ) : (
          <React.Fragment key={i}>{part}</React.Fragment>
        ),
      )}
    </>
  );
};

export default HighlightedText;
