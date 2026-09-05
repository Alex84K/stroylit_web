import type { FC } from "react"
import { useState } from "react"
import { uuidv7 } from "../../utils/uuid"
import type { Task, TaskRequest } from "../../features/planner/types"

interface SplitTaskModalProps {
  task: Task
  allTasks: Task[]
  onSplit: (updatedTasks: TaskRequest[]) => void
  onClose: () => void
  isPending: boolean
}

interface SubStage {
  title: string
  assignee: string
}

export const SplitTaskModal: FC<SplitTaskModalProps> = ({
  task,
  allTasks,
  onSplit,
  onClose,
  isPending,
}) => {
  const [stages, setStages] = useState<SubStage[]>([
    { title: `${task.title} (часть 1)`, assignee: task.assignee },
    { title: `${task.title} (часть 2)`, assignee: task.assignee },
  ])

  const handleStageChange = (index: number, field: keyof SubStage, value: string) => {
    setStages((prev) =>
      prev.map((s, i) => (i === index ? { ...s, [field]: value } : s)),
    )
  }

  const handleAddStage = () => {
    setStages((prev) => [
      ...prev,
      { title: `${task.title} (часть ${prev.length + 1})`, assignee: task.assignee },
    ])
  }

  const handleRemoveStage = (index: number) => {
    if (stages.length <= 2) return
    setStages((prev) => prev.filter((_, i) => i !== index))
  }

  const handleConfirm = () => {
    const valid = stages.every((s) => s.title.trim() !== "")
    if (!valid) return

    const newSubTasks: TaskRequest[] = stages.map((s) => ({
      id: uuidv7(),
      title: s.title.trim(),
      description: "",
      assignee: s.assignee.trim(),
      deadline: task.deadline,
      status: "todo",
      progressPct: 0,
      position: 0,
    }))

    const newTasks: TaskRequest[] = []
    allTasks.forEach((t) => {
      if (t.id === task.id) {
        newTasks.push(...newSubTasks)
      } else {
        newTasks.push({
          id: t.id,
          title: t.title,
          description: t.description,
          assignee: t.assignee,
          deadline: t.deadline,
          status: t.status,
          progressPct: t.progressPct,
          position: 0,
        })
      }
    })

    const finalTasks = newTasks.map((t, idx) => ({ ...t, position: idx }))
    onSplit(finalTasks)
  }

  const allValid = stages.every((s) => s.title.trim() !== "")

  return (
    <div
      className="modal fade show d-block"
      tabIndex={-1}
      role="dialog"
      style={{ backgroundColor: "rgba(0, 0, 0, 0.5)" }}
    >
      <div className="modal-dialog modal-dialog-centered">
        <div className="modal-content border-0 rounded-4 shadow">
          <div className="modal-header border-bottom px-4 py-3">
            <h5 className="modal-title fw-bold">Разбить этап на подэтапы</h5>
            <button
              type="button"
              className="btn-close"
              aria-label="Закрыть"
              onClick={onClose}
              disabled={isPending}
            />
          </div>

          <div className="modal-body p-4">
            <div className="alert alert-light border small mb-3">
              Исходный этап: <strong>{task.title || "Без названия"}</strong>
            </div>

            <p className="text-muted small mb-3">
              Укажите названия новых подэтапов, которые заменят данный этап.
            </p>

            <div className="d-flex flex-column gap-3 mb-3">
              {stages.map((stage, idx) => (
                <div key={idx} className="p-3 bg-body-tertiary rounded-3">
                  <div className="d-flex justify-content-between align-items-center mb-2">
                    <span className="fw-semibold small">Подэтап {idx + 1}</span>
                    {stages.length > 2 && (
                      <button
                        type="button"
                        className="btn btn-link text-danger p-0 text-decoration-none small"
                        onClick={() => {
                          handleRemoveStage(idx)
                        }}
                      >
                        <i className="bi bi-trash me-1" />
                        Удалить
                      </button>
                    )}
                  </div>
                  <input
                    type="text"
                    className="form-control mb-2"
                    placeholder="Название подэтапа"
                    value={stage.title}
                    onChange={(e) => {
                      handleStageChange(idx, "title", e.target.value)
                    }}
                    required
                  />
                  <input
                    type="text"
                    className="form-control form-control-sm"
                    placeholder="Исполнитель (необязательно)"
                    value={stage.assignee}
                    onChange={(e) => {
                      handleStageChange(idx, "assignee", e.target.value)
                    }}
                  />
                </div>
              ))}
            </div>

            <button
              type="button"
              className="btn btn-outline-secondary btn-sm w-100"
              onClick={handleAddStage}
              disabled={isPending}
            >
              <i className="bi bi-plus-lg me-1" />
              Добавить ещё подэтап
            </button>
          </div>

          <div className="modal-footer border-top px-4 py-3">
            <button
              type="button"
              className="btn btn-outline-secondary btn-sm fw-semibold"
              onClick={onClose}
              disabled={isPending}
            >
              Отмена
            </button>
            <button
              type="button"
              className="btn btn-primary btn-sm fw-semibold"
              onClick={handleConfirm}
              disabled={!allValid || isPending}
            >
              {isPending ? "Разбиение..." : `Разбить на ${stages.length} этапа`}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
