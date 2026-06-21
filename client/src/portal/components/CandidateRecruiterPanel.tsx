import { useCallback, useEffect, useState } from 'react';
import { portalApi } from '@/api/portalApi';
import { RecruiterActivityTypeLabels } from '@/models/recruiter';
import type { PortalApplicantDetail } from '@/models/portalApplicant';
import type { RecruiterTag } from '@/models/recruiter';
import { RecruiterStarRating } from '@/portal/components/RecruiterStarRating';
import ws from '@/portal/workspace.module.css';

interface CandidateRecruiterPanelProps {
  applicant: PortalApplicantDetail;
  onUpdated: () => void;
  hideEvaluation?: boolean;
}

export function CandidateRecruiterPanel({ applicant, onUpdated, hideEvaluation = false }: CandidateRecruiterPanelProps) {
  const safe = {
    ...applicant,
    recruiterTags: applicant.recruiterTags ?? [],
    recruiterNotes: applicant.recruiterNotes ?? [],
    activityTimeline: applicant.activityTimeline ?? [],
    isFavorite: applicant.isFavorite ?? false,
  };

  const [companyTags, setCompanyTags] = useState<RecruiterTag[]>([]);
  const [noteText, setNoteText] = useState('');
  const [newTagName, setNewTagName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadTags = useCallback(() => {
    portalApi.getRecruiterTags()
      .then(setCompanyTags)
      .catch(() => setCompanyTags([]));
  }, []);

  useEffect(() => { loadTags(); }, [loadTags]);

  const run = async (action: () => Promise<unknown>) => {
    setBusy(true);
    setError(null);
    try {
      await action();
      onUpdated();
    } catch {
      setError('Action failed. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  const selectedTagIds = new Set(safe.recruiterTags.map((t) => t.id));

  const toggleTag = (tagId: string) => {
    const next = selectedTagIds.has(tagId)
      ? safe.recruiterTags.filter((t) => t.id !== tagId).map((t) => t.id)
      : [...safe.recruiterTags.map((t) => t.id), tagId];
    void run(() => portalApi.setApplicationTags(safe.applicationId, next));
  };

  const addNote = () => {
    const text = noteText.trim();
    if (!text) return;
    void run(async () => {
      await portalApi.addRecruiterNote(safe.applicationId, text);
      setNoteText('');
    });
  };

  const createTag = () => {
    const name = newTagName.trim();
    if (!name) return;
    void run(async () => {
      const tag = await portalApi.createRecruiterTag(name);
      setNewTagName('');
      setCompanyTags((prev) => [...prev, tag].sort((a, b) => a.name.localeCompare(b.name)));
      await portalApi.setApplicationTags(
        safe.applicationId,
        [...safe.recruiterTags.map((t) => t.id), tag.id],
      );
    });
  };

  return (
    <div className={ws.recruiterPanel}>
      {error && <p className={ws.formError} role="alert">{error}</p>}

      {!hideEvaluation && (
      <div className={ws.recruiterPanelSection}>
        <p className={ws.railTitle}>Your evaluation</p>
        <div className={ws.recruiterPanelRow}>
          <RecruiterStarRating
            value={safe.recruiterRating}
            disabled={busy}
            onChange={(rating) => void run(() => portalApi.setRecruiterRating(safe.applicationId, rating))}
          />
          <button
            type="button"
            className={[ws.favoriteToggle, safe.isFavorite ? ws.favoriteToggleActive : ''].filter(Boolean).join(' ')}
            disabled={busy}
            title={safe.isFavorite ? 'Remove from favorites' : 'Mark as favorite'}
            onClick={() => void run(() => portalApi.setFavorite(safe.applicationId, !safe.isFavorite))}
          >
            {safe.isFavorite ? '★ Favorited' : '☆ Favorite'}
          </button>
        </div>
      </div>
      )}

      <div className={ws.recruiterPanelSection}>
        <p className={ws.railTitle}>Tags</p>
        <div className={ws.tagPicker}>
          {companyTags.map((tag) => (
            <span key={tag.id} className={ws.tagManageItem}>
              <button
                type="button"
                className={[ws.tagPickerItem, selectedTagIds.has(tag.id) ? ws.tagPickerItemActive : ''].filter(Boolean).join(' ')}
                disabled={busy}
                onClick={() => toggleTag(tag.id)}
              >
                {tag.name}
              </button>
              <button
                type="button"
                className={ws.tagManageDelete}
                disabled={busy}
                title="Rename tag"
                onClick={() => {
                  const next = window.prompt('Rename tag', tag.name);
                  if (next && next.trim() && next.trim() !== tag.name) {
                    void run(async () => {
                      await portalApi.updateRecruiterTag(tag.id, next.trim());
                      loadTags();
                    });
                  }
                }}
              >
                ✎
              </button>
              <button
                type="button"
                className={ws.tagManageDelete}
                disabled={busy}
                title="Delete tag"
                onClick={() => void run(async () => {
                  await portalApi.deleteRecruiterTag(tag.id);
                  loadTags();
                })}
              >
                ×
              </button>
            </span>
          ))}
        </div>
        <div className={ws.tagCreateRow}>
          <input
            type="text"
            className={ws.schedulerInput}
            placeholder="New tag name…"
            value={newTagName}
            onChange={(e) => setNewTagName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && createTag()}
          />
          <button type="button" className={ws.btnGhost} disabled={busy || !newTagName.trim()} onClick={createTag}>
            Add tag
          </button>
        </div>
      </div>

      <div className={ws.recruiterPanelSection}>
        <p className={ws.railTitle}>Internal notes</p>
        <p className={ws.candidateSub}>Private to your hiring team.</p>
        <div className={ws.noteComposer}>
          <textarea
            className={ws.schedulerInput}
            rows={2}
            placeholder="Strong communication, good portfolio, follow up next week…"
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
          />
          <button type="button" className={ws.btnPrimary} disabled={busy || !noteText.trim()} onClick={addNote}>
            Add note
          </button>
        </div>
        {safe.recruiterNotes.length > 0 && (
          <ul className={ws.noteList}>
            {safe.recruiterNotes.map((note) => (
              <li key={note.id} className={ws.noteItem}>
                <p className={ws.bodyText}>{note.text}</p>
                <div className={ws.noteItemMeta}>
                  <span>{new Date(note.createdAt).toLocaleString()}</span>
                  <button
                    type="button"
                    className={ws.noteDelete}
                    disabled={busy}
                    onClick={() => void run(() => portalApi.deleteRecruiterNote(safe.applicationId, note.id))}
                  >
                    Remove
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {safe.rejectionReason && (
        <div className={ws.recruiterPanelSection}>
          <p className={ws.railTitle}>Rejection reason</p>
          <p className={ws.bodyText}>{safe.rejectionReason}</p>
        </div>
      )}

      {safe.activityTimeline.length > 0 && (
        <div className={ws.recruiterPanelSection}>
          <p className={ws.railTitle}>Activity</p>
          <div className={ws.timeline}>
            {safe.activityTimeline.map((entry, index) => (
              <div key={`${entry.type}-${entry.occurredAt}-${index}`} className={ws.timelineItem}>
                <strong>{RecruiterActivityTypeLabels[entry.type] ?? 'Activity'}</strong>
                {entry.details && <p className={ws.bodyText}>{entry.details}</p>}
                <p className={ws.candidateSub}>{new Date(entry.occurredAt).toLocaleString()}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
