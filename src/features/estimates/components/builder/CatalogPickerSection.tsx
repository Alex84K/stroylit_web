import type { FC } from "react"
import { useMemo, useState } from "react"
import type { CatalogItem } from "../../types"
import type { DraftItem } from "../../estimateEditorSlice"
import { formatPlainMinor } from "../../utils/money"

interface Props {
  catalogItems: CatalogItem[]
  currentEstimateItems: DraftItem[]
  onAddItem: (item: CatalogItem) => void
  onEditCatalogItem?: (item: CatalogItem) => void
  onOpenAddCustom: () => void
}

/**
 * Highlights search tokens inside the item title
 */
const HighlightMatch: FC<{ text: string; query: string }> = ({ text, query }) => {
  const q = query.trim()
  if (!q) return <span>{text}</span>

  const words = q
    .split(/\s+/)
    .filter(Boolean)
    .map(w => w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))

  if (words.length === 0) return <span>{text}</span>

  const regex = new RegExp(`(${words.join("|")})`, "gi")
  const parts = text.split(regex)

  return (
    <span>
      {parts.map((part, index) => {
        const isMatch = words.some(w => part.toLowerCase() === w.toLowerCase())
        return isMatch ? (
          <mark
            key={index}
            style={{
              backgroundColor: "var(--stroylit-accent-soft, #F5E0DA)",
              color: "var(--stroylit-accent-dark, #8C3222)",
              padding: "0 2px",
              borderRadius: "4px",
              fontWeight: 600,
            }}
          >
            {part}
          </mark>
        ) : (
          <span key={index}>{part}</span>
        )
      })}
    </span>
  )
}

