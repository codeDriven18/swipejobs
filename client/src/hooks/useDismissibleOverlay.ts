import { useEffect, type RefObject } from 'react';
import { useLocation } from 'react-router-dom';
import { registerFloatingPanel, unregisterFloatingPanel } from '@/lib/floatingPanels';

interface UseDismissibleOverlayOptions {
  open: boolean;
  onClose: () => void;
  /** Root element — clicks inside (trigger + panel) do not dismiss. */
  containerRef: RefObject<HTMLElement | null>;
  /** Unique id for single-panel coordination. */
  panelId?: string;
  /** Close when the route changes. Default true. */
  closeOnRouteChange?: boolean;
}

/**
 * Standard dismiss behavior for dropdowns/overlays:
 * pointer down outside, Escape, route change, and single-panel coordination.
 */
export function useDismissibleOverlay({
  open,
  onClose,
  containerRef,
  panelId,
  closeOnRouteChange = true,
}: UseDismissibleOverlayOptions): void {
  const location = useLocation();

  useEffect(() => {
    if (!open) return;

    if (panelId) {
      registerFloatingPanel(panelId, onClose);
    }

    const onPointerDown = (event: PointerEvent) => {
      const root = containerRef.current;
      if (!root) return;
      if (root.contains(event.target as Node)) return;
      onClose();
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
      }
    };

    document.addEventListener('pointerdown', onPointerDown, true);
    document.addEventListener('keydown', onKeyDown);

    return () => {
      document.removeEventListener('pointerdown', onPointerDown, true);
      document.removeEventListener('keydown', onKeyDown);
      if (panelId) {
        unregisterFloatingPanel(panelId);
      }
    };
  }, [open, onClose, containerRef, panelId]);

  useEffect(() => {
    if (!open || !closeOnRouteChange) return;
    onClose();
  }, [location.pathname, location.search, location.hash]); // eslint-disable-line react-hooks/exhaustive-deps -- close on navigation only
}
