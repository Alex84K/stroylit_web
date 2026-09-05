import type { FC, SyntheticEvent } from "react"
import { useState } from "react"
import { ESTIMATE_LIMITS, type CatalogItem, type CatalogItemInput } from "../../types"
import { formatPlainMinor, parseMoneyToMinor } from "../../utils/money"
import { ModalShell } from "../../../../components/modals/ModalShell"

interface Props {
  item: CatalogItem
  onSave: (id: string, data: CatalogItemInput) => void
  onDelete?: (id: string) => void
  onClose: () => void
}

export const EditCatalogItemModal: FC<Props> = ({
  item,
  onSave,
  onDelete,
  onClose,
}) => {
  const [title, setTitle] = useState(item.title)
  const [category, setCategory] = useState(item.category || "Мои позиции")
  const [unit, setUnit] = useState(item.unit || "м²")
  const [priceStr, setPriceStr] = useState(
    item.sellingPriceMinor > 0 ? formatPlainMinor(item.sellingPriceMinor) : ""
  )
  const [description, setDescription] = useState(item.description || "")
  const [errors, setErrors] = useState<Record<string, string>>({})

  const handleSubmit = (e: SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault()
    const trimmedTitle = title.trim()
    const newErrors: Record<string, string> = {}

    if (!trimmedTitle) {
      newErrors.title = "Укажите наименование работы"
    } else if (trimmedTitle.length > ESTIMATE_LIMITS.itemTitle) {
      newErrors.title = `Не более ${ESTIMATE_LIMITS.itemTitle} символов`
    }

    const priceMinor = priceStr.trim() ? parseMoneyToMinor(priceStr) : 0
    if (priceMinor === null || priceMinor < 0) {
      newErrors.price = "Укажите корректную стоимость"
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }

    const data: CatalogItemInput = {
      title: trimmedTitle,
      description: description.trim(),
      unit: unit.trim() || "м²",
      category: category.trim() || "Мои позиции",
      isFavorite: item.isFavorite ?? true,
      purchasePriceMinor: item.purchasePriceMinor || 0,
      sellingPriceMinor: priceMinor ?? 0,
    }

    onSave(item.id, data)
    onClose()
  }

  const handleDelete = () => {
    if (onDelete) {
      onDelete(item.id)
      onClose()
    }
  }

  return (
    <ModalShell title="Позиция каталога" onClose={onClose} size="lg">
      <form onSubmit={handleSubmit} noValidate>
        <div className="modal-body p-4 d-flex flex-column gap-3">
          <div>
            <label className="form-label fw-semibold small text-secondary mb-1" htmlFor="edit-catalog-title">
              Наименование работы *
            </label>
            <input
              id="edit-catalog-title"
              type="text"
              className={`form-control ${errors.title ? "is-invalid" : ""}`}
              placeholder="например, Укладка плитки"
              value={title}
              onChange={e => setTitle(e.target.value)}
              autoFocus
            />
            {errors.title && <div className="invalid-feedback">{errors.title}</div>}
          </div>

          <div className="row g-3">
            <div className="col-md-6">
              <label className="form-label fw-semibold small text-secondary mb-1" htmlFor="edit-catalog-category">
                Категория
              </label>
              <select
                id="edit-catalog-category"
                className="form-select"
                value={category}
                onChange={e => setCategory(e.target.value)}
              >
                <option value="Мои позиции">Мои позиции</option>
                <option value="Демонтаж">Демонтаж</option>
                <option value="Черновые">Черновые</option>
                <option value="Электрика">Электрика</option>
                <option value="Сантехника">Сантехника</option>
                <option value="Малярка">Малярка</option>
                <option value="Полы">Полы</option>
                <option value="Потолки">Потолки</option>
                <option value="Двери и окна">Двери и окна</option>
                <option value="Прочее">Прочее</option>
              </select>
            </div>

            <div className="col-md-6">
              <label className="form-label fw-semibold small text-secondary mb-1" htmlFor="edit-catalog-unit">
                Единица измерения
              </label>
              <select
                id="edit-catalog-unit"
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
          </div>

          <div>
            <label className="form-label fw-semibold small text-secondary mb-1" htmlFor="edit-catalog-price">
              Базовая цена за ед., ₽ (необязательно)
            </label>
            <input
              id="edit-catalog-price"
              type="text"
              className={`form-control ${errors.price ? "is-invalid" : ""}`}
              placeholder="например, 1200"
              value={priceStr}
              onChange={e => setPriceStr(e.target.value)}
            />
            {errors.price && <div className="invalid-feedback">{errors.price}</div>}
          </div>

          <div>
            <label className="form-label fw-semibold small text-secondary mb-1" htmlFor="edit-catalog-desc">
              Описание / спецификация (необязательно)
            </label>
            <textarea
              id="edit-catalog-desc"
              rows={2}
              className="form-control"
              placeholder="Дополнительные детали"
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
              <span>Удалить из каталога</span>
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
