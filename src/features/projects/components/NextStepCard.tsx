import type { FC } from "react"
import type { NextStepInfo } from "../utils/nextStep"

interface NextStepCardProps {
  info: NextStepInfo
  onAction: () => void
}

export const NextStepCard: FC<NextStepCardProps> = ({ info, onAction }) => {
  return (
    <div className="card border-0 shadow-sm rounded-4 bg-primary-subtle text-primary-emphasis mb-4">
      <div className="card-body p-4 d-flex flex-wrap justify-content-between align-items-center gap-3">
        <div className="d-flex align-items-start gap-3 me-auto">
          <div
            className="rounded-3 bg-primary text-white d-flex align-items-center justify-content-center flex-shrink-0 shadow-sm"
            style={{ width: "44px", height: "44px" }}
          >
            <i className="bi bi-arrow-right-circle fs-4" />
          </div>
          <div>
            <div className="d-flex align-items-center gap-2 mb-1">
              <span className="badge bg-primary text-white small px-2 py-1">Следующий шаг</span>
              <h5 className="fw-bold mb-0 text-break">{info.title}</h5>
            </div>
            <p className="mb-0 text-secondary small">{info.description}</p>
          </div>
        </div>

        <button
          type="button"
          className="btn btn-primary fw-semibold px-4 py-2 shadow-sm d-flex align-items-center gap-2"
          onClick={onAction}
        >
          <span>{info.actionLabel}</span>
          <i className="bi bi-arrow-right" />
        </button>
      </div>
    </div>
  )
}
