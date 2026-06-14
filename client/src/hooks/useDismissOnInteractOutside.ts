import { useEffect, useRef, type RefObject } from 'react';

/** Close an open overlay when the user scrolls or taps outside the container. */
export function useDismissOnInteractOutside(
  open: boolean,
  onClose: () => void,
  containerRef: RefObject<HTMLElement | null>,
) {
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!open) return;

    const handleClose = () => onCloseRef.current();

    const onPointerDown = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (containerRef.current?.contains(target)) return;
      handleClose();
    };

    window.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('scroll', handleClose, true);

    return () => {
      window.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('scroll', handleClose, true);
    };
  }, [open, containerRef]);
}
