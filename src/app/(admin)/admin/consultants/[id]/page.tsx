import { ArrowLeft, CalendarDays, Clock3, FileSpreadsheet, Info } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { DashboardMetric } from "@/components/consultant/dashboard-metric";
import { ProfileAvatar } from "@/components/shared/profile-avatar";
import { EditConsultantDialog } from "@/components/admin/edit-consultant-dialog";
import { getConsultant, listActiveClientNames } from "@/lib/admin/consultants";
import { requireRole } from "@/lib/auth/guards";

export const dynamic = "force-dynamic";

export default async function ConsultantDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requireRole("admin");
  const { id } = await params;
  const [consultant, clientNames] = await Promise.all([getConsultant(id), listActiveClientNames()]);
  if (!consultant) notFound();

  const exportUrl = `/api/admin/consultants/${consultant.userId}/attendance-export`;
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
          <div className="flex flex-col gap-3"><EditConsultantDialog clientNames={clientNames} consultant={consultant} /><ExcelDownloadLink href={exportUrl} /></div>
        </div>

        <div className="mt-7 grid gap-5 md:grid-cols-2">
          <DashboardMetric icon={Clock3} label="Horas acumuladas" value="0 h 00 min" />
          <DashboardMetric icon={CalendarDays} label="Días con asistencia" value="0" />
        </div>

        <section className="mt-5 overflow-hidden rounded-[18px] border border-[#eff0f2] bg-white p-5 shadow-[0_12px_40px_rgba(15,23,42,0.045)] sm:p-6">
          <h2 className="text-[24px] font-bold tracking-[-0.03em]">Resumen de asistencias</h2>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm text-[#344056]">
              <thead><tr className="bg-[#f1f3f6]"><th className="rounded-l-lg px-4 py-4">Fecha</th><th className="px-4 py-4">Cliente</th><th className="px-4 py-4">Ingreso</th><th className="px-4 py-4">Salida</th><th className="px-4 py-4">Horas declaradas</th><th className="rounded-r-lg px-4 py-4">Estado</th></tr></thead>
              <tbody><tr><td className="px-4 py-8 text-center text-[#697186]" colSpan={6}>Este consultor todavía no tiene asistencias registradas.</td></tr></tbody>
            </table>
          </div>
        </section>

        <section className="mt-4 flex flex-col gap-5 rounded-[16px] bg-[#f1f3f6] p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-4">
            <Info aria-hidden="true" className="mt-1 size-8 shrink-0 text-[#48566f]" />
            <div><h2 className="font-bold text-[#344056]">Consulta el historial completo</h2><p className="mt-1 text-sm text-[#697186]">Puedes descargar el historial del consultor en formato Excel. Si aún no tiene registros, recibirás un reporte vacío informativo.</p></div>
          </div>
          <ExcelDownloadLink compact href={exportUrl} />
        </section>
      </section>
    </main>
  );
}

function ExcelDownloadLink({ href, compact = false }: { href: string; compact?: boolean }) {
  return (
    <Link
      className={`flex min-h-[68px] items-center justify-center gap-4 rounded-[14px] bg-[linear-gradient(135deg,#9dbb00_0%,#b3ca00_55%,#91ad00_100%)] px-7 font-semibold text-white shadow-[0_12px_28px_rgba(154,177,0,0.18)] ${compact ? "min-h-14 text-base" : "text-lg xl:min-w-[420px]"}`}
      href={href}
    >
      <FileSpreadsheet aria-hidden="true" className="size-8" /> Descargar asistencias en Excel
    </Link>
  );
}
