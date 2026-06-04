import type { WorkflowItem } from '../../api'
import WorkflowCard from './WorkflowCard'
import type { WorkflowEditData } from './WorkflowEditModal'

type WorkflowGridProps = {
  workflows: WorkflowItem[]
  busy: boolean
  onToggle: (workflow: WorkflowItem, isActive: boolean) => void
  onRemove: (workflow: WorkflowItem) => void
  onSave: (workflow: WorkflowItem, data: WorkflowEditData) => void
}

export default function WorkflowGrid ({
  workflows,
  busy,
  onToggle,
  onRemove,
  onSave
}: WorkflowGridProps) {
  return (
    <div className="workflows-grid">
      {workflows.map((w) => (
        <WorkflowCard
          key={w.id}
          workflow={w}
          busy={busy}
          onToggle={onToggle}
          onRemove={onRemove}
          onSave={onSave}
        />
      ))}
    </div>
  )
}
