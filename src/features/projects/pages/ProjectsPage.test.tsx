import { render, screen } from "@testing-library/react"
import { Provider } from "react-redux"
import { MemoryRouter } from "react-router-dom"
import { describe, expect, it, vi } from "vitest"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { makeStore } from "../../../app/store"
import { ProjectsPage } from "./ProjectsPage"

const mockProjects = [
  {
    id: "p1",
    title: "Ремонт квартиры",
    customer: "Иван Иванов",
    objectAddress: "ул. Ленина, 12, кв. 45",
    workType: "Отделка",
    status: "ACTIVE" as const,
    note: "Срочный заказ",
    taskCount: 5,
    taskDoneCount: 2,
    createdAt: "2026-08-01T10:00:00Z",
    updatedAt: "2026-08-05T12:00:00Z",
  },
]

vi.mock("../projects.hooks", () => ({
  useGetProjects: () => ({
    data: mockProjects,
    isLoading: false,
    isError: false,
    error: null,
  }),
  useCreateProject: () => ({ mutate: vi.fn(), isPending: false }),
  useUpdateProject: () => ({ mutate: vi.fn(), isPending: false }),
  useDeleteProject: () => ({ mutate: vi.fn(), isPending: false }),
}))

describe("ProjectsPage component (Order grid)", () => {
  it("renders order cards with address, customer and progress", () => {
    const store = makeStore()
    const queryClient = new QueryClient()

    render(
      <Provider store={store}>
        <QueryClientProvider client={queryClient}>
          <MemoryRouter>
            <ProjectsPage />
          </MemoryRouter>
        </QueryClientProvider>
      </Provider>,
    )

    expect(screen.getByText("Мои заказы")).toBeInTheDocument()
    expect(screen.getByText("Новый заказ")).toBeInTheDocument()
    expect(screen.getByText("ул. Ленина, 12, кв. 45")).toBeInTheDocument()
    expect(screen.getByText("Заказчик: Иван Иванов")).toBeInTheDocument()
    expect(screen.getByText("2 из 5")).toBeInTheDocument()
  })
})
