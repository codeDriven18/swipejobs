import { useCallback, useEffect, useRef, useState } from 'react';
import type { ResolvedJobImage } from '@/lib/resolveJobImage';
import styles from './JobHeroImage.module.css';

interface JobHeroImageProps {
  image: ResolvedJobImage;
  alt: string;
  className?: string;
  priority?: boolean;
  variant?: 'default' | 'swipe' | 'compact';
}

export function JobHeroImage({ image, alt, className = '', priority = false, variant = 'default' }: JobHeroImageProps) {
  const [loaded, setLoaded] = useState(false);
  const [src, setSrc] = useState(image.url);
  const imgRef = useRef<HTMLImageElement>(null);
  const isCategory = image.source === 'category';

  const categoryFallback = `/job-images/${image.theme === 'gig' ? 'default' : image.theme}.svg`;

  const markLoadedIfReady = useCallback(() => {
    const img = imgRef.current;
    if (img?.complete && img.naturalWidth > 0) {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    setLoaded(false);
    setSrc(image.url);
  }, [image.url]);

  useEffect(() => {
    markLoadedIfReady();
  }, [src, markLoadedIfReady]);

  return (
    <div className={`${styles.wrap} ${className}`} style={{ background: image.gradient }}>
      {!loaded && <div className={styles.skeleton} aria-hidden />}
      <img
        ref={imgRef}
        src={src}
        alt={alt}
        draggable={false}
        className={`${styles.img} ${loaded ? styles.visible : ''} ${isCategory ? styles.category : ''}`}
        loading={priority ? 'eager' : 'lazy'}
        decoding="async"
        fetchPriority={priority ? 'high' : 'auto'}
        onLoad={() => setLoaded(true)}
        onError={() => {
          if (src !== categoryFallback) {
            setLoaded(false);
            setSrc(categoryFallback);
          } else {
            setLoaded(true);
          }
        }}
      />
      {variant === 'default' && <div className={styles.fade} aria-hidden />}
      {variant === 'default' && <div className={styles.fadeSurface} aria-hidden />}
    </div>
  );
}
