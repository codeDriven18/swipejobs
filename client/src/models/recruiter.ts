export interface RecruiterTag {
  id: string;
  name: string;
}

export enum RecruiterActivityType {
  Applied = 0,
  Reviewed = 1,
  Shortlisted = 2,
  InterviewScheduled = 3,
  InterviewCompleted = 4,
  Rejected = 5,
  Hired = 6,
  OfferSent = 7,
  NoteAdded = 8,
  RatingChanged = 9,
  TagAdded = 10,
  TagRemoved = 11,
  FavoriteAdded = 12,
  FavoriteRemoved = 13,
  Withdrawn = 14,
}

export const RecruiterActivityTypeLabels: Record<RecruiterActivityType, string> = {
  [RecruiterActivityType.Applied]: 'Applied',
  [RecruiterActivityType.Reviewed]: 'Reviewed',
  [RecruiterActivityType.Shortlisted]: 'Shortlisted',
  [RecruiterActivityType.InterviewScheduled]: 'Interview scheduled',
  [RecruiterActivityType.InterviewCompleted]: 'Interview completed',
  [RecruiterActivityType.Rejected]: 'Rejected',
  [RecruiterActivityType.Hired]: 'Hired',
  [RecruiterActivityType.OfferSent]: 'Offer sent',
  [RecruiterActivityType.NoteAdded]: 'Note added',
  [RecruiterActivityType.RatingChanged]: 'Rating changed',
  [RecruiterActivityType.TagAdded]: 'Tag added',
  [RecruiterActivityType.TagRemoved]: 'Tag removed',
  [RecruiterActivityType.FavoriteAdded]: 'Marked favorite',
  [RecruiterActivityType.FavoriteRemoved]: 'Removed from favorites',
  [RecruiterActivityType.Withdrawn]: 'Withdrawn',
};

export interface PortalRecruiterNote {
  id: string;
  text: string;
  authorUserId: string;
  createdAt: string;
}

export interface PortalRecruiterActivity {
  type: RecruiterActivityType;
  occurredAt: string;
  userId?: string;
  details?: string;
}
