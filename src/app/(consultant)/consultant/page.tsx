import { CalendarDays, Clock3, UsersRound } from "lucide-react";

import { AttendanceAction, type OpenAttendance } from "@/components/consultant/attendance-action";
import { formatDeclaredMinutes } from "@/lib/attendance/hours";
import { DashboardMetric } from "@/components/consultant/dashboard-metric";
import { requireRole } from "@/lib/auth/guards";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function ConsultantPage() {
  const { profile } = await requireRole("consultant");
  const supabase = await createServerSupabaseClient();
  const { data: assignments } = await supabase
    .from("consultant_client_assignments")
    .select("clients(id, name)")
    .eq("consultant_user_id", profile.user_id)
    .eq("is_active", true);
  const assignedClients = (assignments ?? []).flatMap((assignment) => {
    const client = assignment.clients as unknown as { id: string; name: string } | null;
    return client ? [client] : [];
  });

  const { data: openSession } = await supabase
    .from("attendance_sessions")
    .select("id, work_date, entry_time, clients(name)")
    .eq("consultant_user_id", profile.user_id)
    .eq("status", "open")
    .maybeSingle();
  const { data: activities } = openSession
    ? await supabase
      .from("attendance_activities")
      .select("id, area_code, other_area_name, description")
      .eq("session_id", openSession.id)
      .order("created_at")
    : { data: [] };
  const attendance: OpenAttendance | null = openSession ? {
    id: openSession.id,
    workDate: openSession.work_date,
    entryTime: openSession.entry_time.slice(0, 5),
    clientName: (openSession.clients as unknown as { name: string } | null)?.name ?? "Cliente asignado",
    activities: (activities ?? []).map((activity) => ({ id: activity.id, areaCode: activity.area_code, otherAreaName: activity.other_area_name, description: activity.description })),
  } : null;

  const { data: closedSessions } = await supabase
    .from("attendance_sessions")
    .select("declared_minutes")
    .eq("consultant_user_id", profile.user_id)
    .eq("status", "closed");
  const totalMinutes = (closedSessions ?? []).reduce((total, session) => total + (session.declared_minutes ?? 0), 0);
  const assignedClient = attendance?.clientName ?? assignedClients[0]?.name ?? null;

  return (
    <main className="px-4 py-8 sm:px-6 lg:px-9 lg:py-12 xl:px-10 2xl:px-12">
      <section className="mx-auto w-full max-w-[1340px]">
        <div className="flex flex-col gap-7 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <h1 className="text-[38px] leading-none font-extrabold tracking-[-0.045em] sm:text-[46px]">
              Dashboard
            </h1>
            <p className="mt-3 text-lg leading-relaxed text-[#697186] sm:text-[25px]">
              Hola, {profile.first_name}. ¡Que tengas un gran día!
            </p>
          </div>
          <AttendanceAction assignedClients={assignedClients} openAttendance={attendance} />
        </div>

        <div className="mt-10 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          <DashboardMetric icon={Clock3} label="Horas acumuladas" value={formatDeclaredMinutes(totalMinutes)} />
          <DashboardMetric icon={CalendarDays} label="Días con asistencia" value={String(closedSessions?.length ?? 0)} />
          <DashboardMetric
            icon={UsersRound}
            label="Cliente asignado hoy"
              value={assignedClient ?? "Sin cliente asignado"}
            valueClassName="text-[21px]"
          />
        </div>

        <section className="mt-9 rounded-[18px] border border-[#eff0f2] bg-white p-5 shadow-[0_12px_40px_rgba(15,23,42,0.045)] sm:p-8">
          <h2 className="text-[27px] font-bold tracking-[-0.03em] sm:text-[32px]">Estado de hoy</h2>
          <div className="mt-5 flex flex-col gap-5 rounded-[16px] bg-[#f8f9fb] px-5 py-7 sm:flex-row sm:items-center sm:px-7">
            <div className="flex size-[84px] shrink-0 items-center justify-center rounded-full bg-[#eceff3] text-[#363c48]">
              <Clock3 aria-hidden="true" className="size-12" strokeWidth={2.15} />
            </div>
            <div>
              <p className="text-lg font-bold tracking-[-0.02em] sm:text-[24px]">
              {attendance ? "Tienes una jornada abierta" : "Aún no registraste tu asistencia de hoy"}
              </p>
              <p className="mt-1 text-base leading-relaxed text-[#697186] sm:text-[20px]">
              {attendance ? "Registra las actividades realizadas y confirma la salida cuando finalice tu jornada." : "Haz clic en “Marcar asistencia de hoy” para registrar tu ingreso."}
              </p>
            </div>
          </div>
        </section>
      </section>
    </main>
  );
}
