import { registerVisit } from "@/lib/supabase/functions";

const VISIT_REGISTERED_KEY = "visit_registered";

export function hasRegisteredVisitThisSession(): boolean {
  if (typeof window === "undefined") {
    return false;
  }

  return sessionStorage.getItem(VISIT_REGISTERED_KEY) === "1";
}

export function markVisitRegisteredThisSession(): void {
  if (typeof window === "undefined") {
    return;
  }

  sessionStorage.setItem(VISIT_REGISTERED_KEY, "1");
}

export type RegisteredVisit = {
  player_id: string;
  visit_count: number;
  first_seen_at: string;
  is_new_visitor: boolean;
};

export async function registerVisitIfNewSession(
  playerId: string,
): Promise<RegisteredVisit | null> {
  if (hasRegisteredVisitThisSession()) {
    return null;
  }

  const { data, error } = await registerVisit(playerId);

  if (error || !data || "error" in data) {
    return null;
  }

  markVisitRegisteredThisSession();
  return data;
}
