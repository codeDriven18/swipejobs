import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { registerFloatingPanel, unregisterFloatingPanel } from '@/lib/floatingPanels';
import { JobCategory } from '@/models/enums';
import type { Tag } from '@/models/tag';
import styles from './FilterDrawer.module.css';

interface FilterDrawerProps {
  open: boolean;
  onClose: () => void;
  tags: Tag[];
  category: string | null;
  city: string;
  isRemote: string | null;
  salaryMin: string;
  selectedTags: string;
  onApply: (filters: {
    category: string | null;
    city: string;
    isRemote: string | null;
    salaryMin: string;
    selectedTags: string;
  }) => void;
}

export function FilterDrawer({
  open,
  onClose,
  tags,
  category,
  city,
  isRemote,
  salaryMin,
  selectedTags,
  onApply,
}: FilterDrawerProps) {
  const [localCategory, setLocalCategory] = useState(category);
  const [localCity, setLocalCity] = useState(city);
  const [localRemote, setLocalRemote] = useState(isRemote);
  const [localSalary, setLocalSalary] = useState(salaryMin);
  const [localTags, setLocalTags] = useState(selectedTags);

  useEffect(() => {
    if (open) {
      setLocalCategory(category);
      setLocalCity(city);
      setLocalRemote(isRemote);
      setLocalSalary(salaryMin);
      setLocalTags(selectedTags);
    }
  }, [open, category, city, isRemote, salaryMin, selectedTags]);

  useEffect(() => {
    if (!open) return;

    registerFloatingPanel('filter-drawer', onClose);

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
      }
    };

    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      unregisterFloatingPanel('filter-drawer');
    };
  }, [open, onClose]);

  const handleApply = () => {
    onApply({
      category: localCategory,
      city: localCity,
      isRemote: localRemote,
      salaryMin: localSalary,
      selectedTags: localTags,
    });
    onClose();
  };

  const handleClear = () => {
    setLocalCategory(null);
    setLocalCity('');
    setLocalRemote(null);
    setLocalSalary('');
    setLocalTags('');
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className={styles.backdrop}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            onClick={onClose}
          />
          <motion.div
            className={styles.drawer}
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 340 }}
            role="dialog"
            aria-modal="true"
            aria-label="Filters"
          >
            <div className={styles.handle} />
            <header className={styles.header}>
              <h2>Filters</h2>
              <button type="button" className={styles.clearBtn} onClick={handleClear}>
                Clear all
              </button>
            </header>

            <div className={styles.body}>
              <label className={styles.field}>
                <span>Branch</span>
                <select
                  value={localCategory ?? ''}
                  onChange={(e) => setLocalCategory(e.target.value || null)}
                >
                  <option value="">All branches</option>
                  <option value={JobCategory.Gig}>Gigs</option>
                  <option value={JobCategory.It}>IT Jobs</option>
                </select>
              </label>

              <label className={styles.field}>
                <span>City</span>
                <input
                  placeholder="e.g. Berlin"
                  value={localCity}
                  onChange={(e) => setLocalCity(e.target.value)}
                />
              </label>

              <label className={styles.field}>
                <span>Remote</span>
                <select
                  value={localRemote ?? ''}
                  onChange={(e) => setLocalRemote(e.target.value || null)}
                >
                  <option value="">Any</option>
                  <option value="true">Remote only</option>
                  <option value="false">On-site only</option>
                </select>
              </label>

              <label className={styles.field}>
                <span>Minimum salary</span>
                <input
                  type="number"
                  placeholder="e.g. 2000"
                  value={localSalary}
                  onChange={(e) => setLocalSalary(e.target.value)}
                />
              </label>

              <label className={styles.field}>
                <span>Tag</span>
                <select
                  value={localTags}
                  onChange={(e) => setLocalTags(e.target.value)}
                >
                  <option value="">All tags</option>
                  {tags.map((t) => (
                    <option key={t.id} value={t.slug ?? t.name}>{t.name}</option>
                  ))}
                </select>
              </label>
            </div>

            <footer className={styles.footer}>
              <button type="button" className={styles.applyBtn} onClick={handleApply}>
                Show results
              </button>
            </footer>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
