import { PipelineBoard } from '@/components/employer/pipeline/PipelineBoard';
import ws from '@/portal/workspace.module.css';

export function PipelinePage() {
  return (
    <div className={ws.pipelineWrap}>
      <PipelineBoard />
    </div>
  );
}
