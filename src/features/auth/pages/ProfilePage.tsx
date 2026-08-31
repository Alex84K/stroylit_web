import type { FC, SyntheticEvent } from "react"
import { useCallback, useEffect, useRef, useState } from "react"
import { useNavigate } from "react-router-dom"
import { useAppDispatch, useAppSelector } from "../../../app/hooks"
import type { Address } from "../../../utils/api"
import {
  changePasswordAsync,
  clearAuthError,
  clearSuccessMessage,
  deleteAccountAsync,
  deleteAddressAsync,
  deleteAvatarAsync,
  fetchAvatarUrl,
  logoutAllAsync,
  logoutAsync,
  patchProfileAsync,
  putAddressAsync,
  resendVerificationAsync,
  uploadAvatarAsync,
} from "../authSlice"

// --- constants ---

const AVATAR_MAX_BYTES = 512 * 1024
const ALLOWED_AVATAR_TYPES = ["image/jpeg", "image/png"]

// --- helpers ---

function emptyAddress(): Address {
  return { country: "", postalCode: "", region: "", city: "", street: "", building: "", unit: "" }
}

function addressFromUser(addr: Address | null | undefined): Address {
  return addr ?? emptyAddress()
}

// --- component ---

export const ProfilePage: FC = () => {
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const { user, isLoading, error, successMessage } = useAppSelector((state) => state.auth)

  // ---- scalar form state ----
  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")
  const [phone, setPhone] = useState("")
  const [inn, setInn] = useState("")

  // ---- address form state ----
  const [address, setAddress] = useState<Address>(emptyAddress())

  // ---- avatar state ----
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [avatarError, setAvatarError] = useState<string | null>(null)
  const avatarInputRef = useRef<HTMLInputElement>(null)
  // Object URL currently rendered — revoked when replaced or on unmount
  // (a leaked blob URL keeps the bytes alive in memory).
  const avatarUrlRef = useRef<string | null>(null)
  // ETag of the URL currently displayed; the source of truth for "current"
  // is user.avatar.etag from /me. If they match, there is nothing to fetch.
  const avatarEtagShownRef = useRef<string | null>(null)

  const setAvatar = (url: string | null) => {
    if (avatarUrlRef.current && avatarUrlRef.current !== url) {
      URL.revokeObjectURL(avatarUrlRef.current)
    }
    avatarUrlRef.current = url
    setAvatarUrl(url)
  }

  // ---- password form state ----
  const [oldPassword, setOldPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmNewPassword, setConfirmNewPassword] = useState("")
  const [passwordError, setPasswordError] = useState<string | null>(null)

  // ---- delete account state ----
  const [deletePassword, setDeletePassword] = useState("")
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  // ---- sync local form when user loads/changes ----
  useEffect(() => {
    if (user) {
      setFirstName(user.firstName)
      setLastName(user.lastName)
      setPhone(user.phone)
      setInn(user.inn)
      setAddress(addressFromUser(user.address))
    }
  }, [user])

  // ---- load avatar on mount / avatar change ----
  const avatarMeta = user?.avatar ?? null
  useEffect(() => {
    let cancelled = false
    if (!avatarMeta) {
      setAvatar(null)
      avatarEtagShownRef.current = null
      return
    }

    // Already showing the current etag — nothing to fetch (no 304 dance).
    if (avatarEtagShownRef.current === avatarMeta.etag) {
      return
    }

    // If-None-Match only when we have a URL to keep: on a 304 the caller
    // must not replace its current image (and on a fresh mount there is no
    // URL yet, so a plain 200 is required).
    fetchAvatarUrl(avatarEtagShownRef.current)
      .then(({ url, etag }) => {
        if (cancelled) return
        if (url) {
          setAvatar(url)
          avatarEtagShownRef.current = etag
        }
      })
      .catch(() => {
        if (!cancelled) setAvatar(null)
      })

    return () => {
      cancelled = true
    }
  }, [avatarMeta])

  // Revoke the blob URL on unmount.
  useEffect(
    () => () => {
      if (avatarUrlRef.current) {
        URL.revokeObjectURL(avatarUrlRef.current)
      }
    },
    [],
  )

  // ---- scalar submit ----
  // PATCH semantics (ADR-006 §4): "" clears a field, absent key leaves it
  // alone. The form always submits all four fields — trimmed — so an
  // emptied field is sent as "" and cleared server-side.
  const handleSaveScalars = (e: SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault()
    void dispatch(
      patchProfileAsync({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        phone: phone.trim(),
        inn: inn.trim(),
      }),
    )
  }

  // ---- address submit ----
  const handleSaveAddress = (e: SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault()
    void dispatch(putAddressAsync(address))
  }

  const handleDeleteAddress = () => {
    void dispatch(deleteAddressAsync())
  }

  // ---- avatar handlers ----
  const handleAvatarSelect = useCallback(() => {
    const input = avatarInputRef.current
    if (!input) return
    setAvatarError(null)

    const file = input.files?.[0]
    if (!file) return

    if (!ALLOWED_AVATAR_TYPES.includes(file.type)) {
      setAvatarError("Допустимы только JPEG и PNG.")
      input.value = ""
      return
    }

    if (file.size > AVATAR_MAX_BYTES) {
      setAvatarError("Размер файла не должен превышать 512 КБ.")
      input.value = ""
      return
    }

    // Validate pixel dimensions before upload
    const img = new Image()
    const objectUrl = URL.createObjectURL(file)
    img.onload = () => {
      URL.revokeObjectURL(objectUrl)
      if (img.naturalWidth > 2048 || img.naturalHeight > 2048) {
        setAvatarError("Изображение не должно превышать 2048×2048 пикселей.")
        input.value = ""
        return
      }

      // Read bytes and upload
      const reader = new FileReader()
      reader.onload = () => {
        const bytes = reader.result as ArrayBuffer
        void dispatch(uploadAvatarAsync({ bytes, mimeType: file.type }))
        input.value = ""
      }
      reader.onerror = () => {
        setAvatarError("Не удалось прочитать файл.")
        input.value = ""
      }
      reader.readAsArrayBuffer(file)
    }
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl)
      setAvatarError("Файл повреждён или не является изображением.")
      input.value = ""
    }
    img.src = objectUrl
  }, [dispatch])

  const handleDeleteAvatar = () => {
    void dispatch(deleteAvatarAsync())
    setAvatar(null)
    avatarEtagShownRef.current = null
  }

  // ---- password ----
  const handleChangePassword = (e: SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault()
    setPasswordError(null)

    if (newPassword.length < 8 || newPassword.length > 72) {
      setPasswordError("Новый пароль должен содержать от 8 до 72 символов")
      return
    }

    if (newPassword !== confirmNewPassword) {
      setPasswordError("Новые пароли не совпадают")
      return
    }

    void dispatch(changePasswordAsync({ oldPassword, newPassword })).then((res) => {
      if (changePasswordAsync.fulfilled.match(res)) {
        setOldPassword("")
        setNewPassword("")
        setConfirmNewPassword("")
      }
    })
  }

  // ---- misc ----
  const handleResendVerification = () => {
    void dispatch(resendVerificationAsync())
  }

  const handleLogout = () => {
    void dispatch(logoutAsync()).then(() => {
      void navigate("/login")
    })
  }

  const handleLogoutAll = () => {
    void dispatch(logoutAllAsync()).then(() => {
      void navigate("/login")
    })
  }

  const handleDeleteAccount = (e: SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!deletePassword) return
    void dispatch(deleteAccountAsync({ password: deletePassword })).then((res) => {
      if (deleteAccountAsync.fulfilled.match(res)) {
        void navigate("/login")
      }
    })
  }

  const activeError = passwordError ?? error

  return (
    <div className="container py-5">
      <div className="row justify-content-center">
        <div className="col-lg-8">
          <h2 className="fw-bold mb-4">Профиль пользователя</h2>

          {/* Alerts */}
          {activeError && (
            <div className="alert alert-danger alert-dismissible fade show mb-4" role="alert">
              {activeError}
              <button
                type="button"
                className="btn-close"
                onClick={() => {
                  setPasswordError(null)
                  dispatch(clearAuthError())
                }}
              ></button>
            </div>
          )}

          {successMessage && (
            <div className="alert alert-success alert-dismissible fade show mb-4" role="alert">
              {successMessage}
              <button
                type="button"
                className="btn-close"
                onClick={() => {
                  dispatch(clearSuccessMessage())
                }}
              ></button>
            </div>
          )}

          {/* Account Info Card */}
          <div className="card shadow-sm border-0 rounded-4 mb-4">
            <div className="card-body p-4">
              <h5 className="card-title fw-bold mb-3">Информация об аккаунте</h5>
              <div className="row mb-2">
                <div className="col-sm-3 text-muted">ID:</div>
                <div className="col-sm-9 fw-semibold text-break">{user?.id}</div>
              </div>
              <div className="row mb-3">
                <div className="col-sm-3 text-muted">Email:</div>
                <div className="col-sm-9 fw-semibold">{user?.email}</div>
              </div>
              <div>
                <button
                  className="btn btn-outline-primary btn-sm py-1 px-2 small"
                  onClick={handleResendVerification}
                  disabled={isLoading}
                >
                  Отправить повторно письмо подтверждения email
                </button>
              </div>
            </div>
          </div>

          {/* Profile Scalars Card */}
          <div className="card shadow-sm border-0 rounded-4 mb-4">
            <div className="card-body p-4">
              <h5 className="card-title fw-bold mb-3">Личные данные</h5>
              <form onSubmit={handleSaveScalars}>
                <div className="row g-3">
                  <div className="col-md-6">
                    <label className="form-label fw-semibold">Имя</label>
                    <input
                      type="text"
                      className="form-control"
                      maxLength={128}
                      value={firstName}
                      onChange={(e) => { setFirstName(e.target.value); }}
                    />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label fw-semibold">Фамилия</label>
                    <input
                      type="text"
                      className="form-control"
                      maxLength={128}
                      value={lastName}
                      onChange={(e) => { setLastName(e.target.value); }}
                    />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label fw-semibold">Телефон</label>
                    <input
                      type="text"
                      className="form-control"
                      maxLength={32}
                      placeholder="+7 900 000-00-00"
                      value={phone}
                      onChange={(e) => { setPhone(e.target.value); }}
                    />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label fw-semibold">ИНН</label>
                    <input
                      type="text"
                      className="form-control"
                      maxLength={16}
                      placeholder="123456789012"
                      value={inn}
                      onChange={(e) => { setInn(e.target.value); }}
                    />
                  </div>
                </div>
                <button type="submit" className="btn btn-primary btn-sm py-1 px-2 small fw-bold mt-3" disabled={isLoading}>
                  {isLoading ? "Сохранение..." : "Сохранить данные"}
                </button>
              </form>
            </div>
          </div>

          {/* Address Card */}
          <div className="card shadow-sm border-0 rounded-4 mb-4">
            <div className="card-body p-4">
              <h5 className="card-title fw-bold mb-3">Адрес</h5>
              <form onSubmit={handleSaveAddress}>
                <div className="row g-3">
                  <div className="col-md-4">
                    <label className="form-label fw-semibold">Страна (ISO-код)</label>
                    <input
                      type="text"
                      className="form-control"
                      maxLength={2}
                      placeholder="RU"
                      value={address.country}
                      onChange={(e) =>
                        { setAddress((a) => ({ ...a, country: e.target.value.toUpperCase() })); }
                      }
                    />
                  </div>
                  <div className="col-md-4">
                    <label className="form-label fw-semibold">Индекс</label>
                    <input
                      type="text"
                      className="form-control"
                      maxLength={16}
                      placeholder="123456"
                      value={address.postalCode}
                      onChange={(e) => { setAddress((a) => ({ ...a, postalCode: e.target.value })); }}
                    />
                  </div>
                  <div className="col-md-4">
                    <label className="form-label fw-semibold">Регион / Область</label>
                    <input
                      type="text"
                      className="form-control"
                      maxLength={128}
                      value={address.region}
                      onChange={(e) => { setAddress((a) => ({ ...a, region: e.target.value })); }}
                    />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label fw-semibold">Город</label>
                    <input
                      type="text"
                      className="form-control"
                      maxLength={128}
                      value={address.city}
                      onChange={(e) => { setAddress((a) => ({ ...a, city: e.target.value })); }}
                    />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label fw-semibold">Улица</label>
                    <input
                      type="text"
                      className="form-control"
                      maxLength={128}
                      value={address.street}
                      onChange={(e) => { setAddress((a) => ({ ...a, street: e.target.value })); }}
                    />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label fw-semibold">Дом / Корпус</label>
                    <input
                      type="text"
                      className="form-control"
                      maxLength={128}
                      value={address.building}
                      onChange={(e) => { setAddress((a) => ({ ...a, building: e.target.value })); }}
                    />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label fw-semibold">Квартира / Офис</label>
                    <input
                      type="text"
                      className="form-control"
                      maxLength={128}
                      value={address.unit}
                      onChange={(e) => { setAddress((a) => ({ ...a, unit: e.target.value })); }}
                    />
                  </div>
                </div>
                <div className="d-flex gap-2 mt-3">
                  <button type="submit" className="btn btn-primary btn-sm py-1 px-2 small fw-bold" disabled={isLoading}>
                    {isLoading ? "Сохранение..." : "Сохранить адрес"}
                  </button>
                  {user?.address && (
                    <button
                      type="button"
                      className="btn btn-outline-danger btn-sm py-1 px-2 small"
                      onClick={handleDeleteAddress}
                      disabled={isLoading}
                    >
                      Удалить адрес
                    </button>
                  )}
                </div>
              </form>
            </div>
          </div>

          {/* Avatar Card */}
          <div className="card shadow-sm border-0 rounded-4 mb-4">
            <div className="card-body p-4">
              <h5 className="card-title fw-bold mb-3">Аватар</h5>

              {avatarUrl ? (
                <div className="mb-3">
                  <img
                    src={avatarUrl}
                    alt="Аватар"
                    className="rounded-3 border"
                    style={{ maxWidth: 200, maxHeight: 200, objectFit: "cover" }}
                  />
                </div>
              ) : user?.avatar ? (
                <div className="mb-3 text-muted small">Загрузка аватара...</div>
              ) : (
                <div className="mb-3 text-muted small">Аватар не установлен.</div>
              )}

              {avatarError && (
                <div className="alert alert-danger py-2 px-3 small mb-3">{avatarError}</div>
              )}

              <div className="d-flex flex-wrap gap-2">
                <input
                  ref={avatarInputRef}
                  type="file"
                  accept="image/jpeg,image/png"
                  className="d-none"
                  onChange={handleAvatarSelect}
                />
                <button
                  type="button"
                  className="btn btn-outline-primary btn-sm py-1 px-2 small"
                  onClick={() => avatarInputRef.current?.click()}
                  disabled={isLoading}
                >
                  Загрузить аватар
                </button>
                {user?.avatar && (
                  <button
                    type="button"
                    className="btn btn-outline-danger btn-sm py-1 px-2 small"
                    onClick={handleDeleteAvatar}
                    disabled={isLoading}
                  >
                    Удалить аватар
                  </button>
                )}
              </div>
              <div className="form-text mt-2">
                JPEG или PNG, не более 512 КБ и 2048×2048 пикселей.
              </div>
            </div>
          </div>

          {/* Change Password Card */}
          <div className="card shadow-sm border-0 rounded-4 mb-4">
            <div className="card-body p-4">
              <h5 className="card-title fw-bold mb-3">Смена пароля</h5>
              <form onSubmit={handleChangePassword}>
                <div className="mb-3">
                  <label className="form-label fw-semibold">Старый пароль</label>
                  <input
                    type="password"
                    className="form-control"
                    value={oldPassword}
                    onChange={(e) => {
                      setOldPassword(e.target.value)
                    }}
                    required
                  />
                </div>
                <div className="mb-3">
                  <label className="form-label fw-semibold">Новый пароль</label>
                  <input
                    type="password"
                    className="form-control"
                    placeholder="От 8 до 72 символов"
                    value={newPassword}
                    onChange={(e) => {
                      setNewPassword(e.target.value)
                    }}
                    required
                  />
                </div>
                <div className="mb-3">
                  <label className="form-label fw-semibold">Повторите новый пароль</label>
                  <input
                    type="password"
                    className="form-control"
                    value={confirmNewPassword}
                    onChange={(e) => {
                      setConfirmNewPassword(e.target.value)
                    }}
                    required
                  />
                </div>
                <button type="submit" className="btn btn-primary btn-sm py-1 px-2 small fw-bold" disabled={isLoading}>
                  {isLoading ? "Сохранение..." : "Изменить пароль"}
                </button>
              </form>
            </div>
          </div>

          {/* Sessions & Logout */}
          <div className="card shadow-sm border-0 rounded-4 mb-4">
            <div className="card-body p-4">
              <h5 className="card-title fw-bold mb-3">Управление сессиями</h5>
              <div className="d-flex flex-wrap gap-2">
                <button className="btn btn-outline-dark btn-sm py-1 px-2 small" onClick={handleLogout} disabled={isLoading}>
                  Выйти из системы
                </button>
                <button className="btn btn-outline-danger btn-sm py-1 px-2 small" onClick={handleLogoutAll} disabled={isLoading}>
                  Выйти со всех устройств
                </button>
              </div>
            </div>
          </div>

          {/* Danger Zone: Account Deletion */}
          <div className="card border-danger shadow-sm rounded-4">
            <div className="card-body p-4">
              <h5 className="card-title text-danger fw-bold mb-2">Опасная зона</h5>
              <p className="text-muted small">
                Удаление аккаунта приведет к безвозвратной потере всех ваших данных.
              </p>
              {!showDeleteConfirm ? (
                <button
                  className="btn btn-danger btn-sm py-1 px-2 small"
                  onClick={() => {
                    setShowDeleteConfirm(true)
                  }}
                >
                  Удалить аккаунт
                </button>
              ) : (
                <form onSubmit={handleDeleteAccount} className="mt-3 bg-body-tertiary p-3 rounded-3">
                  <p className="fw-semibold text-danger mb-2">
                    Внимание! Подтвердите удаление, введя текущий пароль:
                  </p>
                  <div className="mb-3">
                    <input
                      type="password"
                      className="form-control"
                      placeholder="Текущий пароль"
                      value={deletePassword}
                      onChange={(e) => {
                        setDeletePassword(e.target.value)
                      }}
                      required
                    />
                  </div>
                  <div className="d-flex gap-2">
                    <button type="submit" className="btn btn-danger btn-sm py-1 px-2 small fw-bold" disabled={isLoading}>
                      Подтвердить удаление
                    </button>
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm py-1 px-2 small"
                      onClick={() => {
                        setShowDeleteConfirm(false)
                      }}
                    >
                      Отмена
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
