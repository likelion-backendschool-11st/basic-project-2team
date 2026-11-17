import React from 'react';
import { useKickedNotice } from '../../hooks/useKickedNotice';
import KickedNoticeDialog from './KickedNoticeDialog';

/**
 * 안 읽은 추방 알림이 있으면 어느 화면에서든 추방 안내 모달을 띄웁니다.
 * 추방된 그 공고 화면에서 확인을 누르면 이전 페이지로 이동합니다. App 에 한 번만 둡니다.
 */
export const KickedNoticeHost: React.FC = () => {
  const { notice, onKickedPost, confirm, toSupport } = useKickedNotice();
  return <KickedNoticeDialog notice={notice} leavesPage={onKickedPost} onConfirm={confirm} onSupport={toSupport} />;
};

export default KickedNoticeHost;
