import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { InstallAppButton } from '@/components/pwa/InstallAppButton';
import { ProfileCompletionCard } from '@/components/profile/ProfileCompletionCard';
import { ProfileImageUpload } from '@/components/profile/ProfileImageUpload';
import { UserAvatar } from '@/components/profile/UserAvatar';
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
import type { ProfileSuggestionId } from '@/lib/profileSuggestions';
import { getProfileDisplayName } from '@/models/userProfile';
import type { ProfileVisibilityLevel, WorkArrangement } from '@/models/userProfile';
import styles from './ProfilePage.module.css';

type SectionId = 'profile' | 'preferences' | 'notifications' | 'privacy' | 'account' | 'app';
type EditPanel = 'identity' | 'skills' | 'experience' | 'education' | 'portfolio' | 'resume' | null;

const SECTIONS: { id: SectionId; label: string }[] = [
  { id: 'profile', label: 'Profile' },
  { id: 'preferences', label: 'Preferences' },
  { id: 'notifications', label: 'Notifications' },
  { id: 'privacy', label: 'Privacy' },
  { id: 'account', label: 'Account' },
  { id: 'app', label: 'App' },
];

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className={styles.field}>
      <span className={styles.fieldLabel}>{label}</span>
      {children}
    </label>
  );
}

function formatYearRange(start?: string, end?: string, isCurrent?: boolean) {
  const year = (d?: string) => (d ? new Date(d).getFullYear().toString() : '');
  const s = year(start);
  const e = isCurrent ? 'Present' : year(end);
  if (s && e) return `${s} – ${e}`;
  return s || e || '';
}

