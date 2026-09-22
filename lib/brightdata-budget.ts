import "server-only";
import { createAdminClient } from "@/lib/supabase-admin";
import { checked } from "@/lib/db-result";

export class BrightDataBudgetPausedError extends Error {
  constructor() {
    super(
      "Bright Data test collection is paused to protect your balance. A one-record test must be enabled manually.",
    );
    this.name = "BrightDataBudgetPausedError";
  }
}

export async function reserveBrightDataTest(
  platform: string,
  accountId: string,
) {
  // Atomic compare-and-set: concurrent jobs cannot both acquire the same slot.
  // Never refund a reservation after timeout/failure: the provider may have
  // accepted and billed the request even when we did not receive its response.
  const slot = checked(
    await createAdminClient()
      .from("brightdata_test_budget")
      .update({ enabled: false, reserved_at: new Date().toISOString() })
      .eq("platform", platform)
      .eq("social_account_id", accountId)
      .eq("enabled", true)
      .is("reserved_at", null)
      .select("max_records")
      .maybeSingle(),
  );
  if (!slot || slot.max_records !== 1) throw new BrightDataBudgetPausedError();
}
