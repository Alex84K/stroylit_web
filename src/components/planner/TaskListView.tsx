import type { FC } from "react"
import { useState } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { ApiError } from "../../utils/api"
import {
  TASKS_QUERY_KEY,
  useDeleteTask,
  useGetTasksByEstimate,
  usePatchTask,
  useReplaceTasksByEstimate,
} from "../../features/planner/tasks.hooks"
import { buildTaskListBody } from "../../features/planner/utils/buildTaskListBody"
import { taskFromCatalogItem } from "../../features/planner/utils/fromTaskCatalog"
import { tasksFromTemplate } from "../../features/planner/utils/fromTaskCatalog"
import {
  progressPatch,
  statusPatch,
} from "../../features/planner/utils/statusProgress"
import type {
  Task,
  TaskCatalogItem,
  TaskStatus,
  TaskTemplate,
} from "../../features/planner/types"
import { TaskListTable } from "./TaskListTable"
import { ApplyTaskTemplateModal } from "../modals/ApplyTaskTemplateModal"
import { EditTaskModal } from "../modals/EditTaskModal"
import { MergeTasksModal } from "../modals/MergeTasksModal"
import { SaveTaskListAsTemplateModal } from "../modals/SaveTaskListAsTemplateModal"
import { SelectTaskCatalogItemsModal } from "../modals/SelectTaskCatalogItemsModal"
import { SplitTaskModal } from "../modals/SplitTaskModal"

type Props = {
  /** The estimate (phase) whose task list this is — tasks hang off the
   *  estimate since ADR-013 decision 5. */
  estimateId: string
  onGoToCatalog: () => void
}

