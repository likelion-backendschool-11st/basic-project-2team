'use strict';

/** postEvents 허브 대신 넣어, 서비스가 어떤 공고에 어떤 신호를 보냈는지 기록하는 가짜 허브 */
function createRecordingEvents() {
  const log = [];
  return { log, publish: (postId, topic) => log.push([postId, topic]) };
}

module.exports = { createRecordingEvents };
