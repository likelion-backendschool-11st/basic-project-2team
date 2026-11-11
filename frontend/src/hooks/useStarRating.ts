import { useState } from 'react';

/** Star rating with hover preview. `displayRating` is what the stars should render. */
export function useStarRating(initial = 0, max = 5) {
  const [rating, setRating] = useState(initial);
  const [hovered, setHovered] = useState<number | null>(null);

  const clamp = (v: number) => Math.min(Math.max(0, v), max);

  return {
    rating,
    hovered,
    max,
    displayRating: hovered ?? rating,
    select: (value: number) => setRating(clamp(value)),
    hover: (value: number) => setHovered(clamp(value)),
    clearHover: () => setHovered(null),
    reset: (value = initial) => {
      setRating(clamp(value));
      setHovered(null);
    },
  };
}
