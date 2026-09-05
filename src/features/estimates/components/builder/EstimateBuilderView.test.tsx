import { render, screen, fireEvent } from "@testing-library/react"
import { Provider } from "react-redux"
import { MemoryRouter } from "react-router-dom"
import { describe, expect, it, vi } from "vitest"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { makeStore } from "../../../../app/store"
import { EstimateBuilderView } from "./EstimateBuilderView"
import type { Project } from "../../../projects/types"
import type { CatalogItem } from "../../types"

const mockProject: Project = {
  id: "proj-1",
  title: "Ремонт квартиры",
  customer: "Ирина Петрова",
  objectAddress: "ул. Ленина, 12, кв. 45",
  workType: "Отделка",
  status: "ACTIVE",
  note: "",
  taskCount: 0,
  taskDoneCount: 0,
  createdAt: "2026-08-01T10:00:00Z",
  updatedAt: "2026-08-05T12:00:00Z",
}

const mockCatalog: CatalogItem[] = [
  {
    id: "cat-1",
    title: "Демонтаж старых обоев",
    description: "",
    unit: "м²",
    category: "Демонтаж",
    isFavorite: false,
    purchasePriceMinor: 0,
    sellingPriceMinor: 12000,
    createdAt: "2026-08-01T10:00:00Z",
    updatedAt: "2026-08-01T10:00:00Z",
  },
  {
    id: "cat-2",
    title: "Монтаж электропроводки",
    description: "",
    unit: "п.м.",
    category: "Электрика",
    isFavorite: true,
    purchasePriceMinor: 0,
    sellingPriceMinor: 18000,
    createdAt: "2026-08-01T10:00:00Z",
    updatedAt: "2026-08-01T10:00:00Z",
  },
]

vi.mock("../../catalog.hooks", () => ({
  useGetCatalog: () => ({
    data: mockCatalog,
    isLoading: false,
  }),
  useGetSystemCatalog: () => ({
    data: [],
    isLoading: false,
  }),
  usePutCatalogItem: () => ({
    mutate: vi.fn(),
    isPending: false,
  }),
  useDeleteCatalogItem: () => ({
    mutate: vi.fn(),
    isPending: false,
  }),
}))

vi.mock("../../estimates.hooks", () => ({
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
  useSendEstimate: () => ({
    mutateAsync: vi.fn().mockResolvedValue({ id: "1", status: "SENT", publicUrl: "http://localhost:5173/estimate?token=abc", notified: true }),
    isPending: false,
  }),
}))

describe("EstimateBuilderView (WEB 04)", () => {
  it("renders header, catalog picker, and estimate cart panel", () => {
    const store = makeStore()
    const queryClient = new QueryClient()

    render(
      <Provider store={store}>
        <QueryClientProvider client={queryClient}>
          <MemoryRouter>
            <EstimateBuilderView project={mockProject} />
          </MemoryRouter>
        </QueryClientProvider>
      </Provider>
    )

    // Header info
    expect(screen.getAllByText("Смета").length).toBeGreaterThanOrEqual(1)
    expect(
      screen.getByText("ул. Ленина, 12, кв. 45 · Ирина Петрова")
    ).toBeInTheDocument()

    // Search and Catalog
    expect(
      screen.getByPlaceholderText("Найти работу, например «обои»")
    ).toBeInTheDocument()
    expect(screen.getByText("Демонтаж старых обоев")).toBeInTheDocument()

    // Switch to Электрика
    const elChip = screen.getByRole("button", { name: "Электрика" })
    fireEvent.click(elChip)
    expect(screen.getByText("Монтаж электропроводки")).toBeInTheDocument()

    // Cart panel
    expect(screen.getByText("Итого")).toBeInTheDocument()
    expect(screen.getByText("Отправить заказчику")).toBeInTheDocument()
    expect(screen.getByText("Скачать смету файлом")).toBeInTheDocument()
  })

  it("adds an item from catalog to cart and updates total sum", () => {
    const store = makeStore()
    const queryClient = new QueryClient()

    render(
      <Provider store={store}>
        <QueryClientProvider client={queryClient}>
          <MemoryRouter>
            <EstimateBuilderView project={mockProject} />
          </MemoryRouter>
        </QueryClientProvider>
      </Provider>
    )

    const addBtns = screen.getAllByTitle("Добавить в смету")
    fireEvent.click(addBtns[0])

    // Should now display 1 позиция and sum
    expect(screen.getByText("1 позиция")).toBeInTheDocument()
    expect(screen.getAllByText(/120/).length).toBeGreaterThanOrEqual(1)
  })

  it("filters catalog items by search query", () => {
    const store = makeStore()
    const queryClient = new QueryClient()

    render(
      <Provider store={store}>
        <QueryClientProvider client={queryClient}>
          <MemoryRouter>
            <EstimateBuilderView project={mockProject} />
          </MemoryRouter>
        </QueryClientProvider>
      </Provider>
    )

    const searchInput = screen.getByPlaceholderText(
      "Найти работу, например «обои»"
    )
    fireEvent.change(searchInput, { target: { value: "электро" } })

    expect(screen.queryByText("Демонтаж старых обоев")).not.toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Добавить Монтаж электропроводки" })).toBeInTheDocument()
  })
})
