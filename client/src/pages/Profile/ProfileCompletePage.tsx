import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ProfileCompletionCard } from '@/components/profile/ProfileCompletionCard';
import { ProfileImageUpload } from '@/components/profile/ProfileImageUpload';
import { ProfileSkeleton } from '@/components/ui/Skeleton';
import { useToast } from '@/context/ToastContext';
import { useProfile } from '@/hooks/useProfile';
import {
  emptyExperience,
  emptySkill,
  formStateToPayload,
  profileToFormState,
  type ProfileFormState,
} from '@/lib/profileForm';
import { getApiErrorMessage } from '@/lib/apiErrors';
import type { ProfileSuggestionId } from '@/lib/profileSuggestions';
import { getProfileCompletionPercent, isProfileSubstantiallyComplete } from '@/lib/profileCompletion';
import styles from './ProfilePage.module.css';

const STEPS = ['intro', 'skills', 'experience', 'resume'] as const;
type Step = (typeof STEPS)[number];

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className={styles.field}>
      <span className={styles.fieldLabel}>{label}</span>
      {children}
    </label>
  );
}

export function ProfileCompletePage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isWelcome = searchParams.get('welcome') === '1';
  const { showToast } = useToast();
  const {
    profile,
    loading,
    saving,
    updateProfile,
    uploadAvatar,
    removeAvatar,
    uploadResume,
  } = useProfile();

  const [form, setForm] = useState<ProfileFormState | null>(null);
  const [step, setStep] = useState<Step>('intro');
  const [uploadProgress, setUploadProgress] = useState(0);

  useEffect(() => {
    if (!profile) return;
    setForm(profileToFormState(profile));
  }, [profile?.id, profile?.updatedAt]);

  useEffect(() => {
    if (loading || !profile || !isWelcome) return;
    if (isProfileSubstantiallyComplete(profile)) {
      navigate('/profile', { replace: true });
    }
  }, [loading, profile, isWelcome, navigate]);

  const stepIndex = STEPS.indexOf(step);
  const percent = useMemo(() => getProfileCompletionPercent(profile), [profile]);

  const save = useCallback(async () => {
    if (!form) return;
    await updateProfile(formStateToPayload(form));
    showToast('Saved', 'success');
  }, [form, updateProfile, showToast]);

  const patchForm = (patch: Partial<ProfileFormState>) => {
    setForm((prev) => (prev ? { ...prev, ...patch } : prev));
  };

  const handleSuggestion = (id: ProfileSuggestionId) => {
    if (id === 'photo' || id === 'headline') setStep('intro');
    else if (id === 'skills') setStep('skills');
    else if (id === 'experience') setStep('experience');
    else if (id === 'resume') setStep('resume');
  };

  const next = async () => {
    try {
      if (step === 'intro' || step === 'skills' || step === 'experience') {
        await save();
      }
      const idx = STEPS.indexOf(step);
      if (idx < STEPS.length - 1) {
        setStep(STEPS[idx + 1]);
      } else {
        navigate('/profile', { replace: true });
      }
    } catch (e) {
      showToast(getApiErrorMessage(e, 'Save failed'), 'error');
    }
  };

  if (loading || !form || !profile) {
    return (
      <section className={styles.page}>
        <ProfileSkeleton />
      </section>
    );
  }

  return (
    <section className={styles.page}>
      <header className={styles.sectionPageHeader}>
        <Link to="/profile" className={styles.backLink}>Skip for now</Link>
        <h1 className={styles.sectionPageTitle}>
          {isWelcome ? 'Welcome — finish your profile' : 'Complete your profile'}
        </h1>
        <p className={styles.panelHint}>
          Step {stepIndex + 1} of {STEPS.length} · {percent}% complete
        </p>
      </header>

      <ProfileCompletionCard profile={profile} onAction={handleSuggestion} />

      <div className={styles.panel}>
        {step === 'intro' && (
          <>
            <p className={styles.panelHint}>
              Hi {form.firstName.trim() || 'there'} — your name from registration is already saved.
            </p>
            <ProfileImageUpload
              profile={profile}
              uploading={saving}
              uploadProgress={uploadProgress}
              onUpload={async (file) => {
                setUploadProgress(0);
                await uploadAvatar(file, setUploadProgress);
                showToast('Photo added', 'success');
              }}
              onRemove={async () => {
                await removeAvatar();
                showToast('Photo removed', 'success');
              }}
            />
            <div className={styles.grid2}>
              <Field label="First name">
                <input value={form.firstName} onChange={(e) => patchForm({ firstName: e.target.value })} />
              </Field>
              <Field label="Last name">
                <input value={form.lastName} onChange={(e) => patchForm({ lastName: e.target.value })} />
              </Field>
            </div>
            <Field label="Headline">
              <input value={form.headline} onChange={(e) => patchForm({ headline: e.target.value })} />
            </Field>
            <Field label="Location">
              <input value={form.location} onChange={(e) => patchForm({ location: e.target.value })} />
            </Field>
            <Field label="About">
              <textarea rows={3} value={form.bio} onChange={(e) => patchForm({ bio: e.target.value })} />
            </Field>
          </>
        )}

        {step === 'skills' && (
          <>
            {form.skills.map((sk, i) => (
              <div key={i} className={styles.grid2}>
                <input value={sk.name} onChange={(e) => {
                  const skills = [...form.skills];
                  skills[i] = { ...sk, name: e.target.value };
                  patchForm({ skills });
                }} />
                <input placeholder="Level" value={sk.level ?? ''} onChange={(e) => {
                  const skills = [...form.skills];
                  skills[i] = { ...sk, level: e.target.value };
                  patchForm({ skills });
                }} />
              </div>
            ))}
            <button type="button" className={styles.ghostBtn} onClick={() => patchForm({ skills: [...form.skills, emptySkill()] })}>+ Add skill</button>
          </>
        )}

        {step === 'experience' && (
          <>
            {form.experiences.map((ex, i) => (
              <div key={i} className={styles.block}>
                <input placeholder="Company" value={ex.company} onChange={(e) => {
                  const experiences = [...form.experiences];
                  experiences[i] = { ...ex, company: e.target.value };
                  patchForm({ experiences });
                }} />
                <input placeholder="Title" value={ex.title} onChange={(e) => {
                  const experiences = [...form.experiences];
                  experiences[i] = { ...ex, title: e.target.value };
                  patchForm({ experiences });
                }} />
              </div>
            ))}
            <button type="button" className={styles.ghostBtn} onClick={() => patchForm({ experiences: [...form.experiences, emptyExperience()] })}>+ Add experience</button>
          </>
        )}

        {step === 'resume' && (
          <>
            <label className={styles.uploadZone}>
              <input
                type="file"
                accept=".pdf,.doc,.docx"
                hidden
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  setUploadProgress(0);
                  try {
                    await uploadResume(file, setUploadProgress);
                    showToast('Resume uploaded', 'success');
                  } catch (err) {
                    showToast(getApiErrorMessage(err, 'Upload failed'), 'error');
                  }
                }}
              />
              {saving ? `Uploading… ${uploadProgress}%` : 'Upload resume (optional)'}
            </label>
            {profile.resumeFileName && (
              <p className={styles.panelHint}>Uploaded: {profile.resumeFileName}</p>
            )}
          </>
        )}

        <div className={styles.wizardActions}>
          {stepIndex > 0 && (
            <button type="button" className={styles.ghostBtn} onClick={() => setStep(STEPS[stepIndex - 1])}>
              Back
            </button>
          )}
          <button type="button" className={styles.saveBtn} disabled={saving} onClick={() => void next()}>
            {saving ? 'Saving…' : step === 'resume' ? 'Finish' : 'Continue'}
          </button>
        </div>
      </div>
    </section>
  );
}
