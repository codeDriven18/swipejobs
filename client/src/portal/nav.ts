import type { ComponentType } from 'react';
import {
  IconBriefcase,
  IconClipboard,
  IconGrid,
  IconSettings,
  IconUser,
} from '@/components/icons/Icons';
import { IconMessages } from '@/components/layout/NavIcons';

export interface WorkspaceNavItem {
  to: string;
  label: string;
  shortLabel?: string;
  end?: boolean;
  icon: ComponentType<{ className?: string }>;
  badgeKey?: 'messages';
}

/** Primary hiring workflow — same source for desktop sidebar and mobile bar. */
export const WORKSPACE_NAV_PRIMARY: WorkspaceNavItem[] = [
  { to: '/portal', label: 'Today', shortLabel: 'Today', end: true, icon: IconGrid },
  { to: '/portal/pipeline', label: 'Pipeline', shortLabel: 'Pipeline', icon: IconClipboard },
  { to: '/portal/messages', label: 'Inbox', shortLabel: 'Inbox', icon: IconMessages, badgeKey: 'messages' },
  { to: '/portal/jobs', label: 'Roles', shortLabel: 'Roles', icon: IconBriefcase },
];

export const WORKSPACE_NAV_SECONDARY: WorkspaceNavItem[] = [
  { to: '/portal/company', label: 'Company', icon: IconUser },
  { to: '/portal/settings', label: 'Settings', icon: IconSettings },
];

/** @deprecated Use WORKSPACE_NAV_PRIMARY — kept for any stale imports during migration */
export const WORKSPACE_NAV = [...WORKSPACE_NAV_PRIMARY, ...WORKSPACE_NAV_SECONDARY];

export interface WorkspaceContext {
  title: string;
  breadcrumb: string;
}

export function isWorkspaceNavActive(
  pathname: string,
  searchParams: URLSearchParams,
  item: WorkspaceNavItem,
): boolean {
  if (item.end && item.to === '/portal') {
    if (pathname === '/portal') return true;
    const candidateMatch = pathname.match(/^\/portal\/applications\/([^/]+)$/);
    return Boolean(candidateMatch && searchParams.get('from') === 'today');
  }

  if (item.to === '/portal/pipeline') {
    if (pathname.startsWith('/portal/pipeline')) return true;
    if (pathname === '/portal/applications') return true;
    const candidateMatch = pathname.match(/^\/portal\/applications\/([^/]+)$/);
    if (candidateMatch) {
      const from = searchParams.get('from');
      if (from === 'inbox') return false;
      if (from === 'today') return false;
      return true;
    }
    return false;
  }

  if (item.to === '/portal/messages') {
    return pathname.startsWith('/portal/messages')
      || Boolean(pathname.match(/^\/portal\/applications\/[^/]+$/) && searchParams.get('from') === 'inbox');
  }

  if (item.to === '/portal/jobs') {
    return pathname.startsWith('/portal/jobs');
  }

  if (item.to === '/portal/company') {
    return pathname.startsWith('/portal/company');
  }

  if (item.to === '/portal/settings') {
    return pathname.startsWith('/portal/settings');
  }

  return pathname === item.to || pathname.startsWith(`${item.to}/`);
}

export function resolveWorkspaceContext(pathname: string, searchParams: URLSearchParams): WorkspaceContext {
  if (pathname.startsWith('/portal/messages/')) {
    return { breadcrumb: 'Inbox', title: 'Conversation' };
  }

  if (pathname.match(/^\/portal\/applications\/[^/]+$/)) {
    const from = searchParams.get('from');
    const origin = from === 'today' ? 'Today' : from === 'inbox' ? 'Inbox' : 'Pipeline';
    return { breadcrumb: origin, title: 'Candidate profile' };
  }

  if (pathname.startsWith('/portal/pipeline') || pathname === '/portal/applications') {
    const view = searchParams.get('view') === 'list' ? 'List' : 'Board';
    const jobId = searchParams.get('jobId');
    const jobSuffix = jobId ? ' · Filtered role' : '';
    return { breadcrumb: 'Pipeline', title: `${view} view${jobSuffix}` };
  }

  if (pathname.startsWith('/portal/messages')) {
    return { breadcrumb: 'Inbox', title: 'Candidate conversations' };
  }

  if (pathname.startsWith('/portal/jobs')) {
    return { breadcrumb: 'Roles', title: 'Open campaigns' };
  }

  if (pathname.startsWith('/portal/company')) {
    return { breadcrumb: 'Company', title: 'Employer profile' };
  }

  if (pathname.startsWith('/portal/settings')) {
    return { breadcrumb: 'Settings', title: 'Workspace preferences' };
  }

  if (pathname === '/portal') {
    return { breadcrumb: 'Hiring workspace', title: 'Today' };
  }

  return { breadcrumb: 'Workspace', title: 'Hiring workspace' };
}

/** @deprecated Use resolveWorkspaceContext */
export function resolveWorkspaceTitle(pathname: string): string {
  return resolveWorkspaceContext(pathname, new URLSearchParams()).title;
}
