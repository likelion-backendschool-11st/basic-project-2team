import { useState } from 'react';
import type { ActivityPost } from '../data/myPageData';

/**
 * MyPage post list state. Marking a post as complete flips its status and
 * calls `onComplete` (MyPage uses it to open the review modal).
 */
export function useActivityPosts(initial: readonly ActivityPost[], onComplete?: (post: ActivityPost) => void) {
  const [posts, setPosts] = useState<readonly ActivityPost[]>(initial);

  const completePost = (id: string) => {
    const target = posts.find((p) => p.id === id);
    if (!target) return;
    if (target.status === 'open') {
      setPosts((prev) => prev.map((p) => (p.id === id ? { ...p, status: 'completed' } : p)));
    }
    onComplete?.(target);
  };

  return { posts, completePost };
}
