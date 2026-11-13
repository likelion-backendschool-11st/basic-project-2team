import { request } from './http';

/** GET /api/games 응답 (docs/API_SPEC.md 3절). contents[].type 은 공고의 모집 유형(type)과 같은 값 */
export interface GameContent {
  readonly code: string;
  readonly name: string;
  readonly type: string;
  /** 파티장 포함 최대 모집 인원 */
  readonly maxHeadcount: number;
}

export interface Game {
  readonly code: string;
  readonly name: string;
  readonly categoryCode: string;
  readonly contents: readonly GameContent[];
}

export const getGames = () => request<readonly Game[]>('GET', '/api/games');
