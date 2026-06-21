/**
 * Employer portal product architecture — hiring workspace mental model.
 *
 * Core workflow routes:
 * - Today (action queues)
 * - Pipeline (board + list)
 * - Inbox (conversations)
 * - Candidate profile (detail)
 *
 * Supporting: Roles, Company, Settings
 */

export const EMPLOYER_CORE_ROUTES = [
  '/portal',
  '/portal/pipeline',
  '/portal/messages',
  '/portal/applications',
] as const;

export const EMPLOYER_SUPPORT_ROUTES = [
  '/portal/jobs',
  '/portal/company',
  '/portal/settings',
] as const;
