import { apiFetch } from "../../utils/api"
import type { CatalogItem, CatalogItemInput, CatalogItemPatch, SystemCatalogItem } from "./types"

export const catalogApi = {
  // The whole catalog in one request, ORDER BY title, id — search and
  // filtering happen on the client (F-6).
  getAll: (): Promise<CatalogItem[]> =>
    apiFetch<CatalogItem[]>("/api/v1/catalog-items"),

  getById: (id: string): Promise<CatalogItem> =>
    apiFetch<CatalogItem>(`/api/v1/catalog-items/${id}`),

  put: (id: string, data: CatalogItemInput): Promise<CatalogItem> =>
    apiFetch<CatalogItem>(`/api/v1/catalog-items/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  patch: (id: string, patch: CatalogItemPatch): Promise<CatalogItem> =>
    apiFetch<CatalogItem>(`/api/v1/catalog-items/${id}`, {
      method: "PATCH",
      body: JSON.stringify(patch),
    }),

  remove: (id: string): Promise<void> =>
    apiFetch(`/api/v1/catalog-items/${id}`, { method: "DELETE" }),

  getSystemCatalog: (): Promise<SystemCatalogItem[]> =>
    apiFetch<SystemCatalogItem[]>("/api/v1/system-catalog"),
}
