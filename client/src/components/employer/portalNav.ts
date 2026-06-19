import type { ComponentType } from 'react';
import {
  IconApplications,
  IconBriefcase,
  IconClipboard,
  IconGrid,
  IconSettings,
  IconUser,
} from '@/components/icons/Icons';
import { IconMessages } from '@/components/layout/NavIcons';

export type PortalNavGroup = 'hiring' | 'workspace';

export interface PortalNavItem {
  to: string;
  label: string;
  shortLabel?: string;
  end?: boolean;
  icon: ComponentType<{ className?: string }>;
  group: PortalNavGroup;
  mobilePrimary?: boolean;
  badgeKey?: 'messages';
}

/** Core hiring workflows first; settings/admin grouped under workspace. */
export const PORTAL_NAV: PortalNavItem[] = [
  { to: '/portal', label: 'Dashboard', shortLabel: 'Home', end: true, icon: IconGrid, group: 'hiring', mobilePrimary: true },
  { to: '/portal/pipeline', label: 'Pipeline', icon: IconClipboard, group: 'hiring', mobilePrimary: true },
  { to: '/portal/applications', label: 'Candidates', shortLabel: 'People', icon: IconApplications, group: 'hiring', mobilePrimary: true },
  { to: '/portal/messages', label: 'Messages', icon: IconMessages, group: 'hiring', mobilePrimary: true, badgeKey: 'messages' },
  { to: '/portal/jobs', label: 'Jobs', icon: IconBriefcase, group: 'workspace' },
  { to: '/portal/company', label: 'Company', icon: IconUser, group: 'workspace' },
  { to: '/portal/settings', label: 'Settings', icon: IconSettings, group: 'workspace' },
];

export const PORTAL_NAV_HIRING = PORTAL_NAV.filter((item) => item.group === 'hiring');
export const PORTAL_NAV_WORKSPACE = PORTAL_NAV.filter((item) => item.group === 'workspace');
export const PORTAL_MOBILE_PRIMARY = PORTAL_NAV.filter((item) => item.mobilePrimary);

export function resolvePortalPageTitle(pathname: string): string {
  if (pathname.startsWith('/portal/messages/')) return 'Conversation';
  const match = PORTAL_NAV.find((item) =>
    item.end ? pathname === item.to : pathname === item.to || pathname.startsWith(`${item.to}/`),
  );
  return match?.label ?? 'Workspace';
}

