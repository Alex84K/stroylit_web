import type { FC } from "react"
import { useEffect, useMemo, useState } from "react"
import { formatDate, formatDateTime } from "../../features/projects/format"
import {
  DEADLINE_URGENCY_BADGE,
  DEADLINE_URGENCY_LABELS,
  TASK_LIMITS,
  TASK_STATUS_BADGE,
  TASK_STATUS_LABELS,
  TASK_STATUSES,
  type Task,
  type TaskStatus,
} from "../../features/planner/types"
import { deadlineUrgency } from "../../features/planner/utils/deadlineUrgency"
import { ConfirmDeleteModal } from "../modals/ConfirmDeleteModal"

type Props = {
  tasks: Task[]
  /** Any mutation in flight — the toolbar's add buttons are disabled while one runs. */
  isPending: boolean
  /** A changing value (list updatedAt) — clears input buffers after a server round-trip. */
  resetToken: string | null
  onSetStatus: (id: string, status: TaskStatus) => void
  onSetProgress: (id: string, pct: number) => void
  onMove: (from: number, to: number) => void
  onEdit: (task: Task) => void
  onRemove: (task: Task) => void
  onAdd: () => void
  onOpenCatalog: () => void
  onOpenMerge?: () => void
  onOpenSplit?: (task: Task) => void
}

