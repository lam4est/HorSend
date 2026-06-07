import type { WorkflowItem } from '../../api'
import WorkflowCard from './WorkflowCard'
import type { WorkflowEditData } from './WorkflowEditModal'

type WorkflowGridProps = {
  workflows: WorkflowItem[]
  busy: boolean
  onToggle: (workflow: WorkflowItem, isActive: boolean) => void
  onRemove: (workflow: WorkflowItem) => void
  onSave: (workflow: WorkflowItem, data: WorkflowEditData) => void | Promise<void>
  onEditClosed: (workflow: WorkflowItem, data: WorkflowEditData) => void
}

export default function WorkflowGrid ({
  workflows,
  busy,
  onToggle,
  onRemove,
  onSave,
  onEditClosed
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
          onEditClosed={onEditClosed}
        />
      ))}
    </div>
  )
}
