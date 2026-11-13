import React from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import CommentSection from '../components/comments/CommentSection';
import ReportDialog from '../components/comments/ReportDialog';
import ApplicantBanner from '../components/post/ApplicantBanner';
import ApplicantsDialog from '../components/post/ApplicantsDialog';
import HostCard from '../components/post/HostCard';
import OwnerPanel from '../components/post/OwnerPanel';
import PartyStatusCard from '../components/post/PartyStatusCard';
import PostDescription from '../components/post/PostDescription';
import PostHeader from '../components/post/PostHeader';
import PostTiles from '../components/post/PostTiles';
import RelatedPosts from '../components/post/RelatedPosts';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import Toast from '../components/ui/Toast';
import LoggedInLayout from '../components/user/LoggedInLayout';
import { commentText } from '../data/commentData';
import { postDetailText, postText } from '../data/postData';
import { paths, ROUTES } from '../data/routes';
import { useComments } from '../hooks/useComments';
import { usePostDetail } from '../hooks/usePostDetail';

interface PostDetailPageProps {
  readonly className?: string;
}

/**
 * Stitch screens: "공고글 상세 - 파티원 모드 / 작성자 모드" + comment interaction screens
 * (edit, delete modal, report modal + toast, profile popover, paging).
 */
export const PostDetailPage: React.FC<PostDetailPageProps> = () => {
  const { postId } = useParams<{ postId: string }>();
  if (!postId) return <Navigate to={ROUTES.board} replace />;
  return <PostDetailView key={postId} postId={postId} />;
};

const PostDetailView: React.FC<{ readonly postId: string }> = ({ postId }) => {
  const navigate = useNavigate();
  const post = usePostDetail(postId);
  const thread = useComments(postId, post.detail?.commentCount ?? 0);
  const { detail } = post;

  if (!detail) {
    return (
      <LoggedInLayout>
        <div className="rounded-2xl border border-night-borderLight bg-night-surface p-10 text-center text-sm">
          {post.loading ? (
            <p className="text-fog-muted">{postDetailText.loading}</p>
          ) : (
            <>
              <p className="text-rose-300">{post.error ?? postDetailText.loadFailed}</p>
              <button type="button" onClick={() => navigate(ROUTES.board)} className="mt-4 px-4 py-2 rounded-lg border border-night-borderLight text-fog-sub hover:text-white">{postText.toList}</button>
            </>
          )}
        </div>
      </LoggedInLayout>
    );
  }

  return (
    <LoggedInLayout>
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_380px] gap-6 items-start">
        <div className="flex flex-col gap-5 min-w-0">
          <PostHeader detail={detail} filled={post.filled} state={post.state} scrapped={post.scrapped} onScrap={post.toggleScrap} onShare={post.copyLink} onEdit={() => navigate(paths.postEdit(String(detail.id)))} onRemove={post.remove.open} />
          {detail.isOwner && <ApplicantBanner count={post.applicants.length} names={post.applicants.map((a) => a.name)} onManage={post.applicantsDialog.open} />}
          <PostTiles tiles={detail.tiles} />
          <PostDescription detail={detail} />
          <CommentSection thread={thread} ownerView={detail.isOwner} title={detail.isOwner ? '댓글 및 공대 문의' : commentText.title} />
        </div>
        <aside className="flex flex-col gap-5 xl:sticky xl:top-24">
          {detail.isOwner ? (
            <OwnerPanel detail={detail} participants={post.participants} state={post.state} onClose={post.closeRecruit.open} onTogglePause={post.togglePause} onDisband={post.disband.open} />
          ) : (
            <>
              <PartyStatusCard detail={detail} filled={post.filled} percent={post.percent} applied={post.applied} state={post.state} scrapped={post.scrapped} onApply={post.apply} onLeave={post.leave.open} onScrap={post.toggleScrap} onCopy={post.copyLink} />
              <HostCard host={detail.host} following={post.following} onFollow={post.toggleFollow} />
            </>
          )}
          <RelatedPosts posts={post.related} />
        </aside>
      </div>

      <ConfirmDialog isOpen={post.remove.isOpen} title={postText.deletePost.title} description={postText.deletePost.description} confirmLabel={postText.deletePost.confirm} cancelLabel={postText.deletePost.cancel} icon="fa-trash-can" onConfirm={post.confirmRemove} onCancel={post.remove.close} />
      <ConfirmDialog isOpen={post.disband.isOpen} title={postText.disband.title} description={postText.disband.description} confirmLabel={postText.disband.confirm} cancelLabel={postText.disband.cancel} icon="fa-people-group" onConfirm={post.confirmDisband} onCancel={post.disband.close} />
      <ConfirmDialog isOpen={post.leave.isOpen} title={postText.leave.title} description={postText.leave.description} confirmLabel={postText.leave.confirm} cancelLabel={postText.leave.cancel} icon="fa-right-from-bracket" tone="warning" onConfirm={post.confirmLeave} onCancel={post.leave.close} />
      <ConfirmDialog isOpen={post.closeRecruit.isOpen} title={postText.closeConfirm.title} description={postText.closeConfirm.description} confirmLabel={postText.closeConfirm.confirm} cancelLabel={postText.closeConfirm.cancel} icon="fa-circle-check" tone="brand" onConfirm={post.confirmClose} onCancel={post.closeRecruit.close} />
      <ConfirmDialog isOpen={thread.deleteDialog.isOpen} title={commentText.deleteDialog.title} description={commentText.deleteDialog.description} confirmLabel={commentText.deleteDialog.confirm} cancelLabel={commentText.deleteDialog.cancel} icon="fa-trash-can" onConfirm={thread.confirmDelete} onCancel={thread.deleteDialog.close} />
      <ReportDialog isOpen={thread.reportDialog.isOpen} onConfirm={thread.confirmReport} onClose={thread.reportDialog.close} />
      <ApplicantsDialog isOpen={post.applicantsDialog.isOpen} applicants={post.applicants} onResolve={post.resolveApplicant} onClose={post.applicantsDialog.close} />
      <Toast message={thread.toast.message ?? post.toast.message} />
    </LoggedInLayout>
  );
};

export default PostDetailPage;
