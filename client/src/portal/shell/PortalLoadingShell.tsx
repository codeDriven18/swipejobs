import ws from '@/portal/workspace.module.css';

export function PortalLoadingShell() {
  return (
    <div className={`employer-portal ${ws.shell}`}>
      <div className={ws.loadingShell}>
        <div className={ws.loadingShellNav} aria-hidden />
        <div className={ws.loadingShellMain}>
          <div className={ws.loadingShellHeader} aria-hidden />
          <div className={ws.loadingShellBlock} aria-hidden />
          <div className={ws.loadingShellBlock} aria-hidden />
          <p className={ws.statusText}>Loading hiring workspace…</p>
        </div>
      </div>
    </div>
  );
}
