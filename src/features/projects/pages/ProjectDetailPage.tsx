import type { FC } from "react"
import { useState } from "react"
import { Link, useParams } from "react-router-dom"
import { ApiError } from "../../../utils/api"
import { EstimateBuilderView } from "../../estimates/components/builder/EstimateBuilderView"
import { MeasurementTab } from "../../../components/measurement/MeasurementTab"
import { PlannerTab } from "../../../components/planner/PlannerTab"
import { ProjectFormModal } from "../components/ProjectFormModal"
import { NextStepCard } from "../components/NextStepCard"
import { calculateNextStep } from "../utils/nextStep"
import { useGetEstimatesByProject } from "../../estimates/estimates.hooks"
import { useGetTasksByEstimate } from "../../planner/tasks.hooks"
import { formatDateTime } from "../format"
import { useGetProject } from "../projects.hooks"
import { useGetProjectCustomer } from "../customer.hooks"
import {
  PROJECT_STATUS_BADGE,
  PROJECT_STATUS_LABELS,
} from "../types"

export const ProjectDetailPage: FC = () => {
  const { id } = useParams<{ id: string }>()
  const { data: project, isLoading, isError, error } = useGetProject(id)
  const { data: customerContact } = useGetProjectCustomer(id)
  const { data: estimates = [] } = useGetEstimatesByProject(id)
  const activeEstimateId = estimates[0]?.id
  const { data: tasks = [] } = useGetTasksByEstimate(activeEstimateId)

  const [activeTab, setActiveTab] = useState<"stages" | "estimates">("stages")
  const [viewMeasurements, setViewMeasurements] = useState(false)
  const [editOpen, setEditOpen] = useState(false)

  if (isLoading) {
    return (
      <div className="container-fluid py-5 d-flex justify-content-center">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Загрузка...</span>
        </div>
      </div>
    )
  }

  if (isError || !project) {
    const message =
      error instanceof ApiError && error.status === 404
        ? "Заказ не найден — возможно, он был удалён."
        : error instanceof ApiError
          ? error.message
          : "Не удалось загрузить заказ."
    return (
      <div className="container-fluid py-5 px-4">
        <div className="alert alert-danger" role="alert">
          {message}
        </div>
        <Link to="/projects" className="btn btn-outline-secondary">
          <i className="bi bi-arrow-left me-1" />К списку заказов
        </Link>
      </div>
    )
  }

  // If in dedicated measurement mode:
  if (viewMeasurements) {
    return (
      <div className="container-fluid py-4 px-3 px-md-4 max-w-7xl">
        <div className="d-flex align-items-center justify-content-between mb-4">
          <button
            type="button"
            className="btn btn-outline-secondary btn-sm fw-semibold d-flex align-items-center gap-2"
            onClick={() => {
              setViewMeasurements(false)
            }}
          >
            <i className="bi bi-arrow-left" />
            <span>Назад к заказу</span>
          </button>
          <h4 className="fw-bold mb-0">Замеры и контуры объекта</h4>
          <span className="badge bg-secondary-subtle text-secondary">{project.title || "Заказ"}</span>
        </div>

        <div className="card shadow-sm border-0 rounded-4">
          <div className="card-body p-3 p-md-4">
            <MeasurementTab project={project} />
          </div>
        </div>
      </div>
    )
  }

  const nextStepInfo = calculateNextStep(project, estimates, tasks)

  const handleNextStepAction = () => {
    if (nextStepInfo.action === "ADD_ESTIMATE" || nextStepInfo.action === "VIEW_ESTIMATE") {
      setActiveTab("estimates")
    } else {
      setActiveTab("stages")
    }
  }

  return (
    <div className="container-fluid py-4 px-3 px-md-4 max-w-7xl">
      {/* Back breadcrumb */}
      <Link
        to="/projects"
        className="text-decoration-none text-muted small d-inline-flex align-items-center gap-1 mb-3"
      >
        <i className="bi bi-arrow-left" />
        <span>К списку заказов</span>
      </Link>

      {/* Order Header */}
      <div className="card shadow-sm border-0 rounded-4 p-4 mb-4 bg-surface">
        <div className="d-flex flex-wrap justify-content-between align-items-start gap-3">
          <div className="me-auto" style={{ minWidth: 0 }}>
            <div className="d-flex align-items-center flex-wrap gap-2 mb-2">
              <h3 className="fw-bold mb-0 text-break">
                {project.objectAddress || project.title || "Без названия"}
              </h3>
              <span className={`badge ${PROJECT_STATUS_BADGE[project.status]}`}>
                {PROJECT_STATUS_LABELS[project.status]}
              </span>
            </div>

            <div className="d-flex flex-wrap column-gap-4 row-gap-1 text-muted small">
              {project.customer && (
                <span className="fw-medium text-body">
                  <i className="bi bi-person me-1 text-secondary" />
                  {project.customer}
                </span>
              )}
              {customerContact?.note && (
                <span>
                  <i className="bi bi-telephone me-1 text-secondary" />
                  <a
                    href={`tel:${customerContact.note.replace(/\s+/g, "")}`}
                    className="text-decoration-none text-muted"
                  >
                    {customerContact.note}
                  </a>
                </span>
              )}
              {customerContact?.contact && (
                <span>
                  <i className="bi bi-envelope me-1 text-secondary" />
                  <a
                    href={`mailto:${customerContact.contact}`}
                    className="text-decoration-none text-muted"
                  >
                    {customerContact.contact}
                  </a>
                </span>
              )}
              {project.workType && (
                <span>
                  <i className="bi bi-hammer me-1 text-secondary" />
                  {project.workType}
                </span>
              )}
              <span>
                <i className="bi bi-clock me-1 text-secondary" />
                Обновлён {formatDateTime(project.updatedAt)}
              </span>
            </div>

            {project.note && (
              <div className="text-muted small mt-2 text-break">
                {project.note}
              </div>
            )}
          </div>

          <div className="d-flex align-items-center gap-2">
            <button
              type="button"
              className="btn btn-outline-primary btn-sm fw-semibold d-flex align-items-center gap-1"
              onClick={() => {
                setViewMeasurements(true)
              }}
            >
              <i className="bi bi-bounding-box" />
              <span>Замеры</span>
            </button>
            <button
              type="button"
              className="btn btn-outline-secondary btn-sm fw-semibold d-flex align-items-center gap-1"
              onClick={() => {
                setEditOpen(true)
              }}
            >
              <i className="bi bi-pencil" />
              <span>Редактировать</span>
            </button>
          </div>
        </div>
      </div>

      {/* Leading Next-Step Card */}
      <NextStepCard info={nextStepInfo} onAction={handleNextStepAction} />

      {/* Navigation Tabs */}
      <div className="d-flex align-items-center justify-content-between flex-wrap gap-3 mb-4">
        <ul className="nav nav-pills bg-light p-1 rounded-3 border d-inline-flex gap-1" role="tablist">
          <li className="nav-item" role="presentation">
            <button
              type="button"
              className={`nav-link fw-semibold px-4 py-2 d-flex align-items-center gap-2 rounded-2 ${
                activeTab === "stages" ? "active shadow-sm" : "text-muted"
              }`}
              onClick={() => {
                setActiveTab("stages")
              }}
              role="tab"
              aria-selected={activeTab === "stages"}
            >
              <i className="bi bi-list-check" />
              <span>Этапы работ</span>
              <span
                className={`badge rounded-pill ${
                  activeTab === "stages"
                    ? "bg-white text-primary"
                    : "bg-secondary-subtle text-secondary"
                }`}
              >
                {tasks.length}
              </span>
            </button>
          </li>
          <li className="nav-item" role="presentation">
            <button
              type="button"
              className={`nav-link fw-semibold px-4 py-2 d-flex align-items-center gap-2 rounded-2 ${
                activeTab === "estimates" ? "active shadow-sm" : "text-muted"
              }`}
              onClick={() => {
                setActiveTab("estimates")
              }}
              role="tab"
              aria-selected={activeTab === "estimates"}
            >
              <i className="bi bi-journal-text" />
              <span>Сметы</span>
              <span
                className={`badge rounded-pill ${
                  activeTab === "estimates"
                    ? "bg-white text-primary"
                    : "bg-secondary-subtle text-secondary"
                }`}
              >
                {estimates.length}
              </span>
            </button>
          </li>
        </ul>
      </div>

      {/* Tab Content Panes */}
      <div className="tab-content">
        {/* Stages Tab */}
        {activeTab === "stages" && (
          <div className="card shadow-sm border-0 rounded-4" id="order-stages-section">
            <div className="card-header bg-transparent border-bottom p-4 pb-3">
              <div className="d-flex justify-content-between align-items-center">
                <h5 className="fw-bold mb-0 d-flex align-items-center gap-2">
                  <i className="bi bi-list-check text-primary" />
                  <span>Этапы работ</span>
                </h5>
                <span className="badge bg-secondary-subtle text-secondary small">
                  {tasks.length} {tasks.length === 1 ? "этап" : "этапов"}
                </span>
              </div>
            </div>
            <div className="card-body p-4">
              <PlannerTab
                projectId={project.id}
                onGoToEstimates={() => {
                  setActiveTab("estimates")
                }}
              />
            </div>
          </div>
        )}

        {/* Estimates Tab: WEB 04 Builder */}
        {activeTab === "estimates" && (
          <div id="order-estimates-section">
            <EstimateBuilderView
              project={project}
              estimateId={activeEstimateId}
              onExit={() => {
                setActiveTab("stages")
              }}
            />
          </div>
        )}
      </div>

      {editOpen && (
        <ProjectFormModal
          project={project}
          onClose={() => {
            setEditOpen(false)
          }}
        />
      )}
    </div>
  )
}
