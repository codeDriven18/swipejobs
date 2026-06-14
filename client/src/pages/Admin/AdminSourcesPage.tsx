import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { sourcesApi } from '@/api/sourcesApi';
import type {
  AdminSource,
  CreateAdminSourceRequest,
  SourceConnectionTestResult,
  SourceIngestionLogEntry,
} from '@/models/source';
import { SourceTypeLabels } from '@/models/source';
import { SourceTrustLevel, SourceTrustLevelLabels, SourceType } from '@/models/enums';
import { getIngestionErrorMessage } from '@/lib/ingestionErrors';
import adminStyles from './AdminPage.module.css';
import styles from './AdminSourcesPage.module.css';

const EMPTY_FORM: CreateAdminSourceRequest = {
  name: '',
  type: SourceType.Telegram,
  channelUrl: '',
  trustScore: 50,
  defaultExpirationDays: 30,
  ingestionEnabled: true,
};

function trustLabel(level: SourceTrustLevel) {
  return SourceTrustLevelLabels[level] ?? 'Standard';
}

function statusClass(status: string) {
  if (status === 'Connected' || status === 'Configured') return styles.statusGood;
  if (status === 'Disabled') return styles.statusMuted;
  return styles.statusWarn;
}

const POLL_INTERVAL_MS = 20_000;

