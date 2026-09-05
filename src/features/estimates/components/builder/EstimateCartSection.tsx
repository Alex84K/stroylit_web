import type { FC } from "react"
import type { EstimateTotals } from "../../types"
import type { DraftItem } from "../../estimateEditorSlice"
import { formatPlainMinor } from "../../utils/money"

interface Props {
  items: DraftItem[]
  totals: EstimateTotals
  currency: string
  isDirty: boolean
  isPending: boolean
  onUpdateQuantity: (id: string, newQty: number) => void
  onRemoveItem: (id: string) => void
  onEditItem: (id: string) => void
  onSend: () => void
  onDownloadPdf: () => void
  onSave: () => void
}

function formatPositionCount(count: number): string {
  if (count % 10 === 1 && count % 100 !== 11) return `${count} позиция`
  if (
    [2, 3, 4].includes(count % 10) &&
    ![12, 13, 14].includes(count % 100)
  ) {
    return `${count} позиции`
  }
  return `${count} позиций`
}

export const EstimateCartSection: FC<Props> = ({
  items,
  totals,
  currency,
  isDirty,
  isPending,
  onRemoveItem,
  onEditItem,
  onSend,
  onDownloadPdf,
  onSave,
}) => {
  const currencySymbol = currency === "RUB" ? "₽" : currency

  return (
    <div className="cart-panel">
      {/* Panel Header */}
      <div className="d-flex justify-content-between align-items-center mb-1">
        <h4 className="fw-bold mb-0">Смета</h4>
        <span className="text-secondary small fw-medium">
          {formatPositionCount(items.length)}
        </span>
      </div>

      {/* Total Card (Black Banner) */}
      <div className="total-card">
        <div className="d-flex flex-column gap-1">
          <span className="label">Итого</span>
          <span className="value">
            {formatPlainMinor(totals.grossMinor || totals.netMinor)} {currencySymbol}
          </span>
        </div>
        {isDirty && (
          <button
            type="button"
            className="btn btn-sm btn-outline-light px-2 py-1 small rounded-pill"
            onClick={onSave}
            disabled={isPending}
            title="Сохранить черновик"
          >
            {isPending ? "Сохраняем..." : "Сохранить"}
          </button>
        )}
      </div>

      {/* Cart Items List */}
      <div className="cart-items-list">
        {items.length === 0 ? (
          <div className="text-center py-5 text-secondary">
            <i className="bi bi-cart3 fs-2 d-block mb-2 text-muted" />
            <span className="small">Смета пуста.<br />Нажмите «+» у работ из каталога слева.</span>
          </div>
        ) : (
          items.map(item => {
            const lineTotalMinor = Math.round(item.quantity * item.sellingPriceMinor)
            return (
              <div key={item.id} className="price-row">
                <div
                  className="flex-grow-1 pe-2"
                  onClick={() => onEditItem(item.id)}
                  title="Нажмите, чтобы изменить объём или цену"
                  style={{ cursor: "pointer" }}
                >
                  <div className="item-name">{item.title}</div>
                  <div className="item-calc">
                    {item.quantity} {item.unit || "м²"} × {formatPlainMinor(item.sellingPriceMinor)} {currencySymbol}
                  </div>
                </div>

                <div className="d-flex align-items-center gap-2 flex-shrink-0">
                  <span className="item-sum">
                    {formatPlainMinor(lineTotalMinor)} {currencySymbol}
                  </span>

                  {/* Edit button */}
                  <button
                    type="button"
                    className="icon-btn-circle"
                    onClick={e => {
                      e.stopPropagation()
                      onEditItem(item.id)
                    }}
                    title="Редактировать позицию"
                    aria-label={`Редактировать ${item.title}`}
                  >
                    <i className="bi bi-pencil" style={{ fontSize: "11px" }} />
                  </button>

                  {/* Delete / Remove button */}
                  <button
                    type="button"
                    className="icon-btn-circle"
                    onClick={e => {
                      e.stopPropagation()
                      onRemoveItem(item.id)
                    }}
                    title="Удалить позицию"
                    aria-label={`Удалить ${item.title}`}
                  >
                    <i className="bi bi-x-lg" style={{ fontSize: "11px" }} />
                  </button>
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* Action Buttons */}
      <div className="d-flex flex-column gap-3 pt-2">
        <button
          type="button"
          className="btn btn-primary fw-semibold py-3 d-flex align-items-center justify-content-center gap-2 rounded-4 shadow-sm"
          onClick={onSend}
          disabled={items.length === 0}
          style={{ height: "48px" }}
        >
          <i className="bi bi-send" />
          <span>Отправить заказчику</span>
        </button>

        <button
          type="button"
          className="btn btn-link text-secondary text-decoration-none fw-semibold p-0 d-inline-flex align-items-center justify-content-center gap-2"
          onClick={onDownloadPdf}
          disabled={items.length === 0}
        >
          <i className="bi bi-download" />
          <span>Скачать смету файлом</span>
        </button>
      </div>
    </div>
  )
}
