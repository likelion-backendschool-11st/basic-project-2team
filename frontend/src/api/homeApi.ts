import { boardCategories } from '../data/boardData';
import { categoryAccents, homeText, type PopularPost, type UrgentPost } from '../data/homeData';
import type { PostListItem } from './boardApi';
import { request } from './http';

const HOME_POST_LIMIT = 4;

/** 메인 화면용 인기·마감 임박 공고 (배열, 공고 목록 아이템과 같은 모양) */
export const getPopularPosts = () => request<readonly PostListItem[]>('GET', `/api/posts/popular?limit=${HOME_POST_LIMIT}`);
export const getUrgentPosts = () => request<readonly PostListItem[]>('GET', `/api/posts/urgent?limit=${HOME_POST_LIMIT}`);

const MINUTE = 60_000;
const pad = (n: number) => String(n).padStart(2, '0');

/** 지난 시각 → `방금 전` · `N분 전` · `N시간 전` · `N일 전` */
function timeAgo(iso: string, now: Date) {
  const minutes = Math.floor((now.getTime() - new Date(iso).getTime()) / MINUTE);
  if (minutes < 1) return homeText.justNow;
  if (minutes < 60) return `${minutes}분 전`;
  if (minutes < 60 * 24) return `${Math.floor(minutes / 60)}시간 전`;
  return `${Math.floor(minutes / (60 * 24))}일 전`;
}

/** 다가오는 시각 → `N분 후` · `N시간 후` · `N일 후` */
function timeUntil(iso: string, now: Date) {
  const minutes = Math.max(0, Math.ceil((new Date(iso).getTime() - now.getTime()) / MINUTE));
  if (minutes < 60) return `${minutes}분 후`;
  if (minutes < 60 * 24) return `${Math.floor(minutes / 60)}시간 후`;
  return `${Math.floor(minutes / (60 * 24))}일 후`;
}

/** 출발 시각 → 오늘이면 `HH:mm`, 아니면 `MM-DD HH:mm` (브라우저 시간대) */
function departureLabel(iso: string, now: Date) {
  const d = new Date(iso);
  const time = `${pad(d.getHours())}:${pad(d.getMinutes())}`;
  return d.toDateString() === now.toDateString() ? time : `${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${time}`;
}

export function toPopularPost(item: PostListItem, now = new Date()): PopularPost {
  return {
    id: String(item.id),
    category: boardCategories.find((c) => c.id === item.category)?.label ?? item.category,
    accent: categoryAccents[item.category] ?? 'mercury',
    time: timeAgo(item.createdAt, now),
    title: item.title,
    voice: item.voiceRequired
      ? { label: homeText.voiceRequired, icon: 'fa-brands fa-discord', highlight: true }
      : { label: homeText.voiceOptional, icon: 'fa-solid fa-microphone-slash', highlight: false },
    author: item.author,
    members: `${item.current}/${item.max}`,
  };
}

export function toUrgentPost(item: PostListItem, now = new Date()): UrgentPost {
  const remaining = item.max - item.current;
  const critical = remaining <= 1;
  const hasSchedule = !item.scheduleTbd && item.schedule !== null;
  return {
    id: String(item.id),
    deadline: hasSchedule ? `출발 ${timeUntil(item.schedule as string, now)}` : homeText.nearlyFull,
    icon: critical ? 'fa-fire' : 'fa-stopwatch',
    slotsLabel: critical ? '1자리 남음' : `${remaining}명 구인`,
    title: item.title,
    meta: hasSchedule ? `출발 예정: ${departureLabel(item.schedule as string, now)}` : homeText.scheduleTbd,
    actionLabel: critical ? '빠른신청' : '참가',
    critical,
  };
}
