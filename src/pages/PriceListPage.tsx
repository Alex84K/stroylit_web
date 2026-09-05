import type { FC } from "react"
import { CatalogManager } from "../components/estimates/CatalogManager"

export const PriceListPage: FC = () => {
  return (
    <div className="container-fluid py-4 max-w-7xl">
      <div className="mb-4">
        <h2 className="fw-bold mb-1">Прайс-лист</h2>
        <p className="text-muted">
          Справочник расценок на работы и материалы, используемый для составления смет.
        </p>
      </div>

      <div className="card shadow-sm border-0 rounded-4">
        <div className="card-body p-4">
          <CatalogManager />
        </div>
      </div>
    </div>
  )
}
