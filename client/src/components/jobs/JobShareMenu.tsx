import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  IconCheck,
  IconLink,
  IconMail,
  IconMore,
  IconShare,
} from '@/components/icons/Icons';
import { getJobShareUrl } from '@/lib/shareUrls';
import { useFloatingOverlay } from '@/hooks/useFloatingOverlay';
import type { Job } from '@/models/job';
import styles from './JobShareMenu.module.css';

interface JobShareMenuProps {
  job: Job;
  open: boolean;
  onClose: () => void;
}

function ShareOption({
  label,
  icon,
  onClick,
  href,
}: {
  label: string;
  icon: React.ReactNode;
  onClick?: () => void;
  href?: string;
}) {
  const className = styles.option;
  const inner = (
    <>
      <span className={styles.optionIcon}>{icon}</span>
      <span className={styles.optionLabel}>{label}</span>
    </>
  );

  if (href) {
    return (
      <a className={className} href={href} target="_blank" rel="noopener noreferrer" onClick={onClick}>
        {inner}
      </a>
    );
  }

  return (
    <button type="button" className={className} onClick={onClick}>
      {inner}
    </button>
  );
}

export function JobShareMenu({ job, open, onClose }: JobShareMenuProps) {
  const [copied, setCopied] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const url = getJobShareUrl(job.id);
  const text = `${job.title} at ${job.company}`;

  useFloatingOverlay({
    open,
    onClose,
    panelId: 'job-share-menu',
    panelRef,
    closeOnScroll: true,
  });

  useEffect(() => {
    if (!open) setCopied(false);
  }, [open]);

  const copyLink = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  }, [url]);

  const shareNative = useCallback(async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: text, text, url });
        onClose();
      } catch {
        /* cancelled */
      }
    }
  }, [text, url, onClose]);

  if (!open) return null;

  const telegramUrl = `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`;
  const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(`${text} ${url}`)}`;
  const mailUrl = `mailto:?subject=${encodeURIComponent(text)}&body=${encodeURIComponent(url)}`;

  return createPortal(
    <div className={styles.backdrop} role="presentation" onClick={onClose}>
      <div
        ref={panelRef}
        className={styles.sheet}
        role="dialog"
        aria-label="Share job"
        onClick={(e) => e.stopPropagation()}
      >
        <div className={styles.handle} aria-hidden />
        <h3 className={styles.title}>Share this job</h3>

        {copied && (
          <div className={styles.successBar} role="status">
            <span>Link copied!</span>
            <span className={styles.successIcon} aria-hidden><IconCheck size={18} /></span>
          </div>
        )}

        <div className={styles.optionsRow}>
          <ShareOption label="Copy link" icon={<IconLink size={22} />} onClick={() => void copyLink()} />
          {typeof navigator !== 'undefined' && 'share' in navigator && (
            <ShareOption label="Share" icon={<IconShare size={22} />} onClick={() => void shareNative()} />
          )}
          <ShareOption
            label="Telegram"
            icon={<IconShare size={22} />}
            href={telegramUrl}
            onClick={onClose}
          />
          <ShareOption
            label="WhatsApp"
            icon={<IconShare size={22} />}
            href={whatsappUrl}
            onClick={onClose}
          />
          <ShareOption
            label="Email"
            icon={<IconMail size={22} />}
            href={mailUrl}
            onClick={onClose}
          />
          <ShareOption label="More" icon={<IconMore size={22} />} onClick={() => void copyLink()} />
        </div>

        <button type="button" className={styles.cancel} onClick={onClose}>Cancel</button>
      </div>
    </div>,
    document.body,
  );
}
