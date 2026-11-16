import React from 'react';
import { noShowReasons, postText } from '../../data/postData';
import type { useNoShowReport } from '../../hooks/useNoShowReport';
import ReportDialog from '../comments/ReportDialog';

interface NoShowReportDialogProps {
  readonly report: ReturnType<typeof useNoShowReport>;
}

/** 노쇼 신고 창: 댓글 신고 창에 노쇼 사유와 안내 문구를 넣어 씁니다. */
export const NoShowReportDialog: React.FC<NoShowReportDialogProps> = ({ report }) => (
  <ReportDialog
    isOpen={report.isOpen}
    title={postText.noShow.title(report.target?.name ?? '')}
    description={postText.noShow.description}
    reasons={noShowReasons}
    onConfirm={(reason, detail) => void report.confirm(reason, detail)}
    onClose={report.close}
  />
);

export default NoShowReportDialog;
