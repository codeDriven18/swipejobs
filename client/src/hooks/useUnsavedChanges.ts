import { useCallback, useEffect, useState } from 'react';
import { useBeforeUnload, useBlocker } from 'react-router-dom';

export interface UseUnsavedChangesOptions {
  isDirty: boolean;
  onDiscard?: () => void;
}

export type UnsavedChangesAction = 'continue' | 'discard' | 'save';

export interface UseUnsavedChangesReturn {
  showModal: boolean;
  resolveModal: (action: UnsavedChangesAction) => void;
}

/**
 * Blocks navigation and shows a confirmation modal when there are unsaved changes.
 * Also warns before browser tab close.
 */
export function useUnsavedChanges({
  isDirty,
  onDiscard,
}: UseUnsavedChangesOptions): UseUnsavedChangesReturn {
  const [showModal, setShowModal] = useState(false);

  const shouldBlock = useCallback(
    ({ currentLocation, nextLocation }: { currentLocation: { pathname: string }; nextLocation: { pathname: string } }) =>
      isDirty && currentLocation.pathname !== nextLocation.pathname,
    [isDirty],
  );

  const blocker = useBlocker(shouldBlock);

  useEffect(() => {
    if (blocker.state === 'blocked') {
      setShowModal(true);
    }
  }, [blocker.state]);

  useBeforeUnload(
    useCallback(
      (e) => {
        if (isDirty) {
          e.preventDefault();
        }
      },
      [isDirty],
    ),
  );

  const resolveModal = useCallback(
    (action: UnsavedChangesAction) => {
      setShowModal(false);
      if (action === 'discard') {
        onDiscard?.();
        blocker.proceed?.();
      } else if (action === 'continue') {
        blocker.reset?.();
      }
    },
    [blocker, onDiscard],
  );

  return { showModal, resolveModal };
}
