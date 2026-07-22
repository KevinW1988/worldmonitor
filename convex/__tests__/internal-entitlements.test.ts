import { convexTest } from "convex-test";
import { describe, expect, test, beforeEach, afterEach, vi } from "vitest";
import schema from "../schema";
import { internal } from "../_generated/api";
import { PRODUCT_CATALOG } from "../config/productCatalog";
import { getFeaturesForPlan } from "../lib/entitlements";

const modules = import.meta.glob("../**/*.ts");

const CONVEX_SECRET = "test-convex-secret-internal-entitlements-46chXX";
const USER_A = "user-test-entitlements";
const NOW = 1_750_000_000_000;
const DAY_MS = 24 * 60 * 60 * 1000;

function validHeaders(): Record<string, string> {
  return {
    "x-convex-shared-secret": CONVEX_SECRET,
    "Content-Type": "application/json",
  };
}

describe("/api/internal-entitlements HTTP action", () => {
  let originalSecret: string | undefined;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
    originalSecret = process.env.CONVEX_SERVER_SHARED_SECRET;
    process.env.CONVEX_SERVER_SHARED_SECRET = CONVEX_SECRET;
  });

  afterEach(() => {
    vi.useRealTimers();
    if (originalSecret === undefined) {
      delete process.env.CONVEX_SERVER_SHARED_SECRET;
    } else {
      process.env.CONVEX_SERVER_SHARED_SECRET = originalSecret;
    }
  });

  test("happy path: valid secret + valid userId → 200 with free-tier defaults", async () => {
    const t = convexTest(schema, modules);
    const res = await t.fetch("/api/internal-entitlements", {
      method: "POST",
      headers: validHeaders(),
      body: JSON.stringify({ userId: USER_A }),
    });

    expect(res.status).toBe(200);
    const body = (await res.json()) as { planKey: string };
    expect(body.planKey).toBe("free");
  });

  test("recently stale verification lease surfaces renewal_verification_pending", async () => {
    const t = convexTest(schema, modules);
    await t.run(async (ctx) => {
      await ctx.db.insert("subscriptions", {
        userId: USER_A,
        dodoSubscriptionId: "sub_http_pending",
        dodoProductId: PRODUCT_CATALOG.pro_monthly.dodoProductId!,
        planKey: "pro_monthly",
        status: "active",
        currentPeriodStart: NOW - 31 * DAY_MS,
        currentPeriodEnd: NOW - DAY_MS,
        rawPayload: {},
        updatedAt: NOW - DAY_MS,
      });
      await ctx.db.insert("entitlements", {
        userId: USER_A,
        planKey: "pro_monthly",
        features: getFeaturesForPlan("pro_monthly"),
        validUntil: NOW - DAY_MS,
        updatedAt: NOW - DAY_MS,
      });
    });
    await t.mutation(
      internal.payments.billing.claimRecentlyStaleSubscriptionForVerification,
      { userId: USER_A, now: NOW },
    );

    const res = await t.fetch("/api/internal-entitlements", {
      method: "POST",
      headers: validHeaders(),
      body: JSON.stringify({ userId: USER_A }),
    });

    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({
      planKey: "free",
      billingStatus: "renewal_verification_pending",
      retryAfterSeconds: 15,
    });
  });

  test("billing history without a verification candidate surfaces subscription_lapsed", async () => {
    const t = convexTest(schema, modules);
    await t.run(async (ctx) => {
      await ctx.db.insert("subscriptions", {
        userId: USER_A,
        dodoSubscriptionId: "sub_http_lapsed",
        dodoProductId: PRODUCT_CATALOG.pro_monthly.dodoProductId!,
        planKey: "pro_monthly",
        status: "expired",
        currentPeriodStart: NOW - 31 * DAY_MS,
        currentPeriodEnd: NOW - DAY_MS,
        rawPayload: {},
        updatedAt: NOW - DAY_MS,
      });
      await ctx.db.insert("entitlements", {
        userId: USER_A,
        planKey: "free",
        features: getFeaturesForPlan("free"),
        validUntil: NOW - 1,
        updatedAt: NOW - 1,
      });
    });

    const res = await t.fetch("/api/internal-entitlements", {
      method: "POST",
      headers: validHeaders(),
      body: JSON.stringify({ userId: USER_A }),
    });

    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({
      planKey: "free",
      billingStatus: "subscription_lapsed",
    });
  });

  test("missing secret header → 401 UNAUTHORIZED", async () => {
    const t = convexTest(schema, modules);
    const res = await t.fetch("/api/internal-entitlements", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: USER_A }),
    });

    expect(res.status).toBe(401);
    const body = (await res.json()) as { error: string };
    expect(body.error).toBe("UNAUTHORIZED");
  });

  test("empty secret header → 401 UNAUTHORIZED", async () => {
    const t = convexTest(schema, modules);
    const res = await t.fetch("/api/internal-entitlements", {
      method: "POST",
      headers: {
        "x-convex-shared-secret": "",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ userId: USER_A }),
    });

    expect(res.status).toBe(401);
    const body = (await res.json()) as { error: string };
    expect(body.error).toBe("UNAUTHORIZED");
  });

  test("wrong secret → 401 UNAUTHORIZED", async () => {
    const t = convexTest(schema, modules);
    const res = await t.fetch("/api/internal-entitlements", {
      method: "POST",
      headers: {
        "x-convex-shared-secret": "wrong-secret",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ userId: USER_A }),
    });

    expect(res.status).toBe(401);
    const body = (await res.json()) as { error: string };
    expect(body.error).toBe("UNAUTHORIZED");
  });

  test("missing userId → 400 MISSING_USER_ID", async () => {
    const t = convexTest(schema, modules);
    const res = await t.fetch("/api/internal-entitlements", {
      method: "POST",
      headers: validHeaders(),
      body: JSON.stringify({}),
    });

    expect(res.status).toBe(400);
    const body = (await res.json()) as { error: string };
    expect(body.error).toBe("MISSING_USER_ID");
  });

  test("empty-string userId → 400 MISSING_USER_ID", async () => {
    const t = convexTest(schema, modules);
    const res = await t.fetch("/api/internal-entitlements", {
      method: "POST",
      headers: validHeaders(),
      body: JSON.stringify({ userId: "" }),
    });

    expect(res.status).toBe(400);
    const body = (await res.json()) as { error: string };
    expect(body.error).toBe("MISSING_USER_ID");
  });

  test("non-string userId (number) → 400 MISSING_USER_ID", async () => {
    const t = convexTest(schema, modules);
    const res = await t.fetch("/api/internal-entitlements", {
      method: "POST",
      headers: validHeaders(),
      body: JSON.stringify({ userId: 12345 }),
    });

    expect(res.status).toBe(400);
    const body = (await res.json()) as { error: string };
    expect(body.error).toBe("MISSING_USER_ID");
  });

  test("oversized userId (>256 chars) → 400 MISSING_USER_ID", async () => {
    const t = convexTest(schema, modules);
    const oversized = "u-".repeat(200); // 400 chars
    expect(oversized.length).toBeGreaterThan(256);
    const res = await t.fetch("/api/internal-entitlements", {
      method: "POST",
      headers: validHeaders(),
      body: JSON.stringify({ userId: oversized }),
    });

    expect(res.status).toBe(400);
    const body = (await res.json()) as { error: string };
    expect(body.error).toBe("MISSING_USER_ID");
  });

  test("invalid JSON body → 400 INVALID_JSON", async () => {
    const t = convexTest(schema, modules);
    const res = await t.fetch("/api/internal-entitlements", {
      method: "POST",
      headers: validHeaders(),
      body: "not-json",
    });

    expect(res.status).toBe(400);
    const body = (await res.json()) as { error: string };
    expect(body.error).toBe("INVALID_JSON");
  });

  test.each([null, [], "not-an-object", 42, true])(
    "non-object JSON body (%j) → 400 INVALID_JSON",
    async (payload) => {
      const t = convexTest(schema, modules);
      const res = await t.fetch("/api/internal-entitlements", {
        method: "POST",
        headers: validHeaders(),
        body: JSON.stringify(payload),
      });

      expect(res.status).toBe(400);
      const body = (await res.json()) as { error: string };
      expect(body.error).toBe("INVALID_JSON");
    },
  );
});
