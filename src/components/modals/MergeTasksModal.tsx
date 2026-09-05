import type { FC } from "react"
import { useState } from "react"
import { uuidv7 } from "../../utils/uuid"
import type { Task, TaskRequest } from "../../features/planner/types"

interface MergeTasksModalProps {
  tasks: Task[]
  onMerge: (mergedTasks: TaskRequest[]) => void
  onClose: () => void
  isPending: boolean
}

export const MergeTasksModal: FC<MergeTasksModalProps> = ({
  tasks,
  onMerge,
  onClose,
  isPending,
}) => {
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [mergedTitle, setMergedTitle] = useState("")
  const [mergedDescription, setMergedDescription] = useState("")

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
      const selectedTasks = tasks.filter((t) => next.includes(t.id))
      setMergedTitle(selectedTasks.map((t) => t.title).filter(Boolean).join(" + "))
      return next
    })
  }

  const handleConfirm = () => {
    if (selectedIds.length < 2 || !mergedTitle.trim()) return

    // Build new list: remove selected, insert merged task at first selected position
    const mergedTask: TaskRequest = {
      id: uuidv7(),
      title: mergedTitle.trim(),
      description: mergedDescription.trim(),
      assignee: tasks.find((t) => selectedIds.includes(t.id) && t.assignee)?.assignee || "",
      deadline: tasks.find((t) => selectedIds.includes(t.id) && t.deadline)?.deadline || "",
      status: "todo",
      progressPct: 0,
      position: 0,
    }

    const newTasks: TaskRequest[] = []
    let inserted = false

    tasks.forEach((t) => {
      if (selectedIds.includes(t.id)) {
        if (!inserted) {
          newTasks.push(mergedTask)
          inserted = true
        }
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

    // Reassign positions
    const finalTasks = newTasks.map((t, idx) => ({ ...t, position: idx }))
    onMerge(finalTasks)
  }

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
            <h5 className="modal-title fw-bold">Объединить этапы</h5>
            <button
              type="button"
              className="btn-close"
              aria-label="Закрыть"
              onClick={onClose}
              disabled={isPending}
            />
          </div>

          <div className="modal-body p-4">
            <p className="text-muted small mb-3">
              Выберите два или более этапа, чтобы объединить их в один общий этап.
            </p>

            <div className="mb-3">
              <label className="form-label fw-semibold small">Выберите этапы для объединения</label>
              <div
                className="list-group overflow-y-auto"
                style={{ maxHeight: "200px" }}
              >
                {tasks.map((task) => (
                  <label
                    key={task.id}
                    className="list-group-item d-flex align-items-center gap-2 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      className="form-check-input flex-shrink-0"
                      checked={selectedIds.includes(task.id)}
                      onChange={() => {
                        toggleSelect(task.id)
                      }}
                    />
                    <span className="text-truncate">{task.title || "Без названия"}</span>
                  </label>
                ))}
              </div>
            </div>

            {selectedIds.length >= 2 && (
              <>
                <div className="mb-3">
                  <label className="form-label fw-semibold small">Название объединённого этапа</label>
                  <input
                    type="text"
                    className="form-control"
                    value={mergedTitle}
                    onChange={(e) => {
                      setMergedTitle(e.target.value)
                    }}
                    placeholder="Например, Черновые и подготовительные работы"
                    required
                  />
                </div>

                <div className="mb-3">
                  <label className="form-label fw-semibold small">Описание (необязательно)</label>
                  <textarea
                    className="form-control"
                    rows={2}
                    value={mergedDescription}
                    onChange={(e) => {
                      setMergedDescription(e.target.value)
                    }}
                    placeholder="Детали и перечень работ..."
                  />
                </div>
              </>
            )}
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
              disabled={selectedIds.length < 2 || !mergedTitle.trim() || isPending}
            >
              {isPending ? "Объединение..." : `Объединить (${selectedIds.length})`}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
