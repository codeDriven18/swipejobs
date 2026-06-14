import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminApi } from '@/api/adminApi';
import type { AdminSearchResultItem } from '@/models/source';
import styles from './AdminGlobalSearch.module.css';

interface AdminGlobalSearchProps {
  open: boolean;
  onClose: () => void;
}

const TYPE_LABELS: Record<string, string> = {
  job: 'Job',
  company: 'Company',
  user: 'User',
  source: 'Source',
  candidate: 'Candidate',
  application: 'Application',
};

export function AdminGlobalSearch({ open, onClose }: AdminGlobalSearchProps) {
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<AdminSearchResultItem[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      setQuery('');
      setResults([]);
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;

    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  const runSearch = useCallback(async (value: string) => {
    const trimmed = value.trim();
    if (trimmed.length < 2) {
      setResults([]);
      return;
    }
    setLoading(true);
    try {
      const data = await adminApi.search(trimmed);
      setResults(data.results);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!open) return undefined;
    const timer = window.setTimeout(() => void runSearch(query), 250);
    return () => window.clearTimeout(timer);
  }, [open, query, runSearch]);

  if (!open) return null;

  const handleSelect = (item: AdminSearchResultItem) => {
    onClose();
    navigate(item.url);
  };

  return (
    <div className={styles.backdrop} role="presentation" onClick={onClose}>
      <div
        className={styles.dialog}
        role="dialog"
        aria-modal="true"
        aria-label="Admin search"
        onClick={(e) => e.stopPropagation()}
      >
        <div className={styles.inputRow}>
          <span className={styles.searchIcon} aria-hidden>⌕</span>
          <input
            ref={inputRef}
            className={styles.input}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search jobs, companies, users, sources, candidates..."
          />
          <kbd className={styles.kbd}>Esc</kbd>
        </div>

        <div className={styles.results}>
          {loading && <p className={styles.hint}>Searching...</p>}
          {!loading && query.trim().length >= 2 && results.length === 0 && (
            <p className={styles.hint}>No results for “{query.trim()}”.</p>
          )}
          {!loading && query.trim().length < 2 && (
            <p className={styles.hint}>Type at least 2 characters. Shortcut: Ctrl+K</p>
          )}
          {results.map((item) => (
            <button
              key={`${item.type}-${item.id}`}
              type="button"
              className={styles.result}
              onClick={() => handleSelect(item)}
            >
              <span className={styles.resultType}>{TYPE_LABELS[item.type] ?? item.type}</span>
              <span className={styles.resultTitle}>{item.title}</span>
              {item.subtitle && <span className={styles.resultSub}>{item.subtitle}</span>}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export function useAdminSearchShortcut(onOpen: () => void) {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        onOpen();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onOpen]);
}
