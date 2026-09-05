import { apiFetch, apiFetchBinary } from "../../utils/api"
import type {
  Estimate,
  EstimateInput,
  EstimatePatch,
  EstimateSummary,
} from "./types"

export const estimatesApi = {
  listByProject: (projectId: string): Promise<EstimateSummary[]> =>
    apiFetch<EstimateSummary[]>(`/api/v1/projects/${projectId}/estimates`),

  getById: (id: string): Promise<Estimate> =>
    apiFetch<Estimate>(`/api/v1/estimates/${id}`),

  // The blob's .type is set from the response's Content-Type
  // (application/pdf, set by the server) — nothing to configure here.
  pdf: async (id: string): Promise<Blob> => {
    const response = await apiFetchBinary(`/api/v1/estimates/${id}/pdf`)
    return response.blob()
  },

  // PUT is both create (201) and replace (200) — the client mints the
  // UUIDv7 id. The body is always built by buildEstimateBody so the items
  // key can never be missing (F-2).
  put: (id: string, data: EstimateInput): Promise<Estimate> =>
    apiFetch<Estimate>(`/api/v1/estimates/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  // PATCH touches only the scalar fields; items are not patchable at all.
  patch: (id: string, patch: EstimatePatch): Promise<Estimate> =>
    apiFetch<Estimate>(`/api/v1/estimates/${id}`, {
      method: "PATCH",
      body: JSON.stringify(patch),
    }),

  // Idempotent: 204 even for a foreign or missing id.
  remove: (id: string): Promise<void> =>
    apiFetch(`/api/v1/estimates/${id}`, { method: "DELETE" }),

  // POST /api/v1/estimates/{id}/send — moves DRAFT -> SENT, issues public token and notifies via customer channel
  send: (id: string): Promise<{ id: string; status: string; publicUrl: string; notified: boolean }> =>
    apiFetch(`/api/v1/estimates/${id}/send`, { method: "POST" }),
}
