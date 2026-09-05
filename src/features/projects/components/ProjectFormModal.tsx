import type { FC, SyntheticEvent } from "react"
import { useEffect, useState } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { ApiError } from "../../../utils/api"
import { uuidv7 } from "../../../utils/uuid"
import { customerApi } from "../customer.api"
import { CUSTOMER_QUERY_KEY, useGetProjectCustomer } from "../customer.hooks"
import { projectsApi } from "../projects.api"
import { PROJECTS_QUERY_KEY } from "../projects.hooks"
import {
  PROJECT_FIELD_LIMITS,
  PROJECT_STATUSES,
  PROJECT_STATUS_LABELS,
  type Project,
  type ProjectInput,
  type ProjectPatch,
  type ProjectStatus,
} from "../types"

// runeLength counts Unicode code points — the same unit the server uses
// (utf8.RuneCountInString, DESIGN_PROJECT.md §4.1).
const runeLength = (s: string): number => Array.from(s).length

const isValidEmail = (addr: string): boolean => {
  const s = addr.trim()
  if (!s) return true
  if (runeLength(s) > 254 || /\s/.test(s)) return false
  const at = s.indexOf("@")
  if (at <= 0 || s.indexOf("@", at + 1) !== -1) return false
  const host = s.slice(at + 1)
  return host.includes(".") && !host.startsWith(".") && !host.endsWith(".")
}

const isPhoneRune = (char: string): boolean => {
  return (
    (char >= "0" && char <= "9") ||
    char === "+" ||
    char === "-" ||
    char === "(" ||
    char === ")" ||
    char === " "
  )
}

const isValidPhone = (phone: string): boolean => {
  const trimmed = phone.trim()
  if (!trimmed) return true
  if (runeLength(trimmed) > 32) return false
  for (const ch of trimmed) {
    if (!isPhoneRune(ch)) return false
  }
  return true
}

type Props = {
  /** null → create mode (client mints a fresh UUIDv7 id via PUT); a project → edit mode (PATCH with only the changed fields). */
  project: Project | null
  onClose: () => void
}

