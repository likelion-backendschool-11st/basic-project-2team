import React from 'react';
import AppLayout from '../components/layout/AppLayout';
import InfoDocument from '../components/info/InfoDocument';
import InfoNav from '../components/info/InfoNav';
import { infoDocs, type InfoDocId } from '../data/infoData';
import { useScrollTopOnChange } from '../hooks/useScrollTopOnChange';

interface InfoPageProps {
  readonly docId: InfoDocId;
}

/** 푸터 안내 페이지: 커뮤니티 소개 · 이용약관 · 개인정보처리방침 · 고객지원 */
export const InfoPage: React.FC<InfoPageProps> = ({ docId }) => {
  useScrollTopOnChange(docId);
  return (
    <AppLayout>
      <div className="flex flex-col lg:flex-row gap-6 py-4">
        <InfoNav active={docId} />
        <InfoDocument doc={infoDocs[docId]} />
      </div>
    </AppLayout>
  );
};

export default InfoPage;
