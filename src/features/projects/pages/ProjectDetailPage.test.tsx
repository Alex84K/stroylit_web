import { render, screen, fireEvent } from "@testing-library/react"
import { Provider } from "react-redux"
import { MemoryRouter, Route, Routes } from "react-router-dom"
import { describe, expect, it, vi } from "vitest"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { makeStore } from "../../../app/store"
import { ProjectDetailPage } from "./ProjectDetailPage"

const mockProject = {
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
}

vi.mock("../projects.hooks", () => ({
  useGetProject: () => ({
    data: mockProject,
    isLoading: false,
    isError: false,
    error: null,
  }),
}))

vi.mock("../customer.hooks", () => ({
  useGetProjectCustomer: () => ({
    data: {
      projectId: "p1",
      channel: "EMAIL",
      contact: "ivan@example.com",
      note: "+7 (999) 000-00-00",
    },
    isLoading: false,
  }),
}))

vi.mock("../../estimates/estimates.hooks", () => ({
  useGetEstimatesByProject: () => ({
    data: [],
    isLoading: false,
  }),
  useGetEstimate: () => ({
    data: null,
    isLoading: false,
  }),
  usePutEstimate: () => ({
    mutateAsync: vi.fn(),
    isPending: false,
  }),
  usePatchEstimate: () => ({
    mutateAsync: vi.fn(),
    isPending: false,
  }),
  useOpenEstimatePdf: () => ({
    mutate: vi.fn(),
    isPending: false,
    error: null,
  }),
  useGetCatalog: () => ({ data: [] }),
}))

vi.mock("../../estimates/catalog.hooks", () => ({
  useGetCatalog: () => ({ data: [] }),
  useGetSystemCatalog: () => ({ data: [] }),
  usePutCatalogItem: () => ({ mutate: vi.fn(), isPending: false }),
  useDeleteCatalogItem: () => ({ mutate: vi.fn(), isPending: false }),
}))

vi.mock("../../planner/catalog.hooks", () => ({
  useGetTaskCatalog: () => ({ data: [] }),
}))

describe("ProjectDetailPage (Order Hub with Tabs)", () => {
  it("renders Order Hub header and switches between Stages and Estimates tabs", () => {
    const store = makeStore()
    const queryClient = new QueryClient()

    render(
      <Provider store={store}>
        <QueryClientProvider client={queryClient}>
          <MemoryRouter initialEntries={["/projects/p1"]}>
            <Routes>
              <Route path="/projects/:id" element={<ProjectDetailPage />} />
            </Routes>
          </MemoryRouter>
        </QueryClientProvider>
      </Provider>,
    )

    expect(screen.getByText("ул. Ленина, 12, кв. 45")).toBeInTheDocument()
    expect(screen.getByText(/Иван Иванов/)).toBeInTheDocument()
    expect(screen.getByText("+7 (999) 000-00-00")).toBeInTheDocument()
    expect(screen.getByText(/ivan@example.com/)).toBeInTheDocument()
    expect(screen.getByText("Следующий шаг")).toBeInTheDocument()

    // Initially "Этапы работ" tab is active
    expect(screen.getByRole("tab", { name: /Этапы работ/i })).toHaveClass("active")

    // Switch to "Сметы" tab
    const estimatesTabButton = screen.getByRole("tab", { name: /Сметы/i })
    fireEvent.click(estimatesTabButton)

    expect(estimatesTabButton).toHaveClass("active")
    expect(screen.getByText("Итого")).toBeInTheDocument()
    expect(screen.getByText("Отправить заказчику")).toBeInTheDocument()
    expect(screen.getByText("Скачать смету файлом")).toBeInTheDocument()
  })
})
