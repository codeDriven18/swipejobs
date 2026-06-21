import { useState } from 'react';
import { Link } from 'react-router-dom';
import { portalApi } from '@/api/portalApi';
import { ApiError } from '@/api/client';
import { ApplicationStatus, ApplicationStatusLabels } from '@/models/enums';
import { InterviewScheduler } from '@/portal/components/InterviewScheduler';
import { RejectCandidateDialog } from '@/portal/components/RejectCandidateDialog';
import ws from '@/portal/workspace.module.css';

const NEXT_STAGE: Partial<Record<ApplicationStatus, ApplicationStatus>> = {
  [ApplicationStatus.Applied]: ApplicationStatus.UnderReview,
  [ApplicationStatus.UnderReview]: ApplicationStatus.Shortlisted,
  [ApplicationStatus.Shortlisted]: ApplicationStatus.InterviewInvited,
  [ApplicationStatus.InterviewInvited]: ApplicationStatus.Interviewing,
  [ApplicationStatus.Interviewing]: ApplicationStatus.OfferSent,
  [ApplicationStatus.OfferSent]: ApplicationStatus.Hired,
};

const CLOSED_STATUSES: ApplicationStatus[] = [
  ApplicationStatus.Hired,
  ApplicationStatus.Rejected,
  ApplicationStatus.Withdrawn,
];

interface RecruiterChatActionsProps {
  applicationId: string;
  status: ApplicationStatus;
  onChanged: () => void;
  variant?: 'default' | 'toolbar' | 'compact';
}

function resolveActionError(err: unknown): string {
  if (err instanceof ApiError) {
    let serverMessage: string | undefined;
    if (typeof err.body === 'string') {
      try {
        serverMessage = (JSON.parse(err.body) as { error?: string }).error;
      } catch {
        serverMessage = err.body || undefined;
      }
    }
    return serverMessage ?? err.message;
  }
  return err instanceof Error ? err.message : 'Action failed. Please try again.';
}

export function RecruiterChatActions({ applicationId, status, onChanged, variant = 'default' }: RecruiterChatActionsProps) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [scheduling, setScheduling] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);

  const isClosed = CLOSED_STATUSES.includes(status);
  const next = NEXT_STAGE[status];
  const canReview = status === ApplicationStatus.Applied || status === ApplicationStatus.UnderReview;

  const run = async (action: () => Promise<unknown>) => {
    setBusy(true);
    setError(null);
    try {
      await action();
      onChanged();
    } catch (err) {
      setError(resolveActionError(err));
    } finally {
      setBusy(false);
    }
  };

  const rootClass = [
    ws.recruiterActions,
    variant === 'toolbar' ? ws.recruiterActionsToolbar : '',
    variant === 'compact' ? ws.recruiterActionsCompact : '',
  ].filter(Boolean).join(' ');

  return (
    <div className={rootClass}>
      <div className={ws.recruiterActionsRow}>
        <span className={ws.recruiterActionsStatus}>
          <span className={ws.recruiterActionsDot} aria-hidden />
          {ApplicationStatusLabels[status]}
        </span>

        {!isClosed && (
          <div className={ws.recruiterActionsButtons}>
            {canReview && (
              <button
                type="button"
                className={ws.btnGhost}
                disabled={busy}
                onClick={() => void run(() => portalApi.shortlistApplication(applicationId))}
              >
                Mark for review
              </button>
            )}

            <button
              type="button"
              className={scheduling ? ws.btnPrimary : ws.btnGhost}
              disabled={busy}
              onClick={() => setScheduling((v) => !v)}
            >
              {scheduling ? 'Close scheduler' : 'Schedule interview'}
            </button>

            {next && next !== ApplicationStatus.InterviewInvited && (
              <button
                type="button"
                className={ws.btnPrimary}
                disabled={busy}
                onClick={() => void run(() => portalApi.updateApplicationStatus(applicationId, { status: next }))}
              >
                Move to {ApplicationStatusLabels[next]}
              </button>
            )}

            <button
              type="button"
              className={ws.btnDanger}
              disabled={busy}
              onClick={() => setRejectOpen(true)}
            >
              Reject
            </button>
          </div>
        )}

        <Link to={`/portal/applications/${applicationId}`} className={ws.recruiterActionsLink}>
          View full profile
        </Link>
      </div>

      {error && <p className={ws.recruiterActionsError} role="alert">{error}</p>}

      {scheduling && !isClosed && (
        <InterviewScheduler
          applicationId={applicationId}
          onScheduled={() => {
            setScheduling(false);
            onChanged();
          }}
          onCancel={() => setScheduling(false)}
        />
      )}

      <RejectCandidateDialog
        open={rejectOpen}
        busy={busy}
        onCancel={() => setRejectOpen(false)}
        onConfirm={(reason) => {
          setRejectOpen(false);
          void run(() => portalApi.updateApplicationStatus(applicationId, {
            status: ApplicationStatus.Rejected,
            rejectionReason: reason,
          }));
        }}
      />
    </div>
  );
}
