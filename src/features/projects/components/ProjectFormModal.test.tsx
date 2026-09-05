import { render, screen, fireEvent, waitFor } from "@testing-library/react"
import { describe, expect, it, vi, beforeEach } from "vitest"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { ProjectFormModal } from "./ProjectFormModal"
import { projectsApi } from "../projects.api"
import { customerApi } from "../customer.api"

vi.mock("../projects.api", () => ({
  projectsApi: {
    put: vi.fn().mockResolvedValue({ id: "p1" }),
    patch: vi.fn().mockResolvedValue({ id: "p1" }),
  },
}))

vi.mock("../customer.api", () => ({
  customerApi: {
    getByProjectId: vi.fn().mockResolvedValue(null),
    put: vi.fn().mockResolvedValue({
      projectId: "p1",
      channel: "EMAIL",
      contact: "test@example.com",
      note: "+7 (999) 000-00-00",
    }),
  },
}))

describe("ProjectFormModal", () => {
  let queryClient: QueryClient

  beforeEach(() => {
    queryClient = new QueryClient()
    vi.clearAllMocks()
  })

  it("renders phone and email fields in create mode and submits customer data on save", async () => {
    const onClose = vi.fn()

    render(
      <QueryClientProvider client={queryClient}>
        <ProjectFormModal project={null} onClose={onClose} />
      </QueryClientProvider>,
    )

    expect(screen.getByLabelText(/Телефон/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/^Email/i)).toBeInTheDocument()

    fireEvent.change(screen.getByLabelText(/Название заказа/i), {
      target: { value: "Ремонт студии" },
    })
    fireEvent.change(screen.getByLabelText(/Заказчик \(Имя\)/i), {
      target: { value: "Алексей" },
    })
    fireEvent.change(screen.getByLabelText(/Телефон/i), {
      target: { value: "+7 (999) 111-22-33" },
    })
    fireEvent.change(screen.getByLabelText(/^Email/i), {
      target: { value: "alex@example.com" },
    })

    fireEvent.click(screen.getByRole("button", { name: "Сохранить" }))

    await waitFor(() => {
      expect(projectsApi.put).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          title: "Ремонт студии",
          customer: "Алексей",
        }),
      )
      expect(customerApi.put).toHaveBeenCalledWith(
        expect.any(String),
        {
          channel: "EMAIL",
          contact: "alex@example.com",
          note: "+7 (999) 111-22-33",
        },
      )
      expect(onClose).toHaveBeenCalled()
    })
  })

  it("validates invalid email format and prevents submission", async () => {
    const onClose = vi.fn()

    render(
      <QueryClientProvider client={queryClient}>
        <ProjectFormModal project={null} onClose={onClose} />
      </QueryClientProvider>,
    )

    fireEvent.change(screen.getByLabelText(/^Email/i), {
      target: { value: "not-an-email" },
    })

    fireEvent.click(screen.getByRole("button", { name: "Сохранить" }))

    await waitFor(() => {
      expect(
        screen.getByText("Введите корректный адрес электронной почты"),
      ).toBeInTheDocument()
      expect(projectsApi.put).not.toHaveBeenCalled()
      expect(customerApi.put).not.toHaveBeenCalled()
    })
  })

  it("validates invalid phone characters and prevents submission", async () => {
    const onClose = vi.fn()

    render(
      <QueryClientProvider client={queryClient}>
        <ProjectFormModal project={null} onClose={onClose} />
      </QueryClientProvider>,
    )

    fireEvent.change(screen.getByLabelText(/Телефон/i), {
      target: { value: "invalid_phone_#123" },
    })

    fireEvent.click(screen.getByRole("button", { name: "Сохранить" }))

    await waitFor(() => {
      expect(
        screen.getByText(/Недопустимый формат телефона/i),
      ).toBeInTheDocument()
      expect(projectsApi.put).not.toHaveBeenCalled()
      expect(customerApi.put).not.toHaveBeenCalled()
    })
  })
})