export const TaskListTable: FC<Props> = ({
  tasks,
  isPending,
  resetToken,
  onSetStatus,
  onSetProgress,
  onMove,
  onEdit,
  onRemove,
  onAdd,
  onOpenCatalog,
  onOpenMerge,
  onOpenSplit,
}) => {
  const [progressBuffer, setProgressBuffer] = useState<
    Partial<Record<string, string>>
  >({})
  const [search, setSearch] = useState("")
  const [removeTarget, setRemoveTarget] = useState<Task | null>(null)

  // After a server round-trip the buffers may hold text for ids that no
  // longer carry it — clear them (the estimate table's resetToken trick).
  useEffect(() => {
    setProgressBuffer({})
  }, [resetToken])

  const atMax = tasks.length >= TASK_LIMITS.maxTasks
  const showCounter = tasks.length >= 900

  const visibleTasks = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (q === "") return tasks
    return tasks.filter(
      t =>
        t.title.toLowerCase().includes(q) ||
        t.description.toLowerCase().includes(q) ||
        t.assignee.toLowerCase().includes(q),
    )
  }, [tasks, search])
  const isFiltering = search.trim() !== ""

  const parsePct = (raw: string): number | null => {
    const cleaned = raw.trim().replace(/\s/g, "")
    if (!/^\d+$/.test(cleaned)) return null
    const v = Number(cleaned)
    if (!Number.isFinite(v) || v < 0 || v > 100) return null
    return v
  }

  const commitPct = (task: Task, raw: string) => {
    setProgressBuffer(b => {
      if (!(task.id in b)) return b
      return Object.fromEntries(
        Object.entries(b).filter(([key]) => key !== task.id),
      )
    })
    const pct = parsePct(raw)
    if (pct === null || pct === task.progressPct) return
    onSetProgress(task.id, pct)
  }

  const pctValue = (task: Task): string => {
    const buffered = progressBuffer[task.id]
    if (buffered !== undefined) return buffered
    return String(task.progressPct)
  }

  const isEmptyTask = (t: Task): boolean =>
    t.title === "" &&
    t.description === "" &&
    t.assignee === "" &&
    t.status === "todo" &&
    t.progressPct === 0

  const handleDelete = (task: Task) => {
    if (isEmptyTask(task)) {
      onRemove(task)
      return
    }
    setRemoveTarget(task)
  }

  const nextStatus = (current: TaskStatus): TaskStatus => {
    if (current === "todo") return "in_progress"
    if (current === "in_progress") return "done"
    return "todo"
  }

  const deadlineCell = (task: Task) => {
    if (task.deadline === "") return null
    const urgency = deadlineUrgency(task.deadline)
    const text = formatDate(task.deadline)
    if (urgency === "later" || urgency === "none") {
      return (
        <span className="text-muted small" title="Дедлайн">
          <i className="bi bi-calendar3 me-1" />
          {text}
        </span>
      )
    }
    return (
      <span
        className={`badge ${DEADLINE_URGENCY_BADGE[urgency]}`}
        title={DEADLINE_URGENCY_LABELS[urgency]}
      >
        <i className="bi bi-calendar-event me-1" />
        {text}
      </span>
    )
  }

  const moveButtons = (index: number) => (
    <div className="btn-group-vertical btn-group-sm">
      <button
        type="button"
        className="btn btn-outline-secondary py-0 px-1 lh-1"
        style={{ fontSize: "0.65rem" }}
        disabled={isFiltering || index === 0}
        onClick={() => {
          onMove(index, index - 1)
        }}
        title="Выше"
        aria-label="Выше"
      >
        <i className="bi bi-chevron-up" />
      </button>
      <button
        type="button"
        className="btn btn-outline-secondary py-0 px-1 lh-1"
        style={{ fontSize: "0.65rem" }}
        disabled={isFiltering || index === tasks.length - 1}
        onClick={() => {
          onMove(index, index + 1)
        }}
        title="Ниже"
        aria-label="Ниже"
      >
        <i className="bi bi-chevron-down" />
      </button>
    </div>
  )

  const actionButtons = (task: Task) => {
    const isDone = task.status === "done"
    return (
      <div className="d-inline-flex align-items-center gap-1">
        <button
          type="button"
          className={`btn btn-sm ${isDone ? "btn-success" : "btn-outline-primary"}`}
          title={isDone ? "Завершено (клик для смены статуса)" : "Сменить статус"}
          aria-label="Сменить статус"
          onClick={() => {
            onSetStatus(task.id, nextStatus(task.status))
          }}
        >
          <i className={`bi ${isDone ? "bi-check-circle-fill" : "bi-arrow-repeat"}`} />
        </button>
        {onOpenSplit && (
          <button
            type="button"
            className="btn btn-sm btn-outline-secondary"
            title="Разбить на подэтапы"
            aria-label="Разбить на подэтапы"
            onClick={() => {
              onOpenSplit(task)
            }}
          >
            <i className="bi bi-arrows-split" />
          </button>
        )}
        <button
          type="button"
          className="btn btn-sm btn-outline-secondary"
          title="Редактировать"
          aria-label="Редактировать"
          onClick={() => {
            onEdit(task)
          }}
        >
          <i className="bi bi-pencil" />
        </button>
        <button
          type="button"
          className="btn btn-sm btn-outline-danger"
          title="Удалить"
          aria-label="Удалить"
          onClick={() => {
            handleDelete(task)
          }}
        >
          <i className="bi bi-trash" />
        </button>
      </div>
    )
  }

  return (
    <div className="card shadow-sm border-0">
      <div className="card-body p-3 p-md-4">
        {/* Search & Counter Toolbar */}
        <div className="d-flex flex-wrap align-items-center gap-2 mb-3">
          <div className="input-group" style={{ maxWidth: "20rem" }}>
            <span className="input-group-text bg-surface">
              <i className="bi bi-search" />
            </span>
            <input
              type="text"
              className="form-control"
              placeholder="Поиск по этапам..."
              value={search}
              onChange={e => {
                setSearch(e.target.value)
              }}
            />
          </div>
          {showCounter && (
            <span className="text-muted small">
              {tasks.length} / {TASK_LIMITS.maxTasks}
            </span>
          )}
        </div>

        {/* Action Toolbar */}
        <div className="d-flex flex-wrap gap-2 mb-3">
          <button
            type="button"
            className="btn btn-outline-primary btn-sm fw-semibold"
            onClick={onOpenCatalog}
            disabled={atMax || isPending}
          >
            <i className="bi bi-box-seam me-1" />
            Из каталога
          </button>
          <button
            type="button"
            className="btn btn-outline-secondary btn-sm fw-semibold"
            onClick={onAdd}
            disabled={atMax || isPending}
          >
            <i className="bi bi-plus-lg me-1" />
            Новый этап
          </button>
          {tasks.length >= 2 && onOpenMerge && (
            <button
              type="button"
              className="btn btn-outline-secondary btn-sm fw-semibold"
              onClick={onOpenMerge}
              disabled={isPending}
            >
              <i className="bi bi-union me-1" />
              Объединить этапы
            </button>
          )}
        </div>

        {/* Stage Cards List */}
        <div className="d-flex flex-column gap-2">
          {visibleTasks.length === 0 ? (
            <div className="text-center text-muted py-4 border rounded-3 bg-light-subtle">
              {isFiltering
                ? "Ничего не найдено по заданному условию."
                : "Этапов пока нет — добавьте их из сметы, каталога или создайте новый."}
            </div>
          ) : (
            visibleTasks.map(task => {
              const index = tasks.indexOf(task)
              const isDone = task.status === "done"

              return (
                <div
                  key={task.id}
                  className={`card border rounded-3 p-3 transition-all ${
                    isDone
                      ? "border-success-subtle bg-success-subtle bg-opacity-10"
                      : "border-secondary-subtle bg-body"
                  }`}
                >
                  {/* Card Header */}
                  <div className="d-flex justify-content-between align-items-start gap-2 mb-2">
                    <div className="d-flex align-items-start gap-2" style={{ minWidth: 0 }}>
                      <div className="d-flex align-items-center gap-1 pt-0.5">
                        <span className="badge bg-secondary-subtle text-body fw-bold">
                          #{index + 1}
                        </span>
                        {moveButtons(index)}
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <h6 className="fw-bold mb-1 text-break">
                          {task.title || (
                            <span className="text-muted">Без названия</span>
                          )}
                        </h6>
                        {task.description && (
                          <div className="text-muted small text-break">
                            {task.description}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex-shrink-0">
                      {actionButtons(task)}
                    </div>
                  </div>

                  {/* Card Attributes / Controls */}
                  <div className="row g-2 align-items-center pt-2 border-top">
                    {/* Status Select */}
                    <div className="col-12 col-sm-4 col-md-4">
                      <label
                        className="form-label visually-hidden"
                        htmlFor={`status-${task.id}`}
                      >
                        Статус: {task.title || "Без названия"}
                      </label>
                      <select
                        id={`status-${task.id}`}
                        className="form-select form-select-sm fw-semibold"
                        aria-label={`Статус: ${task.title || "Без названия"}`}
                        value={task.status}
                        onChange={e => {
                          onSetStatus(task.id, e.target.value as TaskStatus)
                        }}
                      >
                        {TASK_STATUSES.map(s => (
                          <option key={s} value={s}>
                            {TASK_STATUS_LABELS[s]}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Progress */}
                    <div className="col-6 col-sm-3 col-md-3">
                      <div className="input-group input-group-sm">
                        <span className="input-group-text small text-muted px-2">
                          Готовность
                        </span>
                        <input
                          id={`progress-${task.id}`}
                          type="text"
                          inputMode="numeric"
                          className="form-control text-center"
                          aria-label={`Прогресс: ${task.title || "Без названия"}`}
                          value={pctValue(task)}
                          onChange={e => {
                            setProgressBuffer(b => ({
                              ...b,
                              [task.id]: e.target.value,
                            }))
                          }}
                          onBlur={e => {
                            commitPct(task, e.target.value)
                          }}
                        />
                        <span className="input-group-text px-1.5">%</span>
                      </div>
                    </div>

                    {/* Assignee & Deadline */}
                    <div className="col-6 col-sm-5 col-md-5 d-flex flex-wrap justify-content-end align-items-center gap-2">
                      {task.assignee ? (
                        <span className="badge bg-light text-dark border small text-truncate" style={{ maxWidth: "140px" }} title={`Исполнитель: ${task.assignee}`}>
                          <i className="bi bi-person me-1" />
                          {task.assignee}
                        </span>
                      ) : null}
                      {deadlineCell(task)}
                    </div>
                  </div>

                  {/* Creation Date Footer */}
                  <div className="d-flex justify-content-between align-items-center mt-2 pt-1 small text-muted" style={{ fontSize: "0.75rem" }}>
                    <span>
                      <i className="bi bi-clock me-1" />
                      Создан: {formatDateTime(task.createdAt)}
                    </span>
                    <span className={`badge ${TASK_STATUS_BADGE[task.status]}`}>
                      {TASK_STATUS_LABELS[task.status]}
                    </span>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>

      {removeTarget && (
        <ConfirmDeleteModal
          title="Удаление этапа"
          message={
            <>
              Удалить этап
              {removeTarget.title ? (
                <>
                  {" "}
                  <strong>{removeTarget.title}</strong>
                </>
              ) : null}
              ?
            </>
          }
          onConfirm={() => {
            onRemove(removeTarget)
            setRemoveTarget(null)
          }}
          onClose={() => {
            setRemoveTarget(null)
          }}
        />
      )}
    </div>
  )
}
