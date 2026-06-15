import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion, useScroll, useTransform } from 'framer-motion';
import { ApiError } from '@/api/client';
import { applicationsApi } from '@/api/applicationsApi';
import { jobsApi } from '@/api/jobsApi';
import { savedJobsApi } from '@/api/savedJobsApi';
import { tagsApi } from '@/api/tagsApi';
import {
  PremiumSwipeDeck,
  type PremiumSwipeDeckHandle,
  type SwipeDirection,
} from '@/components/swipe/PremiumSwipeDeck';
import { IconBookmark, IconFilter, IconHeart, IconMenu, IconX } from '@/components/icons/Icons';
import { hasCompletedSwipeOnboarding, markSwipeOnboardingComplete } from '@/lib/swipeOnboardingStorage';
import { PullToRefresh } from '@/components/ui/PullToRefresh';
import { EmptyState } from '@/components/ui/EmptyState';
import { Skeleton } from '@/components/ui/Skeleton';
import { FilterDrawer } from '@/components/ui/FilterDrawer';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { useJobFilters } from '@/hooks/useJobFilters';
import { useProfile } from '@/hooks/useProfile';
import { useRefreshLock } from '@/hooks/useRefreshLock';
import { useActivityTracking } from '@/hooks/useActivityTracking';
import { refreshSeekerAccountData } from '@/lib/seekerRefresh';
import { closeActiveFloatingPanel, registerFloatingPanel, unregisterFloatingPanel } from '@/lib/floatingPanels';
import type { Job } from '@/models/job';
import type { Tag } from '@/models/tag';
import styles from './SwipePage.module.css';

const STACK_BUFFER = 3;

