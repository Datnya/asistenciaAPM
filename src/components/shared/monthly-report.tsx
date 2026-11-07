import Link from "next/link";

import { EvidenceGallery } from "@/components/shared/evidence-gallery";
import { ReportPeriodForm } from "@/components/shared/report-period-form";
import { getLimaWorkDate } from "@/lib/attendance/lima";
import { reportPeriodLabel } from "@/lib/reports/period";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

type Query = { consultant?: string; period?: string };

export async function MonthlyReport({ role, userId, searchParams }: { role: "admin" | "consultant"; userId: string; searchParams: Promise<Query> }) {
  const query = await searchParams;
  const today = getLimaWorkDate();
  const admin = createAdminSupabaseClient();
  const { data: consultants, error: consultantsError } = role === "admin"
    ? await admin.from("profiles").select("user_id, first_name, last_name").eq("role", "consultant").order("last_name")
    : { data: [], error: null };
  if (consultantsError) throw new Error("No fue posible cargar los consultores.");
  const consultantId = role === "consultant"
    ? userId
    : consultants?.some((person) => person.user_id === query.consultant) ? query.consultant! : consultants?.[0]?.user_id;

  const { data: periods, error: periodsError } = consultantId
    ? await admin.from("report_periods").select("id, start_date, end_date").eq("consultant_user_id", consultantId).order("start_date", { ascending: false })
    : { data: [] as Array<{ id: string; start_date: string; end_date: string }>, error: null };
  if (periodsError) throw new Error("No fue posible cargar los períodos del reporte.");
  const selectedPeriod = periods?.find((period) => period.id === query.period)
    ?? periods?.find((period) => period.start_date <= today && period.end_date >= today)
    ?? periods?.[0] ?? null;

  const { data: sessions, error: sessionsError } = consultantId && selectedPeriod
    ? await admin.from("attendance_sessions")
      .select("id, work_date, daily_summary, declared_minutes, evidence_paths")
      .eq("consultant_user_id", consultantId)
      .eq("status", "closed")
      .gte("work_date", selectedPeriod.start_date)
      .lte("work_date", selectedPeriod.end_date)
      .order("work_date", { ascending: false })
    : { data: [] as Array<{ id: string; work_date: string; daily_summary: string | null; declared_minutes: number | null; evidence_paths: string[] }>, error: null };
  if (sessionsError) throw new Error("No fue posible cargar las jornadas del período.");
  const total = (sessions ?? []).reduce((sum, session) => sum + (session.declared_minutes ?? 0), 0);
  const currentHref = `/${role}/monthly-report${role === "admin" && consultantId ? `?consultant=${consultantId}` : ""}`;

  return <main className="px-4 py-8 sm:px-8"><section className="mx-auto max-w-6xl">
    <h1 className="text-4xl font-bold">Reporte mensual</h1>
    <p className="mt-2 text-[#697186]">{selectedPeriod ? `Avance ${reportPeriodLabel(selectedPeriod.start_date, selectedPeriod.end_date)}` : "Define las fechas de inicio y fin para crear el primer reporte."}</p>
    {role === "admin" ? <form className="mt-7 flex flex-wrap items-end gap-3" method="get">
      <label className="text-sm font-semibold">Consultor<select className="admin-field mt-2" defaultValue={consultantId} name="consultant">{consultants?.map((person) => <option key={person.user_id} value={person.user_id}>{person.first_name} {person.last_name}</option>)}</select></label>
      <button className="min-h-11 rounded-xl border border-[#cfd6df] px-5 font-semibold" type="submit">Ver consultor</button>
    </form> : null}
    {consultantId ? <ReportPeriodForm consultantId={consultantId} latestEnd={periods?.[0]?.end_date ?? null} role={role} selectedPeriod={selectedPeriod} today={today} /> : <p className="mt-6 text-[#697186]">No hay consultores disponibles.</p>}
    {periods?.length ? <form className="mt-7 flex flex-wrap items-end gap-3" method="get">
      {role === "admin" ? <input name="consultant" type="hidden" value={consultantId} /> : null}
      <label className="text-sm font-semibold">Período<select className="admin-field mt-2" defaultValue={selectedPeriod?.id} name="period">{periods.map((period) => <option key={period.id} value={period.id}>{reportPeriodLabel(period.start_date, period.end_date)}</option>)}</select></label>
      <button className="min-h-11 rounded-xl border border-[#cfd6df] px-5 font-semibold" type="submit">Ver período</button>
      <Link className="inline-flex min-h-11 items-center rounded-xl border border-[#cfd6df] px-5 font-semibold" href={currentHref}>Período actual</Link>
    </form> : null}
    {selectedPeriod ? <>
      <div className="mt-7 flex flex-wrap items-center gap-4">
        <p className="text-[#52617a]">{sessions?.length ?? 0} jornadas · {Math.floor(total / 60)} h {String(total % 60).padStart(2, "0")} min declarados</p>
        <a className="inline-flex min-h-11 items-center rounded-xl bg-[#b0bf12] px-6 font-semibold text-black" href={`/api/reports/monthly?period=${selectedPeriod.id}`}>Descargar Excel</a>
      </div>
      <div className="mt-8 space-y-3">
        {sessions?.map((session) => <article className="rounded-xl border border-[#e5e8ed] bg-white p-5" key={session.id}>
          <p className="font-semibold">{session.work_date} · {Math.floor((session.declared_minutes ?? 0) / 60)} h {String((session.declared_minutes ?? 0) % 60).padStart(2, "0")} min</p>
          <p className="mt-1 text-[#52617a]">{session.daily_summary || "Sin actividad general registrada"}</p>
          <EvidenceGallery count={session.evidence_paths?.length ?? 0} sessionId={session.id} variant="buttons" />
        </article>)}
        {!sessions?.length ? <p className="rounded-xl bg-white p-5 text-[#697186]">No hay jornadas cerradas dentro de este período.</p> : null}
      </div>
    </> : null}
  </section></main>;
}
