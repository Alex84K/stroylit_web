import type { FC } from "react"
import { Link, useLocation, useNavigate } from "react-router-dom"
import { useAppDispatch, useAppSelector } from "../app/hooks"
import { logoutAsync } from "../features/auth/authSlice"
import { ThemeToggle } from "./ThemeToggle"

interface SidebarProps {
  onNavigate?: () => void
}

export const Sidebar: FC<SidebarProps> = ({ onNavigate }) => {
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const location = useLocation()
  const { user } = useAppSelector((state) => state.auth)

  const navItems = [
    {
      to: "/projects",
      label: "Заказы",
      icon: "bi-house-door",
      active: location.pathname === "/projects" || location.pathname.startsWith("/projects/"),
    },
    {
      to: "/price-list",
      label: "Прайс-лист",
      icon: "bi-list-ul",
      active: location.pathname === "/price-list",
    },
    {
      to: "/profile",
      label: "Профиль",
      icon: "bi-person",
      active: location.pathname === "/profile",
    },
  ]

  const handleLogout = () => {
    onNavigate?.()
    void dispatch(logoutAsync()).then(() => {
      void navigate("/login")
    })
  }

  const displayName =
    user?.firstName
      ? `${user.firstName}${user.lastName ? ` ${user.lastName}` : ""}`
      : user?.email || "Мастер"

  return (
    <aside
      className="d-flex flex-column flex-shrink-0 bg-surface border-end h-100"
      style={{ width: "260px" }}
      aria-label="Основная навигация"
    >
      {/* Brand Header */}
      <div className="p-4 pb-3 border-bottom d-flex align-items-center justify-content-between">
        <Link
          to="/projects"
          className="d-flex align-items-center gap-2 text-decoration-none text-body"
          onClick={onNavigate}
        >
          <div
            className="rounded-3 bg-primary text-white d-flex align-items-center justify-content-center shadow-sm"
            style={{ width: "36px", height: "36px" }}
          >
            <i className="bi bi-hammer fs-5" />
          </div>
          <span className="fs-5 fw-bold tracking-tight">Stroylit</span>
        </Link>
      </div>

      {/* Navigation items */}
      <nav className="p-3 flex-grow-1">
        <ul className="nav nav-pills flex-column gap-1">
          {navItems.map((item) => (
            <li className="nav-item" key={item.to}>
              <Link
                to={item.to}
                onClick={onNavigate}
                className={`nav-link d-flex align-items-center gap-3 px-3 py-2 rounded-3 fw-medium ${
                  item.active ? "active bg-primary text-white shadow-sm" : "text-body"
                }`}
                aria-current={item.active ? "page" : undefined}
              >
                <i className={`bi ${item.icon} fs-5`} />
                <span>{item.label}</span>
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      {/* Profile & Footer */}
      <div className="p-3 border-top bg-body-tertiary">
        <div className="d-flex align-items-center gap-2 mb-3">
          <div
            className="rounded-circle bg-primary-subtle text-primary fw-bold d-flex align-items-center justify-content-center flex-shrink-0"
            style={{ width: "40px", height: "40px", fontSize: "16px" }}
          >
            {user?.firstName ? user.firstName[0].toUpperCase() : <i className="bi bi-person" />}
          </div>
          <div className="overflow-hidden me-auto" style={{ minWidth: 0 }}>
            <div className="fw-semibold text-truncate small" title={displayName}>
              {displayName}
            </div>
            <div className="text-muted small" style={{ fontSize: "12px" }}>
              Бесплатный тариф
            </div>
          </div>
          <ThemeToggle />
        </div>

        <button
          type="button"
          onClick={handleLogout}
          className="btn btn-outline-danger btn-sm w-100 d-flex align-items-center justify-content-center gap-2"
        >
          <i className="bi bi-box-arrow-right" />
          <span>Выйти</span>
        </button>
      </div>
    </aside>
  )
}