export const CatalogPickerSection: FC<Props> = ({
  catalogItems,
  currentEstimateItems,
  onAddItem,
  onEditCatalogItem,
  onOpenAddCustom,
}) => {
  const [search, setSearch] = useState("")
  const [selectedCategory, setSelectedCategory] = useState("Все")

  // Gather categories dynamically from items
  const categories = useMemo(() => {
    const defaultOrder = [
      "Все",
      "Мои позиции",
      "Демонтаж",
      "Черновые",
      "Электрика",
      "Сантехника",
      "Малярка",
      "Полы",
      "Потолки",
      "Двери и окна",
    ]
    const set = new Set<string>(defaultOrder)
    catalogItems.forEach(it => {
      const c = it.category?.trim()
      if (c) {
        set.add(c)
      }
    })
    return Array.from(set)
  }, [catalogItems])

  // Count items added into estimate by catalog item title
  const addedCountsByTitle = useMemo(() => {
    const counts = new Map<string, number>()
    currentEstimateItems.forEach(it => {
      const lower = it.title.trim().toLowerCase()
      counts.set(lower, (counts.get(lower) ?? 0) + it.quantity)
    })
    return counts
  }, [currentEstimateItems])

  // Filter items by multi-word search query or category
  const filteredItems = useMemo(() => {
    const q = search.trim().toLowerCase()
    const tokens = q.split(/\s+/).filter(Boolean)

    return catalogItems.filter(item => {
      // 1. Multi-token search: each word in query must match title, category or description
      if (tokens.length > 0) {
        const fullSearchableText = [
          item.title,
          item.category || "",
          item.description || "",
        ]
          .join(" ")
          .toLowerCase()

        return tokens.every(token => fullSearchableText.includes(token))
      }

      // 2. "Все" shows all items
      if (selectedCategory === "Все") {
        return true
      }

      // 3. "Мои позиции" shows items with saved prices or favorite flag
      if (selectedCategory === "Мои позиции") {
        return Boolean(item.isFavorite) || item.sellingPriceMinor > 0
      }

      // 4. Category matching
      if (selectedCategory) {
        const cat = (item.category || "").toLowerCase()
        const target = selectedCategory.toLowerCase()
        return cat.includes(target) || item.title.toLowerCase().includes(target)
      }

      return true
    })
  }, [catalogItems, search, selectedCategory])

  return (
    <div className="catalog-picker-panel">
      {/* Search Bar */}
      <div className="searchbar">
        <i className="bi bi-search text-secondary fs-5" />
        <input
          type="text"
          placeholder="Найти работу, например «обои»"
          value={search}
          onChange={e => setSearch(e.target.value)}
          onKeyDown={e => {
            if (e.key === "Escape") {
              setSearch("")
            }
          }}
        />
        {search && (
          <button
            type="button"
            className="btn btn-sm btn-link p-0 text-secondary text-decoration-none"
            onClick={() => setSearch("")}
            title="Очистить поиск (Esc)"
          >
            <i className="bi bi-x-lg" />
          </button>
        )}
      </div>

      {/* Category Chips (hidden when search is active to focus on search results) */}
      {!search ? (
        <div className="chips-container">
          {categories.map(cat => (
            <button
              key={cat}
              type="button"
              className={`chip-btn ${selectedCategory === cat ? "active" : ""}`}
              onClick={() => {
                setSelectedCategory(cat)
              }}
            >
              {cat}
            </button>
          ))}
        </div>
      ) : (
        <div className="d-flex align-items-center justify-content-between px-1 text-secondary small">
          <span>
            Найдено позиций: <strong>{filteredItems.length}</strong>
          </span>
          <button
            type="button"
            className="btn btn-link btn-sm text-secondary text-decoration-none p-0"
            onClick={() => setSearch("")}
          >
            Сбросить поиск
          </button>
        </div>
      )}

      {/* Catalog Items List */}
      <div className="catalog-items-list">
        {filteredItems.length === 0 ? (
          <div className="text-center py-5 text-secondary">
            <i className="bi bi-search fs-2 d-block mb-2 text-muted" />
            <div className="fw-semibold mb-1">Ничего не найдено</div>
            <div className="small text-muted mb-3">
              {search
                ? `По запросу «${search}» позиций не найдено.`
                : "В этой категории пока нет позиций."}
            </div>
            <button
              type="button"
              className="btn btn-sm btn-outline-primary fw-semibold"
              onClick={onOpenAddCustom}
            >
              <i className="bi bi-plus-lg me-1" /> Добавить свою позицию
            </button>
          </div>
        ) : (
          filteredItems.map(item => {
            const addedQty = addedCountsByTitle.get(item.title.trim().toLowerCase())
            const priceLabel =
              item.sellingPriceMinor > 0
                ? ` · ${formatPlainMinor(item.sellingPriceMinor)} ₽`
                : ""

            return (
              <div key={item.id} className="catalog-item-row">
                <div
                  className="pe-2 grow cursor-pointer"
                  onClick={() => onAddItem(item)}
                  style={{ cursor: "pointer" }}
                >
                  <div className="item-title">
                    <HighlightMatch text={item.title} query={search} />
                  </div>
                  <div className="item-meta">
                    <span>{item.unit || "м²"}</span>
                    {priceLabel && <span className="text-body fw-medium">{priceLabel}</span>}
                    {item.category && !search && selectedCategory === "Все" && (
                      <span className="ms-2 text-muted">({item.category})</span>
                    )}
                  </div>
                </div>

                <div className="d-flex align-items-center gap-1 flex-shrink-0">
                  {onEditCatalogItem && (
                    <button
                      type="button"
                      className="edit-btn"
                      onClick={e => {
                        e.stopPropagation()
                        onEditCatalogItem(item)
                      }}
                      title="Редактировать или удалить из каталога"
                      aria-label={`Редактировать ${item.title}`}
                    >
                      <i className="bi bi-pencil" style={{ fontSize: "14px" }} />
                    </button>
                  )}

                  <button
                    type="button"
                    className={`add-btn ${addedQty ? "added" : ""}`}
                    onClick={e => {
                      e.stopPropagation()
                      onAddItem(item)
                    }}
                    title="Добавить в смету"
                    aria-label={`Добавить ${item.title}`}
                  >
                    {addedQty ? (
                      <span>+{addedQty}</span>
                    ) : (
                      <i className="bi bi-plus fs-4" />
                    )}
                  </button>
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* Add Custom Item Button */}
      <div className="pt-2">
        <button
          type="button"
          className="btn btn-link text-primary text-decoration-none fw-semibold p-0 d-inline-flex align-items-center gap-2"
          onClick={onOpenAddCustom}
        >
          <i className="bi bi-pencil" />
          <span>Не нашли позицию? Добавить свою</span>
        </button>
      </div>
    </div>
  )
}
