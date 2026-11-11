import React from 'react';
import { ratingPhrases, reviewText } from '../../data/reviewData';

interface StarRatingProps {
  readonly max: number;
  readonly rating: number;
  readonly displayRating: number;
  readonly onSelect: (value: number) => void;
  readonly onHover: (value: number) => void;
  readonly onLeave: () => void;
}

/** ② Interactive 5-star rating with hover preview and score phrase. */
export const StarRating: React.FC<StarRatingProps> = ({ max, rating, displayRating, onSelect, onHover, onLeave }) => (
  <div className="text-center bg-night-base/60 border border-night-hover rounded-xl p-4">
    <div className="flex items-center justify-center gap-1.5 mb-2">
      <span className="text-xs font-semibold text-slate-300">{reviewText.starPrompt}</span>
    </div>
    <div className="flex items-center justify-center gap-2 text-3xl sm:text-4xl py-1" onMouseLeave={onLeave}>
      {Array.from({ length: max }, (_, i) => {
        const value = i + 1;
        const filled = value <= displayRating;
        return (
          <button
            key={value}
            type="button"
            aria-label={`${value}${reviewText.starAriaSuffix}`}
            aria-pressed={value <= rating}
            onClick={() => onSelect(value)}
            onMouseEnter={() => onHover(value)}
            onFocus={() => onHover(value)}
            onBlur={onLeave}
            className={`hover:scale-110 transform transition ${
              filled ? 'text-amber-400 drop-shadow-[0_0_8px_rgba(245,158,11,0.5)]' : 'text-slate-600'
            }`}
          >
            {reviewText.star}
          </button>
        );
      })}
    </div>
    <p className="text-sm font-bold text-amber-300 mt-2">
      {displayRating.toFixed(1)} / {max.toFixed(1)}
    </p>
    <p className="text-xs text-slate-400 mt-0.5">{ratingPhrases[displayRating]}</p>
  </div>
);

export default StarRating;
