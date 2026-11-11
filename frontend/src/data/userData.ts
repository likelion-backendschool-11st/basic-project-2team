import { ROUTES } from './routes';

export interface LoggedInUser {
  readonly id: string;
  readonly nickname: string;
  /** Single-character avatar fallback shown in the header pill. */
  readonly initial: string;
  readonly level: number;
  /** Short manner temperature shown in the header ("98°C"). */
  readonly mannerShort: string;
  /** Precise manner temperature shown on MyPage ("98.4°C"). */
  readonly mannerTemp: string;
  readonly avatarUrl: string;
  readonly online: boolean;
}

export const currentUser: LoggedInUser = {
  id: 'u-healer',
  nickname: '빛나는힐러',
  initial: '빛',
  level: 48,
  mannerShort: '98°C',
  mannerTemp: '98.4°C',
  avatarUrl:
    'https://lh3.googleusercontent.com/aida-public/AB6AXuB0eAf3-d6JoNkDxtgG-EpAl4j51qmvBWaWf5dzY-6zPmmpvxCeGf7EWDARACJAhFlQUXT9SAUUNA1JNqFGQoFW95GMvJAyOXOTK6jSXDGBa2-p8Xs_qmDi8pqGw5nmhSRmuut6BwIngbIRg7k30-rCqv4BgvsRPFC336VoVmNQ3PVPNA5lnH6YeqBuwIVi-cqQJpbdVcKyMtW0kW7XybUgUncsxHQwhWZ7_6VlwKhu',
  online: true,
};

export const userMenuText = {
  levelPrefix: 'Lv.',
  mannerPrefix: '매너 ',
  logout: '로그아웃',
  profileLink: ROUTES.myPage,
  /** Where the user lands after logging out. */
  logoutRedirect: ROUTES.home,
} as const;
