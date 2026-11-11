import { useLocation } from 'react-router-dom';
import { signupCompleteText } from '../data/signupData';
import type { SignupCompleteState } from './useSignupForm';

/** Reads the nickname handed over from the signup form (falls back to the design's default). */
export function useSignupComplete() {
  const location = useLocation();
  const state = (location.state ?? {}) as SignupCompleteState;
  return { nickname: state.nickname ?? signupCompleteText.defaultNickname };
}
