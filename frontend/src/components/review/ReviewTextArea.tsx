import React from 'react';
import { reviewText } from '../../data/reviewData';

interface ReviewTextAreaProps {
  readonly id: string;
  readonly value: string;
  readonly length: number;
  readonly maxLength: number;
  readonly onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
}

/** ③ 상세 리뷰 작성 textarea with live character counter. */
export const ReviewTextArea: React.FC<ReviewTextAreaProps> = ({ id, value, length, maxLength, onChange }) => (
  <div>
    <div className="flex items-center justify-between mb-2">
      <label className="text-sm font-bold text-white" htmlFor={id}>
        {reviewText.detailLabel}
      </label>
      <span className="text-xs text-slate-400">
        <span className="text-mercury-light font-semibold">{length}</span> / {maxLength}
        {reviewText.charSuffix}
      </span>
    </div>
    <textarea
      id={id}
      rows={4}
      value={value}
      maxLength={maxLength}
      onChange={onChange}
      placeholder={reviewText.placeholder}
      className="w-full bg-night-base border border-night-borderLight rounded-xl p-3.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-mercury focus:ring-1 focus:ring-mercury resize-none transition-colors"
    />
  </div>
);

export default ReviewTextArea;
