import { useEffect, type RefObject } from 'react';
import { useLocation } from 'react-router-dom';
import { registerFloatingPanel, unregisterFloatingPanel } from '@/lib/floatingPanels';

interface UseFloatingOverlayOptions {
  open: boolean;
  onClose: () => void;
  panelId: string;
  panelRef?: RefObject<HTMLElement | null>;
  closeOnRouteChange?: boolean;
  closeOnScroll?: boolean;
}

/**
 * Single-overlay dismiss: outside tap, Escape, route change, scroll, panel coordination.
 */
export function useFloatingOverlay({
  open,
  onClose,
  panelId,
  panelRef,
  closeOnRouteChange = true,
  closeOnScroll = true,
}: UseFloatingOverlayOptions): void {
  const location = useLocation();

  useEffect(() => {
    if (!open) return;

    registerFloatingPanel(panelId, onClose);

    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (panelRef?.current?.contains(target)) return;
      onClose();
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
      }
    };

    const onScroll = () => onClose();

    document.addEventListener('pointerdown', onPointerDown, true);
    document.addEventListener('keydown', onKeyDown);
    if (closeOnScroll) {
      window.addEventListener('scroll', onScroll, { capture: true, passive: true });
    }

    return () => {
      document.removeEventListener('pointerdown', onPointerDown, true);
      document.removeEventListener('keydown', onKeyDown);
      if (closeOnScroll) {
        window.removeEventListener('scroll', onScroll, true);
      }
      unregisterFloatingPanel(panelId);
    };
  }, [open, onClose, panelId, panelRef, closeOnScroll]);

  useEffect(() => {
    if (!open || !closeOnRouteChange) return;
    onClose();
  }, [location.pathname, location.search, location.hash]); // eslint-disable-line react-hooks/exhaustive-deps
}
