import Link from "next/link";

import { getLimaWorkDate } from "@/lib/attendance/lima";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

const months = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];

export async function MonthlyReport({ role, userId, searchParams }: { role: "admin" | "consultant"; userId: string; searchParams: Promise<{ year?: string; month?: string; consultant?: string }> }) {
  const query = await searchParams;
  const today = getLimaWorkDate();
  const currentYear = Number(today.slice(0, 4));
  const year = /^\d{4}$/.test(query.year ?? "") && Number(query.year) >= 1900 && Number(query.year) <= currentYear ? Number(query.year) : currentYear;
  const month = /^\d{1,2}$/.test(query.month ?? "") && Number(query.month) >= 1 && Number(query.month) <= 12 ? Number(query.month) : Number(today.slice(5, 7));
  const admin = createAdminSupabaseClient();
  const { data: consultants } = role === "admin" ? await admin.from("profiles").select("user_id, first_name, last_name").eq("role", "consultant").order("last_name") : { data: [] };
  const selectedId = role === "consultant" ? userId : consultants?.some((item) => item.user_id === query.consultant) ? query.consultant! : consultants?.[0]?.user_id;
  const from = `${year}-${String(month).padStart(2, "0")}-01`;
  const to = `${year}-${String(month).padStart(2, "0")}-${String(new Date(year, month, 0).getDate()).padStart(2, "0")}`;
  const { data: sessions, error } = selectedId ? await admin.from("attendance_sessions").select("id, work_date, daily_summary, declared_minutes, evidence_paths").eq("consultant_user_id", selectedId).eq("status", "closed").gte("work_date", from).lte("work_date", to).order("work_date", { ascending: false }) : { data: [] as Array<{ id: string; work_date: string; daily_summary: string | null; declared_minutes: number | null; evidence_paths: string[] }>, error: null };
  if (error) throw new Error("No fue posible cargar el reporte mensual.");
  const total = (sessions ?? []).reduce((sum, item) => sum + (item.declared_minutes ?? 0), 0);
  const params = new URLSearchParams({ year: String(year), month: String(month), consultant: selectedId ?? "" });
  return <main className="px-4 py-8 sm:px-8"><section className="mx-auto max-w-6xl"><h1 className="text-4xl font-bold">Reporte mensual</h1><p className="mt-2 text-[#697186]">{months[month - 1]} de {year} · {sessions?.length ?? 0} jornadas · {Math.floor(total / 60)} h {String(total % 60).padStart(2, "0")} min</p><form className="mt-8 flex flex-wrap items-end gap-4" method="get">{role === "admin" ? <label className="text-sm font-semibold">Consultor<select className="admin-field mt-2" defaultValue={selectedId} name="consultant">{consultants?.map((person) => <option key={person.user_id} value={person.user_id}>{person.first_name} {person.last_name}</option>)}</select></label> : null}<label className="text-sm font-semibold">Mes<select className="admin-field mt-2" defaultValue={month} name="month">{months.map((name, index) => <option key={name} value={index + 1}>{name}</option>)}</select></label><label className="text-sm font-semibold">Año<input className="admin-field mt-2" defaultValue={year} max={currentYear} min="1900" name="year" type="number" /></label><button className="min-h-12 rounded-xl bg-[#b0bf12] px-6 font-semibold text-black">Ver mes</button></form><div className="mt-7 flex gap-3"><Link className="inline-flex min-h-12 items-center rounded-xl border border-[#d7dce4] px-5 font-semibold" href={`/${role}/monthly-report`}>Mes actual</Link>{selectedId ? <a className="inline-flex min-h-12 items-center rounded-xl bg-[#b0bf12] px-6 font-semibold text-black" href={`/api/reports/monthly?${params}`}>Descargar Excel</a> : null}</div><div className="mt-8 space-y-3">{sessions?.map((item) => <article className="rounded-xl border border-[#e5e8ed] bg-white p-5" key={item.id}><p className="font-semibold">{item.work_date} · {Math.floor((item.declared_minutes ?? 0) / 60)} h {String((item.declared_minutes ?? 0) % 60).padStart(2, "0")} min</p><p className="mt-1 text-[#52617a]">{item.daily_summary || "Sin actividad general registrada"}</p><div className="mt-3 flex flex-wrap gap-2">{(item.evidence_paths ?? []).map((_: string, index: number) => <a className="rounded-lg border border-[#d7dce4] px-3 py-2 text-sm font-semibold text-[#52617a]" href={`/api/attendance/evidence/${item.id}/${index}`} key={index} rel="noopener noreferrer" target="_blank">Ver evidencia {index + 1}</a>)}</div></article>)}{!sessions?.length ? <p className="rounded-xl bg-white p-5 text-[#697186]">No hay jornadas registradas para este mes.</p> : null}</div></section></main>;
}
