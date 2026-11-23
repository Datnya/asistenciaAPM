import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function getCurrentPeriodMetrics(userId: string) {
  const db = await createServerSupabaseClient();
  const { data: period, error } = await db.from("report_periods")
    .select("start_date, end_date").eq("consultant_user_id", userId)
    .order("start_date", { ascending: false }).limit(1).maybeSingle();
  if (error) throw error;
  if (!period) return { totalMinutes: 0, days: 0 };
  const { data: sessions, error: attendanceError } = await db.from("attendance_sessions")
    .select("work_date, declared_minutes").eq("consultant_user_id", userId).eq("status", "closed")
    .gte("work_date", period.start_date).lte("work_date", period.end_date);
  if (attendanceError) throw attendanceError;
  return {
    totalMinutes: sessions.reduce((sum, session) => sum + (session.declared_minutes ?? 0), 0),
    days: new Set(sessions.map(session => session.work_date)).size,
  };
}
