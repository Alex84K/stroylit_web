// Центральный источник адреса Web-клиента — используется для генерации
// публичных ссылок для заказчика (просмотр и согласование сметы, витрина заказа).
//
// Адрес резолвится автоматически на клиенте без необходимости в .env:
//   1. window.location.origin — текущий origin браузера (работает везде: localhost:5173, stroylit.shk.solutions);
//   2. window.__WEB_BASE_URL__ — рантайм-оверрайд при необходимости;
//   3. Карта прод-доменов / дефолтный fallback.

const PROD_DEFAULT_WEB = "https://stroylit.shk.solutions"
const DEV_DEFAULT_WEB = "http://localhost:5173"

export function resolveWebBaseUrl(): string {
  // 1. Рантайм-оверрайд
  if (typeof window !== "undefined") {
    const runtime = (window as Window & { __WEB_BASE_URL__?: string }).__WEB_BASE_URL__
    if (typeof runtime === "string" && runtime !== "") {
      return runtime.replace(/\/+$/, "")
    }

    // 2. Текущий origin страницы браузера (http://localhost:5173 или https://stroylit.shk.solutions)
    if (window.location?.origin && window.location.origin !== "null") {
      return window.location.origin.replace(/\/+$/, "")
    }
  }

  // 3. Fallback по окружению
  if (typeof import.meta !== "undefined" && import.meta.env?.DEV) {
    return DEV_DEFAULT_WEB
  }
  return PROD_DEFAULT_WEB
}

export const webBaseUrl = resolveWebBaseUrl()

/**
 * Формирует ссылку для заказчика на публичный просмотр сметы
 * @param tokenOrUrl Токен ссылки (или полный url, из которого извлекается токен)
 */
export function buildPublicEstimateUrl(tokenOrUrl: string): string {
  const base = resolveWebBaseUrl()
  if (!tokenOrUrl) return `${base}/estimate`

  // Если передан полный URL, извлекаем из него токен
  if (tokenOrUrl.includes("token=")) {
    try {
      const url = new URL(tokenOrUrl, base)
      const token = url.searchParams.get("token")
      if (token) {
        return `${base}/estimate?token=${encodeURIComponent(token)}`
      }
    } catch {
      // Игнорируем ошибку парсинга и берем по regexp
      const match = tokenOrUrl.match(/token=([^&]+)/)
      if (match && match[1]) {
        return `${base}/estimate?token=${match[1]}`
      }
    }
  }

  return `${base}/estimate?token=${encodeURIComponent(tokenOrUrl)}`
}
