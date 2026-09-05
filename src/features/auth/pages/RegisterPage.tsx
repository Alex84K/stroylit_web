import type { FC, SyntheticEvent } from "react"
import { useEffect, useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { useAppDispatch, useAppSelector } from "../../../app/hooks"
import { clearAuthError, registerAsync } from "../authSlice"

export const RegisterPage: FC = () => {
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const { isLoading, error, isAuthenticated } = useAppSelector((state) => state.auth)

  const [email, setEmail] = useState("")
  const [firstName, setFirstName] = useState("")
  const [legalForm, setLegalForm] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [validationError, setValidationError] = useState<string | null>(null)

  useEffect(() => {
    dispatch(clearAuthError())
  }, [dispatch])

  useEffect(() => {
    if (isAuthenticated) {
      void navigate("/projects")
    }
  }, [isAuthenticated, navigate])

  const handleSubmit = (e: SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault()
    setValidationError(null)

    const trimmedName = firstName.trim()
    if (!trimmedName) {
      setValidationError("Пожалуйста, укажите ваше имя")
      return
    }
    if (trimmedName.length > 64) {
      setValidationError("Имя не должно превышать 64 символа")
      return
    }

    if (password.length < 8 || password.length > 72) {
      setValidationError("Пароль должен содержать от 8 до 72 символов")
      return
    }

    if (password !== confirmPassword) {
      setValidationError("Пароли не совпадают")
      return
    }

    void dispatch(
      registerAsync({
        email: email.trim(),
        firstName: trimmedName,
        legalForm: legalForm || undefined,
        password,
      }),
    ).then((result) => {
      if (registerAsync.fulfilled.match(result)) {
        void navigate("/projects")
      }
    })
  }

  const activeError = validationError ?? error

  return (
    <div className="container py-5">
      <div className="row justify-content-center">
        <div className="col-md-6 col-lg-5">
          <div className="card shadow-lg border-0 rounded-4">
            <div className="card-body p-4 p-sm-5">
              <h3 className="card-title text-center fw-bold mb-4">Регистрация</h3>

              {activeError && (
                <div className="alert alert-danger alert-dismissible fade show" role="alert">
                  {activeError}
                  <button
                    type="button"
                    className="btn-close"
                    onClick={() => {
                      setValidationError(null)
                      dispatch(clearAuthError())
                    }}
                  ></button>
                </div>
              )}

              <form onSubmit={handleSubmit}>
                <div className="mb-3">
                  <label className="form-label fw-semibold">Ваше имя</label>
                  <input
                    type="text"
                    className="form-control form-control-lg"
                    placeholder="Например, Иван"
                    value={firstName}
                    onChange={(e) => {
                      setFirstName(e.target.value)
                    }}
                    required
                  />
                </div>

                <div className="mb-3">
                  <label className="form-label fw-semibold">Email</label>
                  <input
                    type="email"
                    className="form-control form-control-lg"
                    placeholder="name@example.com"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value)
                    }}
                    required
                  />
                </div>

                <div className="mb-3">
                  <label className="form-label fw-semibold">Юридический статус <span className="text-muted fw-normal">(необязательно)</span></label>
                  <select
                    className="form-select form-select-lg"
                    value={legalForm}
                    onChange={(e) => {
                      setLegalForm(e.target.value)
                    }}
                  >
                    <option value="">Не указано</option>
                    <option value="SELF_EMPLOYED">Самозанятый</option>
                    <option value="IE">Индивидуальный предприниматель (ИП)</option>
                    <option value="INDIVIDUAL">Физическое лицо</option>
                  </select>
                </div>

                <div className="mb-3">
                  <label className="form-label fw-semibold">Пароль</label>
                  <input
                    type="password"
                    className="form-control form-control-lg"
                    placeholder="От 8 до 72 символов"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value)
                    }}
                    required
                  />
                </div>

                <div className="mb-3">
                  <label className="form-label fw-semibold">Подтвердите пароль</label>
                  <input
                    type="password"
                    className="form-control form-control-lg"
                    placeholder="Повторите пароль"
                    value={confirmPassword}
                    onChange={(e) => {
                      setConfirmPassword(e.target.value)
                    }}
                    required
                  />
                </div>

                <button
                  type="submit"
                  className="btn btn-primary btn-lg w-100 mt-3 fw-bold"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2" role="status" />
                      Регистрация...
                    </>
                  ) : (
                    "Зарегистрироваться"
                  )}
                </button>
              </form>

              <div className="text-center mt-4">
                <span className="text-muted">Уже есть аккаунт? </span>
                <Link to="/login" className="fw-semibold text-decoration-none">
                  Войти
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
