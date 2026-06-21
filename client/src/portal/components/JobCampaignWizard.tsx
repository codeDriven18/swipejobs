import { useMemo, useState } from 'react';
import { IconChevronLeft, IconChevronRight, IconSpark } from '@/components/icons/Icons';
import { ImageDropZone } from '@/portal/components/ImageDropZone';
import { JobCampaignPreviewPanel } from '@/portal/components/JobCampaignPreviewPanel';
import type { JobCampaignFormState } from '@/lib/jobCampaignPreview';
import { getCampaignReadiness } from '@/lib/jobCampaignPreview';
import type { Company } from '@/models/company';
import { JobCategory, JobLevel } from '@/models/enums';
import ws from '@/portal/workspace.module.css';

const STEPS = [
  {
    key: 'role',
    label: 'Role',
    heading: 'Start with a strong title',
    hint: 'Clear titles get more qualified applicants. Lead with the role, not internal jargon.',
  },
  {
    key: 'details',
    label: 'Details',
    heading: 'Where and who you need',
    hint: 'Location and seniority help SwipeJobs match the right candidates to your campaign.',
  },
  {
    key: 'offer',
    label: 'Offer',
    heading: 'Compensation and visual branding',
    hint: 'Roles with salary ranges and strong cover imagery perform better in discover.',
  },
  {
    key: 'review',
    label: 'Review',
    heading: 'Launch your hiring campaign',
    hint: 'Confirm how candidates will see this role before you publish.',
  },
] as const;

const ROLE_TIPS = [
  'Lead with the outcome — what the hire will own in their first 90 days.',
  'Use plain language. Avoid internal level codes candidates will not recognize.',
  'Mention team size or stack only if it helps someone self-select in or out.',
];

interface JobCampaignWizardProps {
  form: JobCampaignFormState;
  onChange: (form: JobCampaignFormState) => void;
  company: Company | null;
  editingId: string | null;
  saving: boolean;
  formError: string | null;
  onSubmit: () => void;
  onCancel: () => void;
}

function canAdvanceStep(step: number, form: JobCampaignFormState): boolean {
  if (step === 0) {
    return form.title.trim().length >= 2 && form.description.trim().length >= 10;
  }
  return true;
}

