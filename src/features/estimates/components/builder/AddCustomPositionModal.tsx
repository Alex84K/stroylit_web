import type { FC, SyntheticEvent } from "react"
import { useState } from "react"
import { ESTIMATE_LIMITS, type CatalogItemInput, type EstimateItemInput } from "../../types"
import { parseMoneyToMinor } from "../../utils/money"
import { uuidv7 } from "../../../../utils/uuid"

interface Props {
  onAdd: (item: EstimateItemInput, saveToCatalog?: CatalogItemInput) => void
  onClose: () => void
}

export const AddCustomPositionModal: FC<Props> = ({ onAdd, onClose }) => {
  const [title, setTitle] = useState("")
  const [category, setCategory] = useState("Мои позиции")
  const [unit, setUnit] = useState("м²")
  const [priceStr, setPriceStr] = useState("1000")
  const [quantityStr, setQuantityStr] = useState("1")
  const [saveToCatalog, setSaveToCatalog] = useState(true)
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

    const priceMinor = parseMoneyToMinor(priceStr)
    if (priceMinor === null || priceMinor < 0) {
      newErrors.price = "Укажите корректную стоимость"
    }

    const qty = parseFloat(quantityStr.replace(",", "."))
    if (isNaN(qty) || qty <= 0) {
      newErrors.quantity = "Количество должно быть больше 0"
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }

    const newItem: EstimateItemInput = {
      id: uuidv7(),
      title: trimmedTitle,
      description: "",
      unit: unit.trim() || "шт.",
      quantity: qty,
      purchasePriceMinor: 0,
      sellingPriceMinor: priceMinor ?? 0,
      position: 0,
    }

    let catalogInput: CatalogItemInput | undefined
    if (saveToCatalog) {
      catalogInput = {
        title: trimmedTitle,
        description: "",
        unit: unit.trim() || "шт.",
        category: category.trim() || "Мои позиции",
        isFavorite: true,
        purchasePriceMinor: 0,
        sellingPriceMinor: priceMinor ?? 0,
      }
    }

    onAdd(newItem, catalogInput)
    onClose()
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
              <h5 className="modal-title fw-bold mb-0">Своя позиция</h5>
              <button
                type="button"
                className="btn-close"
                aria-label="Закрыть"
                onClick={onClose}
              />
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body p-4 d-flex flex-column gap-3">
                <div>
                  <label className="form-label fw-medium small text-secondary mb-1">
                    Наименование работы *
                  </label>
                  <input
                    type="text"
                    className={`form-control ${errors.title ? "is-invalid" : ""}`}
                    placeholder="например, Укладка ламината"
                    value={title}
                    onChange={e => setTitle(e.target.value)}
                    autoFocus
                  />
                  {errors.title && (
                    <div className="invalid-feedback">{errors.title}</div>
                  )}
                </div>

                <div className="row g-3">
                  <div className="col-6">
                    <label className="form-label fw-medium small text-secondary mb-1">
                      Категория
                    </label>
                    <select
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

                  <div className="col-6">
                    <label className="form-label fw-medium small text-secondary mb-1">
                      Единица измерения
                    </label>
                    <select
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

                <div className="row g-3">
                  <div className="col-6">
                    <label className="form-label fw-medium small text-secondary mb-1">
                      Количество *
                    </label>
                    <input
                      type="number"
                      step="any"
                      min="0.01"
                      className={`form-control ${errors.quantity ? "is-invalid" : ""}`}
                      value={quantityStr}
                      onChange={e => setQuantityStr(e.target.value)}
                    />
                    {errors.quantity && (
                      <div className="invalid-feedback">{errors.quantity}</div>
                    )}
                  </div>

                  <div className="col-6">
                    <label className="form-label fw-medium small text-secondary mb-1">
                      Цена за ед., ₽ *
                    </label>
                    <input
                      type="text"
                      className={`form-control ${errors.price ? "is-invalid" : ""}`}
                      placeholder="1000"
                      value={priceStr}
                      onChange={e => setPriceStr(e.target.value)}
                    />
                    {errors.price && (
                      <div className="invalid-feedback">{errors.price}</div>
                    )}
                  </div>
                </div>

                {/* Save to Catalog Checkbox */}
                <div className="form-check mt-2">
                  <input
                    className="form-check-input"
                    type="checkbox"
                    id="saveToCatalogCheck"
                    checked={saveToCatalog}
                    onChange={e => setSaveToCatalog(e.target.checked)}
                  />
                  <label
                    className="form-check-label small fw-medium text-body cursor-pointer"
                    htmlFor="saveToCatalogCheck"
                  >
                    Сохранить позицию в каталог (для повторного использования в других сметах)
                  </label>
                </div>
              </div>

              <div className="modal-footer border-top p-3 px-4 d-flex justify-content-end gap-2">
                <button
                  type="button"
                  className="btn btn-outline-secondary px-3"
                  onClick={onClose}
                >
                  Отмена
                </button>
                <button type="submit" className="btn btn-primary px-4 fw-semibold">
                  Добавить в смету
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </>
  )
}
