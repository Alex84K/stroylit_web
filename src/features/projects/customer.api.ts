import { apiFetch, ApiError } from "../../utils/api"

export interface CustomerDTO {
  projectId: string
  channel: "EMAIL" | "TELEGRAM" | "MAX"
  contact: string
  note?: string
  createdAt?: string
  updatedAt?: string
}

export interface SetCustomerInput {
  channel: "EMAIL" | "TELEGRAM"
  contact: string
  note?: string
}

export interface CustomerInviteDTO {
  channel: string
  url: string
  expiresAt: string
}

export const customerApi = {
  getByProjectId: async (projectId: string): Promise<CustomerDTO | null> => {
    try {
      return await apiFetch<CustomerDTO>(`/api/v1/projects/${projectId}/customer`)
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) {
        return null
      }
      throw err
    }
  },

  put: async (projectId: string, input: SetCustomerInput): Promise<CustomerDTO> => {
    return apiFetch<CustomerDTO>(`/api/v1/projects/${projectId}/customer`, {
      method: "PUT",
      body: JSON.stringify({
        channel: input.channel,
        contact: input.contact,
        note: input.note ?? "",
      }),
    })
  },

  invite: async (projectId: string, channel: "TELEGRAM"): Promise<CustomerInviteDTO> => {
    return apiFetch<CustomerInviteDTO>(`/api/v1/projects/${projectId}/customer/invite`, {
      method: "POST",
      body: JSON.stringify({ channel }),
    })
  },
}
