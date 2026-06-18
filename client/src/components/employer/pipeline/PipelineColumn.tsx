import { memo, useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { IconFileText, IconMenu } from '@/components/icons/Icons';
import { IconMessages } from '@/components/layout/NavIcons';
import { UserAvatar } from '@/components/profile/UserAvatar';
import {
  formatAppliedDate,
  getPipelineCardAttention,
} from '@/lib/employer/pipelineCardAttention';
import {
  INTERVIEW_PHASE_LABELS,
  PIPELINE_STAGE_ORDER,
} from '@/lib/employer/pipelineArchitecture';
import { canMoveToStage, PIPELINE_STAGE_LABELS } from '@/lib/employer/pipelineMove';
import { InterviewPhase, PipelineStage } from '@/models/enums';
import type { PortalApplication } from '@/models/portal';
import styles from './PipelineBoard.module.css';

interface PipelineCardProps {
  application: PortalApplication;
  conversationId?: string;
  isDragging: boolean;
  showInterviewPhase: boolean;
  onDragStart: (applicationId: string) => void;
  onDragEnd: () => void;
  onMove: (applicationId: string, targetStage: PipelineStage) => void;
}

export const PipelineCard = memo(function PipelineCard({
  application,
  conversationId,
  isDragging,
  showInterviewPhase,
  onDragStart,
  onDragEnd,
  onMove,
}: PipelineCardProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const attention = getPipelineCardAttention(application);
  const draggable = !application.isWithdrawn;

  useEffect(() => {
    if (!menuOpen) return;
    const onPointerDown = (event: MouseEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', onPointerDown);
    return () => document.removeEventListener('mousedown', onPointerDown);
  }, [menuOpen]);

  const cardClass = [
    styles.card,
    isDragging ? styles.cardDragging : '',
    attention.includes('unread') ? styles.cardAttentionUnread : '',
    attention.includes('recent') ? styles.cardAttentionRecent : '',
    attention.includes('interview') ? styles.cardAttentionInterview : '',
  ].filter(Boolean).join(' ');

  const interviewLabel = application.interviewPhase !== InterviewPhase.None
    ? INTERVIEW_PHASE_LABELS[application.interviewPhase]
    : null;

  const nameParts = application.applicantName.trim().split(/\s+/);
  const firstName = nameParts[0] ?? '';
  const lastName = nameParts.slice(1).join(' ');

  return (
    <article
      className={cardClass}
      draggable={draggable}
      onDragStart={(event) => {
        if (!draggable) {
          event.preventDefault();
          return;
        }
        event.dataTransfer.effectAllowed = 'move';
        event.dataTransfer.setData('text/plain', application.id);
        onDragStart(application.id);
      }}
      onDragEnd={onDragEnd}
    >
      <div className={styles.cardTop}>
        <UserAvatar
          profile={{
            firstName,
            lastName,
            email: application.applicantEmail,
            profileImageUrl: application.applicantProfileImageUrl,
          }}
          size="md"
        />
        <div className={styles.cardIdentity}>
          <h3 className={styles.cardName}>{application.applicantName}</h3>
          <p className={styles.cardJob}>{application.jobTitle}</p>
        </div>
      </div>

      <div className={styles.cardMeta}>
        <span className={styles.metaItem}>{formatAppliedDate(application.appliedAt)}</span>
        {application.hasResume && (
          <span className={styles.metaItem} title="Resume on file">
            <IconFileText className={styles.metaIcon} />
            Resume
          </span>
        )}
        {application.unreadMessageCount > 0 && (
          <span className={styles.unreadPill} title="Unread messages">
            <IconMessages className={styles.metaIcon} />
            {application.unreadMessageCount}
          </span>
        )}
        {showInterviewPhase && interviewLabel && (
          <span className={styles.interviewPhase}>{interviewLabel}</span>
        )}
      </div>

      {/* Reserved: internal notes, ratings, scheduling, team assignments */}
      <div className={styles.cardExtensions} data-pipeline-extensions="" />

      <div
        className={[styles.cardActions, menuOpen ? styles.cardActionsOpen : ''].filter(Boolean).join(' ')}
        ref={menuRef}
      >
        <button
          type="button"
          className={styles.actionBtn}
          aria-label="Candidate actions"
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((open) => !open)}
        >
          <IconMenu size={14} />
        </button>

        {menuOpen && (
          <div className={styles.menu} role="menu">
            <Link
              to={`/portal/applications/${application.id}`}
              className={styles.menuItem}
              role="menuitem"
              onClick={() => setMenuOpen(false)}
            >
              Open profile
            </Link>
            {conversationId ? (
              <Link
                to={`/portal/messages/${conversationId}`}
                className={styles.menuItem}
                role="menuitem"
                onClick={() => setMenuOpen(false)}
              >
                Open chat
              </Link>
            ) : (
              <Link
                to={`/portal/applications/${application.id}`}
                className={styles.menuItem}
                role="menuitem"
                onClick={() => setMenuOpen(false)}
              >
                View candidate
              </Link>
            )}
            <div className={styles.menuDivider} />
            {PIPELINE_STAGE_ORDER.filter((stage) => canMoveToStage(application, stage)).map((stage) => (
              <button
                key={stage}
                type="button"
                className={styles.menuItem}
                role="menuitem"
                onClick={() => {
                  setMenuOpen(false);
                  void onMove(application.id, stage);
                }}
              >
                Move to {PIPELINE_STAGE_LABELS[stage]}
              </button>
            ))}
            {canMoveToStage(application, PipelineStage.Rejected) && (
              <>
                <div className={styles.menuDivider} />
                <button
                  type="button"
                  className={`${styles.menuItem} ${styles.menuItemDanger}`}
                  role="menuitem"
                  onClick={() => {
                    setMenuOpen(false);
                    void onMove(application.id, PipelineStage.Rejected);
                  }}
                >
                  Reject candidate
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </article>
  );
});

interface PipelineColumnProps {
  stage: PipelineStage;
  label: string;
  stageClass: string;
  applications: PortalApplication[];
  emptyMessage: string;
  isDropTarget: boolean;
  draggingId: string | null;
  conversationByApplicationId: Record<string, string>;
  onDragStart: (applicationId: string) => void;
  onDragEnd: () => void;
  onDragEnter: (stage: PipelineStage) => void;
  onDrop: (stage: PipelineStage) => void;
  onMove: (applicationId: string, targetStage: PipelineStage) => void;
}

export const PipelineColumn = memo(function PipelineColumn({
  stage,
  label,
  stageClass,
  applications,
  emptyMessage,
  isDropTarget,
  draggingId,
  conversationByApplicationId,
  onDragStart,
  onDragEnd,
  onDragEnter,
  onDrop,
  onMove,
}: PipelineColumnProps) {
  const handleDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
    onDragEnter(stage);
  }, [onDragEnter, stage]);

  const handleDrop = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    onDrop(stage);
  }, [onDrop, stage]);

  return (
    <section
      className={[styles.column, isDropTarget ? styles.columnDropTarget : ''].filter(Boolean).join(' ')}
      aria-label={`${label} column`}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      <header className={styles.columnHeader}>
        <div className={styles.columnTitle}>
          <span className={`${styles.stageDot} ${stageClass}`} aria-hidden />
          <span>{label}</span>
        </div>
        <span className={styles.columnCount}>{applications.length}</span>
      </header>

      <div className={styles.columnBody}>
        {applications.length === 0 ? (
          <div className={styles.columnEmpty}>
            <span>{emptyMessage}</span>
          </div>
        ) : (
          applications.map((application) => (
            <PipelineCard
              key={application.id}
              application={application}
              conversationId={conversationByApplicationId[application.id]}
              isDragging={draggingId === application.id}
              showInterviewPhase={stage === PipelineStage.Interview}
              onDragStart={onDragStart}
              onDragEnd={onDragEnd}
              onMove={onMove}
            />
          ))
        )}
      </div>
    </section>
  );
});

export const STAGE_STYLE_CLASS: Record<PipelineStage, string> = {
  [PipelineStage.Applied]: styles.stageApplied,
  [PipelineStage.Reviewing]: styles.stageReviewing,
  [PipelineStage.Shortlisted]: styles.stageShortlisted,
  [PipelineStage.Interview]: styles.stageInterview,
  [PipelineStage.Offer]: styles.stageOffer,
  [PipelineStage.Hired]: styles.stageHired,
  [PipelineStage.Rejected]: styles.stageRejected,
};

export const EMPTY_COLUMN_MESSAGES: Record<PipelineStage, string> = {
  [PipelineStage.Applied]: 'Waiting for applicants',
  [PipelineStage.Reviewing]: 'No one in review',
  [PipelineStage.Shortlisted]: 'No shortlisted candidates',
  [PipelineStage.Interview]: 'No interviews in progress',
  [PipelineStage.Offer]: 'No offers out',
  [PipelineStage.Hired]: 'No hires yet',
  [PipelineStage.Rejected]: 'No rejected candidates',
};
