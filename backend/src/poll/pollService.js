'use strict';

const { ApiError } = require('../common/ApiError');
const { POST_EVENT, NO_EVENTS } = require('../common/postEvents');
const {
  POLL_STATUS,
  POLL_NOTIFICATION_TYPE,
  POLL_REMIND_INTERVAL_MINUTES,
  NOTIFICATION_TITLE_MAX,
  MEMBER_STATUS,
  pollMessages: m,
  pollNotices,
} = require('./pollConstants');
const { validatePollInput, validateVote, validatePin, validateClose } = require('./pollValidator');

const toIso = (value) => (value ? new Date(value).toISOString() : null);
const postNotFound = () => new ApiError(404, 'POST_NOT_FOUND', m.postNotFound);
const pollNotFound = () => new ApiError(404, 'POLL_NOT_FOUND', m.pollNotFound);
const pollNotOpen = () => new ApiError(409, 'POLL_NOT_OPEN', m.pollNotOpen);

/** 알림 문구에 넣을 때 너무 긴 제목을 자릅니다. */
const truncate = (text) => {
  const chars = Array.from(text);
  return chars.length > NOTIFICATION_TITLE_MAX ? `${chars.slice(0, NOTIFICATION_TITLE_MAX).join('')}…` : text;
};

/** 확정 여부와 마감 시각으로 응답 status 를 정합니다. */
function statusOf(poll, current) {
  if (poll.closedAt) return POLL_STATUS.confirmed;
  return new Date(poll.closesAt) > current ? POLL_STATUS.open : POLL_STATUS.ended;
}

/** 응답에 넣는 회원 요약 (탈퇴 회원은 닉네임을 가립니다) */
const toPerson = (row, hostId) => ({
  memberId: row.memberId,
  nickname: row.memberStatus === MEMBER_STATUS.withdrawn ? m.withdrawnMember : row.nickname,
  mannerTemp: Number(row.mannerTemp),
  isHost: row.memberId === hostId,
});

/**
 * 투표할 수 있는 공대원: 파티장 + 수락된 파티원(탈퇴 제외).
 * 「댓글 작성자만 투표 허용」이면 이 공고에 댓글을 남긴 공대원만 (파티장은 항상 포함).
 */
function eligibleMembers(poll, members, commenterIds) {
  return members.filter(
    (member) =>
      member.memberStatus !== MEMBER_STATUS.withdrawn &&
      (!poll.commentersOnly || Boolean(member.isHost) || commenterIds.has(member.memberId)),
  );
}

/**
 * 파티 의견 조율 투표(공대장이 만들고 공대원이 투표) 비즈니스 로직.
 * @param {{ pollRepository: ReturnType<typeof import('./pollRepository').createPollRepository>, postEvents?: { publish: Function }, now?: () => Date }} deps
 */
