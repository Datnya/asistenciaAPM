"use client";

import { CheckCircle2, Clock3, MapPin, Pencil, Plus, Trash2, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { closeLiveAttendance, deleteAttendanceActivity, saveAttendanceActivity, startLiveAttendance } from "@/app/(consultant)/consultant/attendance-actions";
import { ATTENDANCE_AREAS, getAttendanceAreaLabel } from "@/lib/attendance/areas";
import { formatDeclaredMinutes } from "@/lib/attendance/hours";
import { formatLimaDate } from "@/lib/attendance/lima";

type Client = { id: string; name: string };
type Activity = { id: string; areaCode: string; otherAreaName: string | null; description: string };
export type OpenAttendance = { id: string; workDate: string; clientName: string; entryTime: string; activities: Activity[] };
type LocationData = { status: string; latitude: number | null; longitude: number | null; accuracy: number | null };
type View = "start" | "start-confirm" | "activity" | "close" | "close-confirm" | "success" | null;
type AttendanceDraft = { clientId: string; entryTime: string; exitTime: string; declaredHours: string };

const initialLocation: LocationData = { status: "unsupported", latitude: null, longitude: null, accuracy: null };

function locationFields(formData: FormData, location: LocationData) {
  formData.set("locationStatus", location.status);
  if (location.latitude !== null) formData.set("latitude", String(location.latitude));
  if (location.longitude !== null) formData.set("longitude", String(location.longitude));
  if (location.accuracy !== null) formData.set("accuracy", String(location.accuracy));
}

function todayInLima() {
  const parts = new Intl.DateTimeFormat("en", { timeZone: "America/Lima", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date());
  const value = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value ?? "";
  return `${value("year")}-${value("month")}-${value("day")}`;
}

async function captureLocation(): Promise<LocationData> {
  if (!navigator.geolocation) return initialLocation;
  return new Promise((resolve) => navigator.geolocation.getCurrentPosition(
    (position) => resolve({ status: "granted", latitude: position.coords.latitude, longitude: position.coords.longitude, accuracy: position.coords.accuracy }),
    (error) => resolve({ status: error.code === error.PERMISSION_DENIED ? "permission_denied" : error.code === error.TIMEOUT ? "timeout" : "position_unavailable", latitude: null, longitude: null, accuracy: null }),
    { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 },
  ));
}

export function AttendanceAction({ assignedClients, openAttendance }: { assignedClients: Client[]; openAttendance: OpenAttendance | null }) {
  const router = useRouter();
  const [view, setView] = useState<View>(null);
  const [draft, setDraft] = useState<AttendanceDraft>({ clientId: assignedClients[0]?.id ?? "", entryTime: "", exitTime: "", declaredHours: "" });
  const [editingActivity, setEditingActivity] = useState<Activity | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function openStart() {
    setError(null);
    if (!assignedClients.length) { setError("Aún no tienes un cliente activo asignado. Solicita la asignación a administración."); return; }
    setView("start");
  }

  async function confirmStart() {
    setBusy(true); setError(null);
    const formData = new FormData();
    formData.set("clientId", draft.clientId); formData.set("entryTime", draft.entryTime);
    locationFields(formData, await captureLocation());
    const result = await startLiveAttendance(formData);
    setBusy(false);
    if (!result.success) { setError(result.error); setView("start"); return; }
    setView(null); router.refresh();
  }

  async function submitActivity(formData: FormData) {
    if (!openAttendance) return;
    setBusy(true); setError(null); formData.set("sessionId", openAttendance.id);
    if (editingActivity) formData.set("activityId", editingActivity.id);
    const result = await saveAttendanceActivity(formData);
    setBusy(false);
    if (!result.success) { setError(result.error); return; }
    setEditingActivity(null); setView(null); router.refresh();
  }

  async function removeActivity(activity: Activity) {
    if (!openAttendance || !window.confirm("¿Deseas eliminar esta actividad de la jornada abierta?")) return;
    setBusy(true); setError(null);
    const result = await deleteAttendanceActivity(activity.id, openAttendance.id);
    setBusy(false);
    if (!result.success) { setError(result.error); return; }
    router.refresh();
  }

  async function confirmClose() {
    if (!openAttendance) return;
    setBusy(true); setError(null);
    const formData = new FormData();
    formData.set("sessionId", openAttendance.id); formData.set("exitTime", draft.exitTime); formData.set("declaredHours", draft.declaredHours);
    locationFields(formData, await captureLocation());
    const result = await closeLiveAttendance(formData);
    setBusy(false);
    if (!result.success) { setError(result.error); setView("close"); return; }
    setView("success"); router.refresh();
  }

  const today = todayInLima();
  const isPendingPreviousDay = !!openAttendance && openAttendance.workDate !== today;

  return <>
    {openAttendance ? <OpenAttendanceCard attendance={openAttendance} busy={busy} error={error} isPendingPreviousDay={isPendingPreviousDay} onAddActivity={() => { setError(null); setEditingActivity(null); setView("activity"); }} onClose={() => { setError(null); setView("close"); }} onDelete={removeActivity} onEdit={(activity) => { setError(null); setEditingActivity(activity); setView("activity"); }} /> : <div className="xl:w-[430px]"><button className="flex min-h-[78px] w-full items-center justify-center gap-4 rounded-[15px] bg-[linear-gradient(135deg,#a9bf00_0%,#bad100_55%,#a9c000_100%)] px-7 text-lg font-semibold text-white shadow-[0_14px_30px_rgba(154,177,0,0.18)] transition hover:brightness-[0.98] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#7b9000] active:translate-y-px xl:text-[22px]" onClick={openStart} type="button"><Clock3 aria-hidden="true" className="size-9" strokeWidth={2.1} />Marcar asistencia de hoy</button>{error ? <p className="mt-3 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">{error}</p> : null}</div>}
    {view === "start" ? <StartDialog clients={assignedClients} draft={draft} error={error} onCancel={() => setView(null)} onChange={setDraft} onContinue={() => { if (!draft.clientId || !/^([01]\d|2[0-3]):[0-5]\d$/.test(draft.entryTime)) { setError("Completa el cliente y una hora de ingreso válida."); return; } setError(null); setView("start-confirm"); }} /> : null}
    {view === "start-confirm" ? <ConfirmDialog busy={busy} confirmLabel="Sí, confirmar ingreso" description={`Registrarás tu ingreso a las ${draft.entryTime}. Esta hora quedará bloqueada para ti una vez confirmada.`} title="Confirmar inicio de jornada" onCancel={() => setView("start")} onConfirm={confirmStart} /> : null}
    {view === "activity" && openAttendance ? <ActivityDialog activity={editingActivity} busy={busy} error={error} onCancel={() => { setEditingActivity(null); setView(null); }} onSubmit={submitActivity} /> : null}
    {view === "close" && openAttendance ? <CloseDialog activityCount={openAttendance.activities.length} draft={draft} error={error} onCancel={() => setView(null)} onChange={setDraft} onContinue={() => { if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(draft.exitTime) || !/^([01]\d|2[0-4]):[0-5]\d$/.test(draft.declaredHours) || draft.declaredHours === "00:00") { setError("Completa una salida y horas declaradas válidas en formato HH:MM."); return; } if (openAttendance.activities.length < 1) { setError("Registra al menos una actividad antes de marcar la salida."); return; } setError(null); setView("close-confirm"); }} /> : null}
    {view === "close-confirm" && openAttendance ? <ConfirmDialog busy={busy} confirmLabel="Sí, continuar" description={`Registrarás la salida a las ${draft.exitTime} y ${formatDeclaredMinutes(hoursToMinutes(draft.declaredHours))} como horas declaradas. Una vez confirmada, la jornada quedará en solo lectura.`} title="¿Confirmas el cierre de tu jornada?" onCancel={() => setView("close")} onConfirm={confirmClose} secondaryLabel="No, seguir editando" /> : null}
    {view === "success" && openAttendance ? <SuccessDialog workDate={openAttendance.workDate} onClose={() => setView(null)} /> : null}
  </>;
}

function hoursToMinutes(value: string) { const [hours = "0", minutes = "0"] = value.split(":"); return Number(hours) * 60 + Number(minutes); }

function OpenAttendanceCard({ attendance, isPendingPreviousDay, onAddActivity, onClose, onEdit, onDelete, error, busy }: { attendance: OpenAttendance; isPendingPreviousDay: boolean; onAddActivity: () => void; onClose: () => void; onEdit: (activity: Activity) => void; onDelete: (activity: Activity) => void; error: string | null; busy: boolean }) { return <div className="w-full xl:w-[500px]">{isPendingPreviousDay ? <div className="mb-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-800" role="alert">Tienes una jornada pendiente del {formatLimaDate(attendance.workDate)}. Debes marcar su salida antes de iniciar una nueva.</div> : null}<div className="rounded-[18px] border border-[#e8ebef] bg-white p-5 shadow-[0_12px_35px_rgba(15,23,42,0.06)]"><p className="text-sm font-semibold text-[#68758b]">Jornada abierta · {attendance.clientName}</p><p className="mt-1 text-xl font-bold">Ingreso: {attendance.entryTime}</p><div className="mt-4 space-y-2">{attendance.activities.map((activity) => <div className="flex items-start justify-between gap-3 rounded-xl bg-[#f7f8fa] px-3 py-2" key={activity.id}><p className="text-sm"><strong>{activity.areaCode === "other" ? activity.otherAreaName : getAttendanceAreaLabel(activity.areaCode)}:</strong> {activity.description}</p><span className="flex shrink-0 gap-1"><button aria-label="Editar actividad" className="rounded p-1 text-[#52617a] hover:bg-white" onClick={() => onEdit(activity)} type="button"><Pencil className="size-4" /></button><button aria-label="Eliminar actividad" className="rounded p-1 text-red-600 hover:bg-white" disabled={busy} onClick={() => onDelete(activity)} type="button"><Trash2 className="size-4" /></button></span></div>)}</div><div className="mt-4 grid gap-2 sm:grid-cols-2"><button className="min-h-11 rounded-xl border border-[#cfd6df] px-4 font-semibold text-[#35415a]" onClick={onAddActivity} type="button"><Plus className="mr-1 inline size-4" />Actividad</button><button className="min-h-11 rounded-xl bg-[#afc500] px-4 font-semibold text-white disabled:opacity-60" disabled={busy || attendance.activities.length === 0} onClick={onClose} type="button">Registrar salida</button></div>{attendance.activities.length === 0 ? <p className="mt-3 text-xs text-[#697186]">Registra al menos una actividad para habilitar la salida.</p> : null}{error ? <p className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">{error}</p> : null}</div></div>; }

function Modal({ children, title, onClose }: { children: React.ReactNode; title: string; onClose: () => void }) { return <div aria-modal="true" className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 p-4 backdrop-blur-[2px]" role="dialog"><section className="relative max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-[22px] bg-white p-6 shadow-[0_28px_80px_rgba(15,23,42,0.25)] sm:p-8"><button aria-label="Cerrar" className="absolute top-4 right-4 flex size-10 items-center justify-center rounded-full text-[#697186] hover:bg-[#f3f5f7]" onClick={onClose} type="button"><X className="size-5" /></button><h2 className="pr-10 text-2xl font-bold tracking-[-0.035em]">{title}</h2>{children}</section></div>; }

function StartDialog({ clients, draft, error, onChange, onCancel, onContinue }: { clients: Client[]; draft: AttendanceDraft; error: string | null; onChange: (next: AttendanceDraft) => void; onCancel: () => void; onContinue: () => void }) { return <Modal onClose={onCancel} title="Registrar ingreso"><p className="mt-2 text-sm leading-relaxed text-[#697186]">La ubicación se solicitará al confirmar y no bloqueará tu registro si no está disponible.</p><label className="mt-6 block text-sm font-semibold">Cliente asignado<select className="consultant-field mt-2" value={draft.clientId} onChange={(event) => onChange({ ...draft, clientId: event.target.value })}>{clients.map((client) => <option key={client.id} value={client.id}>{client.name}</option>)}</select></label><label className="mt-5 block text-sm font-semibold">Hora de ingreso<input className="consultant-field mt-2" type="time" value={draft.entryTime} onChange={(event) => onChange({ ...draft, entryTime: event.target.value })} /></label>{error ? <p className="mt-4 text-sm text-red-700">{error}</p> : null}<div className="mt-7 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end"><button className="min-h-11 rounded-xl border border-[#d7dce4] px-5 font-semibold" onClick={onCancel} type="button">Cancelar</button><button className="min-h-11 rounded-xl bg-[#afc500] px-5 font-semibold text-white" onClick={onContinue} type="button">Continuar</button></div></Modal>; }

function ActivityDialog({ activity, busy, error, onCancel, onSubmit }: { activity: Activity | null; busy: boolean; error: string | null; onCancel: () => void; onSubmit: (formData: FormData) => void }) { const [area, setArea] = useState(activity?.areaCode ?? ""); return <Modal onClose={onCancel} title={activity ? "Editar actividad" : "Registrar actividad"}><form action={onSubmit} className="mt-6"><label className="block text-sm font-semibold">Área<select className="consultant-field mt-2" name="areaCode" required value={area} onChange={(event) => setArea(event.target.value)}><option value="" disabled>Selecciona un área</option>{ATTENDANCE_AREAS.map((item) => <option key={item.code} value={item.code}>{item.label}</option>)}</select></label>{area === "other" ? <label className="mt-5 block text-sm font-semibold">Área específica<input className="consultant-field mt-2" defaultValue={activity?.otherAreaName ?? ""} maxLength={120} name="otherAreaName" required /></label> : null}<label className="mt-5 block text-sm font-semibold">Motivo o concepto de la reunión<textarea className="consultant-field mt-2 min-h-28 resize-y" defaultValue={activity?.description ?? ""} maxLength={250} name="description" required /></label>{error ? <p className="mt-4 text-sm text-red-700">{error}</p> : null}<div className="mt-7 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end"><button className="min-h-11 rounded-xl border border-[#d7dce4] px-5 font-semibold" onClick={onCancel} type="button">Cancelar</button><button className="min-h-11 rounded-xl bg-[#afc500] px-5 font-semibold text-white disabled:opacity-60" disabled={busy} type="submit">{busy ? "Guardando..." : "Guardar actividad"}</button></div></form></Modal>; }

function CloseDialog({ activityCount, draft, error, onChange, onCancel, onContinue }: { activityCount: number; draft: AttendanceDraft; error: string | null; onChange: (next: AttendanceDraft) => void; onCancel: () => void; onContinue: () => void }) { return <Modal onClose={onCancel} title="Registrar salida"><p className="mt-2 text-sm leading-relaxed text-[#697186]">Antes de continuar, confirma la salida y escribe las horas que realmente deben computarse. No se calculan desde el ingreso y la salida.</p><label className="mt-5 block text-sm font-semibold">Hora de salida<input className="consultant-field mt-2" type="time" value={draft.exitTime} onChange={(event) => onChange({ ...draft, exitTime: event.target.value })} /></label><label className="mt-5 block text-sm font-semibold">Horas trabajadas declaradas<input className="consultant-field mt-2" inputMode="numeric" placeholder="Ej. 08:00" value={draft.declaredHours} onChange={(event) => onChange({ ...draft, declaredHours: event.target.value })} /></label><p className="mt-2 text-xs text-[#697186]">Formato HH:MM. Este valor es editable y es el único que se acumulará en los reportes.</p>{activityCount === 0 ? <p className="mt-4 text-sm text-red-700">Debes registrar al menos una actividad antes de cerrar.</p> : null}{error ? <p className="mt-4 text-sm text-red-700">{error}</p> : null}<div className="mt-7 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end"><button className="min-h-11 rounded-xl border border-[#d7dce4] px-5 font-semibold" onClick={onCancel} type="button">Cancelar</button><button className="min-h-11 rounded-xl bg-[#afc500] px-5 font-semibold text-white" onClick={onContinue} type="button">Marcar asistencia</button></div></Modal>; }

function ConfirmDialog({ title, description, confirmLabel, secondaryLabel = "Cancelar", busy, onCancel, onConfirm }: { title: string; description: string; confirmLabel: string; secondaryLabel?: string; busy: boolean; onCancel: () => void; onConfirm: () => void }) { return <Modal onClose={onCancel} title={title}><div className="mt-5 flex gap-4 rounded-2xl bg-[#f4f7e9] p-4"><MapPin className="mt-0.5 size-5 shrink-0 text-[#6c8500]" /><p className="text-sm leading-relaxed text-[#394458]">{description}</p></div><p className="mt-4 text-sm text-[#697186]">La ubicación se solicitará ahora. Si el navegador no puede obtenerla, tu asistencia se registrará igualmente y quedará la incidencia correspondiente.</p><div className="mt-7 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end"><button className="min-h-11 rounded-xl border border-[#d7dce4] px-5 font-semibold" onClick={onCancel} type="button">{secondaryLabel}</button><button className="min-h-11 rounded-xl bg-[#afc500] px-5 font-semibold text-white disabled:opacity-60" disabled={busy} onClick={onConfirm} type="button">{busy ? "Registrando..." : confirmLabel}</button></div></Modal>; }

function SuccessDialog({ workDate, onClose }: { workDate: string; onClose: () => void }) { return <Modal onClose={onClose} title="Asistencia marcada"><div className="mt-6 text-center"><CheckCircle2 className="mx-auto size-16 text-[#758f00]" /><p className="mt-5 text-lg font-semibold">Tu asistencia del {formatLimaDate(workDate)} fue marcada correctamente.</p><p className="mt-2 text-[#697186]">Gracias por registrar tu jornada.</p><button className="mt-7 min-h-11 rounded-xl bg-[#afc500] px-7 font-semibold text-white" onClick={onClose} type="button">Entendido</button></div></Modal>; }
