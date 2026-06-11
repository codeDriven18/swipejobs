import { useCallback, useRef, useState, type DragEvent } from 'react';
import { UserAvatar } from '@/components/profile/UserAvatar';
import type { UserProfile } from '@/models/userProfile';
import styles from './ProfileImageUpload.module.css';

const MAX_BYTES = 256 * 1024;
const ALLOWED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);

interface ProfileImageUploadProps {
  profile: UserProfile | null;
  uploading: boolean;
  uploadProgress: number;
  onUpload: (file: File) => Promise<void>;
  onRemove: () => Promise<void>;
}

async function compressImage(file: File): Promise<File> {
  if (file.size <= MAX_BYTES || !file.type.startsWith('image/')) return file;

  const bitmap = await createImageBitmap(file);
  const maxDim = 512;
  const scale = Math.min(1, maxDim / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return file;
  ctx.drawImage(bitmap, 0, 0, width, height);

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, 'image/jpeg', 0.85),
  );
  if (!blob) return file;
  return new File([blob], file.name.replace(/\.\w+$/, '.jpg'), { type: 'image/jpeg' });
}

export function ProfileImageUpload({
  profile,
  uploading,
  uploadProgress,
  onUpload,
  onRemove,
}: ProfileImageUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const validateAndUpload = useCallback(async (file: File) => {
    setLocalError(null);
    if (!ALLOWED_TYPES.has(file.type)) {
      setLocalError('Use JPEG, PNG, WebP, or GIF.');
      return;
    }
    if (file.size > MAX_BYTES * 4) {
      setLocalError('Image is too large. Max 256 KB after compression.');
      return;
    }

    const compressed = await compressImage(file);
    if (compressed.size > MAX_BYTES) {
      setLocalError('Image is too large. Choose a smaller photo.');
      return;
    }

    const preview = URL.createObjectURL(compressed);
    setPreviewUrl(preview);
    try {
      await onUpload(compressed);
    } finally {
      URL.revokeObjectURL(preview);
      setPreviewUrl(null);
    }
  }, [onUpload]);

  const onDrop = (event: DragEvent) => {
    event.preventDefault();
    setDragOver(false);
    const file = event.dataTransfer.files?.[0];
    if (file) void validateAndUpload(file);
  };

  const displayProfile = previewUrl
    ? { ...profile!, profileImageUrl: previewUrl }
    : profile;

  return (
    <div className={styles.wrap}>
      <div
        className={`${styles.dropZone} ${dragOver ? styles.dragOver : ''}`}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
      >
        <UserAvatar profile={displayProfile} size="xl" />
        {uploading && (
          <div className={styles.progressRing} aria-hidden="true">
            <span>{uploadProgress}%</span>
          </div>
        )}
      </div>

      <div className={styles.actions}>
        <button
          type="button"
          className={styles.btn}
          disabled={uploading}
          onClick={() => inputRef.current?.click()}
        >
          {profile?.profileImageUrl ? 'Change photo' : 'Upload photo'}
        </button>
        {profile?.profileImageUrl && (
          <button
            type="button"
            className={styles.btnGhost}
            disabled={uploading}
            onClick={() => void onRemove()}
          >
            Remove
          </button>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        hidden
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void validateAndUpload(file);
          e.target.value = '';
        }}
      />

      <p className={styles.hint}>Drag & drop or choose a photo. Max 256 KB.</p>
      {localError && <p className={styles.error}>{localError}</p>}
    </div>
  );
}
