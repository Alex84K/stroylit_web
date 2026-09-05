// Переключение светлой/тёмной темы.
//
// Механика штатная для Bootstrap 5.3: атрибут data-bs-theme на <html>, всё
// остальное он делает сам. Своего слоя тем нет — см. DESIGN_REDESIGN.md D6.
//
// Состояния три, хранится два: пока в localStorage пусто, приложение следует за
// системой; первое нажатие переключателя фиксирует выбор и от системы отписывает.
// Первый кадр красит инлайн-скрипт в index.html — иначе он всегда светлый (D7).

export type Theme = "light" | "dark"

const STORAGE_KEY = "stroylit-theme"

const DARK_QUERY = "(prefers-color-scheme: dark)"

/** Явный выбор пользователя, если он был сделан. */
export const getStoredTheme = (): Theme | null => {
  try {
    const value = localStorage.getItem(STORAGE_KEY)
    return value === "light" || value === "dark" ? value : null
  } catch {
    // Приватный режим и заблокированное хранилище — не повод падать.
    return null
  }
}

export const setStoredTheme = (theme: Theme): void => {
  try {
    localStorage.setItem(STORAGE_KEY, theme)
  } catch {
    // Выбор не переживёт перезагрузку, но текущая сессия работает.
  }
}

export const getSystemTheme = (): Theme => {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
    return "light"
  }
  return window.matchMedia(DARK_QUERY).matches ? "dark" : "light"
}

/** Что показываем сейчас: явный выбор, иначе системная тема. */
export const resolveTheme = (): Theme => getStoredTheme() ?? getSystemTheme()

export const applyTheme = (theme: Theme): void => {
  document.documentElement.setAttribute("data-bs-theme", theme)
}

/**
 * Следить за системной темой, пока пользователь не сделал явный выбор.
 * Возвращает функцию отписки.
 */
export const watchSystemTheme = (onChange: (theme: Theme) => void): (() => void) => {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
    return () => {}
  }
  const query = window.matchMedia(DARK_QUERY)
  const handler = (e: MediaQueryListEvent) => {
    if (getStoredTheme() === null) onChange(e.matches ? "dark" : "light")
  }
  query.addEventListener("change", handler)
  return () => {
    query.removeEventListener("change", handler)
  }
}
