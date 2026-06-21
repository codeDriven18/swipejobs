import { useState } from 'react';
import ws from '@/portal/workspace.module.css';

const REJECTION_REASONS = [
  'Skills mismatch',
  'Position filled',
  'Salary expectations',
  'Experience level',
  'Culture fit',
  'Other',
] as const;

interface RejectCandidateDialogProps {
  open: boolean;
  onCancel: () => void;
  onConfirm: (reason?: string) => void;
  busy?: boolean;
}

export function RejectCandidateDialog({ open, onCancel, onConfirm, busy = false }: RejectCandidateDialogProps) {
  const [reason, setReason] = useState('');
  const [custom, setCustom] = useState('');

  if (!open) return null;

  const resolved = reason === 'Other' ? custom.trim() : reason;

  return (
    <div className={ws.dialogOverlay} role="dialog" aria-modal="true" aria-labelledby="reject-title">
      <div className={ws.dialogPanel}>
        <h3 id="reject-title" className={ws.panelTitle}>Reject candidate</h3>
        <p className={ws.candidateSub}>Optionally record why — visible only to your team.</p>

        <div className={ws.rejectReasonList}>
          {REJECTION_REASONS.map((item) => (
            <label key={item} className={ws.rejectReasonOption}>
              <input
                type="radio"
                name="rejectReason"
                value={item}
                checked={reason === item}
                onChange={() => setReason(item)}
              />
              {item}
            </label>
          ))}
        </div>

        {reason === 'Other' && (
          <input
            type="text"
            className={ws.schedulerInput}
            placeholder="Describe the reason…"
            value={custom}
            onChange={(e) => setCustom(e.target.value)}
          />
        )}

        <div className={ws.schedulerActions}>
          <button
            type="button"
            className={ws.btnDanger}
            disabled={busy}
            onClick={() => onConfirm(resolved || undefined)}
          >
            Reject candidate
          </button>
          <button type="button" className={ws.btnGhost} disabled={busy} onClick={onCancel}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
