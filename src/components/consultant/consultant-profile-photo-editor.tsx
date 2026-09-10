"use client";

import { useState } from "react";

import { PhotoEditor, cropAvatar } from "@/components/admin/new-consultant-dialog";
import { updateOwnProfilePhoto } from "@/app/(consultant)/consultant/profile-actions";

type Point = { x: number; y: number };
type ImageSize = { width: number; height: number };

export function ConsultantProfilePhotoEditor() {
  const [isOpen, setIsOpen] = useState(false);
  const [photoSource, setPhotoSource] = useState<string | null>(null);
  const [imageSize, setImageSize] = useState<ImageSize | null>(null);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState<Point>({ x: 0, y: 0 });
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  function clampOffset(next: Point, nextZoom = zoom) {
    if (!imageSize) return { x: 0, y: 0 };
    const scale = Math.max(240 / imageSize.width, 240 / imageSize.height) * nextZoom;
    const maxX = Math.max(0, (imageSize.width * scale - 240) / 2);
    const maxY = Math.max(0, (imageSize.height * scale - 240) / 2);
    return { x: Math.min(maxX, Math.max(-maxX, next.x)), y: Math.min(maxY, Math.max(-maxY, next.y)) };
  }

  async function save() {
    if (!photoSource) { setMessage("Selecciona una fotografía antes de guardar."); return; }
    setBusy(true); setMessage(null);
    try {
      const data = new FormData();
      data.set("avatar", await cropAvatar(photoSource, zoom, offset));
      const result = await updateOwnProfilePhoto(data);
      setMessage(result.success ? "Tu foto de perfil fue actualizada." : result.error);
      if (result.success) { setPhotoSource(null); setImageSize(null); setZoom(1); setOffset({ x: 0, y: 0 }); }
    } catch { setMessage("No fue posible procesar la fotografía."); }
    finally { setBusy(false); }
  }

  return <>
    <button className="mt-4 min-h-11 rounded-xl border border-[#d7dce4] px-4 text-sm font-semibold text-[#344056]" onClick={() => { setMessage(null); setIsOpen(true); }} type="button">Editar foto de perfil</button>
    {isOpen ? <div aria-modal="true" className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 p-4" role="dialog"><section className="max-h-[92vh] w-full max-w-sm overflow-y-auto rounded-[22px] bg-white p-6 shadow-2xl"><h2 className="text-2xl font-bold">Editar foto de perfil</h2><p className="mt-2 text-sm text-[#697186]">Arrastra la imagen hasta el límite que necesites y usa el zoom para ajustar el enfoque.</p><div className="mt-6"><PhotoEditor clampOffset={clampOffset} offset={offset} onError={setMessage} onImageSizeChange={setImageSize} onOffsetChange={setOffset} onSourceChange={setPhotoSource} onZoomChange={setZoom} photoSource={photoSource} zoom={zoom} /></div>{message ? <p className="mt-4 text-sm text-[#52617a]" role="status">{message}</p> : null}<div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end"><button className="min-h-11 rounded-xl border border-[#d7dce4] px-4 font-semibold" disabled={busy} onClick={() => setIsOpen(false)} type="button">Cancelar</button><button className="min-h-11 rounded-xl bg-[#afc500] px-5 font-semibold text-white disabled:opacity-60" disabled={busy} onClick={save} type="button">{busy ? "Guardando..." : "Guardar foto"}</button></div></section></div> : null}
  </>;
}
