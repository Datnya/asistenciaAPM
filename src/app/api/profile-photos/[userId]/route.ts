import { getActiveSessionProfile } from "@/lib/auth/guards";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { PROFILE_PHOTOS_BUCKET } from "@/lib/supabase/profile-photos";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  context: { params: Promise<{ userId: string }> },
) {
  const session = await getActiveSessionProfile();
  if (!session) return new Response("No autorizado", { status: 401 });

  const { userId } = await context.params;
  const isAdmin = session.user.app_metadata.role === "admin" && session.profile.role === "admin";
  if (!isAdmin && session.user.id !== userId) return new Response("Prohibido", { status: 403 });

  const admin = createAdminSupabaseClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("avatar_path")
    .eq("user_id", userId)
    .maybeSingle();
  if (!profile?.avatar_path || !profile.avatar_path.startsWith(`${userId}/`)) {
    return new Response("Fotografía no encontrada", { status: 404 });
  }

  const { data, error } = await admin.storage.from(PROFILE_PHOTOS_BUCKET).download(profile.avatar_path);
  if (error || !data) return new Response("Fotografía no encontrada", { status: 404 });

  return new Response(await data.arrayBuffer(), {
    headers: {
      "Cache-Control": "private, max-age=300",
      "Content-Type": data.type || "image/jpeg",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