export function SwipePage() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const { profile } = useProfile();
  const { trackJobSkip } = useActivityTracking();
  const { showToast } = useToast();
  const filters = useJobFilters();
  const deckRef = useRef<PremiumSwipeDeckHandle>(null);
  const headerRef = useRef<HTMLElement>(null);
  const pageScrollRef = useRef<HTMLDivElement>(null);
  const queueRef = useRef<Job[]>([]);
  const { scrollY } = useScroll({ container: pageScrollRef });
  const headerActionsOpacity = useTransform(scrollY, [0, 56], [1, 0]);

  const [queue, setQueue] = useState<Job[]>([]);
  queueRef.current = queue;
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterOpen, setFilterOpen] = useState(false);
  const [toast, setToast] = useState<{ msg: string; tone: 'neutral' | 'success' | 'error' } | null>(null);
  const toastRef = useRef<HTMLDivElement>(null);
  const closeToast = useCallback(() => setToast(null), []);
  const location = useLocation();
  const { runRefresh, isRefreshing } = useRefreshLock();

  useEffect(() => {
    if (!toast) return;
    registerFloatingPanel('swipe-toast', closeToast);
    const onScroll = () => closeToast();
    window.addEventListener('scroll', onScroll, { capture: true, passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll, true);
      unregisterFloatingPanel('swipe-toast');
    };
  }, [toast, closeToast]);

  useEffect(() => {
    closeToast();
  }, [location.pathname, closeToast]);

  const [fetchPage, setFetchPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const skippedRef = useRef<Set<string>>(new Set());

  const [onboardingOpen, setOnboardingOpen] = useState(() => !hasCompletedSwipeOnboarding());
  const [onboardingFading, setOnboardingFading] = useState(false);
  const [onboardingCollapsed, setOnboardingCollapsed] = useState(() => hasCompletedSwipeOnboarding());
  const onboardingDoneRef = useRef(hasCompletedSwipeOnboarding());

  const dismissOnboarding = useCallback(() => {
    if (onboardingDoneRef.current) return;
    onboardingDoneRef.current = true;
    markSwipeOnboardingComplete();
    setOnboardingFading(true);
    window.setTimeout(() => {
      setOnboardingOpen(false);
      window.setTimeout(() => setOnboardingCollapsed(true), 50);
    }, 420);
  }, []);

  const loadMore = useCallback(async (page: number, append: boolean) => {
    const result = await jobsApi.search({
      ...filters.query,
      page,
      pageSize: 24,
    });
    const fresh = result.items.filter((j) => !skippedRef.current.has(j.id));
    setQueue((prev) => (append ? [...prev, ...fresh] : fresh));
    setHasMore(page < result.totalPages);
    setFetchPage(page);
  }, [filters.query]);

  useEffect(() => {
    setLoading(true);
    skippedRef.current.clear();
    setQueue([]);
    loadMore(1, false).finally(() => setLoading(false));
  }, [loadMore]);

  useEffect(() => {
    tagsApi.getAll().then(setTags).catch(() => {});
  }, []);

  useEffect(() => {
    if (queue.length <= STACK_BUFFER + 2 && hasMore && !loading) {
      void loadMore(fetchPage + 1, true);
    }
  }, [queue.length, hasMore, loading, fetchPage, loadMore]);

  const refreshFeed = useCallback(async () => {
    const topId = queueRef.current[0]?.id;
    const result = await jobsApi.search({
      ...filters.query,
      page: 1,
      pageSize: 24,
    });
    const fresh = result.items.filter((job) => !skippedRef.current.has(job.id));
    setHasMore(result.page < result.totalPages);
    setFetchPage(1);

    setQueue((prev) => {
      if (!topId) return fresh;
      const topMatch = fresh.find((job) => job.id === topId);
      if (topMatch) {
        return [topMatch, ...fresh.filter((job) => job.id !== topId)];
      }
      if (prev.length > 0) {
        return [prev[0], ...fresh.filter((job) => job.id !== prev[0].id)];
      }
      return fresh;
    });
  }, [filters.query]);

  const handlePullRefresh = useCallback(async () => {
    await runRefresh(async () => {
      let hadError = false;
      try {
        await refreshFeed();
      } catch {
        hadError = true;
      }

      try {
        await tagsApi.getAll().then(setTags);
      } catch {
        hadError = true;
      }

      if (isAuthenticated) {
        const side = await refreshSeekerAccountData();
        if (side.failed) hadError = true;
      }

      if (hadError) {
        showToast('Some updates could not be loaded', 'error');
      }
    });
  }, [isAuthenticated, refreshFeed, runRefresh, showToast]);

  const showLocalToast = (msg: string, tone: 'neutral' | 'success' | 'error' = 'neutral') => {
    closeActiveFloatingPanel();
    setToast({ msg, tone });
    window.setTimeout(() => setToast(null), 2400);
  };

  const openFilters = () => {
    closeToast();
    closeActiveFloatingPanel();
    setFilterOpen(true);
  };

  const handleDismiss = useCallback(async (job: Job, direction: SwipeDirection) => {
    dismissOnboarding();
    setQueue((q) => q.filter((j) => j.id !== job.id));

    if (direction === 'pass') {
      skippedRef.current.add(job.id);
      void trackJobSkip(job.id);
      showLocalToast('Passed');
      return;
    }

    if (!isAuthenticated) {
      navigate('/login', { state: { from: '/swipe' } });
      return;
    }

    if (direction === 'save') {
      try {
        await savedJobsApi.save(job.id);
        showLocalToast('Saved to your collection', 'success');
      } catch {
        showLocalToast('Could not save', 'error');
      }
      return;
    }

    if (!profile) {
      navigate('/profile');
      return;
    }

    try {
      await applicationsApi.apply(job.id);
      showLocalToast('Application sent!', 'success');
    } catch (e) {
      if (e instanceof ApiError && e.body && typeof e.body === 'object' && 'error' in e.body) {
        const msg = String((e.body as { error: string }).error);
        showLocalToast(msg, 'error');
        if (msg.includes('Profile incomplete') || msg.includes('Profile not found')) {
          navigate('/profile');
        }
      } else {
        showLocalToast('Apply failed', 'error');
      }
    }
  }, [dismissOnboarding, isAuthenticated, navigate, profile, trackJobSkip]);

  return (
    <PullToRefresh
      onRefresh={handlePullRefresh}
      disabled={isRefreshing || loading}
      allowWithoutScroll
      triggerRef={headerRef}
      className={styles.page}
      contentClassName={styles.pageInner}
    >
      <div className={styles.backdrop} aria-hidden />

      <div ref={pageScrollRef} className={styles.pageScroll}>
      <header ref={headerRef} className={styles.header}>
        <motion.div className={styles.headerStart} style={{ opacity: headerActionsOpacity }}>
          <button
            type="button"
            className={styles.headerBtn}
            onClick={() => navigate('/jobs')}
            aria-label="Browse jobs"
          >
            <IconMenu size={20} />
          </button>
        </motion.div>

        <span className={styles.deckCount}>
          {loading || isRefreshing ? '…' : `${queue.length} left`}
        </span>

        <motion.div className={styles.headerEnd} style={{ opacity: headerActionsOpacity }}>
          <button
            type="button"
            className={styles.headerBtn}
            onClick={openFilters}
            aria-label="Filters"
          >
            <IconFilter size={20} />
            {filters.activeFilterCount > 0 && (
              <span className={styles.filterCount}>{filters.activeFilterCount}</span>
            )}
          </button>
        </motion.div>
      </header>

      <div className={styles.stage}>
        {loading && queue.length === 0 ? (
          <Skeleton variant="swipeCard" className={styles.skeletonCard} />
        ) : queue.length === 0 ? (
          <EmptyState
            illustration="swipe"
            title="You're all caught up"
            description="Adjust filters or browse collections to keep discovering roles."
            actions={[
              { label: 'Adjust filters', onClick: () => setFilterOpen(true), primary: true },
              { label: 'Browse Discover', to: '/jobs' },
            ]}
          />
        ) : (
          <div className={styles.swipeUnit}>
            <div className={styles.deckStage}>
              <PremiumSwipeDeck
                ref={deckRef}
                jobs={queue}
                onDismiss={(job, direction) => void handleDismiss(job, direction)}
                onTap={(job) => navigate(`/jobs/${job.id}`)}
              />
            </div>

            <div className={styles.controls}>
              <div
                className={`${styles.onboardingSlot} ${onboardingCollapsed ? styles.onboardingSlotCollapsed : ''} ${onboardingFading ? styles.onboardingSlotFading : ''}`}
                aria-hidden={onboardingCollapsed}
              >
                {onboardingOpen && (
                  <div className={styles.onboarding}>
                    <p className={styles.onboardingText}>
                      Swipe <strong>right</strong> to apply, <strong>left</strong> to skip, <strong>up</strong> to save.
                    </p>
                    <p className={styles.onboardingSub}>Diagonals combine actions.</p>
                  </div>
                )}
              </div>

              <div className={styles.glassDock}>
                <motion.button
                  type="button"
                  className={`${styles.glassBtn} ${styles.passBtn}`}
                  whileHover={{ scale: 1.06, boxShadow: '0 0 24px rgba(239, 68, 68, 0.25)' }}
                  whileTap={{ scale: 0.92 }}
                  onClick={() => deckRef.current?.dismiss('pass')}
                  aria-label="Pass"
                >
                  <IconX size={24} />
                </motion.button>
                <motion.button
                  type="button"
                  className={`${styles.glassBtn} ${styles.saveBtn}`}
                  whileHover={{ scale: 1.06, boxShadow: '0 0 24px rgba(255, 214, 0, 0.2)' }}
                  whileTap={{ scale: 0.92 }}
                  onClick={() => deckRef.current?.dismiss('save')}
                  aria-label="Save"
                >
                  <IconBookmark size={22} />
                </motion.button>
                <motion.button
                  type="button"
                  className={`${styles.glassBtn} ${styles.applyBtn}`}
                  whileHover={{ scale: 1.08, boxShadow: '0 0 32px rgba(255, 214, 0, 0.35)' }}
                  whileTap={{ scale: 0.94 }}
                  onClick={() => deckRef.current?.dismiss('apply')}
                  aria-label="Apply"
                >
                  <IconHeart size={26} />
                </motion.button>
              </div>
            </div>
          </div>
        )}
      </div>
      </div>

      <AnimatePresence>
        {toast && (
          <div className={styles.toastWrap} aria-live="polite">
            <motion.div
              ref={toastRef}
              className={`${styles.toast} ${styles[`toast_${toast.tone}`]}`}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
              onClick={closeToast}
              role="status"
            >
              {toast.msg}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <FilterDrawer
        open={filterOpen}
        onClose={() => setFilterOpen(false)}
        tags={tags}
        category={filters.category}
        city={filters.city}
        isRemote={filters.isRemote}
        salaryMin={filters.salaryMin}
        selectedTags={filters.selectedTags}
        onApply={(f) => {
          filters.updateParams({
            category: f.category,
            city: f.city || null,
            isRemote: f.isRemote,
            salaryMin: f.salaryMin || null,
            tags: f.selectedTags || null,
            page: '1',
          });
        }}
      />
    </PullToRefresh>
  );
}

