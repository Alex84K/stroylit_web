// Wire shapes of the estimate feature — taken verbatim from the server DTOs
// (server_go/internal/handler/{estimate,catalog,estimate_template}.go,
// RECEARCH_ESTIMATE.md §4). Field limits mirror the server validators (§5):
// the client duplicates them for instant feedback, the server stays the
// authority.

export const ESTIMATE_LIMITS = {
  title: 256,
  note: 512,
  itemTitle: 256,
  itemDescription: 1000,
  itemUnit: 32,
  catalogCategory: 64,
  maxItems: 1000,
  maxCatalogItems: 5000,
  maxQuantity: 1_000_000,
  maxPriceMinor: 100_000_000_000,
  maxBp: 10_000,
} as const

// GET /api/v1/estimates/{id} · PUT · PATCH — response. Money is whole minor
// units everywhere; totals are computed by the server (DESIGN_ESTIMATE.md §7).
export type Estimate = {
  id: string
  projectId: string
  number: number // human-readable, assigned by the server on creation
  title: string
  currency: string // "RUB" | "KZT" | ... — three uppercase letters, no catalog
  taxRateBp: number // basis points: 2000 = 20 %
  discountBp: number // 500 = 5 %
  note: string
  items: EstimateItem[] // ORDER BY position, id
  totals: EstimateTotals
  createdAt: string // RFC3339, ms
  updatedAt: string
}

export type EstimateItem = {
  id: string
  title: string
  description: string
  unit: string // free string: "м²", "шт", "точка", "смена"
  quantity: number
  purchasePriceMinor: number
  sellingPriceMinor: number
  position: number
  // no line total — the product is computed at read time (DESIGN §5.2)
}

export type EstimateTotals = {
  costMinor: number
  netMinor: number
  discountMinor: number
  netAfterDiscountMinor: number
  taxMinor: number
  grossMinor: number
  marginMinor: number
}

// GET /api/v1/projects/{id}/estimates — same shape, but never with items.
export type EstimateSummary = Omit<Estimate, "items">

// PUT /api/v1/estimates/{id} — full replacement body. items must always be
// present: an absent key and items: [] both delete every position (F-2).
export type EstimateInput = {
  projectId: string
  title: string
  currency: string
  taxRateBp: number
  discountBp: number
  note: string
  items: EstimateItemInput[]
}

// Same eight fields as EstimateItem — the id is minted by the client.
export type EstimateItemInput = EstimateItem

// PATCH — scalars only, explicit null is rejected by the server.
export type EstimatePatch = Partial<
  Pick<Estimate, "title" | "currency" | "taxRateBp" | "discountBp" | "note">
>

// /api/v1/catalog-items
export type CatalogItem = {
  id: string
  title: string
  description: string
  unit: string
  category: string // free string, not a reference
  isFavorite: boolean
  purchasePriceMinor: number
  sellingPriceMinor: number
  createdAt: string
  updatedAt: string
  // no quantity (belongs to an object), no currency (the estimate sets it),
  // no position
}

export type CatalogItemInput = Omit<
  CatalogItem,
  "id" | "createdAt" | "updatedAt"
>

export type CatalogItemPatch = Partial<CatalogItemInput>

// /api/v1/system-catalog
export type SystemCatalogItem = {
  id: string
  category: string
  title: string
  unit: string
  kind: "WORK" | string
}

// /api/v1/estimate-templates
export type EstimateTemplateItem = {
  id: string
  title: string
  description: string
  unit: string
  quantity: number
  purchasePriceMinor: number
  sellingPriceMinor: number
  position: number
}

export type EstimateTemplate = {
  id: string
  title: string
  note: string
  taxRateBp: number
  discountBp: number
  items: EstimateTemplateItem[]
  createdAt: string
  updatedAt: string
  // no projectId, no currency, no totals
}

export type EstimateTemplateSummary = Omit<EstimateTemplate, "items">

export type EstimateTemplateInput = {
  title: string
  note: string
  taxRateBp: number
  discountBp: number
  items: EstimateTemplateItem[]
}

export type EstimateTemplatePatch = Partial<
  Pick<EstimateTemplate, "title" | "note" | "taxRateBp" | "discountBp">
>
