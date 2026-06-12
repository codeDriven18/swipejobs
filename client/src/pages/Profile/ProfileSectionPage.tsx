import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ProfileAppPanel } from '@/components/profile/ProfileAppPanel';
import { ProfileImageUpload } from '@/components/profile/ProfileImageUpload';
import { ProfileSkeleton } from '@/components/ui/Skeleton';
import { useToast } from '@/context/ToastContext';
import { useProfile } from '@/hooks/useProfile';
import {
  emptyEducation,
  emptyExperience,
  emptySkill,
  formStateToPayload,
  profileToFormState,
  type ProfileFormState,
} from '@/lib/profileForm';
import { getApiErrorMessage } from '@/lib/apiErrors';
import type { ProfileVisibilityLevel, WorkArrangement } from '@/models/userProfile';
import styles from './ProfilePage.module.css';

const SECTION_TITLES: Record<string, string> = {
  details: 'Profile',
  resume: 'Resume',
  skills: 'Skills',
  experience: 'Experience',
  education: 'Education',
  preferences: 'Job preferences',
  notifications: 'Notifications',
  privacy: 'Privacy',
  app: 'App',
};

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className={styles.field}>
      <span className={styles.fieldLabel}>{label}</span>
      {children}
    </label>
  );
}

export function ProfileSectionPage() {
  const { section = 'details' } = useParams<{ section: string }>();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const {
    profile,
    loading,
    saving,
    updateProfile,
    uploadAvatar,
    removeAvatar,
    uploadResume,
    removeResume,
  } = useProfile();

  const [form, setForm] = useState<ProfileFormState | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);

  useEffect(() => {
    if (!profile) return;
    setForm(profileToFormState(profile));
  }, [profile?.id, profile?.updatedAt]);

  const save = useCallback(async (message = 'Saved') => {
    if (!form) return;
    try {
      await updateProfile(formStateToPayload(form));
      showToast(message, 'success');
    } catch (e) {
      showToast(getApiErrorMessage(e, 'Save failed'), 'error');
    }
  }, [form, updateProfile, showToast]);

  const patchForm = (patch: Partial<ProfileFormState>) => {
    setForm((prev) => (prev ? { ...prev, ...patch } : prev));
  };

  if (loading || !form || !profile) {
    return (
      <section className={styles.page}>
        <ProfileSkeleton />
      </section>
    );
  }

  if (!SECTION_TITLES[section]) {
    return (
      <section className={styles.page}>
        <div className={styles.panel}>
          <p>Section not found.</p>
          <Link to="/profile" className={styles.linkBtn}>Back to profile</Link>
        </div>
      </section>
    );
  }

  const title = SECTION_TITLES[section];

  return (
    <section className={styles.page}>
      <header className={styles.sectionPageHeader}>
        <Link to="/profile" className={styles.backLink}>← Profile</Link>
        <h1 className={styles.sectionPageTitle}>{title}</h1>
      </header>

      <div className={styles.panel}>
        {section === 'details' && (
          <>
            <ProfileImageUpload
              profile={profile}
              uploading={saving}
              uploadProgress={uploadProgress}
              onUpload={async (file) => {
                setUploadProgress(0);
                await uploadAvatar(file, setUploadProgress);
                showToast('Photo updated', 'success');
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
              <input value={form.headline} onChange={(e) => patchForm({ headline: e.target.value })} placeholder="e.g. Senior Frontend Developer" />
            </Field>
            <Field label="Location">
              <input value={form.location} onChange={(e) => patchForm({ location: e.target.value })} />
            </Field>
            <Field label="Phone">
              <input value={form.phone} onChange={(e) => patchForm({ phone: e.target.value })} />
            </Field>
            <Field label="About">
              <textarea rows={5} value={form.bio} onChange={(e) => patchForm({ bio: e.target.value })} />
            </Field>
            <Field label="LinkedIn">
              <input value={form.linkedInUrl} onChange={(e) => patchForm({ linkedInUrl: e.target.value })} />
            </Field>
            <Field label="GitHub">
              <input value={form.gitHubUrl} onChange={(e) => patchForm({ gitHubUrl: e.target.value })} />
            </Field>
            <Field label="Website">
              <input value={form.websiteUrl} onChange={(e) => patchForm({ websiteUrl: e.target.value })} />
            </Field>
            <button type="button" className={styles.saveBtn} disabled={saving} onClick={() => void save('Profile saved')}>
              {saving ? 'Saving…' : 'Save profile'}
            </button>
          </>
        )}

        {section === 'resume' && (
          <>
            {profile.resumeFileName ? (
              <div className={styles.resumeStatus}>
                <span className={styles.resumeIcon} aria-hidden>📄</span>
                <div>
                  <p className={styles.resumeName}>{profile.resumeFileName}</p>
                  {profile.resumeUploadedAt && (
                    <p className={styles.resumeDate}>Uploaded {new Date(profile.resumeUploadedAt).toLocaleDateString()}</p>
                  )}
                </div>
              </div>
            ) : (
              <p className={styles.placeholderText}>No resume uploaded yet.</p>
            )}
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
              {saving ? `Uploading… ${uploadProgress}%` : profile.resumeFileName ? 'Replace resume' : 'Upload resume (PDF or Word)'}
            </label>
            {profile.resumeFileName && (
              <button type="button" className={styles.ghostBtn} disabled={saving} onClick={async () => {
                try {
                  await removeResume();
                  showToast('Resume removed', 'success');
                } catch (err) {
                  showToast(getApiErrorMessage(err, 'Remove failed'), 'error');
                }
              }}>Remove resume</button>
            )}
          </>
        )}

        {section === 'skills' && (
          <>
            {form.skills.map((sk, i) => (
              <div key={i} className={styles.grid2}>
                <input placeholder="Skill" value={sk.name} onChange={(e) => {
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
            <button type="button" className={styles.saveBtn} disabled={saving} onClick={() => void save('Skills saved')}>{saving ? 'Saving…' : 'Save skills'}</button>
          </>
        )}

        {section === 'experience' && (
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
                <textarea placeholder="Description" rows={2} value={ex.description ?? ''} onChange={(e) => {
                  const experiences = [...form.experiences];
                  experiences[i] = { ...ex, description: e.target.value };
                  patchForm({ experiences });
                }} />
              </div>
            ))}
            <button type="button" className={styles.ghostBtn} onClick={() => patchForm({ experiences: [...form.experiences, emptyExperience()] })}>+ Add experience</button>
            <button type="button" className={styles.saveBtn} disabled={saving} onClick={() => void save('Experience saved')}>{saving ? 'Saving…' : 'Save experience'}</button>
          </>
        )}

        {section === 'education' && (
          <>
            {form.educations.map((ed, i) => (
              <div key={i} className={styles.block}>
                <input placeholder="Institution" value={ed.institution} onChange={(e) => {
                  const educations = [...form.educations];
                  educations[i] = { ...ed, institution: e.target.value };
                  patchForm({ educations });
                }} />
                <input placeholder="Degree" value={ed.degree} onChange={(e) => {
                  const educations = [...form.educations];
                  educations[i] = { ...ed, degree: e.target.value };
                  patchForm({ educations });
                }} />
                <input placeholder="Field of study" value={ed.fieldOfStudy ?? ''} onChange={(e) => {
                  const educations = [...form.educations];
                  educations[i] = { ...ed, fieldOfStudy: e.target.value };
                  patchForm({ educations });
                }} />
              </div>
            ))}
            <button type="button" className={styles.ghostBtn} onClick={() => patchForm({ educations: [...form.educations, emptyEducation()] })}>+ Add education</button>
            <button type="button" className={styles.saveBtn} disabled={saving} onClick={() => void save('Education saved')}>{saving ? 'Saving…' : 'Save education'}</button>
          </>
        )}

        {section === 'preferences' && (
          <>
            <div className={styles.grid2}>
              <Field label="Desired salary min ($/mo)">
                <input inputMode="numeric" value={form.desiredSalaryMin} onChange={(e) => patchForm({ desiredSalaryMin: e.target.value })} />
              </Field>
              <Field label="Desired salary max ($/mo)">
                <input inputMode="numeric" value={form.desiredSalaryMax} onChange={(e) => patchForm({ desiredSalaryMax: e.target.value })} />
              </Field>
            </div>
            <Field label="Preferred locations">
              <input value={form.preferredLocations} onChange={(e) => patchForm({ preferredLocations: e.target.value })} />
            </Field>
            <Field label="Work arrangement">
              <select value={form.workArrangement} onChange={(e) => patchForm({ workArrangement: e.target.value as WorkArrangement })}>
                <option value="Any">Any</option>
                <option value="Remote">Remote</option>
                <option value="Hybrid">Hybrid</option>
                <option value="Onsite">On-site</option>
              </select>
            </Field>
            <button type="button" className={styles.saveBtn} disabled={saving} onClick={() => void save('Preferences saved')}>{saving ? 'Saving…' : 'Save preferences'}</button>
          </>
        )}

        {section === 'notifications' && (
          <>
            <label className={styles.toggleRow}>
              <span>Email notifications</span>
              <input type="checkbox" checked={form.emailNotifications} onChange={(e) => patchForm({ emailNotifications: e.target.checked })} />
            </label>
            <label className={styles.toggleRow}>
              <span>Push notifications</span>
              <input type="checkbox" checked={form.pushNotifications} onChange={(e) => patchForm({ pushNotifications: e.target.checked })} />
            </label>
            <label className={styles.toggleRow}>
              <span>Job alerts</span>
              <input type="checkbox" checked={form.jobAlerts} onChange={(e) => patchForm({ jobAlerts: e.target.checked })} />
            </label>
            <button type="button" className={styles.saveBtn} disabled={saving} onClick={() => void save('Notifications saved')}>{saving ? 'Saving…' : 'Save notifications'}</button>
          </>
        )}

        {section === 'privacy' && (
          <>
            <Field label="Profile visibility">
              <select value={form.profileVisibility} onChange={(e) => patchForm({ profileVisibility: e.target.value as ProfileVisibilityLevel })}>
                <option value="Public">Public</option>
                <option value="EmployersOnly">Employers only</option>
                <option value="Private">Private</option>
              </select>
            </Field>
            <Field label="Contact visibility">
              <select value={form.contactVisibility} onChange={(e) => patchForm({ contactVisibility: e.target.value as ProfileVisibilityLevel })}>
                <option value="Public">Public</option>
                <option value="EmployersOnly">Employers only</option>
                <option value="Private">Private</option>
              </select>
            </Field>
            <button type="button" className={styles.saveBtn} disabled={saving} onClick={() => void save('Privacy saved')}>{saving ? 'Saving…' : 'Save privacy'}</button>
          </>
        )}

        {section === 'app' && <ProfileAppPanel />}
      </div>

      {section !== 'resume' && (
        <button type="button" className={styles.ghostBtn} onClick={() => navigate('/profile')}>
          Back to profile hub
        </button>
      )}
    </section>
  );
}
