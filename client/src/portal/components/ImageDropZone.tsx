import { useCallback, useId, useRef, useState, type DragEvent } from 'react';
import ws from '@/portal/workspace.module.css';

interface ImageDropZoneProps {
  label: string;
  hint?: string;
  value: string;
  onChange: (url: string) => void;
  onUploadFile?: (file: File) => Promise<string>;
  aspect?: 'banner' | 'square';
  placeholder?: React.ReactNode;
}

export function ImageDropZone({
  label,
  hint,
  value,
  onChange,
  onUploadFile,
  aspect = 'banner',
  placeholder,
}: ImageDropZoneProps) {
  const inputId = useId();
  const fileRef = useRef<HTMLInputElement>(null);
  const [localPreview, setLocalPreview] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);

  const preview = value.trim() || localPreview;

  const processFile = useCallback(async (file: File) => {
    if (!file.type.startsWith('image/')) return;
    if (onUploadFile) {
      setUploading(true);
      try {
        const url = await onUploadFile(file);
        onChange(url);
        setLocalPreview(null);
      } finally {
        setUploading(false);
      }
      return;
    }
    const objectUrl = URL.createObjectURL(file);
    setLocalPreview((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return objectUrl;
    });
  }, [onChange, onUploadFile]);

  const handleFiles = useCallback((files: FileList | null) => {
    const file = files?.[0];
    if (!file) return;
    void processFile(file);
  }, [processFile]);

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const url = e.dataTransfer.getData('text/uri-list') || e.dataTransfer.getData('text/plain');
    if (url.startsWith('http://') || url.startsWith('https://')) {
      onChange(url.trim());
      setLocalPreview(null);
      return;
    }
    handleFiles(e.dataTransfer.files);
  };

  return (
    <div className={ws.dropZoneField}>
      <label htmlFor={inputId} className={ws.dropZoneLabel}>{label}</label>
      {hint && <p className={ws.candidateSub}>{hint}</p>}
      <div
        className={[
          ws.dropZone,
          aspect === 'square' ? ws.dropZoneSquare : ws.dropZoneBanner,
          dragging ? ws.dropZoneDragging : '',
        ].filter(Boolean).join(' ')}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        onClick={() => fileRef.current?.click()}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') fileRef.current?.click(); }}
        role="button"
        tabIndex={0}
      >
        {preview ? (
          <img src={preview} alt="" className={ws.dropZonePreview} />
        ) : (
          placeholder ?? <span className={ws.dropZonePlaceholder}>{uploading ? 'Uploading…' : 'Drop image or click to browse'}</span>
        )}
        <input
          ref={fileRef}
          id={inputId}
          type="file"
          accept="image/*"
          className={ws.dropZoneFileInput}
          onChange={(e) => handleFiles(e.target.files)}
        />
      </div>
      <input
        className={ws.input}
        placeholder="https://…"
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          if (e.target.value.trim()) setLocalPreview(null);
        }}
      />
      {localPreview && !value.trim() && !onUploadFile && (
        <p className={ws.dropZoneHint}>Preview only — paste a hosted image URL above to save.</p>
      )}
    </div>
  );
}
