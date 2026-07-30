import type { SupabaseClient } from "npm:@supabase/supabase-js@2";

/**
 * Best-effort: persist a validated display name onto app_visitors.
 * Ensures the visitor row exists, updates last_display_name, and appends
 * to display_names when the name is not already present (case-insensitive).
 * Failures are swallowed so lobby flows are never blocked.
 */
export async function recordVisitorDisplayName(
  supabase: SupabaseClient,
  playerId: string,
  name: string,
): Promise<void> {
  try {
    const now = new Date().toISOString();

    const { data: existing, error: selectError } = await supabase
      .from("app_visitors")
      .select("display_names")
      .eq("id", playerId)
      .maybeSingle();

    if (selectError) {
      console.error("recordVisitorDisplayName select failed", selectError);
      return;
    }

    if (!existing) {
      const { error: insertError } = await supabase.from("app_visitors").insert({
        id: playerId,
        first_seen_at: now,
        last_seen_at: now,
        visit_count: 1,
        last_display_name: name,
        display_names: [name],
      });

      if (insertError) {
        console.error("recordVisitorDisplayName insert failed", insertError);
      }

      return;
    }

    const existingNames = Array.isArray(existing.display_names)
      ? (existing.display_names as string[])
      : [];
    const nameLower = name.toLowerCase();
    const alreadyPresent = existingNames.some(
      (entry) => entry.toLowerCase() === nameLower,
    );
    const nextNames = alreadyPresent
      ? existingNames
      : [...existingNames, name];

    const { error: updateError } = await supabase
      .from("app_visitors")
      .update({
        last_display_name: name,
        display_names: nextNames,
      })
      .eq("id", playerId);

    if (updateError) {
      console.error("recordVisitorDisplayName update failed", updateError);
    }
  } catch (error) {
    console.error("recordVisitorDisplayName unexpected error", error);
  }
}
