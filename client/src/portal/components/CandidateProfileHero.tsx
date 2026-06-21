import { IconChevronRight, IconMapPin } from '@/components/icons/Icons';
import { CandidateTrustBadge } from '@/components/portal/CandidateTrustBadge';
import { UserAvatar } from '@/components/profile/UserAvatar';
import { RecruiterStarRating } from '@/portal/components/RecruiterStarRating';
import {
  estimateYearsExperience,
  getApplicantCompleteness,
  getApplicantProofLinks,
} from '@/lib/candidateProfileMeta';
import { formatJobSeekingStatus } from '@/lib/jobSeekingStatus';
import { ApplicationStatusLabels } from '@/models/enums';
import type { PortalApplicantDetail } from '@/models/portalApplicant';
import ws from '@/portal/workspace.module.css';

interface CandidateProfileHeroProps {
  applicant: PortalApplicantDetail;
  onRatingChange?: (rating: number | null) => void;
  onFavoriteToggle?: () => void;
  ratingBusy?: boolean;
}

export function CandidateProfileHero({
  applicant,
  onRatingChange,
  onFavoriteToggle,
  ratingBusy = false,
}: CandidateProfileHeroProps) {
  const fullName = `${applicant.firstName} ${applicant.lastName}`.trim() || 'Candidate';
  const yearsExp = estimateYearsExperience(applicant.experiences);
  const completeness = getApplicantCompleteness(applicant);
  const proofLinks = getApplicantProofLinks(applicant);
  const isFavorite = applicant.isFavorite ?? false;

  return (
    <header className={ws.candidateHero}>
      <div className={ws.candidateHeroBanner} aria-hidden />
      <div className={ws.candidateHeroBody}>
        <UserAvatar
          profile={{
            firstName: applicant.firstName,
            lastName: applicant.lastName,
            email: applicant.email,
            profileImageUrl: applicant.profileImageUrl,
          }}
          size="lg"
          className={ws.candidateHeroAvatar}
        />
        <div className={ws.candidateHeroMain}>
          <div className={ws.candidateHeroTop}>
            <div>
              <p className={ws.candidateHeroEyebrow}>
                Application #{applicant.applicationNumber}
                {applicant.reapplicationCount > 0 ? ` · ${applicant.reapplicationCount + 1}× applicant` : ''}
              </p>
              <h1 className={ws.candidateHeroName}>{fullName}</h1>
              {applicant.headline && (
                <p className={ws.candidateHeroHeadline}>{applicant.headline}</p>
              )}
              <div className={ws.candidateHeroMeta}>
                <CandidateTrustBadge
                  level={applicant.candidateTrustLevel}
                  signals={applicant.candidateTrustSignals}
                />
                <span className={ws.candidateHeroMetaText}>
                  {formatJobSeekingStatus(applicant.jobSeekingStatus)}
                </span>
                {applicant.location && (
                  <span className={ws.candidateHeroMetaText}>
                    <IconMapPin size={14} /> {applicant.location}
                  </span>
                )}
              </div>
            </div>
            <div className={ws.candidateHeroEval}>
              {onRatingChange && (
                <RecruiterStarRating
                  value={applicant.recruiterRating}
                  disabled={ratingBusy}
                  onChange={onRatingChange}
                />
              )}
              {onFavoriteToggle && (
                <button
                  type="button"
                  className={[ws.favoriteToggle, isFavorite ? ws.favoriteToggleActive : ''].filter(Boolean).join(' ')}
                  disabled={ratingBusy}
                  onClick={onFavoriteToggle}
                >
                  {isFavorite ? '★ Favorited' : '☆ Favorite'}
                </button>
              )}
            </div>
          </div>

          <div className={ws.candidateStatStrip}>
            <div className={ws.candidateStat}>
              <span className={ws.candidateStatLabel}>Experience</span>
              <span className={ws.candidateStatValue}>
                {yearsExp != null ? `${yearsExp}+ yrs` : applicant.experiences.length > 0 ? `${applicant.experiences.length} roles` : '—'}
              </span>
            </div>
            <div className={ws.candidateStat}>
              <span className={ws.candidateStatLabel}>Skills</span>
              <span className={ws.candidateStatValue}>{applicant.skills.length || '—'}</span>
            </div>
            <div className={ws.candidateStat}>
              <span className={ws.candidateStatLabel}>Profile strength</span>
              <span className={`${ws.candidateStatValue} ${ws.candidateStatAccent}`}>{completeness.score}%</span>
            </div>
            <div className={ws.candidateStat}>
              <span className={ws.candidateStatLabel}>Stage</span>
              <span className={ws.candidateStatValue}>{ApplicationStatusLabels[applicant.status]}</span>
            </div>
          </div>

          {proofLinks.length > 0 && (
            <div className={ws.candidateProofRow}>
              {proofLinks.map((link) => (
                <a
                  key={link.id}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={ws.candidateProofLink}
                >
                  {link.label} <IconChevronRight size={14} />
                </a>
              ))}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
