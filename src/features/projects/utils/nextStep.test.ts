import { describe, expect, it } from "vitest"
import type { EstimateSummary } from "../../estimates/types"
import type { Task } from "../../planner/types"
import type { Project } from "../types"
import { calculateNextStep } from "./nextStep"

const baseProject: Project = {
  id: "p1",
  title: "Ремонт квартиры",
  customer: "Иван",
  objectAddress: "ул. Мира, 1",
  workType: "Отделка",
  status: "ACTIVE",
  note: "",
  createdAt: "2026-01-01T00:00:00Z",
  updatedAt: "2026-01-01T00:00:00Z",
}

const baseEstimate: EstimateSummary = {
  id: "est1",
  projectId: "p1",
  number: 1,
  title: "Основная смета",
  currency: "RUB",
  taxRateBp: 0,
  discountBp: 0,
  note: "",
  totals: {
    costMinor: 0,
    netMinor: 0,
    discountMinor: 0,
    netAfterDiscountMinor: 0,
    taxMinor: 0,
    grossMinor: 0,
    marginMinor: 0,
  },
  createdAt: "2026-01-01T00:00:00Z",
  updatedAt: "2026-01-01T00:00:00Z",
}

describe("calculateNextStep", () => {
  it("returns 'Смета ещё не готова' when no estimates exist", () => {
    const step = calculateNextStep(baseProject, [], [])
    expect(step.title).toBe("Смета ещё не готова")
    expect(step.action).toBe("ADD_ESTIMATE")
  })

  it("returns 'Создайте этапы работ' when estimate exists but no tasks exist", () => {
    const step = calculateNextStep(baseProject, [baseEstimate], [])
    expect(step.title).toBe("Создайте этапы работ")
    expect(step.action).toBe("CREATE_TASKS")
  })

  it("returns 'В работе: ...' when there is an in_progress task", () => {
    const tasks: Task[] = [
      {
        id: "t1",
        estimateId: "est1",
        title: "Демонтаж перегородок",
        description: "",
        assignee: "Петр",
        deadline: "",
        position: 0,
        progressPct: 30,
        status: "in_progress",
        createdAt: "2026-01-01T00:00:00Z",
        updatedAt: "2026-01-01T00:00:00Z",
      },
    ]
    const step = calculateNextStep(baseProject, [baseEstimate], tasks)
    expect(step.title).toContain("В работе: Демонтаж перегородок")
    expect(step.action).toBe("VIEW_TASKS")
  })

  it("returns 'Все этапы выполнены' when all tasks are done", () => {
    const tasks: Task[] = [
      {
        id: "t1",
        estimateId: "est1",
        title: "Демонтаж",
        description: "",
        assignee: "Петр",
        deadline: "",
        position: 0,
        progressPct: 100,
        status: "done",
        createdAt: "2026-01-01T00:00:00Z",
        updatedAt: "2026-01-01T00:00:00Z",
      },
    ]
    const step = calculateNextStep(baseProject, [baseEstimate], tasks)
    expect(step.title).toBe("Все этапы выполнены")
    expect(step.action).toBe("COMPLETE_PROJECT")
  })
})
