import type { PortalApplication } from '@/models/portal';
import ws from '@/portal/workspace.module.css';

interface RecruiterMetaRowProps {
  application: Pick<PortalApplication, 'recruiterRating' | 'isFavorite' | 'recruiterTags' | 'recruiterNoteCount'>;
  compact?: boolean;
}

export function RecruiterMetaRow({ application, compact = false }: RecruiterMetaRowProps) {
  const isFavorite = application.isFavorite ?? false;
  const recruiterRating = application.recruiterRating;
  const recruiterTags = application.recruiterTags ?? [];
  const recruiterNoteCount = application.recruiterNoteCount ?? 0;
  const hasMeta = isFavorite || recruiterRating || recruiterTags.length > 0 || recruiterNoteCount > 0;
  if (!hasMeta) return null;

  const visibleTags = compact ? recruiterTags.slice(0, 2) : recruiterTags;
  const extraTags = compact && recruiterTags.length > 2 ? recruiterTags.length - 2 : 0;

  return (
    <div className={[ws.recruiterMetaRow, compact ? ws.recruiterMetaRowCompact : ''].filter(Boolean).join(' ')}>
      {isFavorite && <span className={ws.recruiterFavorite} title="Favorite candidate">★</span>}
      {recruiterRating != null && recruiterRating > 0 && (
        <span className={ws.recruiterRating} title={`Rating: ${recruiterRating}/5`}>
          {'★'.repeat(recruiterRating)}{'☆'.repeat(5 - recruiterRating)}
        </span>
      )}
      {visibleTags.map((tag) => (
        <span key={tag.id} className={ws.recruiterTagPill}>{tag.name}</span>
      ))}
      {extraTags > 0 && <span className={ws.recruiterTagMore}>+{extraTags}</span>}
      {recruiterNoteCount > 0 && (
        <span className={ws.recruiterNoteCount} title="Internal notes">{recruiterNoteCount} note{recruiterNoteCount === 1 ? '' : 's'}</span>
      )}
    </div>
  );
}
