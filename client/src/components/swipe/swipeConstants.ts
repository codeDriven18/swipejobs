/** Horizontal distance (px) to commit pass / apply — position only, no velocity */
export const SWIPE_THRESHOLD_X = 88;

/** Upward distance (px) to commit save — position only */
export const SWIPE_THRESHOLD_Y = 72;

export const SWIPE_EXIT_X = typeof window !== 'undefined' ? window.innerWidth * 1.15 : 640;
export const SWIPE_EXIT_Y = typeof window !== 'undefined' ? window.innerHeight * 0.9 : 520;

/** Fixed-duration exit — no velocity, no acceleration */
export const SWIPE_EXIT = { duration: 0.18, ease: [0.4, 0, 1, 1] as const };
export const SWIPE_SNAP_BACK = { duration: 0.2, ease: [0.25, 0.1, 0.25, 1] as const };

export const STACK_LAYERS = 3;

/** Stack peek — scaled cards sit below, never clipped */
export const STACK_STYLE = [
  { scale: 1, y: 0, opacity: 1 },
  { scale: 0.96, y: 14, opacity: 0.92 },
  { scale: 0.92, y: 28, opacity: 0.82 },
] as const;

export const SWIPE_ROTATE_RANGE = 8;

/** Minimum drag (px) before suppressing tap */
export const SWIPE_TAP_SLOP = 12;
