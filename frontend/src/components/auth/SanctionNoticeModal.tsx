import React from 'react';
import { createPortal } from 'react-dom';
import type { LoginSanction } from '../../api/authApi';
import Modal from '../ui/Modal';
import { sanctionNoticeText as t } from '../../data/authData';
import { sanctionNoticeStyles } from '../../data/authStyles';

interface SanctionNoticeModalProps {
  /** null 이면 닫힌 상태 */
  readonly sanction: LoginSanction | null;
  readonly onClose: () => void;
}

/**
 * 정지·영구 정지 회원이 로그인했을 때 제재 사유와 해제 예정일을 알려주는 모달.
 * 로그인 카드(backdrop-blur · overflow-hidden) 안에서 열리면 화면 전체를 덮지 못하므로 body 로 포털합니다.
 */
export const SanctionNoticeModal: React.FC<SanctionNoticeModalProps> = ({ sanction, onClose }) => {
  if (!sanction) return null;
  const styles = sanctionNoticeStyles[sanction.type];
  return createPortal(
    <Modal isOpen ariaLabel={t.ariaLabel} onClose={onClose}>
      <div className="flex flex-col items-center gap-4 text-center">
        <div className={`flex h-16 w-16 items-center justify-center rounded-2xl text-2xl ${styles.badge}`}>
          <i className={`fa-solid ${t.icon[sanction.type]}`} />
        </div>
        <h2 className="text-xl font-bold text-white">{t.title[sanction.type]}</h2>
        <p className="break-words text-sm leading-relaxed text-fog-sub">
          {t.message(sanction).map((segment, i) =>
            segment.highlight ? (
              // 조각은 순서가 고정된 문장이라 index 를 key 로 씁니다.
              <strong key={i} className={`font-bold ${styles.highlight}`}>
                {segment.text}
              </strong>
            ) : (
              <React.Fragment key={i}>{segment.text}</React.Fragment>
            ),
          )}
        </p>
      </div>

      <dl className={`mt-5 divide-y divide-night-border rounded-2xl border px-4 ${styles.panel}`}>
        {t.rows(sanction).map((row) => (
          <div key={row.label} className="flex items-center justify-between gap-4 py-3 text-sm">
            <dt className="shrink-0 text-fog-muted">{row.label}</dt>
            <dd className="font-semibold text-fog-headline">{row.value}</dd>
          </div>
        ))}
      </dl>

      <p className="mt-4 flex items-center justify-center gap-1.5 text-xs text-fog-muted">
        <i className="fa-solid fa-circle-info" />
        {t.contact}
      </p>

      <button
        autoFocus
        className="mt-6 h-12 w-full rounded-xl bg-mercury text-sm font-bold text-white transition-all hover:bg-mercury-light"
        onClick={onClose}
        type="button"
      >
        {t.confirm}
      </button>
    </Modal>,
    document.body,
  );
};

export default SanctionNoticeModal;
