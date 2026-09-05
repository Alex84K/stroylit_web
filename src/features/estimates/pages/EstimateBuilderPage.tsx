import type { FC } from "react"
import { Link, useParams } from "react-router-dom"
import { useGetProject } from "../../projects/projects.hooks"
import { useGetEstimatesByProject } from "../estimates.hooks"
import { EstimateBuilderView } from "../components/builder/EstimateBuilderView"
import { ApiError } from "../../../utils/api"

export const EstimateBuilderPage: FC = () => {
  const { id: projectId, estimateId } = useParams<{
    id: string
    estimateId?: string
  }>()

  const {
    data: project,
    isLoading: isProjectLoading,
    isError,
    error,
  } = useGetProject(projectId)

  const { data: estimates = [], isLoading: isEstimatesLoading } =
    useGetEstimatesByProject(projectId)

  const effectiveEstimateId = estimateId || (estimates.length > 0 ? estimates[0].id : null)

  if (isProjectLoading || (isEstimatesLoading && !estimateId)) {
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
        ? "Заказ не найден."
        : error instanceof ApiError
          ? error.message
          : "Не удалось загрузить заказ."

    return (
      <div className="container-fluid py-5 px-4">
        <div className="alert alert-danger" role="alert">
          {message}
        </div>
        <Link to="/projects" className="btn btn-outline-secondary">
          <i className="bi bi-arrow-left me-1" /> К заказам
        </Link>
      </div>
    )
  }

  return (
    <div className="container-fluid py-4 px-3 px-md-4 max-w-7xl">
      <EstimateBuilderView
        project={project}
        estimateId={effectiveEstimateId}
      />
    </div>
  )
}
