"use client";

import { useState, useTransition } from "react";
import { Pencil, Trash2, X } from "lucide-react";
import { useRouter } from "next/navigation";

import { correctAdminAttendance, deleteAdminAttendance } from "@/app/(admin)/admin/attendance-actions";
import type { ConsultantAttendanceRecord } from "@/lib/admin/consultants";
import { formatMinutesAsHHMM } from "@/lib/attendance/hours";

export function AttendanceAdminActions({ consultantId, attendance, clients }: { consultantId: string; attendance: ConsultantAttendanceRecord; clients: Array<{ id: string; name: string }> }) {
  const [dialog, setDialog] = useState<"edit" | "delete" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function submitEdit(formData: FormData) {
    startTransition(async () => {
      const result = await correctAdminAttendance(formData);
      if (result?.error) return setError(result.error);
      setDialog(null); setError(null); router.refresh();
    });
  }
  function confirmDelete() {
    const formData = new FormData();
    formData.set("consultantId", consultantId);
    formData.set("sessionId", attendance.id);
    startTransition(async () => {
      const result = await deleteAdminAttendance(formData);
      if (result?.error) return setError(result.error);
      setDialog(null); setError(null); router.refresh();
    });
  }

  return <>
    <div className="flex items-center justify-end gap-1">
      <button aria-label="Editar asistencia" className="grid size-10 place-items-center rounded-lg text-[#4d5d76] hover:bg-[#f0f4e0] hover:text-[#758f00]" onClick={() => { setError(null); setDialog("edit"); }} type="button"><Pencil className="size-4" /></button>
      <button aria-label="Eliminar asistencia" className="grid size-10 place-items-center rounded-lg text-[#4d5d76] hover:bg-red-50 hover:text-red-700" onClick={() => { setError(null); setDialog("delete"); }} type="button"><Trash2 className="size-4" /></button>
    </div>
    {dialog === "edit" ? <Dialog title="Editar asistencia" close={() => setDialog(null)}>
      <form action={submitEdit} className="mt-5 space-y-4">
        <input name="consultantId" type="hidden" value={consultantId} /><input name="sessionId" type="hidden" value={attendance.id} />
        <label className="block text-sm font-semibold">Fecha<input className="admin-field mt-1.5" defaultValue={attendance.workDate} name="workDate" required type="date" /></label>
        <label className="block text-sm font-semibold">Cliente<select className="admin-field mt-1.5" defaultValue={attendance.clientId} name="clientId" required>{clients.map((client) => <option key={client.id} value={client.id}>{client.name}</option>)}</select></label>
        <label className="block text-sm font-semibold">Tipo de jornada<select className="admin-field mt-1.5" defaultValue={attendance.workType ?? ""} name="workType" required><option disabled value="">Selecciona un tipo</option><option value="remote">Remota</option><option value="onsite">Presencial</option></select></label>
        <div className="grid gap-4 sm:grid-cols-2"><label className="block text-sm font-semibold">Ingreso<input className="admin-field mt-1.5" defaultValue={attendance.entryTime.slice(0, 5)} name="entryTime" required type="time" /></label><label className="block text-sm font-semibold">Salida<input className="admin-field mt-1.5" defaultValue={attendance.exitTime?.slice(0, 5) ?? ""} name="exitTime" required type="time" /></label></div>
        <label className="block text-sm font-semibold">Horas declaradas<input className="admin-field mt-1.5" defaultValue={attendance.declaredMinutes ? formatMinutesAsHHMM(attendance.declaredMinutes) : ""} name="declaredHours" required placeholder="HH:MM" /></label>
        {error ? <p className="text-sm text-red-700">{error}</p> : null}
        <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end"><button className="min-h-11 rounded-xl border border-[#d7dce4] px-5 font-semibold" onClick={() => setDialog(null)} type="button">Cancelar</button><button className="min-h-11 rounded-xl bg-[#a9c000] px-5 font-semibold text-white disabled:opacity-60" disabled={pending} type="submit">{pending ? "Guardando…" : "Guardar corrección"}</button></div>
      </form>
    </Dialog> : null}
    {dialog === "delete" ? <Dialog title="¿Eliminar asistencia?" close={() => setDialog(null)}>
      <p className="mt-4 text-sm leading-6 text-[#596884]">Esta acción eliminará de forma permanente la asistencia y sus actividades asociadas. No podrá recuperarse.</p>
      {error ? <p className="mt-4 text-sm text-red-700">{error}</p> : null}
      <div className="mt-7 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end"><button className="min-h-11 rounded-xl border border-[#d7dce4] px-5 font-semibold" onClick={() => setDialog(null)} type="button">Cancelar</button><button className="min-h-11 rounded-xl bg-red-600 px-5 font-semibold text-white disabled:opacity-60" disabled={pending} onClick={confirmDelete} type="button">{pending ? "Eliminando…" : "Sí, eliminar asistencia"}</button></div>
    </Dialog> : null}
  </>;
}

function Dialog({ title, children, close }: { title: string; children: React.ReactNode; close: () => void }) {
  return <div aria-modal="true" className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 p-4 backdrop-blur-sm" role="dialog"><section className="relative max-h-[92vh] w-full max-w-xl overflow-y-auto rounded-[22px] bg-white p-6 shadow-2xl sm:p-8"><button aria-label="Cerrar" className="absolute top-4 right-4 grid size-10 place-items-center rounded-lg text-[#697186] hover:bg-slate-100" onClick={close} type="button"><X className="size-5" /></button><h2 className="pr-10 text-2xl font-bold tracking-[-0.03em]">{title}</h2>{children}</section></div>;
}
