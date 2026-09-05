import type { FC } from "react"
import { useState, useEffect } from "react"
import { useSearchParams } from "react-router-dom"
import { apiFetch, ApiError } from "../../../utils/api"
import { formatPlainMinor } from "../utils/money"

interface PublicLine {
  position: number
  title: string
  description: string
  unit: string
  quantity: number
  priceMinor: number
  sumMinor: number
}

interface PublicTotals {
  netMinor: number
  discountMinor: number
  discountBp: number
  netAfterDiscountMinor: number
  taxMinor: number
  taxRateBp: number
  grossMinor: number
}

interface PublicEstimate {
  number: number
  title: string
  currency: string
  note: string
  status: "DRAFT" | "SENT" | "APPROVED" | "DECLINED"
  lines: PublicLine[]
  totals: PublicTotals
}

export const PublicEstimatePage: FC = () => {
  const [searchParams] = useSearchParams()
  const token = searchParams.get("token")

  const [estimate, setEstimate] = useState<PublicEstimate | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [errorStatus, setErrorStatus] = useState<number | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [actionPending, setActionPending] = useState(false)
  const [actionMessage, setActionMessage] = useState<string | null>(null)

  const fetchEstimate = async () => {
    if (!token) {
      setIsLoading(false)
      setErrorStatus(400)
      return
    }

    setIsLoading(true)
    setErrorStatus(null)
    try {
      const data = await apiFetch<PublicEstimate>(`/api/v1/public/estimates/${token}`)
      setEstimate(data)
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        setErrorStatus(err.status)
        setErrorMessage(err.message)
      } else {
        setErrorStatus(500)
        setErrorMessage("Не удалось загрузить смету")
      }
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    void fetchEstimate()
  }, [token])

  const handleApprove = async () => {
    if (!token) return
    setActionPending(true)
    setActionMessage(null)
    try {
      const res = await apiFetch<{ status: "APPROVED" }>(
        `/api/v1/public/estimates/${token}/approve`,
        { method: "POST" }
      )
      if (estimate) {
        setEstimate({ ...estimate, status: res.status })
      }
      setActionMessage("Смета успешно согласована!")
    } catch (err: unknown) {
      if (err instanceof Error) {
        setActionMessage(err.message)
      }
    } finally {
      setActionPending(false)
    }
  }

  const handleDecline = async () => {
    if (!token) return
    if (!window.confirm("Вы уверены, что хотите отклонить эту смету?")) return

    setActionPending(true)
    setActionMessage(null)
    try {
      const res = await apiFetch<{ status: "DECLINED" }>(
        `/api/v1/public/estimates/${token}/decline`,
        { method: "POST" }
      )
      if (estimate) {
        setEstimate({ ...estimate, status: res.status })
      }
      setActionMessage("Смета отклонена")
    } catch (err: unknown) {
      if (err instanceof Error) {
        setActionMessage(err.message)
      }
    } finally {
      setActionPending(false)
    }
  }

  if (isLoading) {
    return (
      <div className="min-vh-100 d-flex align-items-center justify-content-center bg-light">
        <div className="text-center">
          <div className="spinner-border text-primary mb-3" role="status" />
          <div className="text-secondary fw-medium">Загрузка сметы...</div>
        </div>
      </div>
    )
  }

  if (errorStatus === 410) {
    return (
      <div className="min-vh-100 d-flex align-items-center justify-content-center bg-light p-3">
        <div className="card shadow-sm border-0 rounded-4 p-4 p-md-5 text-center" style={{ maxWidth: 480 }}>
          <i className="bi bi-clock-history text-warning fs-1 mb-3" />
          <h4 className="fw-bold mb-2">Срок действия ссылки истёк</h4>
          <p className="text-secondary small mb-0">
            Срок действия этой ссылки на смету закончился. Пожалуйста, обратитесь к мастеру за актуальной ссылкой.
          </p>
        </div>
      </div>
    )
  }

  if (errorStatus === 404 || !estimate) {
    return (
      <div className="min-vh-100 d-flex align-items-center justify-content-center bg-light p-3">
        <div className="card shadow-sm border-0 rounded-4 p-4 p-md-5 text-center" style={{ maxWidth: 480 }}>
          <i className="bi bi-file-earmark-x text-danger fs-1 mb-3" />
          <h4 className="fw-bold mb-2">Смета не найдена</h4>
          <p className="text-secondary small mb-0">
            {errorMessage || "Ссылка недействительна или смета была удалена."}
          </p>
        </div>
      </div>
    )
  }

  const currencySymbol = estimate.currency === "RUB" ? "₽" : estimate.currency

  return (
    <div className="min-vh-100 bg-light py-4 py-md-5">
      <div className="container" style={{ maxWidth: 900 }}>
        {/* Top Header Card */}
        <div className="card shadow-sm border-0 rounded-4 p-4 mb-4 bg-white">
          <div className="d-flex flex-column flex-sm-row justify-content-between align-items-sm-center gap-3 border-bottom pb-4 mb-4">
            <div>
              <span className="badge bg-light text-secondary border mb-2 px-3 py-1">
                Stroylit · Смета на согласование
              </span>
              <h2 className="fw-bold text-dark mb-1">
                {estimate.title || `Смета №${estimate.number}`}
              </h2>
              <div className="text-muted small">Номер документа: №{estimate.number}</div>
            </div>

            <div>
              {estimate.status === "APPROVED" && (
                <span className="badge bg-success-subtle text-success fs-6 px-3 py-2 border border-success-subtle rounded-pill d-inline-flex align-items-center gap-2">
                  <i className="bi bi-check-circle-fill" /> Согласована
                </span>
              )}
              {estimate.status === "DECLINED" && (
                <span className="badge bg-danger-subtle text-danger fs-6 px-3 py-2 border border-danger-subtle rounded-pill d-inline-flex align-items-center gap-2">
                  <i className="bi bi-x-circle-fill" /> Отклонена
                </span>
              )}
              {estimate.status === "SENT" && (
                <span className="badge bg-primary-subtle text-primary fs-6 px-3 py-2 border border-primary-subtle rounded-pill d-inline-flex align-items-center gap-2">
                  <i className="bi bi-hourglass-split" /> Ожидает согласования
                </span>
              )}
            </div>
          </div>

          {estimate.note && (
            <div className="alert alert-light border small text-secondary mb-4">
              <i className="bi bi-info-circle me-2 text-primary" />
              {estimate.note}
            </div>
          )}

          {actionMessage && (
            <div className="alert alert-info py-2 small mb-4">
              {actionMessage}
            </div>
          )}

          {/* Lines Table */}
          <div className="table-responsive mb-4">
            <table className="table table-hover align-middle mb-0">
              <thead className="table-light">
                <tr>
                  <th style={{ width: "5%" }}>№</th>
                  <th style={{ width: "45%" }}>Наименование работ</th>
                  <th className="text-end" style={{ width: "15%" }}>Кол-во</th>
                  <th className="text-end" style={{ width: "15%" }}>Цена</th>
                  <th className="text-end" style={{ width: "20%" }}>Сумма</th>
                </tr>
              </thead>
              <tbody>
                {estimate.lines.map((line, idx) => (
                  <tr key={idx}>
                    <td className="text-muted small">{line.position}</td>
                    <td>
                      <div className="fw-semibold text-dark">{line.title}</div>
                      {line.description && (
                        <div className="small text-muted">{line.description}</div>
                      )}
                    </td>
                    <td className="text-end">
                      {line.quantity} <span className="small text-muted">{line.unit}</span>
                    </td>
                    <td className="text-end text-nowrap">
                      {formatPlainMinor(line.priceMinor)} {currencySymbol}
                    </td>
                    <td className="text-end fw-bold text-nowrap">
                      {formatPlainMinor(line.sumMinor)} {currencySymbol}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Totals Summary */}
          <div className="row justify-content-end mb-4">
            <div className="col-md-6 col-lg-5">
              <div className="bg-light p-3 rounded-3 border">
                <div className="d-flex justify-content-between small text-secondary mb-2">
                  <span>Сумма работ:</span>
                  <span className="fw-semibold">{formatPlainMinor(estimate.totals.netMinor)} {currencySymbol}</span>
                </div>

                {estimate.totals.discountMinor > 0 && (
                  <div className="d-flex justify-content-between small text-danger mb-2">
                    <span>Скидка:</span>
                    <span>-{formatPlainMinor(estimate.totals.discountMinor)} {currencySymbol}</span>
                  </div>
                )}

                {estimate.totals.taxMinor > 0 && (
                  <div className="d-flex justify-content-between small text-secondary mb-2">
                    <span>НДС:</span>
                    <span>+{formatPlainMinor(estimate.totals.taxMinor)} {currencySymbol}</span>
                  </div>
                )}

                <div className="d-flex justify-content-between fs-5 fw-bold text-dark pt-2 border-top">
                  <span>Итого к оплате:</span>
                  <span className="text-primary">{formatPlainMinor(estimate.totals.grossMinor)} {currencySymbol}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons for Customer */}
          {estimate.status === "SENT" && (
            <div className="border-top pt-4 d-flex flex-column flex-sm-row justify-content-between align-items-center gap-3">
              <button
                type="button"
                className="btn btn-outline-danger order-2 order-sm-1 px-4"
                onClick={handleDecline}
                disabled={actionPending}
              >
                Отклонить смету
              </button>

              <button
                type="button"
                className="btn btn-success btn-lg fw-bold order-1 order-sm-2 px-5 d-flex align-items-center gap-2 shadow"
                onClick={handleApprove}
                disabled={actionPending}
              >
                {actionPending ? (
                  <>
                    <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true" />
                    <span>Обработка...</span>
                  </>
                ) : (
                  <>
                    <i className="bi bi-check-lg fs-4" />
                    <span>Согласовать смету</span>
                  </>
                )}
              </button>
            </div>
          )}

          {estimate.status === "APPROVED" && (
            <div className="border-top pt-4 text-center">
              <div className="d-inline-flex align-items-center gap-2 text-success fw-bold fs-5">
                <i className="bi bi-check-circle-fill" /> Вы согласовали эту смету
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
