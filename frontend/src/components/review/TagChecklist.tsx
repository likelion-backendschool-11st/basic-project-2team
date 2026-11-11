import React from 'react';
import type { ReviewTag } from '../../data/reviewData';
import { reviewText } from '../../data/reviewData';

interface TagChecklistProps {
  readonly tags: readonly ReviewTag[];
  readonly selectedCount: number;
  readonly isSelected: (id: string) => boolean;
  readonly onToggle: (id: string) => void;
}

/** ④ Manner tag checklist (2-column). */
export const TagChecklist: React.FC<TagChecklistProps> = ({ tags, selectedCount, isSelected, onToggle }) => (
  <div className="space-y-2.5">
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-1.5">
        <span className="text-sm font-bold text-white">{reviewText.tagLabel}</span>
        <span className="text-xs text-slate-400">{reviewText.tagHint}</span>
      </div>
      <span className="text-xs text-mercury-light font-medium">
        {selectedCount}
        {reviewText.tagSelectedSuffix}
      </span>
    </div>
    <div className="grid grid-cols-2 gap-2 bg-night-base/90 border border-night-borderLight/80 rounded-xl p-3">
      {tags.map((tag) => {
        const checked = isSelected(tag.id);
        return (
          <label
            key={tag.id}
            className={
              checked
                ? 'flex items-center gap-2 p-2 rounded-lg bg-night-card/80 border border-mercury/40 cursor-pointer hover:border-mercury text-xs transition'
                : 'flex items-center gap-2 p-2 rounded-lg bg-night-surface border border-night-borderLight cursor-pointer hover:border-white/20 text-xs transition'
            }
          >
            <input
              type="checkbox"
              checked={checked}
              onChange={() => onToggle(tag.id)}
              className="w-4 h-4 rounded text-mercury bg-night-base border-white/20 focus:ring-mercury focus:ring-offset-0"
            />
            <span className={checked ? 'text-slate-100 font-medium' : 'text-slate-400 font-medium'}>{tag.label}</span>
          </label>
        );
      })}
    </div>
  </div>
);

export default TagChecklist;
