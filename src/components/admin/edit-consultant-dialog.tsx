"use client";

import { Eye, EyeOff, Pencil, PowerOff, Trash2, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { deleteConsultantAccount, retryConsultantDeletion, setConsultantActive, updateConsultantAccount } from "@/app/(admin)/admin/consultants/actions";
import { PhotoEditor, cropAvatar } from "@/components/admin/new-consultant-dialog";
import type { ConsultantRecord } from "@/lib/admin/consultants";

type Point = { x: number; y: number };
type Size = { width: number; height: number };

export function EditConsultantDialog({ consultant, clientNames }: { consultant: ConsultantRecord; clientNames: string[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [statusOpen, setStatusOpen] = useState(false);
  const [pendingJobId, setPendingJobId] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [statusError, setStatusError] = useState<string | null>(null);
  const [source, setSource] = useState<string | null>(null);
  const [size, setSize] = useState<Size | null>(null);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState<Point>({ x: 0, y: 0 });
  const [values, setValues] = useState({ fullName: consultant.fullName, dni: consultant.dni ?? "", phoneNumber: consultant.phoneNumber ?? "", username: consultant.username, email: consultant.authEmail ?? "", password: "", clientName: consultant.clients[0]?.name ?? "" });

  function clamp(point: Point, nextZoom = zoom) {
    if (!size) return { x: 0, y: 0 };
    const scale = Math.max(240 / size.width, 240 / size.height) * nextZoom;
    const maxX = Math.max(0, (size.width * scale - 240) / 2);
    const maxY = Math.max(0, (size.height * scale - 240) / 2);
    return { x: Math.min(maxX, Math.max(-maxX, point.x)), y: Math.min(maxY, Math.max(-maxY, point.y)) };
  }

  async function save() {
    setBusy(true); setError(null);
    try {
      const form = new FormData();
      form.set("userId", consultant.userId);
      Object.entries(values).forEach(([key, value]) => form.set(key, value));
      if (source) form.set("avatar", await cropAvatar(source, zoom, offset));
      const result = await updateConsultantAccount(form);
      if (!result.success) { setError(result.error); return; }
      setOpen(false);
      router.refresh();
    } catch {
      setError("No fue posible actualizar el consultor.");
    } finally { setBusy(false); }
  }

  async function confirmDelete() {
    setBusy(true); setDeleteError(null);
    try {
      const result = pendingJobId ? await retryConsultantDeletion(pendingJobId) : await deleteConsultantAccount(consultant.userId);
      if (!result.success) {
        setPendingJobId(result.pendingJobId ?? null);
        setDeleteError(result.error);
        return;
      }
      setDeleteOpen(false);
      setOpen(false);
      router.push("/admin");
      router.refresh();
    } catch {
      setDeleteError("No fue posible completar la eliminación. Reinténtalo.");
    } finally { setBusy(false); }
  }

  async function changeStatus(isActive: boolean) {
    setBusy(true); setStatusError(null);
    try {
      const result = await setConsultantActive(consultant.userId, isActive);
      if (!result.success) { setStatusError(result.error); return; }
      setStatusOpen(false); setOpen(false);
      router.refresh();
    } catch { setStatusError("No fue posible cambiar el estado. Reinténtalo."); }
    finally { setBusy(false); }
  }

  const field = (label: string, key: keyof typeof values, type = "text") => (
    <label className="block text-sm font-semibold">{label}
      <input autoComplete={key === "email" ? "email" : undefined} className="admin-field mt-2" inputMode={key === "dni" || key === "phoneNumber" ? "numeric" : undefined} maxLength={key === "dni" ? 8 : key === "phoneNumber" ? 9 : undefined} type={type} value={values[key]} onChange={(event) => setValues({ ...values, [key]: event.target.value })} />
    </label>
  );

  return <>
    <button className="flex min-h-12 items-center gap-2 rounded-xl border border-[#cfd6df] bg-white px-5 font-semibold text-[#344056]" onClick={() => setOpen(true)} type="button"><Pencil className="size-5" />Editar consultor</button>
    {open ? <div aria-modal="true" className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4 py-8" role="dialog">
      <section className="relative w-full max-w-4xl rounded-[24px] bg-white p-6 shadow-2xl sm:p-9">
        <button aria-label="Cerrar" className="absolute top-5 right-5 rounded-full p-2 hover:bg-[#f3f5f7]" onClick={() => !busy && setOpen(false)} type="button"><X /></button>
        <h2 className="pr-10 text-3xl font-bold">Editar consultor</h2>
        <p className="mt-2 text-[#697186]">La contraseña es opcional: déjala vacía para conservar la actual.</p>
        <div className="mt-7 grid gap-8 lg:grid-cols-[1fr_280px]">
          <div className="grid content-start gap-5 sm:grid-cols-2">
            {field("Nombre completo", "fullName")}{field("Nro. de DNI", "dni")}{field("Nro. de celular", "phoneNumber")}{field("Nombre de usuario", "username")}{field("Correo electrónico", "email", "email")}
            <label className="relative block text-sm font-semibold">Nueva contraseña opcional
              <input autoComplete="new-password" className="admin-field mt-2 pr-12" type={showPassword ? "text" : "password"} value={values.password} onChange={(event) => setValues({ ...values, password: event.target.value })} />
              <button aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"} className="absolute right-1 bottom-1 rounded p-3 text-[#697186]" onClick={() => setShowPassword(!showPassword)} type="button">{showPassword ? <EyeOff className="size-5" /> : <Eye className="size-5" />}</button>
            </label>
            <label className="block text-sm font-semibold">Cliente asignado
              <input className="admin-field mt-2" list="edit-client-names" value={values.clientName} onChange={(event) => setValues({ ...values, clientName: event.target.value })} />
              <datalist id="edit-client-names">{clientNames.map((name) => <option key={name} value={name} />)}</datalist>
            </label>
            {error ? <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700 sm:col-span-2">{error}</p> : null}
            <div className="flex flex-col-reverse gap-3 pt-2 sm:col-span-2 sm:flex-row sm:justify-end">
              <button className="min-h-12 rounded-xl border border-[#d7dce4] px-6 font-semibold" onClick={() => setOpen(false)} type="button">Cancelar</button>
              <button className="min-h-12 rounded-xl bg-[#afc500] px-7 font-semibold text-white disabled:opacity-60" disabled={busy} onClick={save} type="button">{busy ? "Guardando..." : "Guardar cambios"}</button>
            </div>
          </div>
          <div><p className="mb-2 text-sm font-semibold">Foto de perfil</p><PhotoEditor clampOffset={clamp} offset={offset} onError={setError} onImageSizeChange={setSize} onOffsetChange={setOffset} onSourceChange={setSource} onZoomChange={setZoom} photoSource={source} zoom={zoom} /></div>
        </div>
        <div className="mt-8 border-t border-[#e2e6eb] pt-6">
          {statusError ? <p className="mb-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">{statusError}</p> : null}
          <button className="mb-4 inline-flex min-h-12 items-center gap-2 rounded-xl border border-[#cfd6df] bg-white px-5 font-semibold text-[#344056] hover:bg-[#f4f7e9]" disabled={busy} onClick={() => consultant.isActive ? setStatusOpen(true) : changeStatus(true)} type="button"><PowerOff className="size-5" />{consultant.isActive ? "Inhabilitar consultor" : "Habilitar consultor"}</button>
          <br />
          <button className="inline-flex min-h-12 items-center gap-2 rounded-xl border border-red-300 bg-red-50 px-5 font-semibold text-red-700 hover:bg-red-100" onClick={() => { setDeleteError(null); setDeleteOpen(true); }} type="button"><Trash2 className="size-5" />Eliminar consultor</button>
        </div>
      </section>
    </div> : null}
    {statusOpen ? <div aria-modal="true" aria-labelledby="disable-consultant-title" className="fixed inset-0 z-[60] flex items-center justify-center bg-black/55 p-4" role="dialog">
      <section className="w-full max-w-lg rounded-[22px] bg-white p-6 shadow-2xl sm:p-8">
        <h2 className="text-2xl font-bold" id="disable-consultant-title">¿Inhabilitar a este consultor?</h2>
        <p className="mt-4 text-[#52617a]"><strong>{consultant.fullName}</strong> no podrá ingresar con su usuario y contraseña. Sus jornadas, evidencias y demás datos se conservarán y podrás habilitar la cuenta más adelante.</p>
        {statusError ? <p className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">{statusError}</p> : null}
        <div className="mt-7 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button className="min-h-11 rounded-xl border border-[#d7dce4] px-5 font-semibold" disabled={busy} onClick={() => setStatusOpen(false)} type="button">No, conservar acceso</button>
          <button className="min-h-11 rounded-xl bg-[#344056] px-5 font-semibold text-white disabled:opacity-60" disabled={busy} onClick={() => changeStatus(false)} type="button">{busy ? "Inhabilitando…" : "Sí, inhabilitar"}</button>
        </div>
      </section>
    </div> : null}
    {deleteOpen ? <div aria-modal="true" aria-labelledby="delete-consultant-title" className="fixed inset-0 z-[60] flex items-center justify-center bg-black/55 p-4" role="dialog">
      <section className="w-full max-w-lg rounded-[22px] bg-white p-6 shadow-2xl sm:p-8">
        <h2 className="text-2xl font-bold" id="delete-consultant-title">¿Eliminar este consultor?</h2>
        <p className="mt-4 text-[#52617a]">Se eliminarán permanentemente <strong>{consultant.fullName}</strong> ({consultant.username}), sus credenciales, jornadas, actividades, auditoría asociada e imágenes. Esta acción no se puede deshacer.</p>
        {pendingJobId ? <p className="mt-4 rounded-xl bg-amber-50 p-3 text-sm text-amber-900">Los registros ya fueron retirados. Queda pendiente finalizar la limpieza de credenciales o imágenes.</p> : null}
        {deleteError ? <p className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">{deleteError}</p> : null}
        <div className="mt-7 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button className="min-h-11 rounded-xl border border-[#d7dce4] px-5 font-semibold" disabled={busy} onClick={() => { if (pendingJobId) router.push("/admin"); setDeleteOpen(false); }} type="button">{pendingJobId ? "Volver al dashboard" : "No, conservar consultor"}</button>
          <button className="min-h-11 rounded-xl bg-red-600 px-5 font-semibold text-white disabled:opacity-60" disabled={busy} onClick={confirmDelete} type="button">{busy ? "Eliminando…" : pendingJobId ? "Reintentar limpieza" : "Sí, eliminar consultor"}</button>
        </div>
      </section>
    </div> : null}
  </>;
}
