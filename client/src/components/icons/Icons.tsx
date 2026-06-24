interface IconProps {
  className?: string;
  size?: number;
}

function base({ className, size = 24 }: IconProps) {
  return { className, width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.75, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, 'aria-hidden': true };
}

export function IconX(props: IconProps) {
  return <svg {...base(props)}><path d="M18 6 6 18M6 6l12 12" /></svg>;
}

export function IconBookmark(props: IconProps) {
  return <svg {...base(props)}><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z" /></svg>;
}

export function IconArrowRight(props: IconProps) {
  return <svg {...base(props)}><path d="M5 12h14M13 6l6 6-6 6" /></svg>;
}

export function IconArrowUp(props: IconProps) {
  return <svg {...base(props)}><path d="M12 19V5M5 12l7-7 7 7" /></svg>;
}

export function IconCheck(props: IconProps) {
  return <svg {...base(props)}><path d="M20 6 9 17l-5-5" /></svg>;
}

export function IconBolt(props: IconProps) {
  return <svg {...base(props)}><path d="M13 2 3 14h8l-1 8 10-12h-8l1-8z" /></svg>;
}

export function IconBell(props: IconProps) {
  return <svg {...base(props)}><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" /></svg>;
}

export function IconMapPin(props: IconProps) {
  return <svg {...base(props)}><path d="M12 21s7-4.5 7-11a7 7 0 1 0-14 0c0 6.5 7 11 7 11z" /><circle cx="12" cy="10" r="2.5" /></svg>;
}

export function IconBuilding(props: IconProps) {
  return <svg {...base(props)}><path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18" /><path d="M6 12h12M10 6h.01M14 6h.01M10 10h.01M14 10h.01M10 14h.01M14 14h.01M10 18h.01M14 18h.01" /></svg>;
}

export function IconChevronLeft(props: IconProps) {
  return <svg {...base(props)}><path d="M15 18l-6-6 6-6" /></svg>;
}

export function IconChevronRight(props: IconProps) {
  return <svg {...base(props)}><path d="M9 18l6-6-6-6" /></svg>;
}

export function IconUser(props: IconProps) {
  return <svg {...base(props)}><circle cx="12" cy="8" r="4" /><path d="M4 20c0-4 3.6-6 8-6s8 2 8 6" /></svg>;
}

export function IconSpark(props: IconProps) {
  return <svg {...base(props)}><path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M5.6 18.4l2.1-2.1M16.3 7.7l2.1-2.1" /></svg>;
}

export function IconVerified(props: IconProps) {
  return <svg {...base(props)}><path d="M12 2l2.4 1.2 2.7-.2 1.1 2.5 2.5 1.1-.2 2.7L22 12l-1.5 2.4.2 2.7-2.5 1.1-1.1 2.5-2.7-.2L12 22l-2.4-1.5-2.7.2-1.1-2.5-2.5-1.1.2-2.7L2 12l1.5-2.4-.2-2.7 2.5-1.1 1.1-2.5 2.7.2L12 2z" /><path d="m9 12 2 2 4-4" /></svg>;
}

export function IconHeart(props: IconProps) {
  return <svg {...base(props)}><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8z" /></svg>;
}

export function IconRefresh(props: IconProps & { className?: string }) {
  const { className, ...rest } = props;
  return (
    <svg {...base(rest)} className={className}>
      <path d="M21 12a9 9 0 1 1-2.64-6.36" />
      <path d="M21 3v6h-6" />
    </svg>
  );
}

export function IconFilter(props: IconProps) {
  return <svg {...base(props)}><path d="M4 6h16M7 12h10M10 18h4" /></svg>;
}

export function IconMenu(props: IconProps) {
  return <svg {...base(props)}><path d="M4 7h16M4 12h16M4 17h16" /></svg>;
}

export function IconSearch(props: IconProps) {
  return <svg {...base(props)}><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>;
}

export function IconApplications(props: IconProps) {
  return <svg {...base(props)}><path d="M9 11l3 3L22 4" /><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" /></svg>;
}

export function IconShare(props: IconProps) {
  return <svg {...base(props)}><path d="M4 12v7a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-7" /><path d="M16 6l-4-4-4 4M12 2v14" /></svg>;
}

export function IconLink(props: IconProps) {
  return <svg {...base(props)}><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" /><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" /></svg>;
}

export function IconGrid(props: IconProps) {
  return <svg {...base(props)}><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></svg>;
}

export function IconList(props: IconProps) {
  return <svg {...base(props)}><path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" /></svg>;
}

export function IconClipboard(props: IconProps) {
  return <svg {...base(props)}><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" /><rect x="8" y="2" width="8" height="4" rx="1" /></svg>;
}

export function IconChart(props: IconProps) {
  return <svg {...base(props)}><path d="M18 20V10M12 20V4M6 20v-6" /></svg>;
}

export function IconFileText(props: IconProps) {
  return <svg {...base(props)}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" /></svg>;
}

export function IconSettings(props: IconProps) {
  return <svg {...base(props)}><circle cx="12" cy="12" r="3" /><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" /></svg>;
}

export function IconLogOut(props: IconProps) {
  return <svg {...base(props)}><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><path d="M16 17l5-5-5-5M21 12H9" /></svg>;
}

export function IconActivity(props: IconProps) {
  return <svg {...base(props)}><path d="M22 12h-4l-3 9L9 3l-3 9H2" /></svg>;
}

export function IconCircle(props: IconProps) {
  return <svg {...base(props)}><circle cx="12" cy="12" r="9" /></svg>;
}

export function IconFile(props: IconProps) {
  return <svg {...base(props)}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><path d="M14 2v6h6" /></svg>;
}

export function IconCamera(props: IconProps) {
  return <svg {...base(props)}><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" /><circle cx="12" cy="13" r="4" /></svg>;
}

export function IconBriefcase(props: IconProps) {
  return <svg {...base(props)}><rect x="2" y="7" width="20" height="14" rx="2" /><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" /></svg>;
}

export function IconGraduation(props: IconProps) {
  return <svg {...base(props)}><path d="M22 10 12 5 2 10l10 5 10-5z" /><path d="M6 12v5c0 1.1 2.7 3 6 3s6-1.9 6-3v-5" /></svg>;
}

export function IconMail(props: IconProps) {
  return <svg {...base(props)}><rect x="2" y="4" width="20" height="16" rx="2" /><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" /></svg>;
}

/** Modern messaging bubble — Telegram / WhatsApp style */
export function IconMessageBubble(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  );
}

/** Two overlapping chat bubbles — Discord / iMessage style */
export function IconMessageBubbles(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M8 11h.01M12 11h.01M16 11h.01" />
      <path d="M20 2H4a2 2 0 0 0-2 2v16l4-4h14a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2z" />
    </svg>
  );
}

export function IconMore(props: IconProps) {
  return <svg {...base(props)}><circle cx="12" cy="12" r="1" /><circle cx="19" cy="12" r="1" /><circle cx="5" cy="12" r="1" /></svg>;
}

export function IconSmartphone(props: IconProps) {
  return <svg {...base(props)}><rect x="7" y="2" width="10" height="20" rx="2" /><path d="M12 18h.01" /></svg>;
}
