'use strict';

/**
 * 응답 포맷 `{ success: false, error: { code, message, fields?, ...details } }` 으로 바뀌는 예외.
 * 서비스 계층에서 throw 하면 errorHandler 가 상태 코드와 함께 응답합니다.
 */
class ApiError extends Error {
  /**
   * @param {number} status HTTP 상태 코드
   * @param {string} code 영문 에러 코드 (예: DUPLICATE_LOGIN_ID)
   * @param {string} message 사용자에게 보여줄 한국어 메시지
   * @param {ReadonlyArray<{ field: string, message: string }>} [fields] 필드별 검증 오류
   * @param {Readonly<Record<string, unknown>>} [details] error 객체에 함께 실을 추가 정보 (예: 로그인 정지 회원의 `sanction`)
   */
  constructor(status, code, message, fields, details) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.fields = fields;
    this.details = details;
  }
}

module.exports = { ApiError };
