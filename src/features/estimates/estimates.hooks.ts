import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { estimatesApi } from "./estimates.api"
import type { EstimateInput, EstimatePatch } from "./types"
import {
  openPdfBlobInTab,
  PdfPopupBlockedError,
  PdfSaveFailedError,
} from "./utils/pdfTab"

export const ESTIMATES_QUERY_KEY = ["estimates"]

export const useGetEstimatesByProject = (projectId: string | undefined) =>
  useQuery({
    queryKey: [...ESTIMATES_QUERY_KEY, "byProject", projectId],
    queryFn: () => {
      if (projectId == null)
        return Promise.reject(new Error("project id is required"))
      return estimatesApi.listByProject(projectId)
    },
    enabled: projectId != null,
  })

export const useGetEstimate = (id: string | null) =>
  useQuery({
    queryKey: [...ESTIMATES_QUERY_KEY, "detail", id],
    queryFn: () => {
      if (id == null)
        return Promise.reject(new Error("estimate id is required"))
      return estimatesApi.getById(id)
    },
    enabled: id != null,
  })

export const usePutEstimate = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: EstimateInput }) =>
      estimatesApi.put(id, data),
    onSuccess: saved => {
      queryClient.setQueryData(
        [...ESTIMATES_QUERY_KEY, "detail", saved.id],
        saved,
      )
      void queryClient.invalidateQueries({
        queryKey: [...ESTIMATES_QUERY_KEY, "byProject", saved.projectId],
      })
    },
  })
}

export const usePatchEstimate = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: EstimatePatch }) =>
      estimatesApi.patch(id, patch),
    onSuccess: saved => {
      queryClient.setQueryData(
        [...ESTIMATES_QUERY_KEY, "detail", saved.id],
        saved,
      )
      void queryClient.invalidateQueries({
        queryKey: [...ESTIMATES_QUERY_KEY, "byProject", saved.projectId],
      })
    },
  })
}

// popup is opened synchronously by the caller (before any await — see
// utils/pdfTab.ts for why) and only navigated here. ensureSaved lets the
// caller reuse its own save path (with its own conflict/error handling)
// without this hook knowing anything about the editor's draft state.
export const useOpenEstimatePdf = () =>
  useMutation({
    mutationFn: async (vars: {
      id: string
      popup: Window | null
      ensureSaved: () => Promise<boolean>
    }) => {
      if (!vars.popup) {
        throw new PdfPopupBlockedError()
      }
      const saved = await vars.ensureSaved()
      if (!saved) {
        if (!vars.popup.closed) vars.popup.close()
        throw new PdfSaveFailedError()
      }
      const blob = await estimatesApi.pdf(vars.id)
      if (vars.popup.closed) return
      openPdfBlobInTab(blob, vars.popup)
    },
  })

export const useDeleteEstimate = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id }: { id: string; projectId: string }) =>
      estimatesApi.remove(id),
    onSuccess: (_data, { id, projectId }) => {
      queryClient.removeQueries({
        queryKey: [...ESTIMATES_QUERY_KEY, "detail", id],
      })
      void queryClient.invalidateQueries({
        queryKey: [...ESTIMATES_QUERY_KEY, "byProject", projectId],
      })
    },
  })
}

export const useSendEstimate = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => estimatesApi.send(id),
    onSuccess: data => {
      void queryClient.invalidateQueries({
        queryKey: [...ESTIMATES_QUERY_KEY, "detail", data.id],
      })
      void queryClient.invalidateQueries({
        queryKey: ESTIMATES_QUERY_KEY,
      })
    },
  })
}
