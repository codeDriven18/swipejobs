import { Link } from 'react-router-dom';
import ui from '@/components/employer/ui/employerUi.module.css';

export function PortalMessagesEmptyPanel() {
  return (
    <div className={ui.surface} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 'var(--space-8)', minHeight: '20rem' }}>
      <h2 className={ui.sectionTitle}>Select a conversation</h2>
      <p className={ui.candidateDetail}>Choose a candidate thread to read and reply, or open the pipeline to invite someone to interview.</p>
      <Link to="/portal/pipeline" className={ui.btnPrimary} style={{ marginTop: 'var(--space-4)' }}>Open pipeline</Link>
    </div>
  );
}