// The estimate's task list — the planner of an estimate is the set of tasks
// carrying its id (ADR-013 decision 5; D1 of DESIGN_PLANNER: no list table,
// the estimate IS the list's identity). No draft, no save button: every
// change commits individually (decision D2, DESIGN_PLANNER.md §7.1) —
// marking one stage done is a single small PATCH, the product's most frequent
// operation. Whole-list operations (reorder, apply template, insert from
// catalog) go through ONE collection PUT — the "replace the list" case where
// that PUT is the user's intent (D6, §5.2).
export const TaskListView: FC<Props> = ({ estimateId, onGoToCatalog }) => {
  const queryClient = useQueryClient()
  const {
    data: tasks = [],
    isLoading,
    isError,
    error,
  } = useGetTasksByEstimate(estimateId)
  const patchTask = usePatchTask()
  const deleteTask = useDeleteTask()
  const replaceTasks = useReplaceTasksByEstimate()

  const [editTarget, setEditTarget] = useState<Task | "new" | null>(null)
  const [splitTarget, setSplitTarget] = useState<Task | null>(null)
  const [mergeOpen, setMergeOpen] = useState(false)
  const [catalogOpen, setCatalogOpen] = useState(false)
  const [applyTemplateOpen, setApplyTemplateOpen] = useState(false)
  const [saveAsTemplateOpen, setSaveAsTemplateOpen] = useState(false)
  // Clears input buffers in the table after our own server round-trips.
  const [resetToken, setResetToken] = useState(0)

  const isPending =
    patchTask.isPending || deleteTask.isPending || replaceTasks.isPending

  const loadError =
    error instanceof ApiError ? error.message : "Не удалось загрузить задачи"

  const writeError = (() => {
    for (const m of [patchTask, deleteTask, replaceTasks]) {
      if (m.error) {
        return m.error instanceof ApiError
          ? m.error.message
          : "Не удалось сохранить изменения"
      }
    }
    return null
  })()

  // Read the freshest list from the cache — mutations keep it in sync, so a
  // collection PUT built here never carries stale fields.
  const currentList = (): Task[] =>
    queryClient.getQueryData<Task[]>([
      ...TASKS_QUERY_KEY,
      "byEstimate",
      estimateId,
    ]) ?? tasks

  const readTask = (id: string): Task | undefined =>
    currentList().find(t => t.id === id)

  const bumpReset = () => {
    setResetToken(t => t + 1)
  }

  const handleSetStatus = (id: string, status: TaskStatus) => {
    const task = readTask(id)
    if (!task) return
    const patch = statusPatch(task, status)
    if (!patch) return
    patchTask.mutate({ estimateId, id, patch }, { onSettled: bumpReset })
  }

  const handleSetProgress = (id: string, pct: number) => {
    const task = readTask(id)
    if (!task) return
    const patch = progressPatch(task, pct)
    if (!patch) return
    patchTask.mutate({ estimateId, id, patch }, { onSettled: bumpReset })
  }

  const handleMove = (from: number, to: number) => {
    const list = [...currentList()]
    if (
      from === to ||
      from < 0 ||
      to < 0 ||
      from >= list.length ||
      to >= list.length
    )
      return
    const [moved] = list.splice(from, 1)
    list.splice(to, 0, moved)
    replaceTasks.mutate(
      { estimateId, tasks: buildTaskListBody(list) },
      { onSettled: bumpReset },
    )
  }

  const handleRemove = (task: Task) => {
    deleteTask.mutate({ estimateId, id: task.id }, { onSettled: bumpReset })
  }

  // "Из каталога": append the selected rows as fresh tasks — one collection
  // PUT, one transaction (the same mechanics as applying a template, D6).
  const handleAddFromCatalog = (rows: TaskCatalogItem[]) => {
    const list = currentList()
    const added = rows.map((c, i) => taskFromCatalogItem(c, list.length + i))
    replaceTasks.mutate(
      { estimateId, tasks: [...buildTaskListBody(list), ...added] },
      { onSettled: bumpReset },
    )
    setCatalogOpen(false)
  }

  // D6 (§5.2): applying APPENDS to the end — replacing the list would
  // destroy marked-off work. One collection PUT, positions continue from the
  // current list length.
  const handleApplyTemplate = (template: TaskTemplate) => {
    const list = currentList()
    const added = tasksFromTemplate(template.items, list.length)
    replaceTasks.mutate(
      { estimateId, tasks: [...buildTaskListBody(list), ...added] },
      { onSettled: bumpReset },
    )
    setApplyTemplateOpen(false)
  }

  // Finished work = review (sent to the customer) or done (accepted). The
  // foreman's own progress advances the moment a stage leaves his hands; the
  // acceptance-only count is the customer's view (server taskDoneCount uses
  // the same review+done rule since ADR-013).
  const finishedCount = tasks.filter(
    t => t.status === "review" || t.status === "done",
  ).length

  return (
    <div>
      <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
        <h5 className="fw-bold mb-0">Этапы работ</h5>
        {tasks.length > 0 && (
          <span className="text-muted small">
            Готово {finishedCount} из {tasks.length}
          </span>
        )}
      </div>

      {isError && (
        <div className="alert alert-danger" role="alert">
          {loadError}
        </div>
      )}
      {writeError && (
        <div className="alert alert-danger" role="alert">
          {writeError}
        </div>
      )}

      {isLoading ? (
        <div className="list-group shadow-sm rounded-4 overflow-hidden">
          {Array.from({ length: 2 }).map((_, i) => (
            <div className="list-group-item p-4 placeholder-glow" key={i}>
              <span className="placeholder col-6" />
              <span className="placeholder col-3 d-block mt-3" />
            </div>
          ))}
        </div>
      ) : (
        <TaskListTable
          tasks={tasks}
          isPending={isPending}
          resetToken={String(resetToken)}
          onSetStatus={handleSetStatus}
          onSetProgress={handleSetProgress}
          onMove={handleMove}
          onEdit={task => {
            setEditTarget(task)
          }}
          onRemove={handleRemove}
          onAdd={() => {
            setEditTarget("new")
          }}
          onOpenCatalog={() => {
            setCatalogOpen(true)
          }}
          onOpenMerge={() => {
            setMergeOpen(true)
          }}
          onOpenSplit={task => {
            setSplitTarget(task)
          }}
        />
      )}

      {/* Summary + template actions — the estimate's totals-panel role. */}
      <div className="card shadow-sm border-0 position-sticky bottom-0 mt-3">
        <div className="card-body">
          {tasks.length > 0 ? (
            <>
              <div className="d-flex justify-content-between align-items-center small text-muted mb-1">
                <span>
                  Готово {finishedCount} из {tasks.length}
                </span>
                <span className="font-monospace">
                  {Math.round((finishedCount / tasks.length) * 100)} %
                </span>
              </div>
              <div
                className="progress"
                role="progressbar"
                aria-label="Готовность списка"
                aria-valuenow={Math.round((finishedCount / tasks.length) * 100)}
                aria-valuemin={0}
                aria-valuemax={100}
              >
                <div
                  className="progress-bar bg-success"
                  style={{
                    width: `${String(Math.round((finishedCount / tasks.length) * 100))}%`,
                  }}
                />
              </div>
            </>
          ) : (
            <p className="text-muted small mb-0">
              Соберите список работ на объекте — задачи можно добавить из
              каталога или по одной.
            </p>
          )}

          <div className="d-flex flex-wrap gap-2 mt-3">
            <button
              type="button"
              className="btn btn-outline-secondary"
              onClick={() => {
                setSaveAsTemplateOpen(true)
              }}
              disabled={tasks.length === 0 || isPending}
            >
              Сохранить как шаблон
            </button>
            <button
              type="button"
              className="btn btn-outline-secondary"
              onClick={() => {
                setApplyTemplateOpen(true)
              }}
            >
              Применить шаблон
            </button>
          </div>
        </div>
      </div>

      {editTarget !== null && (
        <EditTaskModal
          estimateId={estimateId}
          task={editTarget === "new" ? null : editTarget}
          knownAssignees={tasks.map(t => t.assignee)}
          nextPosition={tasks.length}
          onClose={() => {
            setEditTarget(null)
          }}
        />
      )}

      {mergeOpen && (
        <MergeTasksModal
          tasks={tasks}
          isPending={replaceTasks.isPending}
          onMerge={updatedTasks => {
            replaceTasks.mutate(
              { estimateId, tasks: updatedTasks },
              {
                onSuccess: () => {
                  setMergeOpen(false)
                  bumpReset()
                },
              },
            )
          }}
          onClose={() => {
            setMergeOpen(false)
          }}
        />
      )}

      {splitTarget !== null && (
        <SplitTaskModal
          task={splitTarget}
          allTasks={tasks}
          isPending={replaceTasks.isPending}
          onSplit={updatedTasks => {
            replaceTasks.mutate(
              { estimateId, tasks: updatedTasks },
              {
                onSuccess: () => {
                  setSplitTarget(null)
                  bumpReset()
                },
              },
            )
          }}
          onClose={() => {
            setSplitTarget(null)
          }}
        />
      )}

      {catalogOpen && (
        <SelectTaskCatalogItemsModal
          onAdd={handleAddFromCatalog}
          onClose={() => {
            setCatalogOpen(false)
          }}
          onCreateCatalogItem={() => {
            setCatalogOpen(false)
            onGoToCatalog()
          }}
        />
      )}

      {applyTemplateOpen && (
        <ApplyTaskTemplateModal
          onApply={handleApplyTemplate}
          onClose={() => {
            setApplyTemplateOpen(false)
          }}
        />
      )}

      {saveAsTemplateOpen && (
        <SaveTaskListAsTemplateModal
          tasks={tasks}
          onClose={() => {
            setSaveAsTemplateOpen(false)
          }}
        />
      )}
    </div>
  )
}
