/** Horizontal distance (px) to commit pass / apply — position only, no velocity */
export const SWIPE_THRESHOLD_X = 88;

/** Upward distance (px) to commit save — position only */
export const SWIPE_THRESHOLD_Y = 72;

export const SWIPE_EXIT_X = typeof window !== 'undefined' ? window.innerWidth * 1.15 : 640;
export const SWIPE_EXIT_Y = typeof window !== 'undefined' ? window.innerHeight * 0.9 : 520;

export const SWIPE_EXIT = {
  type: 'spring' as const,
  stiffness: 340,
  damping: 32,
  mass: 0.85,
};

export const SWIPE_SNAP_BACK = {
  type: 'spring' as const,
  stiffness: 420,
  damping: 34,
  mass: 0.75,
};

export const STACK_LAYERS = 3;

export const STACK_STYLE = [
  { scale: 1, y: 0, rotate: 0, opacity: 1 },
  { scale: 0.94, y: 16, rotate: -2.8, opacity: 0.88 },
  { scale: 0.88, y: 32, rotate: 3.2, opacity: 0.72 },
] as const;

export const SWIPE_ROTATE_RANGE = 10;

/** Minimum drag (px) before suppressing tap */
export const SWIPE_TAP_SLOP = 12;