export function JobCampaignWizard({
  form,
  onChange,
  company,
  editingId,
  saving,
  formError,
  onSubmit,
  onCancel,
}: JobCampaignWizardProps) {
  const [step, setStep] = useState(0);
  const current = STEPS[step];
  const readiness = useMemo(() => getCampaignReadiness(form), [form]);
  const isLastStep = step === STEPS.length - 1;

  const goNext = () => {
    if (!canAdvanceStep(step, form)) return;
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  };

  const goBack = () => {
    if (step === 0) {
      onCancel();
      return;
    }
    setStep((s) => Math.max(s - 1, 0));
  };

  return (
    <div className={ws.campaignWizard}>
      <nav className={ws.campaignStepper} aria-label="Campaign creation progress">
        {STEPS.map((s, index) => {
          const done = index < step;
          const active = index === step;
          return (
            <button
              key={s.key}
              type="button"
              className={[
                ws.campaignStep,
                active ? ws.campaignStepActive : '',
                done ? ws.campaignStepDone : '',
              ].filter(Boolean).join(' ')}
              onClick={() => {
                if (index <= step || (index === step + 1 && canAdvanceStep(step, form))) {
                  setStep(index);
                }
              }}
              aria-current={active ? 'step' : undefined}
            >
              <span className={ws.campaignStepIndex}>{done ? '✓' : index + 1}</span>
              <span className={ws.campaignStepLabel}>{s.label}</span>
            </button>
          );
        })}
      </nav>

      <div className={ws.campaignWizardLayout}>
        <div className={ws.campaignWizardMain}>
          <header className={ws.campaignStepIntro}>
            <p className={ws.campaignStepEyebrow}>
              Step {step + 1} of {STEPS.length} · {current.label}
            </p>
            <h2 className={ws.campaignStepHeading}>{current.heading}</h2>
            <p className={ws.campaignStepHint}>{current.hint}</p>
          </header>

          {formError && isLastStep && (
            <p className={ws.formError} role="alert">{formError}</p>
          )}

          {step === 0 && (
            <section className={ws.campaignStepPanel}>
              <div className={ws.field}>
                <label htmlFor="title">Role title</label>
                <input
                  id="title"
                  className={ws.input}
                  required
                  placeholder="e.g. Senior Frontend Engineer"
                  value={form.title}
                  onChange={(e) => onChange({ ...form, title: e.target.value })}
                />
              </div>
              <div className={ws.field}>
                <label htmlFor="description">About the role</label>
                <textarea
                  id="description"
                  className={ws.textarea}
                  required
                  rows={8}
                  placeholder="Mission, responsibilities, and what success looks like in the first 90 days."
                  value={form.description}
                  onChange={(e) => onChange({ ...form, description: e.target.value })}
                />
              </div>

              <aside className={ws.campaignGuidance}>
                <div className={ws.campaignGuidanceHead}>
                  <span className={ws.campaignGuidanceIcon} aria-hidden><IconSpark size={16} /></span>
                  <strong>Writing tips</strong>
                </div>
                <ul className={ws.campaignGuidanceList}>
                  {ROLE_TIPS.map((tip) => (
                    <li key={tip}>{tip}</li>
                  ))}
                </ul>
              </aside>
            </section>
          )}

          {step === 1 && (
            <section className={ws.campaignStepPanel}>
              <div className={ws.fieldRow}>
                <div className={ws.field}>
                  <label htmlFor="city">City</label>
                  <input
                    id="city"
                    className={ws.input}
                    placeholder="Berlin"
                    value={form.city}
                    onChange={(e) => onChange({ ...form, city: e.target.value })}
                  />
                </div>
                <div className={ws.field}>
                  <label htmlFor="location">Region / country</label>
                  <input
                    id="location"
                    className={ws.input}
                    placeholder="Germany"
                    value={form.location}
                    onChange={(e) => onChange({ ...form, location: e.target.value })}
                  />
                </div>
              </div>

              <div className={ws.field}>
                <span className={ws.fieldLabel}>Work arrangement</span>
                <div className={ws.campaignChoiceGrid}>
                  <button
                    type="button"
                    className={!form.isRemote ? ws.campaignChoiceActive : ws.campaignChoice}
                    onClick={() => onChange({ ...form, isRemote: false })}
                  >
                    <strong>On-site / hybrid</strong>
                    <span>Team meets in person or blends remote days</span>
                  </button>
                  <button
                    type="button"
                    className={form.isRemote ? ws.campaignChoiceActive : ws.campaignChoice}
                    onClick={() => onChange({ ...form, isRemote: true })}
                  >
                    <strong>Remote-friendly</strong>
                    <span>Open to candidates working from anywhere</span>
                  </button>
                </div>
              </div>

              <div className={ws.field}>
                <span className={ws.fieldLabel}>Category</span>
                <div className={ws.pillRow}>
                  <button
                    type="button"
                    className={form.category === JobCategory.It ? ws.pillActive : ws.pill}
                    onClick={() => onChange({ ...form, category: JobCategory.It })}
                  >
                    IT
                  </button>
                  <button
                    type="button"
                    className={form.category === JobCategory.Gig ? ws.pillActive : ws.pill}
                    onClick={() => onChange({ ...form, category: JobCategory.Gig })}
                  >
                    Gig / contract
                  </button>
                </div>
              </div>

              <div className={ws.field}>
                <label htmlFor="level">Seniority</label>
                <select
                  id="level"
                  className={ws.select}
                  value={form.level}
                  onChange={(e) => onChange({ ...form, level: Number(e.target.value) })}
                >
                  <option value={JobLevel.Internship}>Internship</option>
                  <option value={JobLevel.Junior}>Junior</option>
                  <option value={JobLevel.MidLevel}>Mid-Level</option>
                  <option value={JobLevel.NotApplicable}>Not specified</option>
                </select>
              </div>
            </section>
          )}

          {step === 2 && (
            <section className={ws.campaignStepPanel}>
              <div className={ws.fieldRow}>
                <div className={ws.field}>
                  <label htmlFor="salaryMin">Minimum (annual)</label>
                  <input
                    id="salaryMin"
                    className={ws.input}
                    type="number"
                    min="0"
                    placeholder="65000"
                    value={form.salaryMin}
                    onChange={(e) => onChange({ ...form, salaryMin: e.target.value })}
                  />
                </div>
                <div className={ws.field}>
                  <label htmlFor="salaryMax">Maximum (annual)</label>
                  <input
                    id="salaryMax"
                    className={ws.input}
                    type="number"
                    min="0"
                    placeholder="85000"
                    value={form.salaryMax}
                    onChange={(e) => onChange({ ...form, salaryMax: e.target.value })}
                  />
                </div>
              </div>

              <div className={ws.field}>
                <ImageDropZone
                  label="Campaign cover image"
                  hint="Upload or paste a URL. Leave blank for a branded auto cover based on your role title."
                  value={form.coverImageUrl}
                  onChange={(coverImageUrl) => onChange({ ...form, coverImageUrl })}
                  aspect="banner"
                />
              </div>

              <aside className={ws.campaignGuidance}>
                <div className={ws.campaignGuidanceHead}>
                  <span className={ws.campaignGuidanceIcon} aria-hidden><IconSpark size={16} /></span>
                  <strong>Branding note</strong>
                </div>
                <p className={ws.campaignGuidanceBody}>
                  Your company profile logo and story appear alongside every campaign.
                  {company ? (
                    <> Candidates see listings from <strong>{company.name}</strong> in discover.</>
                  ) : (
                    ' Complete your company profile to strengthen employer branding.'
                  )}
                </p>
              </aside>
            </section>
          )}

          {step === 3 && (
            <section className={ws.campaignStepPanel}>
              <div className={ws.campaignReviewSummary}>
                <div className={ws.campaignReviewBlock}>
                  <h3 className={ws.campaignReviewTitle}>Role</h3>
                  <p className={ws.campaignReviewValue}>{form.title || '—'}</p>
                  <p className={ws.campaignReviewBody}>{form.description || '—'}</p>
                </div>
                <div className={ws.campaignReviewBlock}>
                  <h3 className={ws.campaignReviewTitle}>Details</h3>
                  <p className={ws.campaignReviewValue}>
                    {[form.city, form.location].filter(Boolean).join(', ') || (form.isRemote ? 'Remote' : 'Not set')}
                    {' · '}
                    {form.isRemote ? 'Remote-friendly' : 'On-site / hybrid'}
                    {' · '}
                    {form.category === JobCategory.Gig ? 'Gig' : 'IT'}
                  </p>
                </div>
                <div className={ws.campaignReviewBlock}>
                  <h3 className={ws.campaignReviewTitle}>Compensation</h3>
                  <p className={ws.campaignReviewValue}>
                    {form.salaryMin || form.salaryMax
                      ? `${form.salaryMin || '—'} – ${form.salaryMax || '—'} (annual)`
                      : 'Not listed — consider adding a range'}
                  </p>
                </div>
              </div>

              {editingId && (
                <label className={ws.checkboxRow}>
                  <input
                    type="checkbox"
                    checked={form.isActive}
                    onChange={(e) => onChange({ ...form, isActive: e.target.checked })}
                  />
                  Active listing
                </label>
              )}

              <aside className={ws.campaignLaunchNote}>
                <strong>What happens when you publish</strong>
                <p>
                  Your campaign goes live immediately for approved companies. Candidates can discover,
                  save, and apply — and you'll manage them from your pipeline.
                </p>
                <p className={ws.campaignLaunchScore}>
                  Campaign strength: <span>{readiness.score}%</span>
                </p>
              </aside>
            </section>
          )}

          <div className={ws.campaignStepActions}>
            <button type="button" className={ws.btnGhost} onClick={goBack}>
              <IconChevronLeft size={16} />
              {step === 0 ? 'Cancel' : 'Back'}
            </button>
            {!isLastStep ? (
              <button
                type="button"
                className={ws.btnPrimary}
                disabled={!canAdvanceStep(step, form)}
                onClick={goNext}
              >
                Continue
                <IconChevronRight size={16} />
              </button>
            ) : (
              <button
                type="button"
                className={ws.btnPrimary}
                disabled={saving || !canAdvanceStep(0, form)}
                onClick={onSubmit}
              >
                {saving ? 'Publishing…' : editingId ? 'Update campaign' : 'Publish campaign'}
              </button>
            )}
          </div>
        </div>

        <JobCampaignPreviewPanel form={form} company={company} step={step} />
      </div>
    </div>
  );
}

export type { JobCampaignFormState } from '@/lib/jobCampaignPreview';