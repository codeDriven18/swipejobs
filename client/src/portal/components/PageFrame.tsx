import type { ReactNode } from 'react';
import ws from '@/portal/workspace.module.css';

interface PageFrameProps {
  meta?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  fill?: boolean;
}

export function PageFrame({ meta, actions, children, fill }: PageFrameProps) {
  return (
    <div className={[ws.page, fill ? ws.pageFill : ''].filter(Boolean).join(' ')}>
      {(meta || actions) && (
        <header className={ws.pageHeader}>
          {meta && <div className={ws.pageMeta}>{meta}</div>}
          {actions && <div className={ws.pageActions}>{actions}</div>}
        </header>
      )}
      {children}
    </div>
  );
}

interface PanelProps {
  title?: string;
  action?: ReactNode;
  muted?: boolean;
  children: ReactNode;
}

export function Panel({ title, action, muted, children }: PanelProps) {
  return (
    <section className={muted ? ws.panelMuted : ws.panel}>
      {(title || action) && (
        <div className={ws.panelHeader}>
          {title && <h2 className={ws.panelTitle}>{title}</h2>}
          {action}
        </div>
      )}
      {children}
    </section>
  );
}
