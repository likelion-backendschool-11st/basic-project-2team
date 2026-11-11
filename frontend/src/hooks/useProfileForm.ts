import { useState, type ChangeEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { initialProfile, profileText } from '../data/accountData';
import { ROUTES } from '../data/routes';

export type NicknameStatus = 'idle' | 'invalid' | 'taken' | 'available';

const NICKNAME_RE = /^[가-힣a-zA-Z0-9]+$/;

export function useProfileForm() {
  const navigate = useNavigate();
  const [nickname, setNickname] = useState(initialProfile.nickname);
  const [status, setStatus] = useState<NicknameStatus>('available');
  const [games, setGames] = useState<readonly string[]>(initialProfile.games);
  const [styleId, setStyleId] = useState(initialProfile.styleId);
  const [saved, setSaved] = useState(false);

  const onNicknameChange = (e: ChangeEvent<HTMLInputElement>) => {
    setNickname(e.target.value.slice(0, profileText.maxNickname));
    setStatus('idle');
    setSaved(false);
  };

  const checkNickname = () => {
    const value = nickname.trim();
    if (value.length < profileText.minNickname || !NICKNAME_RE.test(value)) return setStatus('invalid');
    setStatus(profileText.takenNicknames.includes(value) ? 'taken' : 'available');
  };

  const toggleGame = (id: string) => {
    setGames((prev) => (prev.includes(id) ? prev.filter((g) => g !== id) : [...prev, id]));
    setSaved(false);
  };

  const canSave = status === 'available' && games.length > 0;

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSave) return;
    setSaved(true);
    navigate(ROUTES.myPage);
  };

  return { nickname, status, games, styleId, saved, canSave, onNicknameChange, checkNickname, toggleGame, setStyleId, onSubmit };
}