export const ProjectFormModal: FC<Props> = ({ project, onClose }) => {
  const queryClient = useQueryClient()
  const { data: existingCustomer } = useGetProjectCustomer(project?.id)

  const [title, setTitle] = useState(project?.title ?? "")
  const [customer, setCustomer] = useState(project?.customer ?? "")
  const [customerPhone, setCustomerPhone] = useState("")
  const [customerEmail, setCustomerEmail] = useState("")
  const [objectAddress, setObjectAddress] = useState(project?.objectAddress ?? "")
  const [workType, setWorkType] = useState(project?.workType ?? "")
  const [status, setStatus] = useState<ProjectStatus>(project?.status ?? "ACTIVE")
  const [note, setNote] = useState(project?.note ?? "")

  const [isPending, setIsPending] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<
    Partial<Record<keyof ProjectInput | "customerEmail" | "customerPhone", string>>
  >({})

  // Prefill customer contact in edit mode once loaded
  useEffect(() => {
    if (existingCustomer) {
      if (existingCustomer.contact) {
        setCustomerEmail(existingCustomer.contact)
      }
      if (existingCustomer.note) {
        setCustomerPhone(existingCustomer.note)
      }
    }
  }, [existingCustomer])

  const validate = (
    input: ProjectInput,
    emailValue: string,
    phoneValue: string,
  ): Partial<Record<keyof ProjectInput | "customerEmail" | "customerPhone", string>> => {
    const errors: Partial<
      Record<keyof ProjectInput | "customerEmail" | "customerPhone", string>
    > = {}

    const check = (field: keyof typeof PROJECT_FIELD_LIMITS, value: string) => {
      const max = PROJECT_FIELD_LIMITS[field]
      if (runeLength(value) > max) {
        errors[field] = `Не более ${String(max)} символов`
      }
    }
    check("title", input.title)
    check("customer", input.customer)
    check("workType", input.workType)
    check("objectAddress", input.objectAddress)
    check("note", input.note)

    if (emailValue.trim() && !isValidEmail(emailValue)) {
      errors.customerEmail = "Введите корректный адрес электронной почты"
    }

    if (phoneValue.trim() && !isValidPhone(phoneValue)) {
      errors.customerPhone = "Недопустимый формат телефона (до 32 символов: цифры, +, -, скобки)"
    }

    return errors
  }

  const handleSubmit = async (e: SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault()
    setSubmitError(null)

    const input: ProjectInput = { title, customer, objectAddress, workType, status, note }
    const trimmedEmail = customerEmail.trim()
    const trimmedPhone = customerPhone.trim()

    if (project) {
      const patch: ProjectPatch = {}
      if (title !== project.title) patch.title = title
      if (customer !== project.customer) patch.customer = customer
      if (objectAddress !== project.objectAddress) patch.objectAddress = objectAddress
      if (workType !== project.workType) patch.workType = workType
      if (status !== project.status) patch.status = status
      if (note !== project.note) patch.note = note

      const emailChanged = trimmedEmail !== (existingCustomer?.contact ?? "")
      const phoneChanged = trimmedPhone !== (existingCustomer?.note ?? "")

      if (Object.keys(patch).length === 0 && !emailChanged && !phoneChanged) {
        onClose()
        return
      }

      const errors = validate({ ...input, ...project, ...patch }, trimmedEmail, trimmedPhone)
      if (Object.keys(errors).length > 0) {
        setFieldErrors(errors)
        return
      }

      setIsPending(true)
      try {
        if (Object.keys(patch).length > 0) {
          await projectsApi.patch(project.id, patch)
        }
        if ((emailChanged || phoneChanged) && (trimmedEmail || trimmedPhone)) {
          // Channel defaults to EMAIL if email is present, or preserves current
          const channel: "EMAIL" | "TELEGRAM" =
            existingCustomer?.channel === "TELEGRAM" ? "TELEGRAM" : "EMAIL"
          await customerApi.put(project.id, {
            channel,
            contact: trimmedEmail || (existingCustomer?.contact ?? "no-email@stroylit.local"),
            note: trimmedPhone,
          })
        }
        await queryClient.invalidateQueries({ queryKey: PROJECTS_QUERY_KEY })
        await queryClient.invalidateQueries({
          queryKey: CUSTOMER_QUERY_KEY(project.id),
        })
        onClose()
      } catch (err) {
        setSubmitError(
          err instanceof ApiError ? err.message : "Не удалось сохранить изменения",
        )
      } finally {
        setIsPending(false)
      }
      return
    }

    const errors = validate(input, trimmedEmail, trimmedPhone)
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors)
      return
    }

    setIsPending(true)
    const newProjectId = uuidv7()
    try {
      await projectsApi.put(newProjectId, input)
      if (trimmedEmail || trimmedPhone) {
        await customerApi.put(newProjectId, {
          channel: "EMAIL",
          contact: trimmedEmail || "no-email@stroylit.local",
          note: trimmedPhone,
        })
      }
      await queryClient.invalidateQueries({ queryKey: PROJECTS_QUERY_KEY })
      await queryClient.invalidateQueries({
        queryKey: CUSTOMER_QUERY_KEY(newProjectId),
      })
      onClose()
    } catch (err) {
      setSubmitError(
        err instanceof ApiError ? err.message : "Не удалось создать проект",
      )
    } finally {
      setIsPending(false)
    }
  }

  const isInvalid = (field: keyof ProjectInput): boolean => fieldErrors[field] != null

  return (
    <>
      <div className="modal-backdrop fade show" />
      <div className="modal fade show d-block" tabIndex={-1} role="dialog" aria-modal="true">
        <div className="modal-dialog modal-lg modal-dialog-centered">
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title fw-bold">
                {project ? "Редактирование проекта" : "Новый проект"}
              </h5>
              <button type="button" className="btn-close" onClick={onClose} aria-label="Закрыть" />
            </div>

            <form onSubmit={handleSubmit} noValidate>
              <div className="modal-body">
                {submitError && (
                  <div className="alert alert-danger" role="alert">
                    {submitError}
                  </div>
                )}

                <div className="mb-3">
                  <label className="form-label fw-semibold" htmlFor="project-title">
                    Название заказа
                  </label>
                  <input
                    id="project-title"
                    type="text"
                    className={`form-control${isInvalid("title") ? " is-invalid" : ""}`}
                    maxLength={PROJECT_FIELD_LIMITS.title}
                    placeholder="Например: Ремонт квартиры на Ленина"
                    value={title}
                    onChange={(e) => {
                      setTitle(e.target.value)
                    }}
                  />
                  {fieldErrors.title && (
                    <div className="invalid-feedback">{fieldErrors.title}</div>
                  )}
                </div>

                {/* Customer Information 3-Column Block */}
                <div className="row g-3 mb-3">
                  <div className="col-md-4">
                    <label className="form-label fw-semibold" htmlFor="project-customer">
                      Заказчик (Имя)
                    </label>
                    <input
                      id="project-customer"
                      type="text"
                      className={`form-control${isInvalid("customer") ? " is-invalid" : ""}`}
                      maxLength={PROJECT_FIELD_LIMITS.customer}
                      placeholder="Иван Иванов"
                      value={customer}
                      onChange={(e) => {
                        setCustomer(e.target.value)
                      }}
                    />
                    {fieldErrors.customer && (
                      <div className="invalid-feedback">{fieldErrors.customer}</div>
                    )}
                  </div>

                  <div className="col-md-4">
                    <label className="form-label fw-semibold" htmlFor="project-customer-phone">
                      Телефон
                    </label>
                    <input
                      id="project-customer-phone"
                      type="tel"
                      className={`form-control${fieldErrors.customerPhone ? " is-invalid" : ""}`}
                      maxLength={32}
                      placeholder="+7 (999) 000-00-00"
                      value={customerPhone}
                      onChange={(e) => {
                        setCustomerPhone(e.target.value)
                      }}
                    />
                    {fieldErrors.customerPhone && (
                      <div className="invalid-feedback">{fieldErrors.customerPhone}</div>
                    )}
                  </div>

                  <div className="col-md-4">
                    <label className="form-label fw-semibold" htmlFor="project-customer-email">
                      Email
                    </label>
                    <input
                      id="project-customer-email"
                      type="email"
                      className={`form-control${fieldErrors.customerEmail ? " is-invalid" : ""}`}
                      maxLength={254}
                      placeholder="client@example.com"
                      value={customerEmail}
                      onChange={(e) => {
                        setCustomerEmail(e.target.value)
                      }}
                    />
                    {fieldErrors.customerEmail && (
                      <div className="invalid-feedback">{fieldErrors.customerEmail}</div>
                    )}
                  </div>
                </div>

                <div className="row g-3 mb-3">
                  <div className="col-md-6">
                    <label className="form-label fw-semibold" htmlFor="project-worktype">
                      Тип работ
                    </label>
                    <input
                      id="project-worktype"
                      type="text"
                      className={`form-control${isInvalid("workType") ? " is-invalid" : ""}`}
                      maxLength={PROJECT_FIELD_LIMITS.workType}
                      placeholder="Отделка, электрика, сантехника"
                      value={workType}
                      onChange={(e) => {
                        setWorkType(e.target.value)
                      }}
                    />
                    {fieldErrors.workType && (
                      <div className="invalid-feedback">{fieldErrors.workType}</div>
                    )}
                  </div>
                  <div className="col-md-6">
                    <label className="form-label fw-semibold" htmlFor="project-status">
                      Статус
                    </label>
                    <select
                      id="project-status"
                      className="form-select"
                      value={status}
                      onChange={(e) => {
                        setStatus(e.target.value as ProjectStatus)
                      }}
                    >
                      {PROJECT_STATUSES.map((s) => (
                        <option key={s} value={s}>
                          {PROJECT_STATUS_LABELS[s]}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="mb-3">
                  <label className="form-label fw-semibold" htmlFor="project-address">
                    Адрес объекта
                  </label>
                  <input
                    id="project-address"
                    type="text"
                    className={`form-control${isInvalid("objectAddress") ? " is-invalid" : ""}`}
                    maxLength={PROJECT_FIELD_LIMITS.objectAddress}
                    placeholder="г. Москва, ул. Ленина, д. 10, кв. 25"
                    value={objectAddress}
                    onChange={(e) => {
                      setObjectAddress(e.target.value)
                    }}
                  />
                  {fieldErrors.objectAddress && (
                    <div className="invalid-feedback">{fieldErrors.objectAddress}</div>
                  )}
                </div>

                <div className="mb-1">
                  <label className="form-label fw-semibold" htmlFor="project-note">
                    Заметка (видна только вам)
                  </label>
                  <textarea
                    id="project-note"
                    className={`form-control${isInvalid("note") ? " is-invalid" : ""}`}
                    rows={3}
                    maxLength={PROJECT_FIELD_LIMITS.note}
                    placeholder="Особенности объекта, график доступа..."
                    value={note}
                    onChange={(e) => {
                      setNote(e.target.value)
                    }}
                  />
                  {fieldErrors.note && <div className="invalid-feedback">{fieldErrors.note}</div>}
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-outline-secondary" onClick={onClose}>
                  Отмена
                </button>
                <button type="submit" className="btn btn-primary fw-bold" disabled={isPending}>
                  {isPending ? "Сохранение..." : "Сохранить"}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </>
  )
}
