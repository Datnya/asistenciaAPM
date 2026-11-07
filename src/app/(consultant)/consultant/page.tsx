import { CalendarDays, Clock3, UsersRound } from "lucide-react";

import { AttendanceAction, type OpenAttendance } from "@/components/consultant/attendance-action";
import { AttendanceHistory, type ClosedAttendance } from "@/components/consultant/attendance-history";
import { formatDeclaredMinutes } from "@/lib/attendance/hours";
import { DashboardMetric } from "@/components/consultant/dashboard-metric";
import { getLimaWorkDate } from "@/lib/attendance/lima";
import { requireRole } from "@/lib/auth/guards";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function ConsultantPage({ searchParams }: { searchParams: Promise<{ year?: string; month?: string; day?: string }> }) {
  const { profile } = await requireRole("consultant");
  const filters = await searchParams;
  const today = getLimaWorkDate();
  const currentYear = Number(today.slice(0, 4));
  const currentMonth = Number(today.slice(5, 7));
  const year = /^\d{4}$/.test(filters.year ?? "") && Number(filters.year) >= 1900 && Number(filters.year) <= currentYear ? Number(filters.year) : currentYear;
  const month = filters.month === "all" ? null : /^\d{1,2}$/.test(filters.month ?? "") && Number(filters.month) >= 1 && Number(filters.month) <= 12 ? Number(filters.month) : currentMonth;
  const maxDay = month ? new Date(year, month, 0).getDate() : 0;
  const day = month && /^\d{1,2}$/.test(filters.day ?? "") && Number(filters.day) >= 1 && Number(filters.day) <= maxDay ? Number(filters.day) : null;
  const prefix = `${year}-${String(month ?? 1).padStart(2, "0")}`;
  const from = day ? `${prefix}-${String(day).padStart(2, "0")}` : month ? `${prefix}-01` : `${year}-01-01`;
  const to = day ? from : month ? `${prefix}-${String(maxDay).padStart(2, "0")}` : `${year}-12-31`;
  const monthNames = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
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
    .select("id, work_date, work_type, declared_minutes, entry_time, exit_time, status, daily_summary, evidence_paths, clients(name)")
    .eq("consultant_user_id", profile.user_id)
    .eq("status", "closed")
    .gte("work_date", from)
    .lte("work_date", to)
    .order("work_date", { ascending: false });
  const currentMonthFrom = `${today.slice(0, 7)}-01`;
  const currentMonthTo = `${today.slice(0, 7)}-${String(new Date(currentYear, currentMonth, 0).getDate()).padStart(2, "0")}`;
  const { data: monthlySessions } = from === currentMonthFrom && to === currentMonthTo
    ? { data: closedSessions }
    : await supabase.from("attendance_sessions").select("declared_minutes").eq("consultant_user_id", profile.user_id).eq("status", "closed").gte("work_date", currentMonthFrom).lte("work_date", currentMonthTo);
  const totalMinutes = (monthlySessions ?? []).reduce((total, session) => total + (session.declared_minutes ?? 0), 0);
  const closedSessionIds = (closedSessions ?? []).map((session) => session.id);
  const { data: closedActivities } = closedSessionIds.length
    ? await supabase
      .from("attendance_activities")
      .select("id, session_id, area_code, other_area_name, description")
      .in("session_id", closedSessionIds)
      .order("created_at")
    : { data: [] };
  const closedAttendance: ClosedAttendance[] = (closedSessions ?? []).map((session) => ({
    id: session.id,
    workDate: session.work_date,
    workType: session.work_type as ClosedAttendance["workType"],
    clientName: (session.clients as unknown as { name: string } | null)?.name ?? "-",
    entryTime: session.entry_time,
    exitTime: session.exit_time,
    declaredMinutes: session.declared_minutes,
    dailySummary: session.daily_summary,
    evidenceCount: session.evidence_paths?.length ?? 0,
    activities: (closedActivities ?? [])
      .filter((activity) => activity.session_id === session.id)
      .map((activity) => ({ id: activity.id, areaCode: activity.area_code, otherAreaName: activity.other_area_name, description: activity.description })),
  }));
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
          <DashboardMetric icon={Clock3} label="Horas acumuladas del mes" value={formatDeclaredMinutes(totalMinutes)} />
          <DashboardMetric icon={CalendarDays} label="Días con asistencia del mes" value={String(monthlySessions?.length ?? 0)} />
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

        <section className="mt-5 overflow-hidden rounded-[18px] border border-[#eff0f2] bg-white p-5 shadow-[0_12px_40px_rgba(15,23,42,0.045)] sm:p-6">
          <h2 className="text-[24px] font-bold tracking-[-0.03em]">Historial de jornadas</h2>
          <form className="mt-4 flex flex-wrap items-end gap-3" method="get"><label className="text-sm font-semibold">Año<input className="consultant-field mt-1" defaultValue={year} max={currentYear} min="1900" name="year" type="number" /></label><label className="text-sm font-semibold">Mes<select className="consultant-field mt-1" defaultValue={month ?? "all"} name="month"><option value="all">Todo el año</option>{monthNames.map((name, index) => <option key={name} value={index + 1}>{name.charAt(0).toUpperCase() + name.slice(1)}</option>)}</select></label><label className="text-sm font-semibold">Día<select className="consultant-field mt-1" defaultValue={day ?? "all"} name="day"><option value="all">Todos los días</option>{Array.from({ length: 31 }, (_, index) => <option key={index} value={index + 1}>{index + 1}</option>)}</select></label><button className="min-h-12 rounded-xl bg-[#b0bf12] px-5 font-semibold text-black" type="submit">Aplicar filtros</button></form>
          <AttendanceHistory sessions={closedAttendance} />
        </section>
      </section>
    </main>
  );
}
