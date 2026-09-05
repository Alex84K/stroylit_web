import { fireEvent, render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"
import type { Task } from "../../features/planner/types"
import { TaskListTable } from "./TaskListTable"

const makeTask = (overrides: Partial<Task> = {}): Task => ({
  id: "0198f2c1-8000-7abc-9000-000000000040",
  estimateId: "0198f2c1-8000-7abc-9000-000000000001",
  title: "Демонтаж",
  description: "",
  status: "todo",
  progressPct: 0,
  assignee: "",
  position: 0,
  deadline: "",
  createdAt: "2026-08-12T10:00:00.000Z",
  updatedAt: "2026-08-12T10:00:00.000Z",
  ...overrides,
})

const renderTable = (
  props: Partial<Parameters<typeof TaskListTable>[0]> = {},
) => {
  const defaults: Parameters<typeof TaskListTable>[0] = {
    tasks: [makeTask()],
    isPending: false,
    resetToken: null,
    onSetStatus: vi.fn(),
    onSetProgress: vi.fn(),
    onMove: vi.fn(),
    onEdit: vi.fn(),
    onRemove: vi.fn(),
    onAdd: vi.fn(),
    onOpenCatalog: vi.fn(),
  }
  const merged = { ...defaults, ...props }
  const view = render(<TaskListTable {...merged} />)
  return { ...view, props: merged }
}

describe("TaskListTable", () => {
  it("commits the progress on blur", async () => {
    const user = userEvent.setup()
    const onSetProgress = vi.fn()
    renderTable({ onSetProgress })

    // Desktop input has aria-label "Прогресс: <title>", mobile has a
    // "Прогресс" label — take the desktop one.
    const pct = screen.getAllByLabelText("Прогресс: Демонтаж")[0]
    expect(pct).toHaveValue("0")

    await user.clear(pct)
    await user.type(pct, "60")
    fireEvent.blur(pct)

    expect(onSetProgress).toHaveBeenCalledTimes(1)
    expect(onSetProgress).toHaveBeenCalledWith(
      "0198f2c1-8000-7abc-9000-000000000040",
      60,
    )
  })

  it("reverts garbage on blur and never commits", async () => {
    const user = userEvent.setup()
    const onSetProgress = vi.fn()
    renderTable({ onSetProgress })

    const pct = screen.getAllByLabelText("Прогресс: Демонтаж")[0]
    await user.clear(pct)
    await user.type(pct, "abc")
    fireEvent.blur(pct)

    expect(onSetProgress).not.toHaveBeenCalled()
    expect(pct).toHaveValue("0")
  })

  it("reverts out-of-range values on blur and never commits", async () => {
    const user = userEvent.setup()
    const onSetProgress = vi.fn()
    renderTable({ onSetProgress })

    const pct = screen.getAllByLabelText("Прогресс: Демонтаж")[0]
    await user.clear(pct)
    await user.type(pct, "150")
    fireEvent.blur(pct)

    expect(onSetProgress).not.toHaveBeenCalled()
    expect(pct).toHaveValue("0")
  })

  it("advances status on click of status action button", () => {
    const onSetStatus = vi.fn()
    renderTable({ onSetStatus })

    const btn = screen.getAllByLabelText("Сменить статус")[0]
    fireEvent.click(btn)

    expect(onSetStatus).toHaveBeenCalledTimes(1)
    expect(onSetStatus).toHaveBeenCalledWith(
      "0198f2c1-8000-7abc-9000-000000000040",
      "in_progress",
    )
  })

  it("cycles status from in_progress to done on click", () => {
    const onSetStatus = vi.fn()
    renderTable({
      onSetStatus,
      tasks: [makeTask({ status: "in_progress", progressPct: 50 })],
    })

    const btn = screen.getAllByLabelText("Сменить статус")[0]
    fireEvent.click(btn)

    expect(onSetStatus).toHaveBeenCalledTimes(1)
    expect(onSetStatus).toHaveBeenCalledWith(
      "0198f2c1-8000-7abc-9000-000000000040",
      "done",
    )
  })

  it("changes the status through the select", () => {
    const onSetStatus = vi.fn()
    renderTable({ onSetStatus })

    const select = screen.getByLabelText("Статус: Демонтаж")
    fireEvent.change(select, { target: { value: "in_progress" } })

    expect(onSetStatus).toHaveBeenCalledTimes(1)
    expect(onSetStatus).toHaveBeenCalledWith(
      "0198f2c1-8000-7abc-9000-000000000040",
      "in_progress",
    )
  })

  it("disables the up arrow on the first row", () => {
    renderTable({
      tasks: [
        makeTask(),
        makeTask({
          id: "0198f2c1-8000-7abc-9000-000000000041",
          title: "Стяжка",
        }),
      ],
    })
    const upButtons = screen.getAllByTitle("Выше")
    expect(upButtons[0]).toBeDisabled()
    expect(upButtons[1]).not.toBeDisabled()
  })

  it("deletes an empty task without confirmation", () => {
    const onRemove = vi.fn()
    renderTable({
      onRemove,
      tasks: [makeTask({ title: "", description: "", assignee: "" })],
    })

    fireEvent.click(screen.getAllByTitle("Удалить")[0])
    expect(onRemove).toHaveBeenCalledTimes(1)
  })

  it("asks for confirmation before deleting a filled task", () => {
    const onRemove = vi.fn()
    renderTable({ onRemove })

    fireEvent.click(screen.getAllByTitle("Удалить")[0])
    expect(onRemove).not.toHaveBeenCalled()

    // ConfirmDeleteModal is mounted with a danger confirm button — the row
    // delete buttons share the "Удалить" name, take the last (modal) one.
    const confirm = screen.getAllByRole("button", { name: "Удалить" })
    fireEvent.click(confirm[confirm.length - 1])
    expect(onRemove).toHaveBeenCalledTimes(1)
  })
})
