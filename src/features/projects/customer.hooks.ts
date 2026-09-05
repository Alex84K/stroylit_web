import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { customerApi, type SetCustomerInput } from "./customer.api"

export const CUSTOMER_QUERY_KEY = (projectId: string | undefined) => [
  "projects",
  "detail",
  projectId,
  "customer",
]

export const useGetProjectCustomer = (projectId: string | undefined) => {
  return useQuery({
    queryKey: CUSTOMER_QUERY_KEY(projectId),
    queryFn: () => {
      if (!projectId) {
        return Promise.resolve(null)
      }
      return customerApi.getByProjectId(projectId)
    },
    enabled: Boolean(projectId),
  })
}

export const useSetProjectCustomer = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      projectId,
      input,
    }: {
      projectId: string
      input: SetCustomerInput
    }) => customerApi.put(projectId, input),
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({
        queryKey: CUSTOMER_QUERY_KEY(variables.projectId),
      })
      void queryClient.invalidateQueries({
        queryKey: ["projects", "detail", variables.projectId],
      })
    },
  })
}

export const useInviteCustomer = () => {
  return useMutation({
    mutationFn: ({
      projectId,
      channel,
    }: {
      projectId: string
      channel: "TELEGRAM"
    }) => customerApi.invite(projectId, channel),
  })
}
