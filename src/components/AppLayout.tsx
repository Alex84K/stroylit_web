import type { FC, ReactNode } from "react"
import { useState } from "react"
import { Link } from "react-router-dom"
import { Sidebar } from "./Sidebar"

export const AppLayout: FC<{ children: ReactNode }> = ({ children }) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  return (
    <div className="d-flex min-vh-100 bg-body-tertiary">
      {/* Desktop Sidebar (fixed/sticky) */}
      <div className="d-none d-md-block flex-shrink-0 sticky-top vh-100 overflow-y-auto">
        <Sidebar />
      </div>

      {/* Main Content Area */}
      <div className="flex-grow-1 d-flex flex-column" style={{ minWidth: 0 }}>
        {/* Mobile Header (< 768px) */}
        <header className="d-md-none bg-surface border-bottom px-3 py-2 d-flex align-items-center justify-content-between sticky-top">
          <Link to="/projects" className="d-flex align-items-center gap-2 text-decoration-none text-body">
            <div
              className="rounded-3 bg-primary text-white d-flex align-items-center justify-content-center shadow-sm"
              style={{ width: "32px", height: "32px" }}
            >
              <i className="bi bi-hammer fs-6" />
            </div>
            <span className="fw-bold fs-6">Stroylit</span>
          </Link>

          <button
            type="button"
            className="btn btn-outline-secondary btn-sm"
            onClick={() => {
              setMobileMenuOpen((prev) => !prev)
            }}
            aria-label="Переключить меню"
          >
            <i className={`bi ${mobileMenuOpen ? "bi-x-lg" : "bi-list"} fs-5`} />
          </button>
        </header>

        {/* Mobile Offcanvas / Dropdown Drawer */}
        {mobileMenuOpen && (
          <div
            className="d-md-none position-fixed top-0 start-0 w-100 h-100 z-3"
            style={{ backgroundColor: "rgba(0, 0, 0, 0.5)" }}
            onClick={() => {
              setMobileMenuOpen(false)
            }}
          >
            <div
              className="bg-surface h-100 shadow-lg"
              style={{ width: "280px", maxWidth: "80%" }}
              onClick={(e) => {
                e.stopPropagation()
              }}
            >
              <Sidebar
                onNavigate={() => {
                  setMobileMenuOpen(false)
                }}
              />
            </div>
          </div>
        )}

        {/* Main Content Body */}
        <main className="flex-grow-1">{children}</main>
      </div>
    </div>
  )
}
