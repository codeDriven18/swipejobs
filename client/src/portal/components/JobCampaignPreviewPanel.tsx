import { useMemo } from 'react';
import { OpportunityCard } from '@/components/jobs/OpportunityCard';
import { buildCampaignPreviewJob, getCampaignReadiness, type JobCampaignFormState } from '@/lib/jobCampaignPreview';
import { resolveCampaignCoverUrl } from '@/lib/jobCampaignCover';
import type { Company } from '@/models/company';
import ws from '@/portal/workspace.module.css';

interface JobCampaignPreviewPanelProps {
  form: JobCampaignFormState;
  company: Company | null;
  step: number;
  compact?: boolean;
}

export function JobCampaignPreviewPanel({ form, company, step, compact = false }: JobCampaignPreviewPanelProps) {
  const previewJob = useMemo(() => buildCampaignPreviewJob(form, company), [form, company]);
  const readiness = useMemo(() => getCampaignReadiness(form), [form]);
  const usingAutoCover = !form.coverImageUrl.trim();
  const coverUrl = form.coverImageUrl.trim() || resolveCampaignCoverUrl(form.category, form.title);

  return (
    <aside className={compact ? ws.campaignPreviewCompact : ws.campaignPreview}>
      <div className={ws.campaignPreviewHead}>
        <h3 className={ws.campaignPreviewTitle}>Candidate preview</h3>
        <p className={ws.campaignPreviewSub}>
          {step < 3
            ? 'Updates live as you build your campaign.'
            : 'This is how your role appears in discover and swipe.'}
        </p>
      </div>

      <div className={ws.campaignPreviewCardWrap}>
        <OpportunityCard job={previewJob} variant="discover" interactive={false} />
      </div>

      <div className={ws.campaignPreviewMeta}>
        <div className={ws.campaignPreviewCoverRow}>
          <img src={coverUrl} alt="" className={ws.campaignPreviewThumb} />
          <div>
            <span className={ws.campaignPreviewCoverLabel}>Campaign cover</span>
            <span className={ws.campaignPreviewCoverHint}>
              {usingAutoCover ? 'Branded auto cover until you upload one' : 'Custom cover image'}
            </span>
          </div>
        </div>
        {company?.logoUrl && (
          <p className={ws.campaignPreviewBrand}>
            Posted under <strong>{company.name}</strong>
          </p>
        )}
      </div>

      <div className={ws.campaignReadiness}>
        <div className={ws.campaignReadinessHead}>
          <span className={ws.campaignReadinessLabel}>Campaign strength</span>
          <span className={ws.campaignReadinessScore}>{readiness.score}%</span>
        </div>
        <div className={ws.campaignReadinessBar} aria-hidden>
          <span className={ws.campaignReadinessFill} style={{ width: `${readiness.score}%` }} />
        </div>
        <ul className={ws.campaignChecklist}>
          {readiness.items.map((item) => (
            <li key={item.label} className={item.done ? ws.campaignCheckDone : ws.campaignCheckPending}>
              {item.label}
            </li>
          ))}
        </ul>
      </div>
    </aside>
  );
}
