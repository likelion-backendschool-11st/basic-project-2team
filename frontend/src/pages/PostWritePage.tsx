import React from 'react';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import Toast from '../components/ui/Toast';
import MarkdownEditor from '../components/write/MarkdownEditor';
import OptionPanel from '../components/write/OptionPanel';
import WriteTopBar from '../components/write/WriteTopBar';
import { inputBaseClass } from '../components/signup/fieldStyles';
import { writeText } from '../data/writeData';
import { useWriteForm } from '../hooks/useWriteForm';

interface PostWritePageProps {
  readonly className?: string;
}

/** Stitch screen: "OurParty 공고글 작성하기" (262fbf52487f4fddb91379d500854527) */
export const PostWritePage: React.FC<PostWritePageProps> = () => {
  const f = useWriteForm();
  return (
    <div className="min-h-screen flex flex-col bg-night-base">
      <WriteTopBar savedAt={f.savedAt} onDraft={f.saveDraft} onLeave={f.leave.open} />
      <main className="flex-1 max-w-[1520px] w-full mx-auto p-4 lg:p-6 grid grid-cols-1 xl:grid-cols-[1fr_420px] gap-6 items-start">
        <div className="flex flex-col gap-5">
          <section className="rounded-2xl border border-night-borderLight bg-night-surface p-5">
            <label htmlFor="post-title" className="text-xs text-fog-sub">{writeText.titleLabel}</label>
            <input id="post-title" value={f.draft.title} onChange={(e) => f.set('title', e.target.value)} placeholder={writeText.titlePlaceholder} className={`${inputBaseClass} mt-2 rounded-xl text-base`} />
          </section>
          <MarkdownEditor value={f.draft.body} onChange={(v) => f.set('body', v)} actions={f.toolbarActions} onAction={f.applyToolbar} textareaRef={f.bodyRef} chars={f.chars} previewing={f.previewing} />
          <section className="rounded-2xl border border-night-borderLight bg-night-surface p-4 flex flex-wrap items-center gap-4">
            <button type="button" onClick={f.togglePreview} className="h-12 px-5 rounded-xl border border-night-borderLight text-sm font-semibold text-fog-headline hover:bg-white/5 flex items-center gap-2">
              <i className="fa-regular fa-eye" />{f.previewing ? writeText.previewClose : writeText.preview}
            </button>
            <p className="flex-1 min-w-48 text-xs text-fog-muted">{f.error ? <span className="text-rose-300">{f.error}</span> : writeText.syncNote}</p>
            <button type="button" onClick={f.submit} className="h-12 px-8 rounded-xl bg-mercury hover:bg-mercury-light text-sm font-bold text-white shadow-lg shadow-mercury/30 flex items-center gap-2">
              <i className="fa-solid fa-triangle-exclamation" />{writeText.submit}
            </button>
          </section>
        </div>
        <OptionPanel draft={f.draft} onChange={f.set} summary={f.summary} />
      </main>
      <ConfirmDialog
        isOpen={f.leave.isOpen}
        title={writeText.draftConfirm.title}
        description={writeText.draftConfirm.description}
        confirmLabel={writeText.draftConfirm.confirm}
        cancelLabel={writeText.draftConfirm.cancel}
        tone="warning"
        onConfirm={f.confirmLeave}
        onCancel={f.leave.close}
      />
      <Toast message={f.toast.message} />
    </div>
  );
};

export default PostWritePage;
