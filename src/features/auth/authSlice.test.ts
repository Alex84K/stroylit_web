import { beforeEach, describe, expect, it, vi } from "vitest"
import type * as ApiModule from "../../utils/api"
import type { AppStore } from "../../app/store"
import { makeStore } from "../../app/store"
import type { Address, User } from "../../utils/api"
import {
  deleteAddressAsync,
  deleteAvatarAsync,
  patchProfileAsync,
  putAddressAsync,
  uploadAvatarAsync,
} from "./authSlice"

vi.mock("../../utils/api", async (importOriginal) => {
  const actual = await importOriginal<typeof ApiModule>()
  return {
    ...actual,
    apiFetch: vi.fn(),
    apiFetchBinary: vi.fn(),
  }
})

import { apiFetch } from "../../utils/api"

const mockedApiFetch = vi.mocked(apiFetch)

const baseUser: User = {
  id: "u1",
  email: "user@example.com",
  emailVerified: true,
  firstName: "Иван",
  lastName: "Петров",
  phone: "+7 900 000-00-00",
  inn: "123456789012",
  address: {
    country: "RU",
    postalCode: "123456",
    region: "Московская обл.",
    city: "Москва",
    street: "ул. Ленина",
    building: "д. 5",
    unit: "кв. 10",
  },
  avatar: { updatedAt: "2026-08-11T00:00:00Z", etag: '"abc"' },
  createdAt: "2026-01-01T00:00:00Z",
  updatedAt: "2026-08-11T00:00:00Z",
}

describe("profile thunks", () => {
  let store: AppStore

  beforeEach(() => {
    mockedApiFetch.mockReset()
    store = makeStore()
  })

  it("patchProfileAsync replaces the user and sets a success message", async () => {
    const updated: User = {
      ...baseUser,
      firstName: "Пётр",
      lastName: "",
    }
    mockedApiFetch.mockResolvedValue(updated)

    const action = await store.dispatch(
      patchProfileAsync({ firstName: "Пётр", lastName: "", phone: "", inn: "" }),
    )

    expect(patchProfileAsync.fulfilled.match(action)).toBe(true)
    expect(mockedApiFetch).toHaveBeenCalledWith(
      "/api/v1/me",
      expect.objectContaining({
        method: "PATCH",
        body: JSON.stringify({ firstName: "Пётр", lastName: "", phone: "", inn: "" }),
      }),
    )
    const auth = store.getState().auth
    expect(auth.user).toEqual(updated)
    expect(auth.successMessage).toBeTruthy()
    expect(auth.isLoading).toBe(false)
  })

  it("patchProfileAsync rejected stores the error", async () => {
    mockedApiFetch.mockRejectedValue(new Error("network"))

    const action = await store.dispatch(
      patchProfileAsync({ firstName: "Пётр", lastName: "", phone: "", inn: "" }),
    )

    expect(patchProfileAsync.rejected.match(action)).toBe(true)
    expect(store.getState().auth.error).toBeTruthy()
  })

  it("putAddressAsync replaces the whole user", async () => {
    const address: Address = {
      country: "KZ",
      postalCode: "010000",
      region: "Астана",
      city: "Астана",
      street: "ул. Абая",
      building: "10",
      unit: "1",
    }
    mockedApiFetch.mockResolvedValue({ ...baseUser, address })

    const action = await store.dispatch(putAddressAsync(address))

    expect(putAddressAsync.fulfilled.match(action)).toBe(true)
    expect(store.getState().auth.user?.address).toEqual(address)
  })

  it("deleteAddressAsync nulls the address without touching the rest of the user", async () => {
    // Seed a user first.
    mockedApiFetch.mockResolvedValue(baseUser)
    await store.dispatch(patchProfileAsync({ firstName: "Иван", lastName: "Петров", phone: "", inn: "" }))

    mockedApiFetch.mockReset()
    // DELETE responds 204 (apiFetch returns {} for 204).
    mockedApiFetch.mockResolvedValue({})

    const action = await store.dispatch(deleteAddressAsync())

    expect(deleteAddressAsync.fulfilled.match(action)).toBe(true)
    const auth = store.getState().auth
    expect(auth.user?.address).toBeNull()
    expect(auth.user?.id).toBe("u1")
  })

  it("uploadAvatarAsync uploads bytes, then refetches /me for fresh metadata", async () => {
    const afterUpload: User = {
      ...baseUser,
      avatar: { updatedAt: "2026-08-11T12:00:00Z", etag: '"new-etag"' },
    }
    // PUT /me/avatar → 204 ({}), then GET /me → afterUpload
    mockedApiFetch
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce(afterUpload)

    const bytes = new Uint8Array([1, 2, 3]).buffer
    const action = await store.dispatch(
      uploadAvatarAsync({ bytes, mimeType: "image/png" }),
    )

    expect(uploadAvatarAsync.fulfilled.match(action)).toBe(true)
    expect(mockedApiFetch).toHaveBeenNthCalledWith(
      1,
      "/api/v1/me/avatar",
      expect.objectContaining({ method: "PUT", headers: { "Content-Type": "image/png" } }),
    )
    expect(mockedApiFetch).toHaveBeenNthCalledWith(2, "/api/v1/me", expect.anything())
    expect(store.getState().auth.user?.avatar?.etag).toBe('"new-etag"')
  })

  it("deleteAvatarAsync nulls the avatar", async () => {
    mockedApiFetch.mockResolvedValue(baseUser)
    await store.dispatch(patchProfileAsync({ firstName: "Иван", lastName: "Петров", phone: "", inn: "" }))

    mockedApiFetch.mockReset()
    mockedApiFetch.mockResolvedValue({})

    const action = await store.dispatch(deleteAvatarAsync())

    expect(deleteAvatarAsync.fulfilled.match(action)).toBe(true)
    expect(store.getState().auth.user?.avatar).toBeNull()
    expect(store.getState().auth.user?.id).toBe("u1")
  })

  it("registerAsync sends firstName, legalForm, email and password", async () => {
    const authRes = {
      accessToken: "token123",
      refreshToken: "refresh123",
      user: { ...baseUser, firstName: "Сергей", legalForm: "SELF_EMPLOYED" },
    }
    mockedApiFetch.mockResolvedValue(authRes)

    const { registerAsync } = await import("./authSlice")
    const action = await store.dispatch(
      registerAsync({
        email: "sergey@example.com",
        firstName: "Сергей",
        legalForm: "SELF_EMPLOYED",
        password: "password123",
      }),
    )

    expect(registerAsync.fulfilled.match(action)).toBe(true)
    expect(mockedApiFetch).toHaveBeenCalledWith(
      "/api/v1/auth/register",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          email: "sergey@example.com",
          firstName: "Сергей",
          legalForm: "SELF_EMPLOYED",
          password: "password123",
        }),
      }),
    )
    expect(store.getState().auth.isAuthenticated).toBe(true)
    expect(store.getState().auth.user?.firstName).toBe("Сергей")
  })
})
