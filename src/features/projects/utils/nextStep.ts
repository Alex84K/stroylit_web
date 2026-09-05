import type { EstimateSummary } from "../../estimates/types"
import type { Task } from "../../planner/types"
import type { Project } from "../types"

export type NextStepAction =
  | "ADD_ESTIMATE"
  | "VIEW_ESTIMATE"
  | "CREATE_TASKS"
  | "VIEW_TASKS"
  | "COMPLETE_PROJECT"

export interface NextStepInfo {
  title: string
  description: string
  actionLabel: string
  action: NextStepAction
  targetId?: string
}

/**
 * Calculates the next recommended action for the contractor (D1).
 * Pure state-driven calculation without persistent database storage.
 */
export function calculateNextStep(
  project: Project,
  estimates: EstimateSummary[] = [],
  tasks: Task[] = [],
): NextStepInfo {
  if (project.status === "DONE" || project.status === "ARCHIVED") {
    return {
      title: "Заказ завершён",
      description: "Все работы выполнены и согласованы с заказчиком.",
      actionLabel: "Открыть архив",
      action: "VIEW_ESTIMATE",
    }
  }

  // Check estimates
  const hasEstimates = estimates.length > 0
  const activeEstimate = estimates[0]

  if (!hasEstimates) {
    return {
      title: "Смета ещё не готова",
      description: "Рассчитайте стоимость работ и материалов для заказчика.",
      actionLabel: "Добавить смету",
      action: "ADD_ESTIMATE",
    }
  }

  // Check stages / tasks:
  if (tasks.length === 0) {
    return {
      title: "Создайте этапы работ",
      description: "Сформируйте понятные этапы для контроля выполнения.",
      actionLabel: "Сформировать этапы",
      action: "CREATE_TASKS",
      targetId: activeEstimate?.id,
    }
  }

  const inProgressTask = tasks.find((t) => t.status === "in_progress")
  if (inProgressTask) {
    return {
      title: `В работе: ${inProgressTask.title || "Этап работ"}`,
      description: "Отслеживайте выполнение и отмечайте готовность этапа.",
      actionLabel: "К этапам работ",
      action: "VIEW_TASKS",
      targetId: inProgressTask.id,
    }
  }

  const nextTodoTask = tasks.find((t) => t.status === "todo")
  if (nextTodoTask) {
    return {
      title: `Следующий этап: ${nextTodoTask.title || "Этап работ"}`,
      description: "Начните выполнение следующего этапа работ.",
      actionLabel: "Взять в работу",
      action: "VIEW_TASKS",
      targetId: nextTodoTask.id,
    }
  }

  return {
    title: "Все этапы выполнены",
    description: "Все работы по смете завершены. Проверьте объект и закройте заказ.",
    actionLabel: "Завершить заказ",
    action: "COMPLETE_PROJECT",
  }
}
