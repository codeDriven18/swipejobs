import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { moderationApi } from '@/api/moderationApi';
import { sourcesApi } from '@/api/sourcesApi';
import { formatSalary } from '@/lib/jobFormat';
import type { AdminSource } from '@/models/source';
import { SourceType } from '@/models/enums';
import type { JobCandidate } from '@/models/moderation';
import { CandidateJobStatus } from '@/models/moderation';
import styles from './AdminModerationPage.module.css';
import adminStyles from './AdminPage.module.css';

function scoreClass(value: number, invert = false): string {
  const good = invert ? value <= 25 : value >= 70;
  const mid = invert ? value <= 50 : value >= 40;
  if (good) return styles.scoreGood;
  if (mid) return styles.scoreMid;
  return styles.scoreLow;
}

function extractTelegramUrl(text: string): string | null {
  const match = text.match(/https?:\/\/(?:t\.me|telegram\.me)\/[^\s]+/i);
  return match?.[0] ?? null;
}

export function AdminModerationPage() {
  const [queue, setQueue] = useState<JobCandidate[]>([]);
  const [sources, setSources] = useState<AdminSource[]>([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [analytics, setAnalytics] = useState<Awaited<ReturnType<typeof moderationApi.getAnalytics>> | null>(null);
  const [showIngest, setShowIngest] = useState(false);
  const [ingestText, setIngestText] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [messageTone, setMessageTone] = useState<'info' | 'error' | 'success'>('info');

  const telegramSources = useMemo(
    () => sources.filter((s) => s.type === SourceType.Telegram && s.ingestionEnabled),
    [sources],
  );
  const [telegramSourceId, setTelegramSourceId] = useState<string | null>(null);

  const selected = queue.find((c) => c.id === selectedId) ?? null;

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([
      moderationApi.getQueue(CandidateJobStatus.PendingReview),
      moderationApi.getAnalytics(),
      sourcesApi.list(),
    ])
      .then(([q, a, s]) => {
        setQueue(q.items);
        setPendingCount(q.pendingCount);
        setAnalytics(a);
        setSources(s);
        const telegram = s.find((x) => x.type === SourceType.Telegram && x.ingestionEnabled) ?? s[0];
        setTelegramSourceId(telegram?.id ?? null);
        if (q.items.length > 0 && !selectedId) setSelectedId(q.items[0].id);
      })
      .catch(() => {
        setQueue([]);
        setAnalytics(null);
      })
      .finally(() => setLoading(false));
  }, [selectedId]);

  useEffect(() => {
    load();
  }, [load]);

  const notify = (text: string, tone: 'info' | 'error' | 'success' = 'info') => {
    setMessage(text);
    setMessageTone(tone);
  };

  const runAction = async (fn: () => Promise<unknown>, successMsg: string) => {
    setActionLoading(true);
    setMessage(null);
    try {
      await fn();
      notify(successMsg, 'success');
      setSelectedIds(new Set());
      setSelectedId(null);
      load();
    } catch {
      notify('Action failed.', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleIngest = async () => {
    if (!ingestText.trim()) return;

    if (!telegramSourceId) {
      notify('Source not found. Create it in Admin → Sources.', 'error');
      return;
    }

    setActionLoading(true);
    try {
      await moderationApi.ingestTelegram({
        sourceId: telegramSourceId,
        telegramMessageId: `manual-${Date.now()}`,
        rawMessageText: ingestText,
        channelName: telegramSources.find((s) => s.id === telegramSourceId)?.name ?? 'Manual test',
        channelUrl: extractTelegramUrl(ingestText) ?? telegramSources.find((s) => s.id === telegramSourceId)?.channelUrl ?? undefined,
      });
      setIngestText('');
      setShowIngest(false);
      notify('Message ingested into moderation queue.', 'success');
      load();
    } catch {
      notify('Source not found. Create it in Admin → Sources.', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const toggleSelected = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const bulkRejectSelected = () => {
    if (selectedIds.size === 0) return;
    void runAction(
      () => moderationApi.bulkReject([...selectedIds]),
      'Selected candidates rejected.',
    );
  };

  const bulkApproveSelected = () => {
    if (selectedIds.size === 0) return;
    void runAction(async () => {
      for (const id of selectedIds) {
        await moderationApi.approve(id);
      }
    }, 'Selected candidates approved.');
  };

  if (loading) return <p className={adminStyles.status}>Loading moderation queue...</p>;

  const createSourceUrl = extractTelegramUrl(ingestText);

  return (
    <section className={adminStyles.page}>
      <header className={adminStyles.pageHeader}>
        <div>
          <p className={adminStyles.pageEyebrow}>Review queue</p>
          <h2 className={adminStyles.pageTitle}>Moderation</h2>
          <p className={adminStyles.pageSubtitle}>
            {pendingCount} candidates waiting · {telegramSources.length} Telegram source(s) active
          </p>
        </div>
        <div className={adminStyles.actions}>
          <button type="button" className={adminStyles.btn} onClick={() => setShowIngest((v) => !v)}>
            Test ingest
          </button>
          <button
            type="button"
            className={adminStyles.btn}
            disabled={actionLoading || selectedIds.size === 0}
            onClick={bulkApproveSelected}
          >
            Approve selected
          </button>
          <button
            type="button"
            className={adminStyles.btn}
            disabled={actionLoading || selectedIds.size === 0}
            onClick={bulkRejectSelected}
          >
            Reject selected
          </button>
          <button
            type="button"
            className={adminStyles.btnPrimary}
            disabled={actionLoading}
            onClick={() => void runAction(() => moderationApi.bulkApproveHighConfidence(), 'High-confidence jobs approved.')}
          >
            Approve high confidence
          </button>
        </div>
      </header>

      {message && (
        <p className={`${styles.banner} ${messageTone === 'error' ? styles.bannerError : messageTone === 'success' ? styles.bannerSuccess : ''}`}>
          {message}
          {messageTone === 'error' && (
            <>
              {' '}
              <Link to={createSourceUrl ? `/admin/sources?new=1&url=${encodeURIComponent(createSourceUrl)}` : '/admin/sources?new=1'}>
                Create source
              </Link>
            </>
          )}
        </p>
      )}

      {telegramSources.length === 0 && (
        <div className={styles.sourceAlert}>
          <p>No Telegram source configured.</p>
          <Link to="/admin/sources?new=1" className={adminStyles.btnPrimary}>Create source in Admin → Sources</Link>
        </div>
      )}

      {showIngest && (
        <div className={styles.ingestPanel}>
          <label className={styles.ingestLabel}>
            Source
            <select
              value={telegramSourceId ?? ''}
              onChange={(e) => setTelegramSourceId(e.target.value || null)}
            >
              <option value="">Select source...</option>
              {telegramSources.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </label>
          <textarea
            className={styles.ingestTextarea}
            rows={6}
            value={ingestText}
            onChange={(e) => setIngestText(e.target.value)}
            placeholder="Paste a Telegram job post to test the ingestion pipeline..."
          />
          <div className={adminStyles.actions}>
            <button type="button" className={adminStyles.btnPrimary} disabled={actionLoading} onClick={() => void handleIngest()}>
              Ingest message
            </button>
            {!telegramSourceId && (
              <Link
                to={createSourceUrl ? `/admin/sources?new=1&url=${encodeURIComponent(createSourceUrl)}` : '/admin/sources?new=1'}
                className={adminStyles.btn}
              >
                Create source
              </Link>
            )}
          </div>
        </div>
      )}

      {analytics && (
        <div className={styles.analyticsRow}>
          <div className={styles.stat}><strong>{analytics.messagesScanned}</strong><span>Scanned</span></div>
          <div className={styles.stat}><strong>{analytics.jobsDetected}</strong><span>Detected</span></div>
          <div className={styles.stat}><strong>{analytics.duplicatesMerged}</strong><span>Duplicates</span></div>
          <div className={styles.stat}><strong>{analytics.published}</strong><span>Published</span></div>
          <div className={styles.stat}><strong>{Math.round(analytics.averageConfidence)}%</strong><span>Avg confidence</span></div>
        </div>
      )}

      <div className={styles.layout}>
        <div className={styles.queue}>
          {queue.length === 0 ? (
            <p className={styles.empty}>No candidates awaiting review.</p>
          ) : (
            queue.map((candidate) => (
              <article
                key={candidate.id}
                className={`${styles.card} ${candidate.id === selectedId ? styles.cardSelected : ''}`}
              >
                <div className={styles.cardHeader}>
                  <input
                    type="checkbox"
                    checked={selectedIds.has(candidate.id)}
                    onChange={() => toggleSelected(candidate.id)}
                    aria-label={`Select ${candidate.title ?? 'candidate'}`}
                  />
                  <button type="button" className={styles.cardBodyBtn} onClick={() => setSelectedId(candidate.id)}>
                    <div className={styles.cardScores}>
                      <span className={scoreClass(candidate.extractionConfidence)}>{candidate.extractionConfidence}% conf</span>
                      <span className={scoreClass(candidate.trustScore)}>{candidate.trustScore}% trust</span>
                      {candidate.sourceCount > 1 && (
                        <span className={styles.dupBadge}>{candidate.sourceCount} sources</span>
                      )}
                    </div>
                    <h3 className={styles.cardTitle}>{candidate.title ?? 'Untitled role'}</h3>
                    <p className={styles.cardCompany}>{candidate.companyName ?? 'Unknown company'}</p>
                    <p className={styles.cardMeta}>{candidate.sourceName}</p>
                  </button>
                </div>
              </article>
            ))
          )}
        </div>

        {selected && (
          <aside className={styles.detail}>
            <h2 className={styles.detailTitle}>Review candidate</h2>

            {selected.primaryMessage && (
              <div className={styles.rawPost}>
                <p className={styles.rawLabel}>Original Telegram post</p>
                <pre className={styles.rawText}>{selected.primaryMessage.rawMessageText}</pre>
                {selected.primaryMessage.telegramMessageUrl && (
                  <a href={selected.primaryMessage.telegramMessageUrl} target="_blank" rel="noopener noreferrer" className={styles.rawLink}>
                    View source message
                  </a>
                )}
              </div>
            )}

            {selected.sourceCount > 1 && (
              <div className={styles.duplicateBanner}>
                {selected.sourceCount} duplicate sources linked to this candidate
              </div>
            )}

            <div className={styles.preview}>
              <h3>{selected.title ?? 'Untitled'}</h3>
              <p className={styles.previewSalary}>
                {formatSalary(selected.salaryMin, selected.salaryMax, selected.category, selected.applyUrl)}
              </p>
              <p>{selected.companyName}</p>
              <p className={styles.previewMeta}>
                {selected.isRemote ? 'Remote' : selected.location ?? selected.city}
                {selected.employmentType && ` · ${selected.employmentType}`}
              </p>
              {selected.description && <p className={styles.previewDesc}>{selected.description}</p>}
              {selected.skills.length > 0 && (
                <div className={styles.skillRow}>
                  {selected.skills.map((s) => <span key={s} className={styles.skill}>{s}</span>)}
                </div>
              )}
            </div>

            <div className={adminStyles.actions}>
              <button
                type="button"
                className={adminStyles.btnPrimary}
                disabled={actionLoading}
                onClick={() => void runAction(() => moderationApi.approve(selected.id), 'Job approved and published.')}
              >
                Approve
              </button>
              <button
                type="button"
                className={adminStyles.btn}
                disabled={actionLoading}
                onClick={() => void runAction(
                  () => moderationApi.reject(selected.id, 'Does not meet quality standards'),
                  'Candidate rejected.',
                )}
              >
                Reject
              </button>
            </div>
          </aside>
        )}
      </div>
    </section>
  );
}
