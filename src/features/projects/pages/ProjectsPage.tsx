import type { FC } from "react"
import { useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import { ApiError } from "../../../utils/api"
import { DeleteProjectModal } from "../components/DeleteProjectModal"
import { ProjectFormModal } from "../components/ProjectFormModal"
import { formatDateTime } from "../format"
import { useGetProjects } from "../projects.hooks"
import {
  PROJECT_STATUSES,
  PROJECT_STATUS_BADGE,
  PROJECT_STATUS_LABELS,
  type Project,
} from "../types"


export const ProjectsPage: FC = () => {
  const navigate = useNavigate()
  const { data: projects = [], isLoading, isError, error } = useGetProjects()

  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState<"ALL" | (typeof PROJECT_STATUSES)[number]>(
    "ALL",
  )

  const [createOpen, setCreateOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<Project | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Project | null>(null)

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return projects.filter((p) => {
      const matchStatus = statusFilter === "ALL" || p.status === statusFilter
      const matchSearch =
        q === "" ||
        p.title.toLowerCase().includes(q) ||
        p.customer.toLowerCase().includes(q) ||
        p.objectAddress.toLowerCase().includes(q) ||
        p.workType.toLowerCase().includes(q)
      return matchStatus && matchSearch
    })
  }, [projects, search, statusFilter])

  const loadError =
    error instanceof ApiError ? error.message : "Не удалось загрузить список заказов"

  const activeCount = projects.filter((p) => p.status === "ACTIVE").length

  return (
    <div className="container-fluid py-4 px-3 px-md-4 max-w-7xl">
      {/* Header */}
      <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-4">
        <div>
          <h2 className="fw-bold mb-1">Мои заказы</h2>
          <p className="text-muted mb-0 small">
            {isLoading
              ? "Загрузка..."
              : `${projects.length} ${projects.length === 1 ? "заказ" : "заказов"} (${activeCount} активных)`}
          </p>
        </div>
        <button
          type="button"
          className="btn btn-primary fw-semibold d-flex align-items-center gap-2 shadow-sm"
          onClick={() => {
            setCreateOpen(true)
          }}
        >
          <i className="bi bi-plus-lg" />
          <span>Новый заказ</span>
        </button>
      </div>

      {/* Filters */}
      <div className="row g-2 mb-4">
        <div className="col-12 col-md-7 col-lg-6">
          <div className="input-group">
            <span className="input-group-text bg-surface border-end-0">
              <i className="bi bi-search text-muted" />
            </span>
            <input
              type="text"
              className="form-control border-start-0"
              placeholder="Поиск по названию, адресу, клиенту..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value)
              }}
            />
          </div>
        </div>
        <div className="col-12 col-sm-6 col-md-4 col-lg-3">
          <select
            className="form-select"
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value as typeof statusFilter)
            }}
          >
            <option value="ALL">Все статусы</option>
            {PROJECT_STATUSES.map((s) => (
              <option key={s} value={s}>
                {PROJECT_STATUS_LABELS[s]}
              </option>
            ))}
          </select>
        </div>
      </div>

      {isError && (
        <div className="alert alert-danger" role="alert">
          {loadError}
        </div>
      )}

      {/* Card Grid */}
      {isLoading ? (
        <div className="row row-cols-1 row-cols-md-2 row-cols-xl-3 g-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div className="col" key={i}>
              <div className="card shadow-sm border-0 rounded-4 p-4 placeholder-glow h-100">
                <span className="placeholder col-7 mb-2" />
                <span className="placeholder col-4 mb-4" />
                <span className="placeholder col-10 mb-2" />
                <span className="placeholder col-6 mt-auto" />
              </div>
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="card shadow-sm border-0 rounded-4 p-5 text-center text-muted">
          <i className="bi bi-inbox fs-1 mb-2 text-muted" />
          <h5>{projects.length === 0 ? "Заказов пока нет" : "Ничего не найдено"}</h5>
          <p className="small mb-3">
            {projects.length === 0
              ? "Создайте свой первый заказ, указав адрес и заказчика."
              : "Попробуйте изменить параметры поиска или фильтр статуса."}
          </p>
          {projects.length === 0 && (
            <div>
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={() => {
                  setCreateOpen(true)
                }}
              >
                <i className="bi bi-plus-lg me-1" />
                Создать заказ
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="row row-cols-1 row-cols-md-2 row-cols-xl-3 g-3">
          {filtered.map((p) => {
            const hasTasks = typeof p.taskCount === "number" && p.taskCount > 0
            const doneRatio = hasTasks ? Math.round(((p.taskDoneCount ?? 0) / (p.taskCount ?? 1)) * 100) : 0

            return (
              <div className="col" key={p.id}>
                <div
                  className="card shadow-sm border-0 rounded-4 h-100 d-flex flex-column transition-all"
                  style={{ cursor: "pointer" }}
                  onClick={() => {
                    void navigate(`/projects/${p.id}`)
                  }}
                >
                  <div className="card-body p-4 d-flex flex-column">
                    {/* Card Header: Address / Title + Status Badge */}
                    <div className="d-flex justify-content-between align-items-start gap-2 mb-2">
                      <h5 className="fw-bold mb-0 text-break text-truncate" title={p.objectAddress || p.title || "Без названия"}>
                        {p.objectAddress || p.title || "Без названия"}
                      </h5>
                      <span className={`badge ${PROJECT_STATUS_BADGE[p.status]} flex-shrink-0`}>
                        {PROJECT_STATUS_LABELS[p.status]}
                      </span>
                    </div>

                    {/* Customer */}
                    <div className="text-muted small mb-3 d-flex align-items-center gap-2">
                      <i className="bi bi-person text-secondary" />
                      <span className="text-truncate">
                        {p.customer ? `Заказчик: ${p.customer}` : "Заказчик не указан"}
                      </span>
                    </div>

                    {/* Work type / Note */}
                    {p.workType && (
                      <div className="small text-muted mb-2 text-truncate">
                        <i className="bi bi-hammer me-1 text-secondary" />
                        {p.workType}
                      </div>
                    )}

                    {/* Progress / Tasks */}
                    <div className="mt-auto pt-3 border-top">
                      {hasTasks ? (
                        <div className="mb-2">
                          <div className="d-flex justify-content-between align-items-center small mb-1 text-muted">
                            <span>Выполнено этапов</span>
                            <span className="fw-semibold">
                              {p.taskDoneCount ?? 0} из {p.taskCount}
                            </span>
                          </div>
                          <div className="progress" style={{ height: "6px" }}>
                            <div
                              className="progress-bar bg-success"
                              role="progressbar"
                              style={{ width: `${doneRatio}%` }}
                              aria-valuenow={doneRatio}
                              aria-valuemin={0}
                              aria-valuemax={100}
                            />
                          </div>
                        </div>
                      ) : (
                        <div className="small text-muted mb-2 fst-italic">
                          Этапы работ пока не сформированы
                        </div>
                      )}

                      <div className="d-flex justify-content-between align-items-center pt-2">
                        <span className="text-muted small" style={{ fontSize: "12px" }}>
                          {formatDateTime(p.updatedAt)}
                        </span>

                        <div
                          className="btn-group btn-group-sm"
                          onClick={(e) => {
                            e.stopPropagation()
                          }}
                        >
                          <button
                            type="button"
                            className="btn btn-outline-secondary"
                            title="Редактировать"
                            onClick={() => {
                              setEditTarget(p)
                            }}
                          >
                            <i className="bi bi-pencil" />
                          </button>
                          <button
                            type="button"
                            className="btn btn-outline-danger"
                            title="Удалить"
                            onClick={() => {
                              setDeleteTarget(p)
                            }}
                          >
                            <i className="bi bi-trash" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {createOpen && <ProjectFormModal project={null} onClose={() => { setCreateOpen(false) }} />}

      {editTarget && (
        <ProjectFormModal project={editTarget} onClose={() => { setEditTarget(null) }} />
      )}

      {deleteTarget && (
        <DeleteProjectModal project={deleteTarget} onClose={() => { setDeleteTarget(null) }} />
      )}
    </div>
  )
}
