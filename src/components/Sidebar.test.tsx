import { render, screen } from "@testing-library/react"
import { Provider } from "react-redux"
import { MemoryRouter } from "react-router-dom"
import { describe, expect, it } from "vitest"
import { makeStore } from "../app/store"
import { Sidebar } from "./Sidebar"

describe("Sidebar component", () => {
  it("renders main navigation items and brand", () => {
    const store = makeStore()
    render(
      <Provider store={store}>
        <MemoryRouter initialEntries={["/projects"]}>
          <Sidebar />
        </MemoryRouter>
      </Provider>,
    )

    expect(screen.getByText("Stroylit")).toBeInTheDocument()
    expect(screen.getByText("Заказы")).toBeInTheDocument()
    expect(screen.getByText("Прайс-лист")).toBeInTheDocument()
    expect(screen.getByText("Профиль")).toBeInTheDocument()
    expect(screen.getByText("Бесплатный тариф")).toBeInTheDocument()
    expect(screen.getByText("Выйти")).toBeInTheDocument()
  })

  it("marks active route with active class and aria-current", () => {
    const store = makeStore()
    render(
      <Provider store={store}>
        <MemoryRouter initialEntries={["/price-list"]}>
          <Sidebar />
        </MemoryRouter>
      </Provider>,
    )

    const priceListLink = screen.getByRole("link", { name: /прайс-лист/i })
    expect(priceListLink).toHaveAttribute("aria-current", "page")
    expect(priceListLink.className).toContain("active")
  })
})