function createPollService({ pollRepository, postEvents = NO_EVENTS, now = () => new Date() }) {
  const pollChanged = (postId) => postEvents.publish(postId, POST_EVENT.poll);

  /** 항목 · 투표 기록 · 공대원 · (필요하면) 댓글 작성자 */
  async function loadContext(poll) {
    const [options, votes, members] = await Promise.all([
      pollRepository.findOptions(poll.id),
      pollRepository.findVotes(poll.id),
      pollRepository.findPartyMembers(poll.postId),
    ]);
    const commenterIds = poll.commentersOnly
      ? await pollRepository.findCommenterIds(poll.postId, members.map((member) => member.memberId))
      : new Set();
    return { options, votes, members, eligible: eligibleMembers(poll, members, commenterIds) };
  }

  /**
   * DB 행 → 투표 응답 (docs/API_SPEC.md 5절 「파티 의견 조율 투표」).
   * 참여자 명단(participants)은 공대원(파티장 포함)에게만 보입니다.
   */
  async function buildPoll(poll, post, viewerId) {
    const current = now();
    const { options, votes, members, eligible } = await loadContext(poll);
    const status = statusOf(poll, current);

    const voteCounts = new Map();
    const voters = new Map();
    for (const vote of votes) {
      voteCounts.set(vote.optionId, (voteCounts.get(vote.optionId) ?? 0) + 1);
      const voter = voters.get(vote.memberId) ?? { ...toPerson(vote, post.authorId), optionIds: [], votedAt: vote.votedAt };
      voter.optionIds.push(vote.optionId);
      voters.set(vote.memberId, voter);
    }

    const isMember = viewerId !== null && members.some((member) => member.memberId === viewerId);
    const viewer =
      viewerId === null
        ? null
        : {
            memberId: viewerId,
            isHost: viewerId === post.authorId,
            isMember,
            canVote: status === POLL_STATUS.open && eligible.some((member) => member.memberId === viewerId),
            votedOptionIds: voters.get(viewerId)?.optionIds ?? [],
          };
    const participants = isMember
      ? {
          voters: [...voters.values()].map((voter) => ({ ...voter, votedAt: toIso(voter.votedAt) })),
          nonVoters: eligible.filter((member) => !voters.has(member.memberId)).map((member) => toPerson(member, post.authorId)),
        }
      : null;

    return {
      id: poll.id,
      postId: poll.postId,
      title: poll.title,
      description: poll.description ?? null,
      multiple: Boolean(poll.isMultiple),
      commentersOnly: Boolean(poll.commentersOnly),
      pinned: Boolean(poll.isPinned),
      status,
      closesAt: toIso(poll.closesAt),
      createdAt: toIso(poll.createdAt),
      confirmedAt: toIso(poll.closedAt),
      finalOptionId: poll.finalOptionId ?? null,
      notice: poll.notice ?? null,
      options: options.map((option) => ({ id: option.id, label: option.label, voteCount: voteCounts.get(option.id) ?? 0 })),
      totalVoters: voters.size,
      eligibleCount: eligible.length,
      headcount: post.headcount,
      currentCount: post.currentCount,
      viewer,
      participants,
    };
  }

  async function loadPost(postId) {
    const post = await pollRepository.findPost(postId);
    if (!post) throw postNotFound();
    return post;
  }

  /** 투표와 그 공고. 투표가 없거나 공고가 삭제됐으면 404 */
  async function loadPoll(pollId) {
    const poll = await pollRepository.findPollById(pollId);
    if (!poll) throw pollNotFound();
    const post = await pollRepository.findPost(poll.postId);
    if (!post) throw pollNotFound();
    return { poll, post };
  }

  function assertHost(post, memberId) {
    if (post.authorId !== memberId) throw new ApiError(403, 'NOT_POST_AUTHOR', m.notPostAuthor);
  }

  /** 바뀐 투표를 다시 읽어 응답으로 돌려줍니다. */
  async function reload(pollId, post, viewerId) {
    const poll = await pollRepository.findPollById(pollId);
    if (!poll) throw pollNotFound();
    return buildPoll(poll, post, viewerId);
  }

  /**
   * GET /api/posts/{postId}/poll — 공고의 가장 최근 투표(진행 중이거나 마감된). 없으면 null
   * @param {number | null} viewerId 비로그인이면 null
   */
  async function getPoll(postId, viewerId) {
    const post = await loadPost(postId);
    const poll = await pollRepository.findLatestPoll(postId);
    return poll ? buildPoll(poll, post, viewerId) : null;
  }

  /** POST /api/posts/{postId}/poll — 공대장이 투표를 만듭니다. 진행 중인 투표가 있으면 409 */
  async function createPoll(postId, memberId, body) {
    const current = now();
    const input = validatePollInput(body, current);
    const post = await loadPost(postId);
    assertHost(post, memberId);

    const id = await pollRepository.createPoll({ ...input, postId, authorId: memberId, now: current });
    if (id === null) throw new ApiError(409, 'POLL_ALREADY_OPEN', m.pollAlreadyOpen);
    pollChanged(postId);
    return reload(id, post, memberId);
  }

  /** PATCH /api/polls/{pollId} — 아무도 투표하지 않은 진행 중 투표의 내용·항목을 고칩니다. */
  async function updatePoll(pollId, memberId, body) {
    const current = now();
    const input = validatePollInput(body, current);
    const { poll, post } = await loadPoll(pollId);
    assertHost(post, memberId);
    if (statusOf(poll, current) !== POLL_STATUS.open) throw pollNotOpen();

    if (!(await pollRepository.updatePoll(pollId, input))) throw new ApiError(409, 'POLL_HAS_VOTES', m.pollHasVotes);
    pollChanged(poll.postId);
    return reload(pollId, post, memberId);
  }

  /** PUT /api/polls/{pollId}/votes — 내 투표를 optionIds 로 바꿉니다 (빈 배열이면 취소). */
  async function vote(pollId, memberId, body) {
    const { optionIds } = validateVote(body);
    const { poll, post } = await loadPoll(pollId);
    if (statusOf(poll, now()) !== POLL_STATUS.open) throw pollNotOpen();

    const { options, members, eligible } = await loadContext(poll);
    if (!eligible.some((member) => member.memberId === memberId)) {
      const isMember = members.some((member) => member.memberId === memberId);
      throw isMember
        ? new ApiError(403, 'POLL_COMMENT_REQUIRED', m.commentRequired)
        : new ApiError(403, 'NOT_POLL_VOTER', m.notVoter);
    }
    if (optionIds.some((id) => !options.some((option) => option.id === id))) {
      throw new ApiError(400, 'POLL_OPTION_NOT_FOUND', m.optionNotFound);
    }
    if (!poll.isMultiple && optionIds.length > 1) throw new ApiError(400, 'SINGLE_CHOICE_ONLY', m.singleChoiceOnly);

    if (!(await pollRepository.replaceVotes({ pollId, memberId, optionIds }))) throw pollNotOpen();
    pollChanged(poll.postId);
    return reload(pollId, post, memberId);
  }

  /** PATCH /api/polls/{pollId}/pin — 상단 공지 고정 / 해제 */
  async function setPinned(pollId, memberId, body) {
    const { pinned } = validatePin(body);
    const { poll, post } = await loadPoll(pollId);
    assertHost(post, memberId);
    await pollRepository.updatePinned(pollId, pinned);
    pollChanged(poll.postId);
    return reload(pollId, post, memberId);
  }

  /**
   * POST /api/polls/{pollId}/close — 투표를 마감하고 결과를 확정합니다 (마감 시각 전이면 조기 마감).
   * 선택하면 결과 안내 댓글을 공대장 이름으로 달고, 공대원에게 알림을 보냅니다.
   */
  async function confirmPoll(pollId, memberId, body) {
    const input = validateClose(body);
    const { poll, post } = await loadPoll(pollId);
    assertHost(post, memberId);
    if (poll.closedAt) throw new ApiError(409, 'POLL_ALREADY_CONFIRMED', m.pollAlreadyConfirmed);

    const { options, members } = await loadContext(poll);
    const final = options.find((option) => option.id === input.finalOptionId);
    if (!final) throw new ApiError(400, 'POLL_OPTION_NOT_FOUND', m.optionNotFound);

    const comment = input.postComment
      ? { postId: poll.postId, authorId: memberId, content: input.notice ?? pollNotices.confirmedComment(poll.title, final.label) }
      : null;
    const notifications = input.notifyMembers
      ? members
          .filter((member) => member.memberId !== post.authorId && member.memberStatus !== MEMBER_STATUS.withdrawn)
          .map((member) => ({
            memberId: member.memberId,
            type: POLL_NOTIFICATION_TYPE.confirmed,
            message: pollNotices.confirmedNotification(truncate(post.title), truncate(final.label)),
            postId: poll.postId,
          }))
      : [];

    const confirmed = await pollRepository.confirmPoll({
      pollId,
      finalOptionId: final.id,
      notice: input.notice,
      pinned: input.pinned,
      closedAt: now(),
      comment,
      notifications,
    });
    if (!confirmed) throw new ApiError(409, 'POLL_ALREADY_CONFIRMED', m.pollAlreadyConfirmed);

    pollChanged(poll.postId);
    if (comment) postEvents.publish(poll.postId, POST_EVENT.comments);
    return reload(pollId, post, memberId);
  }

  /** POST /api/polls/{pollId}/reminders — 아직 투표하지 않은 공대원에게 알림을 보냅니다 (10분에 한 번). */
  async function remindVoters(pollId, memberId) {
    const { poll, post } = await loadPoll(pollId);
    assertHost(post, memberId);
    const current = now();
    if (statusOf(poll, current) !== POLL_STATUS.open) throw pollNotOpen();

    const { votes, eligible } = await loadContext(poll);
    const voted = new Set(votes.map((v) => v.memberId));
    const targets = eligible.filter((member) => member.memberId !== post.authorId && !voted.has(member.memberId));
    if (targets.length === 0) return { count: 0 };

    const sent = await pollRepository.remind({
      pollId,
      remindedAt: current,
      remindableBefore: new Date(current.getTime() - POLL_REMIND_INTERVAL_MINUTES * 60000),
      notifications: targets.map((member) => ({
        memberId: member.memberId,
        type: POLL_NOTIFICATION_TYPE.reminder,
        message: pollNotices.reminderNotification(truncate(post.title), poll.title),
        postId: poll.postId,
      })),
    });
    if (!sent) throw new ApiError(429, 'POLL_REMIND_TOO_SOON', m.remindTooSoon);
    return { count: targets.length };
  }

  return { getPoll, createPoll, updatePoll, vote, setPinned, confirmPoll, remindVoters };
}

module.exports = { createPollService };