export function JobSeekerProfilePage() {
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
  const { showToast } = useToast();

  const [form, setForm] = useState<ProfileFormState | null>(null);
  const [activeSection, setActiveSection] = useState<SectionId>('profile');
  const [editPanel, setEditPanel] = useState<EditPanel>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const identityRef = useRef<HTMLDivElement>(null);
  const skillsRef = useRef<HTMLDivElement>(null);
  const experienceRef = useRef<HTMLDivElement>(null);
  const resumeRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!profile) return;
    setForm(profileToFormState(profile));
  }, [profile?.id, profile?.updatedAt]);

  const save = useCallback(async (partial?: Partial<ProfileFormState>, message = 'Profile saved') => {
    if (!form) return;
    const merged = { ...form, ...partial };
    setForm(merged);
    try {
      await updateProfile(formStateToPayload(merged));
      showToast(message, 'success');
      setEditPanel(null);
    } catch (e) {
      showToast(getApiErrorMessage(e, 'Save failed'), 'error');
    }
  }, [form, updateProfile, showToast]);

  const patchForm = (patch: Partial<ProfileFormState>) => {
    setForm((prev) => (prev ? { ...prev, ...patch } : prev));
  };

  const handleSuggestion = (id: ProfileSuggestionId) => {
    setActiveSection('profile');
    if (id === 'photo' || id === 'headline') {
      setEditPanel('identity');
      identityRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }
    if (id === 'skills') {
      setEditPanel('skills');
      skillsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }
    if (id === 'experience') {
      setEditPanel('experience');
      experienceRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }
    if (id === 'resume') {
      setEditPanel('resume');
      resumeRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const filledSkills = useMemo(
    () => form?.skills.filter((s) => s.name.trim()) ?? [],
    [form?.skills],
  );
  const filledExperiences = useMemo(
    () => form?.experiences.filter((e) => e.company.trim() || e.title.trim()) ?? [],
    [form?.experiences],
  );
  const filledEducations = useMemo(
    () => form?.educations.filter((e) => e.institution.trim() || e.degree.trim()) ?? [],
    [form?.educations],
  );

  if (loading || !form || !profile) {
    return (
      <section className={styles.page}>
        <ProfileSkeleton />
      </section>
    );
  }

  const displayName = getProfileDisplayName(profile) || 'Your profile';

  return (
    <section className={styles.page}>
      <div className={styles.identityBanner} aria-hidden />
      <header className={styles.identityCard} ref={identityRef}>
        <div className={styles.identityAvatarWrap}>
          <UserAvatar profile={profile} size="xl" className={styles.identityAvatar} />
        </div>
        <div className={styles.identityBody}>
          <h1 className={styles.name}>{displayName}</h1>
          <p className={styles.headline}>
            {form.headline.trim() || 'Add a professional headline'}
          </p>
          <p className={styles.meta}>
            {form.location.trim() ? `📍 ${form.location}` : 'Add your location'}
          </p>
          <div className={styles.identityActions}>
            <button type="button" className={styles.editBtn} onClick={() => setEditPanel(editPanel === 'identity' ? null : 'identity')}>
              {editPanel === 'identity' ? 'Close' : 'Edit intro'}
            </button>
          </div>
        </div>
      </header>

      <ProfileCompletionCard profile={profile} onAction={handleSuggestion} />

      <nav className={styles.sectionNav} aria-label="Profile sections">
        {SECTIONS.map((section) => (
          <button
            key={section.id}
            type="button"
            className={`${styles.sectionTab} ${activeSection === section.id ? styles.sectionTabActive : ''}`}
            onClick={() => { setActiveSection(section.id); setEditPanel(null); }}
          >
            {section.label}
          </button>
        ))}
      </nav>

      {activeSection === 'profile' && (
        <div className={styles.identityStack}>
          {editPanel === 'identity' && (
            <div className={styles.panel}>
              <h2 className={styles.panelTitle}>Edit intro</h2>
              <ProfileImageUpload
                profile={profile}
                uploading={saving}
                uploadProgress={uploadProgress}
                onUpload={async (file) => {
                  setUploadProgress(0);
                  await uploadAvatar(file, setUploadProgress);
                  showToast('Profile photo updated', 'success');
                }}
                onRemove={async () => {
                  await removeAvatar();
                  showToast('Profile photo removed', 'success');
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
                <input value={form.location} onChange={(e) => patchForm({ location: e.target.value })} placeholder="City, country" />
              </Field>
              <Field label="About">
                <textarea rows={4} value={form.bio} onChange={(e) => patchForm({ bio: e.target.value })} placeholder="Tell employers about your background and goals…" />
              </Field>
              <button type="button" className={styles.saveBtn} disabled={saving} onClick={() => void save(undefined, 'Intro saved')}>
                {saving ? 'Saving…' : 'Save intro'}
              </button>
            </div>
          )}

          <article className={styles.sectionCard}>
            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle}>About</h2>
              <button type="button" className={styles.sectionEdit} onClick={() => setEditPanel('identity')}>Edit</button>
            </div>
            {form.bio.trim() ? (
              <p className={styles.aboutText}>{form.bio}</p>
            ) : (
              <p className={styles.placeholderText}>Share a short summary of your experience, strengths, and what you&apos;re looking for next.</p>
            )}
          </article>

          <article className={styles.sectionCard} ref={skillsRef}>
            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle}>Skills</h2>
              <button type="button" className={styles.sectionEdit} onClick={() => setEditPanel(editPanel === 'skills' ? null : 'skills')}>
                {editPanel === 'skills' ? 'Close' : filledSkills.length ? 'Edit' : 'Add'}
              </button>
            </div>
            {editPanel === 'skills' ? (
              <div className={styles.editBlock}>
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
                <button type="button" className={styles.saveBtn} disabled={saving} onClick={() => void save(undefined, 'Skills saved')}>{saving ? 'Saving…' : 'Save skills'}</button>
              </div>
            ) : filledSkills.length > 0 ? (
              <div className={styles.chips}>
                {filledSkills.map((s, i) => (
                  <span key={i} className={styles.chip}>{s.name}{s.level ? ` · ${s.level}` : ''}</span>
                ))}
              </div>
            ) : (
              <p className={styles.placeholderText}>Highlight technologies and strengths employers search for.</p>
            )}
          </article>

          <article className={styles.sectionCard} ref={experienceRef}>
            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle}>Experience</h2>
              <button type="button" className={styles.sectionEdit} onClick={() => setEditPanel(editPanel === 'experience' ? null : 'experience')}>
                {editPanel === 'experience' ? 'Close' : filledExperiences.length ? 'Edit' : 'Add'}
              </button>
            </div>
            {editPanel === 'experience' ? (
              <div className={styles.editBlock}>
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
                <button type="button" className={styles.saveBtn} disabled={saving} onClick={() => void save(undefined, 'Experience saved')}>{saving ? 'Saving…' : 'Save experience'}</button>
              </div>
            ) : filledExperiences.length > 0 ? (
              <ul className={styles.timeline}>
                {filledExperiences.map((ex, i) => (
                  <li key={i} className={styles.timelineItem}>
                    <div className={styles.timelineDot} aria-hidden />
                    <div>
                      <p className={styles.timelineTitle}>{ex.title}</p>
                      <p className={styles.timelineSubtitle}>{ex.company}</p>
                      {ex.description && <p className={styles.timelineDesc}>{ex.description}</p>}
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className={styles.placeholderText}>Add roles to show your career progression.</p>
            )}
          </article>

          <article className={styles.sectionCard}>
            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle}>Education</h2>
              <button type="button" className={styles.sectionEdit} onClick={() => setEditPanel(editPanel === 'education' ? null : 'education')}>
                {editPanel === 'education' ? 'Close' : filledEducations.length ? 'Edit' : 'Add'}
              </button>
            </div>
            {editPanel === 'education' ? (
              <div className={styles.editBlock}>
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
                <button type="button" className={styles.saveBtn} disabled={saving} onClick={() => void save(undefined, 'Education saved')}>{saving ? 'Saving…' : 'Save education'}</button>
              </div>
            ) : filledEducations.length > 0 ? (
              <ul className={styles.timeline}>
                {filledEducations.map((ed, i) => (
                  <li key={i} className={styles.timelineItem}>
                    <div className={styles.timelineDot} aria-hidden />
                    <div>
                      <p className={styles.timelineTitle}>{ed.degree}{ed.fieldOfStudy ? ` · ${ed.fieldOfStudy}` : ''}</p>
                      <p className={styles.timelineSubtitle}>{ed.institution}</p>
                      <p className={styles.timelineMeta}>{formatYearRange(ed.startDate, ed.endDate, ed.isCurrent)}</p>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className={styles.placeholderText}>List degrees, certifications, or training programs.</p>
            )}
          </article>

          <article className={styles.sectionCard}>
            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle}>Portfolio links</h2>
              <button type="button" className={styles.sectionEdit} onClick={() => setEditPanel(editPanel === 'portfolio' ? null : 'portfolio')}>
                {editPanel === 'portfolio' ? 'Close' : 'Edit'}
              </button>
            </div>
            {editPanel === 'portfolio' ? (
              <div className={styles.editBlock}>
                <Field label="LinkedIn">
                  <input value={form.linkedInUrl} onChange={(e) => patchForm({ linkedInUrl: e.target.value })} placeholder="https://linkedin.com/in/..." />
                </Field>
                <Field label="GitHub">
                  <input value={form.gitHubUrl} onChange={(e) => patchForm({ gitHubUrl: e.target.value })} placeholder="https://github.com/..." />
                </Field>
                <Field label="Website">
                  <input value={form.websiteUrl} onChange={(e) => patchForm({ websiteUrl: e.target.value })} placeholder="https://..." />
                </Field>
                <button type="button" className={styles.saveBtn} disabled={saving} onClick={() => void save(undefined, 'Links saved')}>{saving ? 'Saving…' : 'Save links'}</button>
              </div>
            ) : (
              <ul className={styles.linkList}>
                {form.linkedInUrl.trim() && <li><a href={form.linkedInUrl} target="_blank" rel="noopener noreferrer">LinkedIn</a></li>}
                {form.gitHubUrl.trim() && <li><a href={form.gitHubUrl} target="_blank" rel="noopener noreferrer">GitHub</a></li>}
                {form.websiteUrl.trim() && <li><a href={form.websiteUrl} target="_blank" rel="noopener noreferrer">Website</a></li>}
                {!form.linkedInUrl.trim() && !form.gitHubUrl.trim() && !form.websiteUrl.trim() && (
                  <li className={styles.placeholderText}>Add LinkedIn, GitHub, or a portfolio site.</li>
                )}
              </ul>
            )}
          </article>

          <article className={styles.sectionCard} ref={resumeRef}>
            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle}>Resume</h2>
              <button type="button" className={styles.sectionEdit} onClick={() => setEditPanel(editPanel === 'resume' ? null : 'resume')}>
                {editPanel === 'resume' ? 'Close' : profile.resumeFileName ? 'Replace' : 'Upload'}
              </button>
            </div>
            {editPanel === 'resume' ? (
              <div className={styles.editBlock}>
                <label className={styles.uploadZone}>
                  <input
                    type="file"
                    accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                    hidden
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      setUploadProgress(0);
                      try {
                        await uploadResume(file, setUploadProgress);
                        showToast('Resume uploaded', 'success');
                        setEditPanel(null);
                      } catch (err) {
                        showToast(getApiErrorMessage(err, 'Upload failed'), 'error');
                      }
                    }}
                  />
                  {saving ? `Uploading… ${uploadProgress}%` : 'Choose PDF or Word document (max 512 KB)'}
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
              </div>
            ) : profile.resumeFileName ? (
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
              <p className={styles.placeholderText}>Upload your CV so employers can review your background.</p>
            )}
          </article>
        </div>
      )}

      {activeSection === 'preferences' && (
        <div className={styles.panel}>
          <h2 className={styles.panelTitle}>Job preferences</h2>
          <div className={styles.grid2}>
            <Field label="Desired salary min ($/mo)">
              <input inputMode="numeric" value={form.desiredSalaryMin} onChange={(e) => patchForm({ desiredSalaryMin: e.target.value })} />
            </Field>
            <Field label="Desired salary max ($/mo)">
              <input inputMode="numeric" value={form.desiredSalaryMax} onChange={(e) => patchForm({ desiredSalaryMax: e.target.value })} />
            </Field>
          </div>
          <Field label="Preferred locations">
            <input value={form.preferredLocations} onChange={(e) => patchForm({ preferredLocations: e.target.value })} placeholder="Tashkent, Remote, Berlin" />
          </Field>
          <Field label="Work arrangement">
            <select value={form.workArrangement} onChange={(e) => patchForm({ workArrangement: e.target.value as WorkArrangement })}>
              <option value="Any">Any</option>
              <option value="Remote">Remote</option>
              <option value="Hybrid">Hybrid</option>
              <option value="Onsite">On-site</option>
            </select>
          </Field>
          <button type="button" className={styles.saveBtn} disabled={saving} onClick={() => void save(undefined, 'Preferences saved')}>
            {saving ? 'Saving…' : 'Save preferences'}
          </button>
        </div>
      )}

      {activeSection === 'notifications' && (
        <div className={styles.panel}>
          <h2 className={styles.panelTitle}>Notifications</h2>
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
          <button type="button" className={styles.saveBtn} disabled={saving} onClick={() => void save(undefined, 'Notification settings saved')}>
            {saving ? 'Saving…' : 'Save notifications'}
          </button>
        </div>
      )}

      {activeSection === 'privacy' && (
        <div className={styles.panel}>
          <h2 className={styles.panelTitle}>Privacy</h2>
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
          <p className={styles.panelHint}>Control who can see your profile and contact details when applying.</p>
          <button type="button" className={styles.saveBtn} disabled={saving} onClick={() => void save(undefined, 'Privacy settings saved')}>
            {saving ? 'Saving…' : 'Save privacy'}
          </button>
        </div>
      )}

      {activeSection === 'account' && (
        <div className={styles.panel}>
          <h2 className={styles.panelTitle}>Account</h2>
          <div className={styles.readOnlyRow}>
            <span>Email</span>
            <strong>{form.email}</strong>
          </div>
          <p className={styles.panelHint}>Email is tied to your login and cannot be changed here.</p>
          <Link to="/account" className={styles.linkBtn}>Change password & sign out</Link>
        </div>
      )}

      {activeSection === 'app' && (
        <div className={styles.panel}>
          <h2 className={styles.panelTitle}>App</h2>
          <InstallAppButton variant="full" showFallback />
          <p className={styles.panelHint}>SwipeJobs v{import.meta.env.VITE_APP_VERSION ?? '0.1.0'}</p>
          <Link to="/settings" className={styles.linkBtn}>Help & app settings</Link>
        </div>
      )}
    </section>
  );
}
