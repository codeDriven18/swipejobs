import { useEffect } from 'react';

/**
 * Tracks virtual keyboard overlap using Visual Viewport API.
 * Sets --keyboard-offset on the document root for keyboard-aware layouts.
 */
export function useKeyboardViewport() {
  useEffect(() => {
    const viewport = window.visualViewport;
    if (!viewport) return;

    const update = () => {
      const keyboardOffset = Math.max(
        0,
        window.innerHeight - viewport.height - viewport.offsetTop,
      );
      document.documentElement.style.setProperty(
        '--keyboard-offset',
        `${Math.round(keyboardOffset)}px`,
      );
    };

    update();
    viewport.addEventListener('resize', update);
    viewport.addEventListener('scroll', update);
    window.addEventListener('orientationchange', update);

    return () => {
      viewport.removeEventListener('resize', update);
      viewport.removeEventListener('scroll', update);
      window.removeEventListener('orientationchange', update);
      document.documentElement.style.removeProperty('--keyboard-offset');
    };
  }, []);
}