export function AdminSourcesPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [sources, setSources] = useState<AdminSource[]>([]);
  const [initialLoading, setInitialLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<AdminSource | null>(null);
  const [form, setForm] = useState<CreateAdminSourceRequest>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [testResult, setTestResult] = useState<SourceConnectionTestResult | null>(null);
  const [logsOpenFor, setLogsOpenFor] = useState<AdminSource | null>(null);
  const [logs, setLogs] = useState<SourceIngestionLogEntry[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);

  const refresh = useCallback((silent = false) => {
    if (!silent) setRefreshing(true);
    return sourcesApi.list()
      .then(setSources)
      .catch(() => {
        if (!silent) setSources([]);
      })
      .finally(() => {
        setInitialLoading(false);
        if (!silent) setRefreshing(false);
      });
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      void refresh(true);
    }, POLL_INTERVAL_MS);
    return () => window.clearInterval(timer);
  }, [refresh]);

  const openCreate = useCallback((prefillUrl?: string) => {
    setEditing(null);
    setForm({ ...EMPTY_FORM, channelUrl: prefillUrl ?? '' });
    setTestResult(null);
    setFormOpen(true);
  }, []);

  useEffect(() => {
    if (searchParams.get('new') === '1') {
      openCreate(searchParams.get('url') ?? undefined);
      searchParams.delete('new');
      searchParams.delete('url');
      setSearchParams(searchParams, { replace: true });
    }
  }, [searchParams, setSearchParams, openCreate]);

  const telegramSources = useMemo(
    () => sources.filter((s) => s.type === SourceType.Telegram),
    [sources],
  );

  const openEdit = (source: AdminSource) => {
    setEditing(source);
    setForm({
      name: source.name,
      type: source.type,
      channelUrl: source.channelUrl ?? '',
      channelName: source.channelName ?? '',
      externalIdentifier: source.externalIdentifier ?? '',
      logoUrl: source.logoUrl ?? '',
      trustScore: source.trustScore,
      defaultExpirationDays: source.defaultExpirationDays,
      ingestionEnabled: source.ingestionEnabled,
    });
    setTestResult(null);
    setFormOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    setMessage(null);
    try {
      if (editing) {
        await sourcesApi.update(editing.id, { ...form, isActive: editing.isActive });
        setMessage('Source updated.');
      } else {
        await sourcesApi.create(form);
        setMessage('Source created.');
      }
      setFormOpen(false);
      void refresh();
    } catch (err) {
      setMessage(getIngestionErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (source: AdminSource) => {
    try {
      await sourcesApi.setEnabled(source.id, !source.ingestionEnabled);
      void refresh(true);
    } catch {
      setMessage('Could not update source status.');
    }
  };

  const handleDelete = async (source: AdminSource) => {
    if (!window.confirm(`Disable source "${source.name}"?`)) return;
    try {
      await sourcesApi.remove(source.id);
      setMessage('Source disabled.');
      void refresh();
    } catch {
      setMessage('Could not disable source.');
    }
  };

  const handleTest = async (source: AdminSource) => {
    setTestResult(null);
    try {
      const result = await sourcesApi.testConnection(source.id);
      setTestResult(result);
      void refresh(true);
    } catch {
      setMessage('Connection test failed.');
    }
  };

  const handleViewLogs = async (source: AdminSource) => {
    setLogsOpenFor(source);
    setLogsLoading(true);
    try {
      setLogs(await sourcesApi.getLogs(source.id));
    } catch {
      setLogs([]);
    } finally {
      setLogsLoading(false);
    }
  };

  if (initialLoading) return <p className={adminStyles.status}>Loading sources...</p>;

  return (
    <section className={adminStyles.page}>
      <header className={adminStyles.pageHeader}>
        <div>
          <p className={adminStyles.pageEyebrow}>Ingestion</p>
          <h2 className={adminStyles.pageTitle}>Sources</h2>
          <p className={adminStyles.pageSubtitle}>
            Manage Telegram channels and external feeds before they enter moderation.
            {refreshing ? ' Refreshing…' : ''}
          </p>
        </div>
        <div className={adminStyles.actions}>
          <button type="button" className={adminStyles.btnPrimary} onClick={() => openCreate()}>
            Add source
          </button>
        </div>
      </header>

      {message && <p className={adminStyles.banner}>{message}</p>}

      {telegramSources.length === 0 && (
        <div className={styles.emptyState}>
          <h3>No Telegram sources yet</h3>
          <p>Add a channel URL to start ingesting jobs into the moderation queue.</p>
          <button type="button" className={adminStyles.btnPrimary} onClick={() => openCreate()}>
            Create first source
          </button>
        </div>
      )}

      <div className={styles.grid}>
        {sources.map((source) => (
          <article key={source.id} className={styles.card}>
            <div className={styles.cardTop}>
              <div>
                <p className={styles.type}>{SourceTypeLabels[source.type] ?? 'Source'}</p>
                <h3 className={styles.name}>{source.name}</h3>
                {source.channelUrl && (
                  <a href={source.channelUrl} target="_blank" rel="noopener noreferrer" className={styles.url}>
                    {source.channelUrl}
                  </a>
                )}
              </div>
              <span className={`${styles.badge} ${source.ingestionEnabled ? styles.badgeOn : styles.badgeOff}`}>
                {source.ingestionEnabled ? 'Enabled' : 'Disabled'}
              </span>
            </div>

            <div className={styles.metrics}>
              <div><strong>{source.metrics.messagesScanned}</strong><span>Scanned</span></div>
              <div><strong>{source.metrics.jobsExtracted}</strong><span>Extracted</span></div>
              <div><strong>{source.metrics.pendingModeration}</strong><span>Pending</span></div>
              <div className={statusClass(source.metrics.connectionStatus)}>
                <strong>{source.metrics.connectionStatus}</strong><span>Connection</span>
              </div>
            </div>

            <div className={styles.diagnostics}>
              <div><span>Last sync</span><strong>{source.lastSyncStatus ?? source.metrics.connectionStatus}</strong></div>
              <div><span>Last success</span><strong>{source.lastSuccessfulIngestionAt ? new Date(source.lastSuccessfulIngestionAt).toLocaleString() : 'Never'}</strong></div>
              <div><span>Last message ID</span><strong>{source.lastScannedTelegramMessageId ?? '—'}</strong></div>
              {source.lastIngestionError && (
                <div className={styles.errorLine}><span>Last error</span><strong>{source.lastIngestionError}</strong></div>
              )}
            </div>

            <div className={styles.metaRow}>
              <span>Trust: {trustLabel(source.trustLevel)} ({source.trustScore})</span>
              <span>
                Last sync: {source.sourceLastCheckedAt
                  ? new Date(source.sourceLastCheckedAt).toLocaleString()
                  : 'Never'}
              </span>
            </div>

            <div className={adminStyles.actions}>
              <button type="button" className={adminStyles.btn} onClick={() => openEdit(source)}>Edit</button>
              <button type="button" className={adminStyles.btn} onClick={() => void handleTest(source)}>Test</button>
              <button type="button" className={adminStyles.btn} onClick={() => void handleToggle(source)}>
                {source.ingestionEnabled ? 'Disable' : 'Enable'}
              </button>
              <button type="button" className={adminStyles.btn} onClick={() => void handleViewLogs(source)}>View logs</button>
              <button type="button" className={adminStyles.btnDanger} onClick={() => void handleDelete(source)}>
                Delete
              </button>
            </div>
          </article>
        ))}
      </div>

      {formOpen && (
        <div className={styles.modalBackdrop} role="presentation" onClick={() => setFormOpen(false)}>
          <div className={styles.modal} role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
            <h3>{editing ? 'Edit source' : 'Add source'}</h3>
            <label className={styles.field}>
              Name
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </label>
            <label className={styles.field}>
              Type
              <select
                value={form.type}
                onChange={(e) => setForm({ ...form, type: Number(e.target.value) as SourceType })}
              >
                {Object.entries(SourceTypeLabels).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </label>
            <label className={styles.field}>
              Channel URL
              <input
                value={form.channelUrl ?? ''}
                onChange={(e) => setForm({ ...form, channelUrl: e.target.value })}
                placeholder="https://t.me/your_channel"
              />
            </label>
            <label className={styles.field}>
              Trust score (0–100)
              <input
                type="number"
                min={0}
                max={100}
                value={form.trustScore ?? 50}
                onChange={(e) => setForm({ ...form, trustScore: Number(e.target.value) })}
              />
            </label>
            <label className={styles.checkbox}>
              <input
                type="checkbox"
                checked={form.ingestionEnabled ?? true}
                onChange={(e) => setForm({ ...form, ingestionEnabled: e.target.checked })}
              />
              Ingestion enabled
            </label>
            {testResult && (
              <div className={styles.testResult}>
                <strong>{testResult.connectionStatus}</strong>
                <p>{testResult.message}</p>
                {testResult.channelName && <p>Channel: {testResult.channelName}</p>}
              </div>
            )}
            <div className={adminStyles.actions}>
              <button type="button" className={adminStyles.btn} onClick={() => setFormOpen(false)}>Cancel</button>
              <button type="button" className={adminStyles.btnPrimary} disabled={saving} onClick={() => void handleSave()}>
                {saving ? 'Saving...' : 'Save source'}
              </button>
            </div>
          </div>
        </div>
      )}

      {logsOpenFor && (
        <div className={styles.modalBackdrop} role="presentation" onClick={() => setLogsOpenFor(null)}>
          <div className={styles.modal} role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
            <h3>Ingestion logs — {logsOpenFor.name}</h3>
            {logsLoading ? (
              <p className={styles.logHint}>Loading logs...</p>
            ) : logs.length === 0 ? (
              <p className={styles.logHint}>No ingestion logs yet.</p>
            ) : (
              <ul className={styles.logList}>
                {logs.map((log) => (
                  <li key={log.id} className={styles.logItem}>
                    <span className={styles.logMeta}>{new Date(log.createdAt).toLocaleString()} · {log.stage} · {log.level}</span>
                    <span>{log.message}</span>
                    {log.details && <span className={styles.logDetails}>{log.details}</span>}
                  </li>
                ))}
              </ul>
            )}
            <button type="button" className={adminStyles.btn} onClick={() => setLogsOpenFor(null)}>Close</button>
          </div>
        </div>
      )}

      <p className={styles.footerHint}>
        Need to test ingestion? Go to <Link to="/admin/moderation">Moderation</Link> after creating a source.
      </p>
    </section>
  );
}
