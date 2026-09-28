"use client";

import { Eye, X } from "lucide-react";
import { useState } from "react";

import { getAttendanceAreaLabel } from "@/lib/attendance/areas";
import { formatDeclaredMinutes } from "@/lib/attendance/hours";
import { formatLimaDate } from "@/lib/attendance/lima";

export type ClosedAttendance = {
  id: string;
  workDate: string;
  workType: "remote" | "onsite" | null;
  clientName: string;
  entryTime: string;
  exitTime: string | null;
  declaredMinutes: number | null;
  activities: Array<{ id: string; areaCode: string; otherAreaName: string | null; description: string }>;
};

export function AttendanceHistory({ sessions }: { sessions: ClosedAttendance[] }) {
  const [selected, setSelected] = useState<ClosedAttendance | null>(null);
  return <><div className="mt-4 overflow-x-auto"><table className="w-full min-w-[850px] text-left text-sm text-[#344056]"><thead><tr className="bg-[#f1f3f6]"><th className="rounded-l-lg px-4 py-3">Fecha</th><th className="px-4 py-3">Cliente</th><th className="px-4 py-3">Tipo de jornada</th><th className="px-4 py-3">Ingreso</th><th className="px-4 py-3">Salida</th><th className="px-4 py-3">Horas declaradas</th><th className="rounded-r-lg px-4 py-3 text-right">Acciones</th></tr></thead><tbody>{sessions.length ? sessions.map((session) => <tr className="border-b border-[#edf0f3]" key={session.id}><td className="px-4 py-3">{formatLimaDate(session.workDate)}</td><td className="px-4 py-3">{session.clientName}</td><td className="px-4 py-3">{session.workType === "remote" ? "Remota" : session.workType === "onsite" ? "Presencial" : "No especificado"}</td><td className="px-4 py-3">{session.entryTime.slice(0, 5)}</td><td className="px-4 py-3">{session.exitTime?.slice(0, 5) ?? "-"}</td><td className="px-4 py-3">{formatDeclaredMinutes(session.declaredMinutes ?? 0)}</td><td className="px-4 py-3 text-right"><button className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-[#cfd6df] px-3 text-sm font-semibold text-[#344056] hover:bg-[#f4f7e9]" onClick={() => setSelected(session)} type="button"><Eye className="size-4" />Ver jornada completa</button></td></tr>) : <tr><td className="px-4 py-8 text-center text-[#697186]" colSpan={7}>Aún no tienes jornadas cerradas.</td></tr>}</tbody></table></div>{selected ? <AttendanceDetailsDialog session={selected} close={() => setSelected(null)} /> : null}</>;
}

function AttendanceDetailsDialog({ session, close }: { session: ClosedAttendance; close: () => void }) {
  return <div aria-modal="true" className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 p-4 backdrop-blur-sm" role="dialog"><section className="relative max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-[22px] bg-white p-6 shadow-2xl sm:p-8"><button aria-label="Cerrar" className="absolute top-4 right-4 rounded-lg p-2 text-[#697186] hover:bg-slate-100" onClick={close} type="button"><X /></button><h2 className="pr-10 text-2xl font-bold tracking-[-0.03em]">Jornada completa</h2><p className="mt-1 text-sm text-[#697186]">{formatLimaDate(session.workDate)} · {session.clientName}</p><dl className="mt-6 grid gap-3 rounded-xl bg-[#f6f8fa] p-4 text-sm sm:grid-cols-3"><div><dt className="text-[#697186]">Hora de ingreso</dt><dd className="mt-1 font-semibold">{session.entryTime.slice(0, 5)}</dd></div><div><dt className="text-[#697186]">Hora de salida</dt><dd className="mt-1 font-semibold">{session.exitTime?.slice(0, 5) ?? "-"}</dd></div><div><dt className="text-[#697186]">Horas declaradas</dt><dd className="mt-1 font-semibold">{formatDeclaredMinutes(session.declaredMinutes ?? 0)}</dd></div></dl><h3 className="mt-7 text-lg font-bold">Actividades registradas</h3><div className="mt-3 space-y-3">{session.activities.length ? session.activities.map((activity, index) => <article className="rounded-xl border border-[#e2e6eb] p-4" key={activity.id}><p className="font-semibold">{index + 1}. {activity.areaCode === "other" && activity.otherAreaName ? activity.otherAreaName : getAttendanceAreaLabel(activity.areaCode)}</p><p className="mt-2 text-sm leading-6 text-[#52617a]">{activity.description}</p></article>) : <p className="rounded-xl bg-[#f6f8fa] p-4 text-sm text-[#697186]">No hay actividades registradas en esta jornada.</p>}</div><div className="mt-7 flex justify-end"><button className="min-h-11 rounded-xl bg-[#a9c000] px-5 font-semibold text-white" onClick={close} type="button">Cerrar</button></div></section></div>;
}
