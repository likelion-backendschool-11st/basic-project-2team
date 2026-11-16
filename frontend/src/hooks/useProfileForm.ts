import { useEffect, useState, type ChangeEvent, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { getMe, updateProfile } from '../api/accountApi';
import { checkAvailability, updateStoredUser } from '../api/authApi';
import { getGames } from '../api/gameApi';
import { ApiRequestError, errorMessageOf } from '../api/http';
import { DEFAULT_PLAY_STYLE, ageRanges, playStyles, profileText, type GameOption } from '../data/accountData';
import { ROUTES } from '../data/routes';
import { useAuth } from './useAuth';

export type NicknameStatus = 'idle' | 'checking' | 'invalid' | 'taken' | 'available';

/** 불러온 내 프로필 (저장 전 값과 비교하는 기준) */
interface LoadedProfile {
  readonly nickname: string;
  readonly mainGame: string | null;
}

/** 백엔드 memberValidator.fieldRules.nickname 과 같은 규칙 */
const isNicknameFormatOk = (value: string) => {
  const length = Array.from(value).length;
  return !/\s/.test(value) && length >= profileText.minNickname && length <= profileText.maxNickname;
};

/** 프로필 수정 — GET /api/members/me · GET /api/games 로 채우고 PATCH /api/members/me 로 저장합니다. */
export function useProfileForm() {
  const navigate = useNavigate();
  /** 프로필을 처음 설정하는 중(신규 회원 등)이면 true — 안내 배너를 보이고 취소 버튼을 숨깁니다. */
  const setupRequired = useAuth().user?.profileSetupRequired === true;
  const [loaded, setLoaded] = useState<LoadedProfile | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [gameOptions, setGameOptions] = useState<readonly GameOption[]>([]);

  const [nickname, setNickname] = useState('');
  const [status, setStatus] = useState<NicknameStatus>('available');
  /** invalid 일 때 서버가 알려준 이유 (없으면 기본 문구) */
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [games, setGames] = useState<readonly string[]>([]);
  const [styleId, setStyleId] = useState(DEFAULT_PLAY_STYLE);
  const [bio, setBio] = useState('');
  /** '' 이면 선택 안 함(null 로 저장) */
  const [ageRange, setAgeRange] = useState('');
  const [ageRangePublic, setAgeRangePublic] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([getMe(), getGames()])
      .then(([me, gameList]) => {
        if (cancelled) return;
        setGameOptions(gameList.map((g) => ({ id: g.code, name: g.name, genre: g.categoryCode.toUpperCase() })));
        const main = me.games.find((g) => g.isMain) ?? me.games[0];
        const savedStyle = main?.playStyle;
        setNickname(me.nickname);
        setGames(me.games.map((g) => g.code));
        setBio(me.bio ?? '');
        setAgeRange(me.ageRange ?? '');
        setAgeRangePublic(me.ageRangePublic);
        setStyleId(savedStyle && playStyles.some((s) => s.id === savedStyle) ? savedStyle : DEFAULT_PLAY_STYLE);
        setLoaded({ nickname: me.nickname, mainGame: main?.code ?? null });
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setLoadError(errorMessageOf(err, profileText.loadFailed));
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const onNicknameChange = (e: ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.slice(0, profileText.maxNickname);
    setNickname(value);
    // 원래 닉네임으로 되돌리면 다시 확인할 필요가 없습니다.
    setStatus(value.trim() === loaded?.nickname ? 'available' : 'idle');
    setStatusMessage(null);
    setSaveError(null);
  };

  /** GET /api/auth/check?type=nickname — 지금 내 닉네임이면 서버에 묻지 않습니다. */
  const checkNickname = async () => {
    const value = nickname.trim();
    setStatusMessage(null);
    if (!isNicknameFormatOk(value)) return setStatus('invalid');
    if (value === loaded?.nickname) return setStatus('available');
    setStatus('checking');
    try {
      const { available } = await checkAvailability('nickname', value);
      setStatus(available ? 'available' : 'taken');
    } catch (err) {
      setStatus('invalid');
      setStatusMessage(errorMessageOf(err, profileText.checkFailed));
    }
  };

  const toggleGame = (id: string) => {
    setGames((prev) => (prev.includes(id) ? prev.filter((g) => g !== id) : [...prev, id]));
    setSaveError(null);
  };

  const onStyleChange = (id: string) => {
    setStyleId(id);
    setSaveError(null);
  };

  const onBioChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    setBio(e.target.value.slice(0, profileText.maxBio));
    setSaveError(null);
  };

  const onAgeRangeChange = (e: ChangeEvent<HTMLSelectElement>) => {
    setAgeRange(e.target.value);
    setSaveError(null);
  };

  const onAgeRangePublicChange = (e: ChangeEvent<HTMLInputElement>) => {
    setAgeRangePublic(e.target.checked);
    setSaveError(null);
  };

  /** 예전에 선택지에 없는 값으로 저장됐으면 그 값도 선택지에 남겨 둡니다. */
  const ageRangeOptions = ageRange && !ageRanges.includes(ageRange) ? [ageRange, ...ageRanges] : ageRanges;

  const canSave = loaded !== null && status === 'available' && games.length > 0 && !saving;

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!canSave || !loaded) return;
    setSaving(true);
    setSaveError(null);
    try {
      // 대표 게임은 기존 대표 게임이 남아 있으면 유지하고, 아니면 첫 번째 선택한 게임으로 정합니다.
      const mainGame = loaded.mainGame && games.includes(loaded.mainGame) ? loaded.mainGame : games[0];
      const me = await updateProfile({
        nickname: nickname.trim(),
        bio: bio.trim() || null,
        ageRange: ageRange || null,
        ageRangePublic,
        games,
        mainGame,
        playStyle: styleId,
      });
      // 선호 게임을 1개 이상 저장했으므로 프로필 설정 필수 상태가 풀립니다. 처음 설정이었다면 메인으로 보냅니다.
      updateStoredUser({ nickname: me.nickname, profileSetupRequired: false });
      navigate(setupRequired ? ROUTES.homeLoggedIn : ROUTES.myPage);
    } catch (err) {
      if (err instanceof ApiRequestError && err.code === 'DUPLICATE_NICKNAME') setStatus('taken');
      else setSaveError(errorMessageOf(err, profileText.saveFailed));
    } finally {
      setSaving(false);
    }
  };

  return {
    setupRequired,
    loading: loaded === null && loadError === null,
    loadError,
    gameOptions,
    nickname,
    status,
    statusMessage,
    games,
    styleId,
    bio,
    ageRange,
    ageRangeOptions,
    ageRangePublic,
    saving,
    saveError,
    canSave,
    onNicknameChange,
    checkNickname,
    toggleGame,
    setStyleId: onStyleChange,
    onBioChange,
    onAgeRangeChange,
    onAgeRangePublicChange,
    onSubmit,
  };
}
