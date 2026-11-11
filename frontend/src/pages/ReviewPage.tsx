import React from 'react';
import { useNavigate } from 'react-router-dom';
import LoggedInLayout from '../components/user/LoggedInLayout';
import ReviewBackdropContent from '../components/review/ReviewBackdropContent';
import ReviewModal from '../components/review/ReviewModal';
import { useModal } from '../hooks/useModal';
import { ROUTES } from '../data/routes';

interface ReviewPageProps {
  readonly className?: string;
}

/** Stitch screen: "파티원 별점 및 리뷰 등록 모달" (4a9f75476c4f4d33b49d2d3b4fe55412) */
export const ReviewPage: React.FC<ReviewPageProps> = () => {
  const navigate = useNavigate();
  const review = useModal(true, { onClose: () => navigate(ROUTES.myPage) });

  return (
    <LoggedInLayout contained={false}>
      <ReviewBackdropContent dimmed={review.isOpen} />
      <ReviewModal isOpen={review.isOpen} onClose={review.close} initialConfirmOpen />
    </LoggedInLayout>
  );
};

export default ReviewPage;
