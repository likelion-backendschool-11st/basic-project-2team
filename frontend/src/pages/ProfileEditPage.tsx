import React from 'react';
import AccountShell from '../components/account/AccountShell';
import FormActions from '../components/account/FormActions';
import GameCheckCard from '../components/account/GameCheckCard';
import FieldStatusMessage, { type FieldStatusTone } from '../components/signup/FieldStatusMessage';
import { inputBaseClass, labelClass } from '../components/signup/fieldStyles';
import { accountPanelText, gameOptions, playStyles, profileText } from '../data/accountData';
import { useProfileForm, type NicknameStatus } from '../hooks/useProfileForm';

interface ProfileEditPageProps {
  readonly className?: string;
}

const statusView: Readonly<Record<NicknameStatus, { tone: FieldStatusTone; message: string } | null>> = {
  idle: null,
  invalid: { tone: 'error', message: profileText.nicknameInvalid },
  taken: { tone: 'error', message: profileText.nicknameTaken },
  available: { tone: 'success', message: profileText.nicknameOk },
};

/** Stitch screen: "OurParty 마이페이지 - 프로필 수정" (21dd7fe0f0eb4763b34307c438c16e9b) */
export const ProfileEditPage: React.FC<ProfileEditPageProps> = () => {
  const form = useProfileForm();
  const status = statusView[form.status];
  const style = playStyles.find((s) => s.id === form.styleId) ?? playStyles[0];
  const text = accountPanelText.profile;

  return (
    <AccountShell active="profile" title={text.title} description={text.description}>
      <form onSubmit={form.onSubmit} className="flex flex-col gap-8">
        <section className="flex flex-col gap-2">
          <label htmlFor="nickname" className={`${labelClass} font-bold text-white`}>
            {profileText.nicknameLabel} <span className="text-mercury-light">*</span>
          </label>
          <div className="flex gap-3">
            <div className="relative flex-1">
              <input id="nickname" className={inputBaseClass} value={form.nickname} onChange={form.onNicknameChange} maxLength={profileText.maxNickname} />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-fog-muted">
                {form.nickname.length}/{profileText.maxNickname}
              </span>
            </div>
            <button type="button" onClick={form.checkNickname} className="h-12 px-6 rounded-full border border-night-borderLight text-sm font-semibold text-white hover:bg-white/5 flex items-center gap-2">
              <i className="fa-regular fa-circle-check text-mercury-light" />
              {profileText.checkButton}
            </button>
          </div>
          <p className="text-xs text-fog-muted">💡 {profileText.nicknameHint}</p>
          {status && <FieldStatusMessage tone={status.tone} message={status.message} />}
        </section>

        <section className="flex flex-col gap-3 pt-6 border-t border-night-borderLight">
          <div className="flex items-end justify-between">
            <div className="text-sm font-bold text-white">
              {profileText.gamesLabel} <span className="text-mercury-light">*</span>{' '}
              <span className="font-normal text-xs text-fog-muted">{profileText.gamesSub}</span>
            </div>
            <span className="text-xs font-semibold text-mercury-light">{profileText.gamesSelected(form.games.length)}</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
            {gameOptions.map((g) => (
              <GameCheckCard key={g.id} game={g} checked={form.games.includes(g.id)} onToggle={form.toggleGame} />
            ))}
          </div>
        </section>

        <section className="flex flex-col gap-3 pt-6 border-t border-night-borderLight">
          <label htmlFor="play-style" className="text-sm font-bold text-white">
            {profileText.styleLabel} <span className="text-mercury-light">*</span>
          </label>
          <select id="play-style" value={form.styleId} onChange={(e) => form.setStyleId(e.target.value)} className={`${inputBaseClass} rounded-xl border border-night-borderLight`}>
            {playStyles.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </select>
          <p className="flex items-center gap-2 px-4 py-3 rounded-xl border border-night-borderLight text-xs text-fog-sub">
            <i className="fa-solid fa-wand-magic-sparkles text-mercury-light" />
            {style.description}
          </p>
        </section>

        <FormActions submitLabel={profileText.save} submitIcon="fa-floppy-disk" disabled={!form.canSave} />
      </form>
    </AccountShell>
  );
};

export default ProfileEditPage;
