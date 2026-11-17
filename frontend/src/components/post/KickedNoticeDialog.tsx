import React from 'react';
import { postText } from '../../data/postData';
import type { KickedNoticeView } from '../../hooks/useKickedNotice';
import Modal from '../ui/Modal';

interface KickedNoticeDialogProps {
  readonly notice: KickedNoticeView | null;
  /** 추방된 그 공고 화면을 보고 있으면 true (확인 버튼이 「이전 페이지로 이동」) */
  readonly leavesPage: boolean;
  /** 확인 · 닫기 · 바깥 클릭 · Esc */
  readonly onConfirm: () => void;
  /** 「고객지원 > 비매너 이용자 신고센터」 링크 */
  readonly onSupport: () => void;
}

const t = postText.kickedNotice;

/** Stitch 「파티 추방 안내」 모달: 대상 공고 · 공대장 · 추방 사유 · 이의 신청 안내 + 확인 버튼 */
export const KickedNoticeDialog: React.FC<KickedNoticeDialogProps> = ({ notice, leavesPage, onConfirm, onSupport }) => (
  <Modal
    isOpen={notice !== null}
    onClose={onConfirm}
    ariaLabel={t.title}
    panelClass="relative rounded-2xl border border-roseAccent/30 bg-night-surface p-6 shadow-[0_20px_60px_rgba(0,0,0,0.9),0_0_30px_rgba(244,63,94,0.15)]"
  >
    {notice && (
      <div className="flex flex-col gap-4 text-white">
        <button type="button" aria-label={t.close} onClick={onConfirm} className="absolute top-4 right-4 w-8 h-8 rounded-lg flex items-center justify-center text-fog-muted hover:text-white hover:bg-night-card">
          <i className="fa-solid fa-xmark" />
        </button>

        <div className="flex flex-col items-center text-center gap-2 pt-1">
          <div className="w-14 h-14 rounded-full bg-roseAccent/15 border border-roseAccent/30 flex items-center justify-center text-2xl text-rose-300 shadow-[0_0_20px_rgba(244,63,94,0.2)]">
            <i className="fa-solid fa-user-minus" />
          </div>
          <span className="mt-1 inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-roseAccent/15 border border-roseAccent/30 text-rose-300 text-[11px] font-bold">
            <span className="w-1.5 h-1.5 rounded-full bg-roseAccent animate-pulse" />{t.badge}
          </span>
          <h2 className="mt-1 text-xl font-bold tracking-tight">{t.title}</h2>
          <p className="text-xs text-fog-sub">{t.subtitle}</p>
        </div>

        <div className="rounded-xl bg-night-card border border-night-borderLight p-4 flex flex-col gap-2.5 text-left">
          <div className="flex flex-col gap-1 pb-2.5 border-b border-night-borderLight">
            <span className="text-[11px] font-medium text-fog-muted">{t.postLabel}</span>
            <span className="text-xs font-bold truncate">{notice.postTitle}</span>
            {notice.hostName && (
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="text-[11px] text-fog-muted">{t.hostLabel}</span>
                <span className="px-1.5 py-0.5 rounded bg-night-hover text-mercury-light text-[11px] font-bold">{notice.hostName}</span>
              </div>
            )}
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-[11px] font-medium text-fog-muted">{t.reasonLabel}</span>
            <div className="p-2.5 rounded-lg bg-night-deep border border-roseAccent/20 flex flex-col gap-1">
              <span className="text-xs font-semibold text-rose-300 flex items-center gap-1.5"><i className="fa-solid fa-triangle-exclamation text-[11px]" />{t.reasonHeadline}</span>
              <p className={`text-xs break-words ${notice.reason ? 'text-fog-headline font-medium' : 'text-fog-muted'}`}>{notice.reason ?? t.noReason}</p>
            </div>
          </div>
          <p className="pt-1 text-[11px] text-fog-muted leading-relaxed">
            {t.appealPrefix}
            <button type="button" onClick={onSupport} className="text-mercury-light hover:underline">{t.appealLink}</button>
            {t.appealSuffix}
          </p>
        </div>

        <button type="button" onClick={onConfirm} className="w-full h-12 rounded-xl bg-gradient-to-r from-mercury to-mercury-dark text-sm font-bold text-white shadow-glow-mercury hover:brightness-110 transition-all flex items-center justify-center gap-1.5">
          {leavesPage && <i className="fa-solid fa-arrow-left" />}{leavesPage ? t.confirm : t.confirmStay}
        </button>
      </div>
    )}
  </Modal>
);

export default KickedNoticeDialog;
