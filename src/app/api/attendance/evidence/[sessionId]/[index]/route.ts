import { getActiveSessionProfile } from "@/lib/auth/guards";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { ATTENDANCE_EVIDENCE_BUCKET } from "@/lib/supabase/attendance-evidence";

export const runtime = "nodejs";

export async function GET(_request: Request, { params }: { params: Promise<{ sessionId: string; index: string }> }) {
  const viewer = await getActiveSessionProfile();
  if (!viewer) return new Response("No autorizado", { status: 401 });
  const { sessionId, index } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(sessionId) || !/^[01]$/.test(index)) return new Response("Solicitud inválida", { status: 400 });
  const admin = createAdminSupabaseClient();
  const { data: session } = await admin.from("attendance_sessions").select("consultant_user_id, evidence_paths").eq("id", sessionId).maybeSingle();
  if (!session) return new Response("No encontrado", { status: 404 });
  const isAdmin = viewer.user.app_metadata.role === "admin" && viewer.profile.role === "admin";
  if (!isAdmin && (viewer.user.app_metadata.role !== "consultant" || viewer.profile.role !== "consultant" || session.consultant_user_id !== viewer.user.id)) return new Response("Prohibido", { status: 403 });
  const evidencePath = session.evidence_paths?.[Number(index)];
  if (!evidencePath || !evidencePath.startsWith(`${session.consultant_user_id}/`)) return new Response("No encontrado", { status: 404 });
  const { data, error } = await admin.storage.from(ATTENDANCE_EVIDENCE_BUCKET).download(evidencePath);
  if (error || !data) return new Response("No encontrado", { status: 404 });
  return new Response(await data.arrayBuffer(), { headers: { "Cache-Control": "private, no-store", "Content-Type": data.type || "image/jpeg", "X-Content-Type-Options": "nosniff" } });
}
