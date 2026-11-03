import { convexTest } from "convex-test";
import { afterEach, expect, test, vi } from "vitest";
import schema from "../src/convex/schema";

const modules = import.meta.glob("../src/convex/**/*.ts");

afterEach(() => vi.unstubAllEnvs());

test("endpoint de entrega manual recusa solicitação sem autorização", async () => {
  vi.stubEnv("BARBER_EMAIL_PROVIDER", "manual");
  vi.stubEnv("CONVEX_SITE_URL", "https://clever-squid-863.convex.site");
  vi.stubEnv("BARBER_MANUAL_INBOX_SECRET", "fixture-for-tests-only-uses-no-real-secret-value");
  const t = convexTest(schema, modules);
  const response = await t.fetch("/internal/manual-auth-code", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email: "fake@example.test", token: "12345678", purpose: "verification" }),
  });
  expect(response.status).toBe(401);
});
