import type { FC, SyntheticEvent } from "react"
import { useState } from "react"
import { ESTIMATE_LIMITS } from "../../features/estimates/types"
import type { DraftItem } from "../../features/estimates/estimateEditorSlice"
import { formatPlainMinor, parseMoneyToMinor } from "../../features/estimates/utils/money"
import { ModalShell } from "./ModalShell"

type Props = {
  item: DraftItem
  onSave: (patch: Partial<DraftItem>) => void
  onDelete?: (id: string) => void
  onClose: () => void
}

export const EditEstimateItemModal: FC<Props> = ({
  item,
  onSave,
  onDelete,
  onClose,
}) => {
  const [title, setTitle] = useState(item.title)
  const [description, setDescription] = useState(item.description)
  const [unit, setUnit] = useState(item.unit)
  const [quantityStr, setQuantityStr] = useState(String(item.quantity))
  const [priceStr, setPriceStr] = useState(
    formatPlainMinor(item.sellingPriceMinor)
  )
  const [errors, setErrors] = useState<Record<string, string>>({})

  const handleSubmit = (e: SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault()
    const trimmedTitle = title.trim()
    const newErrors: Record<string, string> = {}

    if (!trimmedTitle) {
      newErrors.title = "Наименование обязательно"
    } else if (trimmedTitle.length > ESTIMATE_LIMITS.itemTitle) {
      newErrors.title = `Не более ${ESTIMATE_LIMITS.itemTitle} символов`
    }

    const priceMinor = parseMoneyToMinor(priceStr)
    if (priceMinor === null || priceMinor < 0) {
      newErrors.price = "Укажите корректную цену"
    }

    const qty = parseFloat(quantityStr.replace(",", "."))
    if (isNaN(qty) || qty <= 0) {
      newErrors.quantity = "Количество должно быть больше 0"
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }

    const patch: Partial<DraftItem> = {}
    if (trimmedTitle !== item.title) patch.title = trimmedTitle
    if (description !== item.description) patch.description = description
    if (unit !== item.unit) patch.unit = unit
    if (qty !== item.quantity) patch.quantity = qty
    if (priceMinor !== null && priceMinor !== item.sellingPriceMinor) {
      patch.sellingPriceMinor = priceMinor
    }

    onSave(patch)
  }

  const handleDelete = () => {
    if (onDelete) {
      onDelete(item.id)
    }
  }

  return (
    <ModalShell title="Позиция сметы" onClose={onClose} size="lg">
      <form onSubmit={handleSubmit} noValidate>
        <div className="modal-body p-4 d-flex flex-column gap-3">
          <div>
            <label className="form-label fw-semibold small text-secondary mb-1" htmlFor="edit-item-title">
              Наименование работы *
            </label>
            <input
              id="edit-item-title"
              type="text"
              className={`form-control ${errors.title ? "is-invalid" : ""}`}
              maxLength={ESTIMATE_LIMITS.itemTitle}
              value={title}
              onChange={e => setTitle(e.target.value)}
              autoFocus
            />
            {errors.title && <div className="invalid-feedback">{errors.title}</div>}
          </div>

          <div className="row g-3">
            <div className="col-md-4">
              <label className="form-label fw-semibold small text-secondary mb-1" htmlFor="edit-item-unit">
                Единица измерения
              </label>
              <select
                id="edit-item-unit"
                className="form-select"
                value={unit}
                onChange={e => setUnit(e.target.value)}
              >
                <option value="м²">м² (кв. метр)</option>
                <option value="м³">м³ (куб. метр)</option>
                <option value="п.м.">п.м. (пог. метр)</option>
                <option value="шт.">шт. (штука)</option>
                <option value="компл.">компл. (комплект)</option>
                <option value="точка">точка</option>
                <option value="усл.">усл. (услуга)</option>
              </select>
            </div>

            <div className="col-md-4">
              <label className="form-label fw-semibold small text-secondary mb-1" htmlFor="edit-item-quantity">
                Количество *
              </label>
              <input
                id="edit-item-quantity"
                type="number"
                step="any"
                min="0.01"
                className={`form-control ${errors.quantity ? "is-invalid" : ""}`}
                value={quantityStr}
                onChange={e => setQuantityStr(e.target.value)}
              />
              {errors.quantity && <div className="invalid-feedback">{errors.quantity}</div>}
            </div>

            <div className="col-md-4">
              <label className="form-label fw-semibold small text-secondary mb-1" htmlFor="edit-item-price">
                Цена за ед., ₽ *
              </label>
              <input
                id="edit-item-price"
                type="text"
                className={`form-control ${errors.price ? "is-invalid" : ""}`}
                value={priceStr}
                onChange={e => setPriceStr(e.target.value)}
              />
              {errors.price && <div className="invalid-feedback">{errors.price}</div>}
            </div>
          </div>

          <div>
            <label className="form-label fw-semibold small text-secondary mb-1" htmlFor="edit-item-desc">
              Примечание к работе (необязательно)
            </label>
            <textarea
              id="edit-item-desc"
              rows={2}
              className="form-control"
              maxLength={ESTIMATE_LIMITS.itemDescription}
              placeholder="Дополнительные детали или спецификация"
              value={description}
              onChange={e => setDescription(e.target.value)}
            />
          </div>
        </div>

        <div className="modal-footer d-flex justify-content-between align-items-center p-3 px-4 border-top">
          {onDelete ? (
            <button
              type="button"
              className="btn btn-outline-danger fw-semibold d-flex align-items-center gap-2"
              onClick={handleDelete}
            >
              <i className="bi bi-trash3" />
              <span>Удалить позицию</span>
            </button>
          ) : (
            <div />
          )}

          <div className="d-flex align-items-center gap-2">
            <button
              type="button"
              className="btn btn-outline-secondary px-3"
              onClick={onClose}
            >
              Отмена
            </button>
            <button type="submit" className="btn btn-primary px-4 fw-bold">
              Сохранить
            </button>
          </div>
        </div>
      </form>
    </ModalShell>
  )
}
