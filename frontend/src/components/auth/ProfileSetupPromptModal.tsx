import React from 'react';
import { createPortal } from 'react-dom';
import Modal from '../ui/Modal';
import { profileSetupPromptText as t } from '../../data/authData';

interface ProfileSetupPromptModalProps {
  /** 환영 문구에 넣을 닉네임. null 이면 닫힌 상태 */
  readonly nickname: string | null;
  readonly onConfirm: () => void;
}

/** 프로필 설정은 필수라 배경 클릭·Esc 로 닫히지 않습니다. */
const ignoreClose = () => undefined;

/**
 * 프로필을 아직 설정하지 않은 회원(신규 가입 등)이 로그인하면 프로필 설정 화면으로 안내하는 모달.
 * 로그인 카드(backdrop-blur · overflow-hidden) 안에서 열리면 화면 전체를 덮지 못하므로 body 로 포털합니다.
 */
export const ProfileSetupPromptModal: React.FC<ProfileSetupPromptModalProps> = ({ nickname, onConfirm }) => {
  if (nickname === null) return null;
  return createPortal(
    <Modal isOpen ariaLabel={t.ariaLabel} onClose={ignoreClose}>
      <div className="flex flex-col items-center gap-4 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-mercury/15 text-2xl text-mercury-light ring-1 ring-mercury/30">
          <i className={t.icon} />
        </div>
        <h2 className="text-xl font-bold text-white">{t.title}</h2>
        <p className="break-words text-sm font-semibold text-mercury-light">{t.welcome(nickname)}</p>
        <p className="break-words text-sm leading-relaxed text-fog-sub">{t.body}</p>
      </div>

      <ul className="mt-5 flex flex-col gap-2.5 rounded-2xl border border-mercury/20 bg-mercury/5 px-4 py-4">
        {t.benefits.map((benefit) => (
          <li key={benefit.id} className="flex items-center gap-3 text-sm text-fog-headline">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-night-card text-mercury-light">
              <i className={benefit.icon} />
            </span>
            {benefit.label}
          </li>
        ))}
      </ul>

      <p className="mt-4 flex items-center justify-center gap-1.5 text-xs text-fog-muted">
        <i className="fa-solid fa-circle-info" />
        {t.requiredHint}
      </p>

      <button
        autoFocus
        className="mt-6 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-mercury text-sm font-bold text-white transition-all hover:bg-mercury-light"
        onClick={onConfirm}
        type="button"
      >
        {t.confirm}
        <i className={t.confirmIcon} />
      </button>
    </Modal>,
    document.body,
  );
};

export default ProfileSetupPromptModal;
