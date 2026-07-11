import { convexTest } from "convex-test";
import { describe, expect, test } from "vitest";
import { api } from "../_generated/api";
import schema from "../schema";

const modules = import.meta.glob("../**/*.ts");
type TestUser = ReturnType<ReturnType<typeof convexTest>["withIdentity"]>;

const USER = {
  subject: "user-tests-notification-channels",
  tokenIdentifier: "clerk|user-tests-notification-channels",
};

async function seedEntitlement(
  t: ReturnType<typeof convexTest>,
  tier = 1,
  validUntil = Date.now() + 30 * 24 * 60 * 60 * 1000,
) {
  await t.run(async (ctx) => {
    await ctx.db.insert("entitlements", {
      userId: USER.subject,
      planKey: tier >= 1 ? "pro_monthly" : "free",
      features: {
        tier,
        maxDashboards: 10,
        apiAccess: true,
        apiRateLimit: 1000,
        prioritySupport: true,
        exportFormats: ["json", "csv"],
      },
      validUntil,
      updatedAt: Date.now(),
    });
  });
}

describe("notificationChannels — Convex entitlement gate", () => {
  test.each([
    ["setChannel", (asUser: TestUser) =>
      asUser.mutation(api.notificationChannels.setChannel, {
        channelType: "email",
        email: "free-user@example.com",
      })],
    ["deleteChannel", (asUser: TestUser) =>
      asUser.mutation(api.notificationChannels.deleteChannel, {
        channelType: "email",
      })],
    ["deactivateChannel", (asUser: TestUser) =>
      asUser.mutation(api.notificationChannels.deactivateChannel, {
        channelType: "email",
      })],
    ["createPairingToken", (asUser: TestUser) =>
      asUser.mutation(api.notificationChannels.createPairingToken, {
        variant: "full",
      })],
  ])("%s rejects an authenticated free-tier caller", async (_name, invoke) => {
    const t = convexTest(schema, modules);
    const asFreeUser = t.withIdentity(USER);

    await expect(invoke(asFreeUser)).rejects.toThrow(
      /PRO_REQUIRED|Notifications are a PRO feature/i,
    );
  });

  test("setChannel rejects an expired PRO entitlement", async () => {
    const t = convexTest(schema, modules);
    await seedEntitlement(t, 1, Date.now() - 1_000);
    const asExpiredUser = t.withIdentity(USER);

    await expect(
      asExpiredUser.mutation(api.notificationChannels.setChannel, {
        channelType: "email",
        email: "expired-user@example.com",
      }),
    ).rejects.toThrow(/PRO_REQUIRED|Notifications are a PRO feature/i);
  });

  test("setChannel rejects an explicit tier-0 entitlement", async () => {
    const t = convexTest(schema, modules);
    await seedEntitlement(t, 0);
    const asFreeUser = t.withIdentity(USER);

    await expect(
      asFreeUser.mutation(api.notificationChannels.setChannel, {
        channelType: "email",
        email: "tier-zero-user@example.com",
      }),
    ).rejects.toThrow(/PRO_REQUIRED|Notifications are a PRO feature/i);
  });

  test("PRO callers retain access to all four public mutations", async () => {
    const t = convexTest(schema, modules);
    await seedEntitlement(t);
    const asProUser = t.withIdentity(USER);

    await asProUser.mutation(api.notificationChannels.setChannel, {
      channelType: "email",
      email: "pro-user@example.com",
    });
    await asProUser.mutation(api.notificationChannels.deactivateChannel, {
      channelType: "email",
    });
    await asProUser.mutation(api.notificationChannels.deleteChannel, {
      channelType: "email",
    });
    const pairing = await asProUser.mutation(
      api.notificationChannels.createPairingToken,
      { variant: "full" },
    );

    await expect(asProUser.query(api.notificationChannels.getChannels, {}))
      .resolves.toEqual([]);
    expect(pairing.token).toHaveLength(43);
  });
});
