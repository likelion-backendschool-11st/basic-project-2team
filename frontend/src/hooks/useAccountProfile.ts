import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import { deleteAvatar, getMe, uploadAvatar } from '../api/accountApi';
import { updateStoredUser } from '../api/authApi';
import { ApiRequestError, assetUrl, errorMessageOf } from '../api/http';
import { avatarText } from '../data/accountData';

export interface AccountProfile {
  readonly nickname: string;
  readonly userId: string;
  /** <img src> 에 바로 쓸 수 있는 주소 (서버 경로는 API 서버 주소를 붙임) */
  readonly avatarUrl: string | null;
  /** 아바타가 없을 때 보여줄 닉네임 첫 글자 */
  readonly initial: string;
}

/**
 * 계정 관리 화면 좌측 프로필 (GET /api/members/me)과 프로필 이미지 변경 (PUT·DELETE /api/members/me/avatar).
 * 로그인이 풀렸으면 로그인 안내 모달이 뜹니다(api/http.ts).
 */
export function useAccountProfile() {
  const [profile, setProfile] = useState<AccountProfile | null>(null);
  const [uploading, setUploading] = useState(false);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 로그인이 풀렸으면(401) http.ts 가 로그인 안내 모달을 띄우므로 오류 문구는 따로 보여주지 않습니다.
  const loginExpired = (err: unknown) => err instanceof ApiRequestError && err.status === 401;

  useEffect(() => {
    let cancelled = false;
    getMe()
      .then((me) => {
        if (cancelled) return;
        setProfile({
          nickname: me.nickname,
          userId: me.userId,
          avatarUrl: assetUrl(me.avatarUrl),
          initial: Array.from(me.nickname)[0] ?? '',
        });
      })
      .catch((err: unknown) => {
        void err; // 로그인이 풀렸으면 http.ts 가 로그인 안내 모달을 띄웁니다.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  /** 화면과 헤더 등에 저장된 로그인 정보의 프로필 이미지를 함께 바꿉니다. */
  const applyAvatar = (serverUrl: string | null) => {
    setProfile((prev) => (prev ? { ...prev, avatarUrl: assetUrl(serverUrl) } : prev));
    updateStoredUser({ avatarUrl: serverUrl });
  };

  /** 카메라 버튼 → 숨겨 둔 파일 선택 창을 엽니다. */
  const pickAvatar = () => {
    setAvatarError(null);
    fileInputRef.current?.click();
  };

  const onAvatarFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // 같은 파일을 다시 골라도 change 가 일어나도록 비웁니다.
    if (!file || uploading) return;
    if (!avatarText.acceptedTypes.includes(file.type)) return setAvatarError(avatarText.invalidType);
    if (file.size > avatarText.maxBytes) return setAvatarError(avatarText.tooLarge);

    setUploading(true);
    setAvatarError(null);
    try {
      const { avatarUrl } = await uploadAvatar(file);
      applyAvatar(avatarUrl);
    } catch (err) {
      if (!loginExpired(err)) setAvatarError(errorMessageOf(err, avatarText.failed));
    } finally {
      setUploading(false);
    }
  };

  const resetAvatar = async () => {
    if (uploading) return;
    setUploading(true);
    setAvatarError(null);
    try {
      await deleteAvatar();
      applyAvatar(null);
    } catch (err) {
      if (!loginExpired(err)) setAvatarError(errorMessageOf(err, avatarText.failed));
    } finally {
      setUploading(false);
    }
  };

  return { profile, uploading, avatarError, fileInputRef, pickAvatar, onAvatarFileChange, resetAvatar };
}
