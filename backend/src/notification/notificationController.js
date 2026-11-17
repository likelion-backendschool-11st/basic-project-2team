'use strict';

const { ApiError } = require('../common/ApiError');
const { sendSuccess } = require('../common/response');
const { MAX_STREAM_CONNECTIONS, STREAM_HEARTBEAT_MS, notificationMessages: m } = require('./notificationConstants');

/** HTTP 요청/응답 변환만 담당하고 로직은 notificationService 에 맡깁니다. */
function createNotificationController(notificationService, { memberEvents, heartbeatMs = STREAM_HEARTBEAT_MS } = {}) {
  const memberId = (req) => req.auth.memberId;

  /**
   * GET /api/notifications/stream — 내 알림함 변경 신호를 SSE 로 보냅니다(`event: notifications`, 내용 없음).
   * 클라이언트는 받으면 안 읽은 수·목록을 다시 조회합니다. Authorization 헤더가 필요해 브라우저는 EventSource 대신 fetch 스트림으로 받습니다.
   */
  async function stream(req, res) {
    if (!memberEvents || memberEvents.connectionCount() >= MAX_STREAM_CONNECTIONS) {
      throw new ApiError(503, 'TOO_MANY_CONNECTIONS', m.tooManyConnections);
    }
    res.set({
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no', // nginx 등 프록시가 응답을 모아 두지 않게 합니다
    });
    res.flushHeaders();
    res.write(': connected\n\n');

    const unsubscribe = memberEvents.subscribe(memberId(req), (topic) => res.write(`event: ${topic}\ndata: {}\n\n`));
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
    return sendSuccess(res, 200, await notificationService.list(memberId(req), req.query));
  }

  async function unreadCount(req, res) {
    return sendSuccess(res, 200, await notificationService.unreadCount(memberId(req)));
  }

  async function markRead(req, res) {
    await notificationService.markRead(memberId(req), req.params.notificationId);
    return res.status(204).end();
  }

  async function markAllRead(req, res) {
    await notificationService.markAllRead(memberId(req));
    return res.status(204).end();
  }

  async function remove(req, res) {
    await notificationService.remove(memberId(req), req.params.notificationId);
    return res.status(204).end();
  }

  async function listSubscriptions(req, res) {
    return sendSuccess(res, 200, await notificationService.listSubscriptions(memberId(req)));
  }

  async function addSubscription(req, res) {
    return sendSuccess(res, 201, await notificationService.addSubscription(memberId(req), req.body));
  }

  async function setSubscriptionEnabled(req, res) {
    await notificationService.setSubscriptionEnabled(memberId(req), req.params.subscriptionId, req.body);
    return res.status(204).end();
  }

  async function removeSubscription(req, res) {
    await notificationService.removeSubscription(memberId(req), req.params.subscriptionId);
    return res.status(204).end();
  }

  return { list, unreadCount, stream, markRead, markAllRead, remove, listSubscriptions, addSubscription, setSubscriptionEnabled, removeSubscription };
}

module.exports = { createNotificationController };
