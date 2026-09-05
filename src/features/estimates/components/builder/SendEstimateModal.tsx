import type { FC } from "react"
import { useState, useEffect } from "react"
import type { Project } from "../../../projects/types"
import { useGetProjectCustomer, useSetProjectCustomer } from "../../../projects/customer.hooks"
import { useSendEstimate } from "../../estimates.hooks"

interface Props {
  project: Project
  estimateId: string
  onEnsureSaved?: () => Promise<boolean>
  onClose: () => void
  onSuccessDone: () => void
}

type ChannelType = "TELEGRAM" | "MAX" | "EMAIL"

export const SendEstimateModal: FC<Props> = ({
  project,
  estimateId,
  onEnsureSaved,
  onClose,
  onSuccessDone,
}) => {
  const [selectedChannel, setSelectedChannel] = useState<ChannelType | null>("EMAIL")
  const [emailInput, setEmailInput] = useState("")
  const [emailError, setEmailError] = useState<string | null>(null)
  const [isSent, setIsSent] = useState(false)
  const [publicUrl, setPublicUrl] = useState("")
  const [copied, setCopied] = useState(false)
  const [showTariffWarning, setShowTariffWarning] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  // Free tier is default
  const isFreePlan = true

  const { data: customerData } = useGetProjectCustomer(project.id)
  const setCustomer = useSetProjectCustomer()
  const sendEstimate = useSendEstimate()

  const isPending = setCustomer.isPending || sendEstimate.isPending

  useEffect(() => {
    if (customerData?.contact && customerData.channel === "EMAIL") {
      setEmailInput(customerData.contact)
    }
  }, [customerData])

  const handleChannelClick = (channel: ChannelType) => {
    if (channel !== "EMAIL" && isFreePlan) {
      setShowTariffWarning(true)
      setSelectedChannel(null)
      return
    }
    setSelectedChannel(channel)
    setShowTariffWarning(false)
  }

  const validateEmail = (val: string): boolean => {
    const trimmed = val.trim()
    if (!trimmed) {
      setEmailError("Укажите email заказчика")
      return false
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(trimmed)) {
      setEmailError("Введите корректный адрес электронной почты")
      return false
    }
    setEmailError(null)
    return true
  }

  const handleSendEmail = async () => {
    const trimmedEmail = emailInput.trim()
    if (!validateEmail(trimmedEmail)) {
      return
    }

    setErrorMessage(null)

    try {
      // 1. Save customer channel as EMAIL
      await setCustomer.mutateAsync({
        projectId: project.id,
        input: {
          channel: "EMAIL",
          contact: trimmedEmail,
        },
      })

      // 2. Ensure current estimate draft is saved
      if (onEnsureSaved) {
        const saved = await onEnsureSaved()
        if (!saved) {
          setErrorMessage("Не удалось сохранить смету перед отправкой")
          return
        }
      }

      // 3. Send estimate
      const result = await sendEstimate.mutateAsync(estimateId)
      setPublicUrl(result.publicUrl)
      setIsSent(true)
    } catch (err: unknown) {
      if (err instanceof Error) {
        setErrorMessage(err.message)
      } else {
        setErrorMessage("Ошибка при отправке сметы")
      }
    }
  }

  const handleCopyLink = async () => {
    if (!publicUrl) return
    try {
      await navigator.clipboard.writeText(publicUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    } catch {
      // Fallback
    }
  }

  const customerName = project.customer || "Заказчик"

  if (isSent) {
    return (
      <>
        <div className="modal-backdrop fade show" />
        <div className="modal fade show d-block" tabIndex={-1} role="dialog" aria-modal="true">
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content rounded-4 border-0 shadow text-center p-4 p-md-5">
              <div
                className="rounded-circle d-flex align-items-center justify-content-center mx-auto mb-4"
                style={{
                  width: "72px",
                  height: "72px",
                  backgroundColor: "var(--bs-success-bg-subtle)",
                  color: "var(--bs-success)",
                }}
              >
                <i className="bi bi-check-lg" style={{ fontSize: "38px" }} />
              </div>

              <h4 className="fw-bold mb-2">Смета отправлена!</h4>
              <p className="text-secondary small mb-3">
                {customerName} получит письмо с PDF и сможет согласовать смету онлайн.
              </p>

              {publicUrl && (
                <div className="mb-4 text-start bg-light p-3 rounded-3 border">
                  <label className="form-label text-muted small fw-semibold mb-1" htmlFor="public-estimate-link">
                    Прямая ссылка для заказчика
                  </label>
                  <div className="input-group">
                    <input
                      id="public-estimate-link"
                      type="text"
                      className="form-control form-control-sm bg-white"
                      value={publicUrl}
                      readOnly
                    />
                    <button
                      type="button"
                      className={`btn btn-sm ${copied ? "btn-success" : "btn-outline-primary"}`}
                      onClick={handleCopyLink}
                    >
                      {copied ? (
                        <>
                          <i className="bi bi-check-lg me-1" />
                          Скопировано
                        </>
                      ) : (
                        <>
                          <i className="bi bi-clipboard me-1" />
                          Копировать
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}

              <div className="d-flex flex-column gap-2">
                <button
                  type="button"
                  className="btn btn-primary fw-semibold py-2"
                  onClick={onSuccessDone}
                >
                  Перейти к заказу
                </button>
                <button
                  type="button"
                  className="btn btn-link text-secondary text-decoration-none small py-1"
                  onClick={onClose}
                >
                  Остаться в конструкторе
                </button>
              </div>
            </div>
          </div>
        </div>
      </>
    )
  }

  return (
    <>
      <div className="modal-backdrop fade show" />
      <div
        className="modal fade show d-block"
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        onClick={e => {
          if (e.target === e.currentTarget) onClose()
        }}
      >
        <div className="modal-dialog modal-dialog-centered">
          <div className="modal-content rounded-4 border-0 shadow">
            <div className="modal-header border-bottom p-4 pb-3">
              <h5 className="modal-title fw-bold mb-0">Отправка сметы заказчику</h5>
              <button
                type="button"
                className="btn-close"
                aria-label="Закрыть"
                onClick={onClose}
              />
            </div>

            <div className="modal-body p-4 d-flex flex-column gap-3">
              {errorMessage && (
                <div className="alert alert-danger py-2 small mb-0 d-flex align-items-center gap-2">
                  <i className="bi bi-exclamation-triangle-fill flex-shrink-0" />
                  <div>{errorMessage}</div>
                </div>
              )}

              <div>
                <h6 className="fw-bold mb-1">
                  Канал связи с {customerName}
                </h6>
                <p className="text-secondary small mb-0">
                  Сюда придут уведомления о ходе работ и смета на согласование.
                </p>
              </div>

              <div className="d-flex flex-column gap-2">
                {/* Email Option (Unified Card) */}
                <div
                  className="rounded-3 border p-3"
                  style={{
                    borderColor: selectedChannel === "EMAIL" ? "var(--stroylit-accent, #B24632)" : "var(--stroylit-border, #E3DCD3)",
                    backgroundColor: selectedChannel === "EMAIL" ? "#FFFBF9" : "var(--stroylit-surface, #FFFFFF)",
                    boxShadow: selectedChannel === "EMAIL" ? "0 0 0 1px var(--stroylit-accent, #B24632)" : undefined,
                    transition: "all 0.15s ease-in-out",
                  }}
                  onClick={() => handleChannelClick("EMAIL")}
                >
                  <div className="d-flex align-items-center gap-3" style={{ cursor: "pointer" }}>
                    <div
                      className="rounded-circle d-flex align-items-center justify-content-center flex-shrink-0"
                      style={{
                        width: "42px",
                        height: "42px",
                        background: "rgba(91, 112, 131, 0.12)",
                        color: "var(--stroylit-email, #5B7083)",
                        fontSize: "20px",
                      }}
                    >
                      <i className="bi bi-envelope-fill" />
                    </div>
                    <div className="flex-grow-1">
                      <div className="fw-bold text-dark mb-0">Email (электронная почта)</div>
                      <div className="text-secondary small">
                        Отправим смету в PDF и ссылку на согласование на почту заказчика
                      </div>
                    </div>
                    <i
                      className={`bi ${
                        selectedChannel === "EMAIL"
                          ? "bi-check-circle-fill text-primary fs-5"
                          : "bi-circle text-muted fs-5"
                      }`}
                    />
                  </div>

                  {/* Input field inside email card */}
                  {selectedChannel === "EMAIL" && (
                    <div className="mt-3 pt-3 border-top" onClick={e => e.stopPropagation()}>
                      <label className="form-label fw-semibold small text-secondary mb-1" htmlFor="send-email-contact">
                        Email заказчика для отправки *
                      </label>
                      <div className="input-group">
                        <span className="input-group-text bg-white">
                          <i className="bi bi-envelope text-muted" />
                        </span>
                        <input
                          id="send-email-contact"
                          type="email"
                          className={`form-control ${emailError ? "is-invalid" : ""}`}
                          placeholder="client@example.com"
                          value={emailInput}
                          onChange={e => {
                            setEmailInput(e.target.value)
                            if (emailError) setEmailError(null)
                          }}
                          autoFocus
                        />
                        {emailError && <div className="invalid-feedback">{emailError}</div>}
                      </div>
                      <div className="form-text small text-muted mt-1">
                        На этот адрес будет отправлено письмо со сметой и ссылкой на быстрое согласование.
                      </div>
                    </div>
                  )}
                </div>

                {/* Telegram Option (PRO) */}
                <button
                  type="button"
                  className={`channel-card ${isFreePlan ? "locked" : ""}`}
                  onClick={() => handleChannelClick("TELEGRAM")}
                >
                  <div
                    className="icon-wrap"
                    style={{
                      background: isFreePlan ? "var(--stroylit-surface-muted)" : "rgba(39, 167, 231, 0.12)",
                      color: isFreePlan ? "var(--stroylit-text-muted)" : "var(--stroylit-telegram)",
                    }}
                  >
                    <i className="bi bi-telegram" />
                  </div>
                  <div className="flex-grow-1 text-start">
                    <div className="d-flex align-items-center gap-2 mb-1">
                      <span className="title">Telegram</span>
                      {isFreePlan && <span className="pro-badge">PRO</span>}
                    </div>
                    <div className="desc">
                      {isFreePlan
                        ? "Доступно на платном тарифе"
                        : "Отправим ссылку заказчику в Telegram — он получит уведомления"}
                    </div>
                  </div>
                  <i
                    className={`bi ${
                      isFreePlan ? "bi-lock text-muted" : "bi-chevron-right text-secondary"
                    }`}
                  />
                </button>

                {/* MAX Option (PRO) */}
                <button
                  type="button"
                  className={`channel-card ${isFreePlan ? "locked" : ""}`}
                  onClick={() => handleChannelClick("MAX")}
                >
                  <div
                    className="icon-wrap"
                    style={{
                      background: isFreePlan ? "var(--stroylit-surface-muted)" : "rgba(140, 92, 245, 0.12)",
                      color: isFreePlan ? "var(--stroylit-text-muted)" : "var(--stroylit-max)",
                    }}
                  >
                    <i className="bi bi-chat-dots-fill" />
                  </div>
                  <div className="flex-grow-1 text-start">
                    <div className="d-flex align-items-center gap-2 mb-1">
                      <span className="title">MAX</span>
                      {isFreePlan && <span className="pro-badge">PRO</span>}
                    </div>
                    <div className="desc">
                      {isFreePlan
                        ? "Доступно на платном тарифе"
                        : "Отправим ссылку в MAX — уведомления придут прямо в мессенджер"}
                    </div>
                  </div>
                  <i
                    className={`bi ${
                      isFreePlan ? "bi-lock text-muted" : "bi-chevron-right text-secondary"
                    }`}
                  />
                </button>
              </div>

              {showTariffWarning && isFreePlan && (
                <div className="tariff-notice">
                  <div className="d-flex align-items-start gap-2">
                    <i className="bi bi-info-circle-fill text-warning fs-5 flex-shrink-0" />
                    <div>
                      <div className="title mb-1">
                        На бесплатном тарифе доступна только электронная почта.
                      </div>
                      <div className="desc">
                        Хотите открыть отправку в Telegram и MAX?
                      </div>
                    </div>
                  </div>
                  <div className="d-flex justify-content-end gap-2 mt-2">
                    <button
                      type="button"
                      className="btn btn-sm btn-outline-secondary"
                      onClick={() => handleChannelClick("EMAIL")}
                    >
                      Остаться на email
                    </button>
                    <a
                      href="/profile"
                      className="btn btn-sm btn-primary fw-semibold"
                    >
                      Перейти на платный тариф
                    </a>
                  </div>
                </div>
              )}
            </div>

            <div className="modal-footer p-3 px-4 border-top d-flex justify-content-between">
              <button
                type="button"
                className="btn btn-outline-secondary px-3"
                onClick={onClose}
                disabled={isPending}
              >
                Отмена
              </button>
              <button
                type="button"
                className="btn btn-primary px-4 fw-bold d-flex align-items-center gap-2"
                onClick={handleSendEmail}
                disabled={isPending}
              >
                {isPending ? (
                  <>
                    <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true" />
                    <span>Отправка...</span>
                  </>
                ) : (
                  <>
                    <i className="bi bi-send-fill" />
                    <span>Отправить смету</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
