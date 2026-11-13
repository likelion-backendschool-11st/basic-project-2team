'use strict';

const { ApiError } = require('../common/ApiError');
const { sendSuccess } = require('../common/response');
const { boardMessages } = require('./boardConstants');
const { parsePostId } = require('./boardValidator');

/** HTTP 요청/응답 변환만 담당하고 로직은 boardService 에 맡깁니다. */
const HEARTBEAT_MS = 25_000;
/** 서버 전체 SSE 연결 상한(메모리·소켓 고갈 방지). 넘으면 503 이고 화면은 30초 폴링으로 대신합니다. */
const MAX_EVENT_CONNECTIONS = 2000;

function createBoardController(boardService, { postEvents, heartbeatMs = HEARTBEAT_MS } = {}) {
  async function getDetail(req, res) {
    const postId = parsePostId(req.params.postId);
    if (postId === null) throw new ApiError(404, 'POST_NOT_FOUND', boardMessages.postNotFound);

    const data = await boardService.getPostDetail(postId, req.auth?.memberId ?? null, { countView: req.query.view !== 'false' });
    return sendSuccess(res, 200, data);
  }

  async function related(req, res) {
    const postId = parsePostId(req.params.postId);
    if (postId === null) throw new ApiError(404, 'POST_NOT_FOUND', boardMessages.postNotFound);
    return sendSuccess(res, 200, await boardService.listRelated(postId, req.query));
  }

  /**
   * GET /api/posts/:postId/events — 공고 변경 신호를 SSE 로 보냅니다(비로그인도 연결 가능).
   * 신호(`event: post|comments`)에는 내용이 없고, 클라이언트가 받으면 일반 API 로 다시 조회합니다.
   */
  async function events(req, res) {
    const postId = parsePostId(req.params.postId);
    if (postId === null) throw new ApiError(404, 'POST_NOT_FOUND', boardMessages.postNotFound);
    const tooMany = () => new ApiError(503, 'TOO_MANY_CONNECTIONS', boardMessages.tooManyConnections);
    if (postEvents.connectionCount() >= MAX_EVENT_CONNECTIONS) throw tooMany();
    await boardService.assertPostExists(postId);
    // await 사이에 다른 요청이 자리를 채웠을 수 있어, 구독 직전에 다시 확인합니다(await 없이 이어지므로 이 뒤로는 경합이 없습니다).
    if (postEvents.connectionCount() >= MAX_EVENT_CONNECTIONS) throw tooMany();
    if (req.destroyed || res.destroyed) return; // 확인하는 사이 클라이언트가 끊었으면 구독하지 않습니다(close 는 이미 지나감)

    res.set({
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no', // nginx 등 프록시가 응답을 모아 두지 않게 합니다
    });
    res.flushHeaders();
    res.write('retry: 3000\n\n'); // 끊기면 브라우저가 3초 뒤 다시 연결합니다

    const unsubscribe = postEvents.subscribe(postId, (topic) => res.write(`event: ${topic}\ndata: {}\n\n`));
    // 프록시·로드밸런서가 유휴 연결을 끊지 않도록 주기적으로 주석 줄을 보냅니다.
    const heartbeat = setInterval(() => res.write(': ping\n\n'), heartbeatMs);
    heartbeat.unref();
    let closed = false;
    const cleanup = () => {
      if (closed) return;
      closed = true;
      clearInterval(heartbeat);
      unsubscribe();
    };
    req.on('close', cleanup);
    res.on('error', cleanup);
  }

  async function list(req, res) {
    const data = await boardService.listPosts(req.query);
    return sendSuccess(res, 200, data);
  }

  const featured = (kind) => async (req, res) => sendSuccess(res, 200, await boardService.listFeatured(kind, req.query));

  return { getDetail, related, events, list, popular: featured('popular'), urgent: featured('urgent') };
}

module.exports = { createBoardController };
