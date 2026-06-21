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

import { RecruiterMetaRow } from '@/portal/components/RecruiterMetaRow';

import { candidateProfilePath } from '@/lib/employer/hiringNavigation';

import styles from './PipelineBoard.module.css';



interface PipelineCardProps {

  application: PortalApplication;

  conversationId?: string;

  isDragging: boolean;

  onDragStart: (applicationId: string) => void;

  onDragEnd: () => void;

  onMove: (applicationId: string, targetStage: PipelineStage) => void;

  jobId?: string;

}



export const PipelineCard = memo(function PipelineCard({

  application,

  conversationId,

  isDragging,

  onDragStart,

  onDragEnd,

  onMove,

  jobId,

}: PipelineCardProps) {

  const [menuOpen, setMenuOpen] = useState(false);

  const menuRef = useRef<HTMLDivElement>(null);

  const attention = getPipelineCardAttention(application);

  const draggable = !application.isWithdrawn;

  const profileTo = candidateProfilePath(application.id, { from: 'pipeline', jobId });



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



  const interviewTime = application.interviewScheduledAtUtc

    ? new Date(application.interviewScheduledAtUtc).toLocaleString(undefined, {

        month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',

      })

    : null;

  const interviewLabel = interviewTime

    ?? (application.interviewPhase !== InterviewPhase.None

      ? INTERVIEW_PHASE_LABELS[application.interviewPhase]

      : null);



  const nameParts = application.applicantName.trim().split(/\s+/);

  const firstName = nameParts[0] ?? '';

  const lastName = nameParts.slice(1).join(' ');



  const cardClass = [

    styles.card,

    isDragging ? styles.cardDragging : '',

    attention.includes('unread') ? styles.cardNeedsReply : '',

    attention.includes('interview') ? styles.cardInterviewSoon : '',

  ].filter(Boolean).join(' ');



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

      <div className={styles.cardHeader}>

        <UserAvatar

          profile={{

            firstName,

            lastName,

            email: application.applicantEmail,

            profileImageUrl: application.applicantProfileImageUrl,

          }}

          size="sm"

        />

        <div className={styles.cardIdentity}>

          <div className={styles.cardNameRow}>

            <h3 className={styles.cardName}>

              <Link to={profileTo} className={styles.cardNameLink}>

                {application.applicantName}

              </Link>

            </h3>

            {application.isFavorite && (

              <span className={styles.cardFavorite} title="Favorite candidate" aria-label="Favorite">★</span>

            )}

          </div>

          <p className={styles.cardJob}>{application.jobTitle}</p>

        </div>



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

                to={profileTo}

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

                  to={profileTo}

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

      </div>



      <div className={styles.cardSignals}>

        <span className={styles.signalChip}>{formatAppliedDate(application.appliedAt)}</span>

        {application.hasResume && (

          <span className={styles.signalChip} title="Resume on file">

            <IconFileText className={styles.signalIcon} aria-hidden />

            Resume

          </span>

        )}

        {application.unreadMessageCount > 0 && (

          <span className={styles.signalChipLive} title="Unread messages">

            <IconMessages className={styles.signalIcon} aria-hidden />

            {application.unreadMessageCount}

          </span>

        )}

        {interviewLabel && (

          <span className={styles.signalChipInterview} title="Interview">

            {interviewLabel}

          </span>

        )}

        {attention.includes('recent') && (

          <span className={styles.signalChipNew}>New</span>

        )}

      </div>



      <RecruiterMetaRow application={application} compact />

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

  columnRef?: (node: HTMLElement | null) => void;

  onDragStart: (applicationId: string) => void;

  onDragEnd: () => void;

  onDragEnter: (stage: PipelineStage) => void;

  onDrop: (stage: PipelineStage) => void;

  onMove: (applicationId: string, targetStage: PipelineStage) => void;

  jobId?: string;

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

  columnRef,

  onDragStart,

  onDragEnd,

  onDragEnter,

  onDrop,

  onMove,

  jobId,

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



  const hasLiveCandidates = applications.some(

    (app) => app.unreadMessageCount > 0 || app.interviewScheduledAtUtc,

  );



  return (

    <section

      ref={columnRef}

      className={[

        styles.column,

        isDropTarget ? styles.columnDropTarget : '',

        applications.length === 0 ? styles.columnEmptyState : '',

      ].filter(Boolean).join(' ')}

      aria-label={`${label} column`}

      onDragOver={handleDragOver}

      onDrop={handleDrop}

    >

      <header className={styles.columnHeader}>

        <div className={styles.columnTitle}>

          <span className={`${styles.stageDot} ${stageClass}`} aria-hidden />

          <span className={styles.columnLabel}>{label}</span>

        </div>

        <span className={[

          styles.columnCount,

          hasLiveCandidates ? styles.columnCountLive : '',

          applications.length > 0 ? styles.columnCountActive : '',

        ].filter(Boolean).join(' ')}>

          {applications.length}

        </span>

      </header>



      <div className={styles.columnBody}>

        {applications.length === 0 ? (

          <PipelineColumnEmpty stage={stage} message={emptyMessage} />

        ) : (

          applications.map((application) => (

            <PipelineCard

              key={application.id}

              application={application}

              conversationId={conversationByApplicationId[application.id]}

              isDragging={draggingId === application.id}

              onDragStart={onDragStart}

              onDragEnd={onDragEnd}

              onMove={onMove}

              jobId={jobId}

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

  [PipelineStage.Applied]: 'No applications yet',

  [PipelineStage.Reviewing]: 'Nothing in review',

  [PipelineStage.Shortlisted]: 'No shortlisted candidates',

  [PipelineStage.Interview]: 'No interviews in progress',

  [PipelineStage.Offer]: 'No offers out',

  [PipelineStage.Hired]: 'No hires yet',

  [PipelineStage.Rejected]: 'No rejected candidates',

};



interface EmptyAction {

  label: string;

  to: string;

  primary?: boolean;

}



export const EMPTY_COLUMN_ACTIONS: Record<PipelineStage, EmptyAction[]> = {

  [PipelineStage.Applied]: [

    { label: 'Publish a role', to: '/portal/jobs', primary: true },

    { label: 'Share open roles', to: '/portal/jobs' },

  ],

  [PipelineStage.Reviewing]: [

    { label: 'Review applicants', to: '/portal/pipeline?view=list', primary: true },

    { label: 'Open Today', to: '/portal' },

  ],

  [PipelineStage.Shortlisted]: [

    { label: 'Review candidates', to: '/portal/pipeline?view=list', primary: true },

    { label: 'Move from review', to: '/portal/pipeline' },

  ],

  [PipelineStage.Interview]: [

    { label: 'Invite to interview', to: '/portal/pipeline?view=list', primary: true },

    { label: 'Open inbox', to: '/portal/messages' },

  ],

  [PipelineStage.Offer]: [

    { label: 'Advance candidates', to: '/portal/pipeline', primary: true },

    { label: 'View pipeline', to: '/portal/pipeline' },

  ],

  [PipelineStage.Hired]: [

    { label: 'Review hired candidates', to: '/portal/pipeline?view=list', primary: true },

  ],

  [PipelineStage.Rejected]: [

    { label: 'Review active pipeline', to: '/portal/pipeline', primary: true },

  ],

};



function PipelineColumnEmpty({ stage, message }: { stage: PipelineStage; message: string }) {

  const actions = EMPTY_COLUMN_ACTIONS[stage];



  return (

    <div className={styles.columnEmpty}>

      <p className={styles.columnEmptyTitle}>{message}</p>

      <p className={styles.columnEmptyHint}>

        {stage === PipelineStage.Applied

          ? 'Publish and share roles to start receiving candidates.'

          : 'Drag candidates here or use quick actions to move them forward.'}

      </p>

      <div className={styles.columnEmptyActions}>

        {actions.map((action) => (

          <Link

            key={action.label}

            to={action.to}

            className={action.primary ? styles.columnEmptyBtnPrimary : styles.columnEmptyBtn}

          >

            {action.label}

          </Link>

        ))}

      </div>

    </div>

  );

}

