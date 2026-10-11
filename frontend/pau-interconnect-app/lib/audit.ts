import { getSupabaseServer } from "@/lib/supabase-server";

interface AuditEntry {
  actorId: string;
  action: string;
  targetType: "application" | "logbook_entry" | "internship";
  targetId: string;
  details?: Record<string, unknown>;
}

export async function logDecision(entry: AuditEntry) {
  const supabase = await getSupabaseServer();
  const { error } = await supabase.from("decision_audit_log").insert({
    actor_id: entry.actorId,
    action: entry.action,
    target_type: entry.targetType,
    target_id: entry.targetId,
    details: entry.details || {},
  });
  if (error) {
    console.error("Audit log failed:", error);
  }
}
