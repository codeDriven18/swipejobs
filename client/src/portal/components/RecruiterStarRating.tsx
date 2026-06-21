import ws from '@/portal/workspace.module.css';

interface RecruiterStarRatingProps {
  value?: number;
  onChange?: (rating: number | null) => void;
  disabled?: boolean;
}

export function RecruiterStarRating({ value, onChange, disabled = false }: RecruiterStarRatingProps) {
  const interactive = Boolean(onChange) && !disabled;

  return (
    <div className={ws.starRating} role={interactive ? 'group' : undefined} aria-label="Recruiter rating">
      {[1, 2, 3, 4, 5].map((star) => {
        const filled = (value ?? 0) >= star;
        return (
          <button
            key={star}
            type="button"
            className={[ws.starButton, filled ? ws.starFilled : ''].filter(Boolean).join(' ')}
            disabled={!interactive}
            onClick={() => onChange?.(value === star ? null : star)}
            aria-label={`${star} star${star === 1 ? '' : 's'}`}
          >
            ★
          </button>
        );
      })}
    </div>
  );
}
