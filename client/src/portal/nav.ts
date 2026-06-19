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

export interface WorkspaceNavItem {
  to: string;
  label: string;
  end?: boolean;
  icon: ComponentType<{ className?: string }>;
  badgeKey?: 'messages';
}

export const WORKSPACE_NAV: WorkspaceNavItem[] = [
  { to: '/portal', label: 'Command center', end: true, icon: IconGrid },
  { to: '/portal/pipeline', label: 'Pipeline', icon: IconClipboard },
  { to: '/portal/applications', label: 'Candidates', icon: IconApplications },
  { to: '/portal/messages', label: 'Messages', icon: IconMessages, badgeKey: 'messages' },
  { to: '/portal/jobs', label: 'Campaigns', icon: IconBriefcase },
  { to: '/portal/company', label: 'Company', icon: IconUser },
  { to: '/portal/settings', label: 'Settings', icon: IconSettings },
];

export function resolveWorkspaceTitle(pathname: string): string {
  if (pathname.startsWith('/portal/messages/')) return 'Conversation';
  if (pathname.startsWith('/portal/applications/')) return 'Candidate';
  const match = WORKSPACE_NAV.find((item) =>
    item.end ? pathname === item.to : pathname === item.to || pathname.startsWith(`${item.to}/`),
  );
  return match?.label ?? 'Workspace';
}
