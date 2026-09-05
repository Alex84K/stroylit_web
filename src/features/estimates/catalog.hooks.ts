import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { catalogApi } from "./catalog.api"
import type { CatalogItemInput, CatalogItemPatch } from "./types"

export const CATALOG_QUERY_KEY = ["catalog-items"]

export const useGetCatalog = () =>
  useQuery({ queryKey: CATALOG_QUERY_KEY, queryFn: () => catalogApi.getAll() })

export const usePutCatalogItem = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: CatalogItemInput }) =>
      catalogApi.put(id, data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: CATALOG_QUERY_KEY })
    },
  })
}

export const usePatchCatalogItem = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: CatalogItemPatch }) =>
      catalogApi.patch(id, patch),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: CATALOG_QUERY_KEY })
    },
  })
}

export const useDeleteCatalogItem = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => catalogApi.remove(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: CATALOG_QUERY_KEY })
    },
  })
}

export const useGetSystemCatalog = () =>
  useQuery({
    queryKey: ["system-catalog"],
    queryFn: () => catalogApi.getSystemCatalog(),
  })
