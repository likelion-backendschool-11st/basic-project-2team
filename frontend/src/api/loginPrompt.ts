/**
 * 「로그인이 필요해요」 안내 모달을 띄우는 신호. 로그인하지 않아 권한이 없을 때 어디서든 promptLogin() 하나로 같은 모달을 띄웁니다
 * (화면의 모달은 components/auth/LoginPromptHost 가 그립니다). API 가 401 을 돌려주면 api/http.ts 가 자동으로 호출합니다.
 */
export const LOGIN_PROMPT_EVENT = 'login-prompt';
export const DEFAULT_LOGIN_MESSAGE = '로그인 후 이용할 수 있습니다.';

let open = false;

/** 모달이 열려 있는 동안에는 같은 실패로 토스트가 또 뜨지 않도록 useToast 가 확인합니다. */
export const isLoginPromptOpen = () => open;
export const closeLoginPrompt = () => {
  open = false;
};

export const promptLogin = (message: string = DEFAULT_LOGIN_MESSAGE) => {
  open = true;
  window.dispatchEvent(new CustomEvent<string>(LOGIN_PROMPT_EVENT, { detail: message }));
};
