import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { aiApi, type AiConnectionTestResult, type AiDiagnostics } from '@/api/aiApi';
import { ApiError } from '@/api/client';
import styles from './AdminPage.module.css';

function formatDate(value: string | null): string {
  if (!value) return '—';
  return new Date(value).toLocaleString();
}

export function AdminAiPage() {
  const [diagnostics, setDiagnostics] = useState<AiDiagnostics | null>(null);
  const [loading, setLoading] = useState(true);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<AiConnectionTestResult | null>(null);
  const [testError, setTestError] = useState<string | null>(null);

  const loadDiagnostics = useCallback(async () => {
    try {
      const data = await aiApi.getDiagnostics();
      setDiagnostics(data);
    } catch {
      setDiagnostics(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadDiagnostics();
    const interval = window.setInterval(() => void loadDiagnostics(), 20_000);
    return () => window.clearInterval(interval);
  }, [loadDiagnostics]);

  const handleTestConnection = async () => {
    setTesting(true);
    setTestResult(null);
    setTestError(null);
    try {
      const result = await aiApi.testConnection();
      setTestResult(result);
    } catch (err) {
      if (err instanceof ApiError && err.body && typeof err.body === 'object' && 'provider' in err.body) {
        setTestResult(err.body as AiConnectionTestResult);
        return;
      }
      const message = err instanceof Error ? err.message : 'Connection test failed.';
      setTestError(message);
    } finally {
      setTesting(false);
      void loadDiagnostics();
    }
  };

  if (loading) return <p className={styles.status}>Loading AI diagnostics...</p>;
  if (!diagnostics) return <p className={styles.error}>Failed to load AI diagnostics.</p>;

  return (
    <section className={styles.page}>
      <header className={styles.pageHeader}>
        <div>
          <p className={styles.pageEyebrow}>
            <Link to="/admin/system">System</Link> / AI
          </p>
          <h1 className={styles.pageTitle}>AI Diagnostics</h1>
          <p className={styles.pageSubtitle}>
            Provider and extraction health for the ingestion pipeline.
          </p>
        </div>
        <button
          type="button"
          className={styles.btnPrimary}
          onClick={() => void handleTestConnection()}
          disabled={testing}
        >
          {testing ? 'Testing...' : 'Test AI Connection'}
        </button>
      </header>

      <div className={styles.healthGrid}>
        <div className={styles.healthCard}>
          <div className={styles.healthLabel}>Current provider</div>
          <div className={styles.healthValue}>{diagnostics.provider || '—'}</div>
          <div className={styles.pageSubtitle}>{diagnostics.providerSource}</div>
        </div>
        <div className={styles.healthCard}>
          <div className={styles.healthLabel}>Current model</div>
          <div className={styles.healthValue}>{diagnostics.model || '—'}</div>
          <div className={styles.pageSubtitle}>{diagnostics.modelSource}</div>
        </div>
        <div className={styles.healthCard}>
          <div className={styles.healthLabel}>API key</div>
          <div className={`${styles.healthValue} ${diagnostics.apiKeyConfigured ? styles.healthOk : styles.healthBad}`}>
            {diagnostics.apiKeyConfigured ? 'Configured' : 'Missing'}
          </div>
        </div>
        <div className={styles.healthCard}>
          <div className={styles.healthLabel}>Messages processed</div>
          <div className={styles.healthValue}>{diagnostics.messagesProcessed}</div>
        </div>
        <div className={styles.healthCard}>
          <div className={styles.healthLabel}>Success rate</div>
          <div className={styles.healthValue}>{diagnostics.successRate}%</div>
        </div>
        <div className={styles.healthCard}>
          <div className={styles.healthLabel}>Queue depth</div>
          <div className={styles.healthValue}>{diagnostics.queueMetrics.queued}</div>
        </div>
      </div>

      <div className={styles.healthGrid}>
        <div className={styles.healthCard}>
          <div className={styles.healthLabel}>Last successful extraction</div>
          <div className={styles.healthValue}>{formatDate(diagnostics.lastSuccessfulExtractionAt)}</div>
        </div>
        <div className={styles.healthCard}>
          <div className={styles.healthLabel}>Last extraction failure</div>
          <div className={styles.healthValue}>{formatDate(diagnostics.lastExtractionFailureAt)}</div>
          {diagnostics.lastExtractionFailure && (
            <div className={styles.pageSubtitle}>{diagnostics.lastExtractionFailure}</div>
          )}
        </div>
      </div>

      {(testResult || testError) && (
        <div className={styles.banner}>
          {testResult && (
            <>
              <strong>Connection test {testResult.success ? 'succeeded' : 'failed'}</strong>
              <div>Provider: {testResult.provider}</div>
              <div>Model: {testResult.model}</div>
              <div>Latency: {testResult.latencyMs} ms</div>
              {testResult.error && <div>{testResult.error}</div>}
            </>
          )}
          {testError && <div>{testError}</div>}
        </div>
      )}
    </section>
  );
}
