import { describe, it, expect } from "vitest"
import { resolveWebBaseUrl, buildPublicEstimateUrl } from "./webConfig"

describe("webConfig", () => {
  it("resolves current origin as webBaseUrl", () => {
    const base = resolveWebBaseUrl()
    expect(base).toBeDefined()
    expect(typeof base).toBe("string")
  })

  it("builds public estimate url from raw token", () => {
    const url = buildPublicEstimateUrl("test-token-123")
    expect(url).toContain("/estimate?token=test-token-123")
  })

  it("extracts token when given full backend url and replaces with current client origin", () => {
    const url = buildPublicEstimateUrl("http://localhost:8080/estimate?token=abc-xyz")
    expect(url).toContain("/estimate?token=abc-xyz")
    expect(url).not.toContain("localhost:8080")
  })
})
