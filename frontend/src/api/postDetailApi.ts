import { postDetailText, type ApplicationStatus, type PostDetail, type PostStatus } from '../data/postData';
import { styleChoices, typeLabels } from '../data/writeData';
import { request } from './http';

/** GET /api/posts/{postId} 응답 (docs/API_SPEC.md 3절 「공고 상세」) */
export interface PostDetailResponse {
  readonly id: number;
  readonly category: string;
  readonly categoryName: string;
  readonly game: string;
  readonly gameName: string;
  readonly detail: string | null;
  readonly detailName: string | null;
  readonly detailType: string | null;
  readonly type: string;
  readonly title: string;
  readonly body: string;
  readonly partyName: string | null;
  readonly style: string | null;
  readonly requiredSpec: string | null;
  readonly headcount: number;
  readonly current: number;
  readonly schedule: string | null;
  readonly scheduleTbd: boolean;
  readonly voiceRequired: boolean;
  readonly status: PostStatus;
  readonly views: number;
  readonly commentCount: number;
  readonly scrapCount: number;
  readonly tags: readonly string[];
  readonly host: {
    readonly id: number;
    readonly nickname: string;
    readonly avatarUrl: string | null;
    readonly level: number;
    readonly mannerTemp: number;
    readonly reviewCount: number;
  };
  readonly viewer: { readonly isOwner: boolean; readonly scrapped: boolean; readonly applicationStatus: ApplicationStatus | null } | null;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export const getPostDetail = (postId: string) =>
  request<PostDetailResponse>('GET', `/api/posts/${encodeURIComponent(postId)}`);

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];
const pad = (n: number) => String(n).padStart(2, '0');

/** ISO → `11. 15. (토) 21:00` (브라우저 시간대 기준) */
function formatSchedule(iso: string) {
  const d = new Date(iso);
  return `${d.getMonth() + 1}. ${d.getDate()}. (${WEEKDAYS[d.getDay()]}) ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** 등록 시각 → `방금 전` / `15분 전` / `3시간 전` / `2일 전` */
export function timeAgo(iso: string, now = Date.now()) {
  const minutes = Math.max(0, Math.floor((now - new Date(iso).getTime()) / 60000));
  if (minutes < 1) return postDetailText.justNow;
  if (minutes < 60) return `${minutes}분 전`;
  if (minutes < 60 * 24) return `${Math.floor(minutes / 60)}시간 전`;
  return `${Math.floor(minutes / (60 * 24))}일 전`;
}

/** 출발까지 남은 시간 안내. 일정 미정이거나 이미 지났으면 다른 문구 */
function departureNote(schedule: string | null, now = Date.now()) {
  if (!schedule) return { note: postDetailText.scheduleTbdNote, tone: 'muted' as const };
  const minutes = Math.floor((new Date(schedule).getTime() - now) / 60000);
  if (minutes < 0) return { note: postDetailText.departed, tone: 'muted' as const };
  if (minutes < 60) return { note: postDetailText.departIn(`${minutes}분`), tone: 'good' as const };
  if (minutes < 60 * 24) return { note: postDetailText.departIn(`${Math.floor(minutes / 60)}시간`), tone: 'good' as const };
  return { note: postDetailText.departIn(`${Math.floor(minutes / (60 * 24))}일`), tone: 'muted' as const };
}

const styleLabel = (style: string | null) =>
  styleChoices.find((s) => s.id === style)?.label ?? postDetailText.styleAny;

/** 마크다운 본문을 빈 줄 기준 문단으로 나눕니다 (마크다운 렌더러 도입 전까지 원문 그대로 표시). */
const toParagraphs = (body: string) =>
  body
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);

/** API 응답 → 상세 화면용 PostDetail */
export function toPostDetail(res: PostDetailResponse): PostDetail {
  const t = postDetailText;
  const typeLabel = typeLabels[res.type] ?? res.type;
  const scheduleText = res.schedule ? formatSchedule(res.schedule) : t.scheduleTbd;
  const departure = departureNote(res.schedule);
  const manner = `${res.host.mannerTemp.toFixed(1)}℃`;
  return {
    id: String(res.id),
    isOwner: res.viewer?.isOwner ?? false,
    game: res.gameName,
    raid: res.detailName ?? typeLabel,
    title: res.title,
    current: res.current,
    max: res.headcount,
    host: {
      id: res.host.id,
      name: res.host.nickname,
      level: res.host.level,
      record: t.hostRecord(res.host.reviewCount),
      manner,
    },
    views: res.views,
    postedAgo: timeAgo(res.createdAt),
    tiles: [
      { icon: 'fa-regular fa-clock', label: t.tileSchedule, value: scheduleText, note: departure.note, noteTone: departure.tone },
      {
        icon: 'fa-solid fa-headset',
        label: t.tileVoice,
        value: res.voiceRequired ? t.voiceOn : t.voiceOff,
        note: res.voiceRequired ? t.voiceOnNote : t.voiceOffNote,
        noteTone: 'muted',
      },
      { icon: 'fa-regular fa-circle-check', label: t.tileSpec, value: res.requiredSpec ?? t.specNone, note: styleLabel(res.style), noteTone: 'muted' },
    ],
    intro: toParagraphs(res.body),
    steps: [],
    pledgeTitle: t.pledgeTitle,
    pledge: t.pledge,
    tags: res.tags,
    slots: [{ role: t.slotRole, filled: res.current, total: res.headcount }],
    conditions: [
      { label: t.conditionType, value: typeLabel },
      ...(res.detailName ? [{ label: t.conditionDetail, value: res.detailName }] : []),
      { label: t.conditionStyle, value: styleLabel(res.style) },
      { label: t.conditionSchedule, value: scheduleText },
      { label: t.conditionSpec, value: res.requiredSpec ?? t.specNone },
      { label: t.conditionVoice, value: res.voiceRequired ? t.voiceOn : t.voiceOff },
    ],
    // 확정 파티원 목록 API(GET /api/posts/{postId}/participants) 연동 전까지 파티장만 표시합니다.
    participants: [{ name: res.host.nickname, role: t.leaderRole, leader: true, online: true }],
    status: res.status,
    commentCount: res.commentCount,
    scrapCount: res.scrapCount,
    scrapped: res.viewer?.scrapped ?? false,
    applicationStatus: res.viewer?.applicationStatus ?? null,
  };
}
