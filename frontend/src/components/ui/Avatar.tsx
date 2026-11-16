import React, { useEffect, useState } from 'react';
import { assetUrl } from '../../api/http';

interface AvatarProps {
  /** 서버가 내려준 프로필 이미지 주소 (없으면 닉네임 첫 글자) */
  readonly url?: string | null;
  readonly name: string;
  /** 크기·모양·글자 스타일. 사진이 없을 때 보이는 글자에도 그대로 적용됩니다. */
  readonly className?: string;
}

/** 프로필 사진 (없거나 불러오지 못하면 닉네임 첫 글자). 사진은 className 의 크기에 꽉 차게 잘라 보여줍니다. */
export const Avatar: React.FC<AvatarProps> = ({ url, name, className = '' }) => {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [url]);
  const src = failed ? null : assetUrl(url ?? null);
  return (
    <span className={`${className} overflow-hidden`}>
      {src ? <img src={src} alt="" className="w-full h-full object-cover" onError={() => setFailed(true)} /> : (Array.from(name)[0] ?? '?')}
    </span>
  );
};

export default Avatar;
