import { ArrowLeft, CalendarDays, Clock3, Info } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { DashboardMetric } from "@/components/consultant/dashboard-metric";
import { ProfileAvatar } from "@/components/shared/profile-avatar";
import { EditConsultantDialog } from "@/components/admin/edit-consultant-dialog";
import { AttendanceAdminActions } from "@/components/admin/attendance-actions";
import { ExcelExportDialog } from "@/components/admin/excel-export-dialog";
import { getConsultant, listActiveClientNames, listConsultantAttendance } from "@/lib/admin/consultants";
import { requireRole } from "@/lib/auth/guards";
import { formatDeclaredMinutes } from "@/lib/attendance/hours";
import { formatLimaDate, getLimaWorkDate } from "@/lib/attendance/lima";

export const dynamic = "force-dynamic";

const monthNames = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];

export default async function ConsultantDetailPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ year?: string; month?: string; day?: string }> }) {
  await requireRole("admin");
  const { id } = await params;
  const filters = await searchParams;
  const today = getLimaWorkDate();
  const currentYear = Number(today.slice(0, 4));
  const currentMonth = Number(today.slice(5, 7));
  const year = /^\d{4}$/.test(filters.year ?? "") && Number(filters.year) >= 1900 && Number(filters.year) <= currentYear ? Number(filters.year) : currentYear;
  const month = filters.month === "all" ? null : /^\d{1,2}$/.test(filters.month ?? "") && Number(filters.month) >= 1 && Number(filters.month) <= 12 ? Number(filters.month) : currentMonth;
  const maxDay = month ? new Date(year, month, 0).getDate() : 0;
  const day = month && /^\d{1,2}$/.test(filters.day ?? "") && Number(filters.day) >= 1 && Number(filters.day) <= maxDay ? Number(filters.day) : null;
  const monthPrefix = `${year}-${String(month ?? 1).padStart(2, "0")}`;
  const from = day ? `${monthPrefix}-${String(day).padStart(2, "0")}` : month ? `${monthPrefix}-01` : `${year}-01-01`;
  const to = day ? from : month ? `${monthPrefix}-${String(maxDay).padStart(2, "0")}` : `${year}-12-31`;
  const currentMonthFrom = `${today.slice(0, 7)}-01`;
  const currentMonthTo = `${today.slice(0, 7)}-${String(new Date(currentYear, currentMonth, 0).getDate()).padStart(2, "0")}`;
  const [consultant, clientNames] = await Promise.all([getConsultant(id), listActiveClientNames()]);
  if (!consultant) notFound();
  const [attendance, monthlyAttendance] = await Promise.all([
    listConsultantAttendance(consultant.userId, from, to),
    from === currentMonthFrom && to === currentMonthTo ? Promise.resolve(null) : listConsultantAttendance(consultant.userId, currentMonthFrom, currentMonthTo),
  ]);
  const closedThisMonth = (monthlyAttendance ?? attendance).filter((session) => session.status === "closed");
  const totalMinutes = closedThisMonth.reduce((total, session) => total + (session.declaredMinutes ?? 0), 0);

  const clientLabel = consultant.clients.length
    ? consultant.clients.map((client) => client.name).join(", ")
    : "Sin cliente asignado";

  return (
    <main className="px-4 py-8 sm:px-6 lg:px-9 lg:py-7 xl:px-10 2xl:px-12">
      <section className="mx-auto w-full max-w-[1340px]">
        <Link className="inline-flex min-h-11 items-center gap-2 text-[#52617a] hover:text-[#202632]" href="/admin">
          <ArrowLeft aria-hidden="true" className="size-5" /> Volver a Consultores
        </Link>

        <div className="mt-3 flex flex-col gap-7 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <h1 className="text-[36px] leading-none font-extrabold tracking-[-0.045em] sm:text-[44px]">Detalle del consultor</h1>
            <div className="mt-4 flex items-center gap-5">
              <ProfileAvatar avatarPath={consultant.avatarPath} className="size-24 text-2xl" fullName={consultant.fullName} userId={consultant.userId} />
              <div>
                <h2 className="text-[27px] leading-tight font-bold tracking-[-0.035em]">{consultant.fullName}</h2>
                <p className="mt-1 text-lg text-[#596884]">Consultor{consultant.isActive ? "" : " · Inactivo"}</p>
                <p className="mt-1 text-base text-[#596884]">Cliente asignado: {clientLabel}</p>
                {consultant.dni ? <p className="mt-1 text-sm text-[#7a8497]">DNI: {consultant.dni}</p> : null}
                {consultant.phoneNumber ? <p className="mt-1 text-sm text-[#7a8497]">Celular: {consultant.phoneNumber}</p> : null}
              </div>
            </div>
          </div>
          <div className="flex flex-col gap-3"><EditConsultantDialog clientNames={clientNames} consultant={consultant} /><ExcelExportDialog consultantId={consultant.userId} /></div>
        </div>

        <div className="mt-7 grid gap-5 md:grid-cols-2">
          <DashboardMetric icon={Clock3} label="Horas acumuladas del mes" value={formatDeclaredMinutes(totalMinutes)} />
          <DashboardMetric icon={CalendarDays} label="Días con asistencia del mes" value={String(closedThisMonth.length)} />
        </div>

        <section className="mt-5 overflow-hidden rounded-[18px] border border-[#eff0f2] bg-white p-5 shadow-[0_12px_40px_rgba(15,23,42,0.045)] sm:p-6">
          <h2 className="text-[24px] font-bold tracking-[-0.03em]">Resumen de asistencias</h2>
          <form className="mt-4 flex flex-wrap items-end gap-3" method="get">
            <label className="text-sm font-semibold text-[#344056]">Año<input className="admin-field mt-1" defaultValue={year} max={currentYear} min="1900" name="year" type="number" /></label>
            <label className="text-sm font-semibold text-[#344056]">Mes<select className="admin-field mt-1" defaultValue={month ?? "all"} name="month"><option value="all">Todo el año</option>{monthNames.map((name, index) => <option key={name} value={index + 1}>{name.charAt(0).toUpperCase() + name.slice(1)}</option>)}</select></label>
            <label className="text-sm font-semibold text-[#344056]">Día<select className="admin-field mt-1" defaultValue={day ?? "all"} name="day"><option value="all">Todos los días</option>{Array.from({ length: 31 }, (_, index) => <option key={index + 1} value={index + 1}>{index + 1}</option>)}</select></label>
            <button className="min-h-12 rounded-xl bg-[#b0bf12] px-5 font-semibold text-black" type="submit">Aplicar filtros</button>
            <Link className="flex min-h-12 items-center rounded-xl border border-[#d7dce4] px-5 font-semibold text-[#344056]" href={`/admin/consultants/${id}`}>Mes actual</Link>
          </form>
          <p className="mt-2 text-xs text-[#697186]">Para filtrar por día, selecciona también un mes.</p>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[880px] text-left text-sm text-[#344056]">
              <thead><tr className="bg-[#f1f3f6]"><th className="rounded-l-lg px-4 py-4">Fecha</th><th className="px-4 py-4">Cliente</th><th className="px-4 py-4">Tipo de jornada</th><th className="px-4 py-4">Ingreso</th><th className="px-4 py-4">Salida</th><th className="px-4 py-4">Horas declaradas</th><th className="px-4 py-4">Estado</th><th className="rounded-r-lg px-4 py-4 text-right">Acciones</th></tr></thead>
              <tbody>{attendance.length ? attendance.map((session) => <tr className="border-b border-[#edf0f3]" key={session.id}><td className="px-4 py-3">{formatLimaDate(session.workDate)}</td><td className="px-4 py-3">{session.clientName}</td><td className="px-4 py-3">{session.workType === "remote" ? "Remota" : session.workType === "onsite" ? "Presencial" : "No especificado"}</td><td className="px-4 py-3">{session.entryTime.slice(0, 5)}</td><td className="px-4 py-3">{session.exitTime?.slice(0, 5) ?? "-"}</td><td className="px-4 py-3">{session.declaredMinutes ? formatDeclaredMinutes(session.declaredMinutes) : "-"}</td><td className="px-4 py-3">{session.status === "closed" ? "Completada" : "Pendiente"}</td><td className="px-4 py-3"><AttendanceAdminActions attendance={session} clients={consultant.clients.map((client) => ({ id: client.id, name: client.name }))} consultantId={consultant.userId} /></td></tr>) : <tr><td className="px-4 py-8 text-center text-[#697186]" colSpan={8}>No hay asistencias para el período seleccionado.</td></tr>}</tbody>
            </table>
          </div>
        </section>

        <section className="mt-4 flex flex-col gap-5 rounded-[16px] bg-[#f1f3f6] p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-4">
            <Info aria-hidden="true" className="mt-1 size-8 shrink-0 text-[#48566f]" />
            <div><h2 className="font-bold text-[#344056]">Consulta el historial completo</h2><p className="mt-1 text-sm text-[#697186]">Puedes descargar el historial del consultor en formato Excel. Si aún no tiene registros, recibirás un reporte vacío informativo.</p></div>
          </div>
          <ExcelExportDialog compact consultantId={consultant.userId} />
        </section>
      </section>
    </main>
  );
}
