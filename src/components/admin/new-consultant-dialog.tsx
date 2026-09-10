"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff, ImagePlus, UserPlus, X, ZoomIn, ZoomOut } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import type { z } from "zod";

import { createConsultantAccount } from "@/app/(admin)/admin/consultants/actions";
import { createConsultantSchema } from "@/lib/auth/schemas";

type ConsultantFormValues = z.input<typeof createConsultantSchema>;
type Point = { x: number; y: number };
type ImageSize = { width: number; height: number };

function suggestUsername(fullName: string) {
  return fullName
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ".")
    .replace(/[^a-z0-9._-]/g, "");
}

export async function cropAvatar(source: string, zoom: number, offset: Point) {
  const image = new window.Image();
  image.src = source;
  await image.decode();

  const size = 512;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("No fue posible procesar la fotografía.");

  const coverScale = Math.max(size / image.naturalWidth, size / image.naturalHeight);
  const width = image.naturalWidth * coverScale * zoom;
  const height = image.naturalHeight * coverScale * zoom;
  const x = (size - width) / 2 + offset.x * (size / 240);
  const y = (size - height) / 2 + offset.y * (size / 240);

  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, size, size);
  context.drawImage(image, x, y, width, height);

  return new Promise<File>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error("No fue posible procesar la fotografía."));
        return;
      }
      resolve(new File([blob], "avatar.jpg", { type: "image/jpeg" }));
    }, "image/jpeg", 0.9);
  });
}

export function NewConsultantDialog({ clientNames }: { clientNames: string[] }) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [photoSource, setPhotoSource] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState<Point>({ x: 0, y: 0 });
  const [imageSize, setImageSize] = useState<ImageSize | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [createdUsername, setCreatedUsername] = useState<string | null>(null);
  const [usernameEdited, setUsernameEdited] = useState(false);

  const { register, handleSubmit, reset, setValue, formState: { errors } } = useForm<ConsultantFormValues>({
    resolver: zodResolver(createConsultantSchema),
    defaultValues: { fullName: "", dni: "", phoneNumber: "", username: "", password: "", clientName: "" },
  });

  useEffect(() => {
    if (!isOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !isSubmitting) setIsOpen(false);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [isOpen, isSubmitting]);

  function closeDialog() {
    if (isSubmitting) return;
    setIsOpen(false);
    setServerError(null);
    setCreatedUsername(null);
    setPhotoSource(null);
    setZoom(1);
    setOffset({ x: 0, y: 0 });
    setImageSize(null);
    setUsernameEdited(false);
    reset();
  }

  function clampOffset(next: Point, nextZoom = zoom) {
    if (!imageSize) return { x: 0, y: 0 };
    const coverScale = Math.max(240 / imageSize.width, 240 / imageSize.height) * nextZoom;
    const maximumX = Math.max(0, (imageSize.width * coverScale - 240) / 2);
    const maximumY = Math.max(0, (imageSize.height * coverScale - 240) / 2);
    return {
      x: Math.min(maximumX, Math.max(-maximumX, next.x)),
      y: Math.min(maximumY, Math.max(-maximumY, next.y)),
    };
  }

  async function onSubmit(values: ConsultantFormValues) {
    setIsSubmitting(true);
    setServerError(null);
    try {
      const formData = new FormData();
      Object.entries(values).forEach(([key, value]) => formData.set(key, String(value)));
      if (photoSource) formData.set("avatar", await cropAvatar(photoSource, zoom, offset));

      const result = await createConsultantAccount(formData);
      if (!result.success) {
        setServerError(result.error);
        return;
      }
      setCreatedUsername(result.username);
      router.refresh();
    } catch (error) {
      setServerError(error instanceof Error ? error.message : "No fue posible crear el consultor.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <>
      <button
        className="flex min-h-[76px] w-full items-center justify-center gap-4 rounded-[15px] bg-[linear-gradient(135deg,#9dbb00_0%,#b3ca00_55%,#91ad00_100%)] px-7 text-lg font-semibold text-white shadow-[0_14px_30px_rgba(154,177,0,0.18)] transition hover:brightness-[0.98] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#7b9000] active:translate-y-px xl:w-[425px] xl:text-[21px]"
        onClick={() => setIsOpen(true)}
        type="button"
      >
        <UserPlus aria-hidden="true" className="size-9" />
        Agregar nuevo consultor
      </button>

      {isOpen ? (
        <div
          aria-labelledby="new-consultant-title"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4 py-8 backdrop-blur-[2px]"
          onMouseDown={(event) => {
            if (event.currentTarget === event.target) closeDialog();
          }}
          role="dialog"
        >
          <section className="relative w-full max-w-4xl rounded-[24px] bg-white p-6 shadow-[0_30px_90px_rgba(15,23,42,0.28)] sm:p-9">
            <button
              aria-label="Cerrar formulario"
              className="absolute top-5 right-5 flex size-11 items-center justify-center rounded-full text-[#697186] hover:bg-[#f3f5f7] focus-visible:outline-2 focus-visible:outline-[#92a300]"
              onClick={closeDialog}
              type="button"
            >
              <X aria-hidden="true" className="size-5" />
            </button>

            {createdUsername ? (
              <CreatedConsultantMessage onClose={closeDialog} username={createdUsername} />
            ) : (
              <>
                <header className="pr-12">
                  <h2 className="text-3xl font-bold tracking-[-0.04em]" id="new-consultant-title">Agregar nuevo consultor</h2>
                  <p className="mt-2 text-[#697186]">Crea el perfil, las credenciales y su primera asignación de cliente.</p>
                </header>

                <form className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_280px]" onSubmit={handleSubmit(onSubmit)}>
                  <div className="grid content-start gap-5 sm:grid-cols-2">
                    <label className="sm:col-span-2">
                      <FieldLabel>Nombre completo</FieldLabel>
                      <input
                        className="admin-field"
                        placeholder="Ej. Patricia Romero"
                        {...register("fullName", {
                          onChange: (event) => {
                            if (!usernameEdited) setValue("username", suggestUsername(event.target.value), { shouldValidate: true });
                          },
                        })}
                      />
                      <FieldError message={errors.fullName?.message} />
                    </label>

                    <label>
                      <FieldLabel>Nro. de DNI</FieldLabel>
                      <input className="admin-field" inputMode="numeric" maxLength={8} placeholder="12345678" {...register("dni")} />
                      <FieldError message={errors.dni?.message} />
                    </label>

                    <label>
                      <FieldLabel>Nro. de celular</FieldLabel>
                      <input className="admin-field" inputMode="numeric" maxLength={9} placeholder="999999999" {...register("phoneNumber")} />
                      <FieldError message={errors.phoneNumber?.message} />
                    </label>

                    <label>
                      <FieldLabel>Nombre de usuario</FieldLabel>
                      <input
                        autoCapitalize="none"
                        className="admin-field"
                        placeholder="patricia.romero"
                        {...register("username", { onChange: () => setUsernameEdited(true) })}
                      />
                      <FieldError message={errors.username?.message} />
                    </label>

                    <label>
                      <FieldLabel>Contraseña inicial</FieldLabel>
                      <span className="relative block">
                        <input
                          autoComplete="new-password"
                          className="admin-field pr-12"
                          placeholder="Mínimo 8 caracteres"
                          type={showPassword ? "text" : "password"}
                          {...register("password")}
                        />
                        <button
                          aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                          className="absolute inset-y-0 right-0 flex w-12 items-center justify-center text-[#697186] focus-visible:outline-2 focus-visible:outline-[#92a300]"
                          onClick={() => setShowPassword((value) => !value)}
                          type="button"
                        >
                          {showPassword ? <EyeOff aria-hidden="true" className="size-5" /> : <Eye aria-hidden="true" className="size-5" />}
                        </button>
                      </span>
                      <FieldError message={errors.password?.message} />
                    </label>

                    <label>
                      <FieldLabel>Cliente asignado</FieldLabel>
                      <input className="admin-field" list="active-client-names" placeholder="Selecciona o escribe un cliente" {...register("clientName")} />
                      <datalist id="active-client-names">
                        {clientNames.map((name) => <option key={name} value={name} />)}
                      </datalist>
                      <FieldError message={errors.clientName?.message} />
                    </label>

                    {serverError ? <p className="rounded-xl bg-red-50 p-4 text-sm text-red-700 sm:col-span-2" role="alert">{serverError}</p> : null}

                    <div className="flex flex-col-reverse gap-3 pt-2 sm:col-span-2 sm:flex-row sm:justify-end">
                      <button className="min-h-12 rounded-xl border border-[#d7dce4] px-6 font-semibold" onClick={closeDialog} type="button">Cancelar</button>
                      <button className="min-h-12 rounded-xl bg-[#afc500] px-7 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60" disabled={isSubmitting} type="submit">
                        {isSubmitting ? "Creando consultor..." : "Crear consultor y credenciales"}
                      </button>
                    </div>
                  </div>

                  <PhotoEditor
                    offset={offset}
                    onError={setServerError}
                    onImageSizeChange={setImageSize}
                    onOffsetChange={setOffset}
                    onSourceChange={setPhotoSource}
                    onZoomChange={setZoom}
                    photoSource={photoSource}
                    zoom={zoom}
                    clampOffset={clampOffset}
                  />
                </form>
              </>
            )}
          </section>
        </div>
      ) : null}
    </>
  );
}

function FieldLabel({ children }: { children: ReactNode }) {
  return <span className="mb-2 block text-sm font-semibold">{children}</span>;
}

function FieldError({ message }: { message?: string }) {
  return message ? <span className="mt-1 block text-sm text-red-600">{message}</span> : null;
}

function CreatedConsultantMessage({ username, onClose }: { username: string; onClose: () => void }) {
  return (
    <div className="py-8 text-center">
      <div className="mx-auto flex size-20 items-center justify-center rounded-full bg-[#f0f5df] text-[#668000]"><UserPlus aria-hidden="true" className="size-10" /></div>
      <h2 className="mt-6 text-3xl font-bold tracking-[-0.04em]">Consultor creado</h2>
      <p className="mx-auto mt-3 max-w-lg leading-relaxed text-[#697186]">Las credenciales ya están activas. Puede ingresar con el usuario <strong className="text-[#202632]">{username}</strong> y la contraseña que acabas de definir.</p>
      <button className="mt-7 min-h-12 rounded-xl bg-[#afc500] px-8 font-semibold text-white" onClick={onClose} type="button">Finalizar</button>
    </div>
  );
}

export type PhotoEditorProps = {
  photoSource: string | null;
  zoom: number;
  offset: Point;
  onSourceChange: (source: string) => void;
  onZoomChange: (zoom: number) => void;
  onOffsetChange: (point: Point) => void;
  onError: (message: string) => void;
  onImageSizeChange: (size: ImageSize | null) => void;
  clampOffset: (point: Point, zoom?: number) => Point;
};

export function PhotoEditor(props: PhotoEditorProps) {
  const dragStart = useRef<{ pointer: Point; offset: Point } | null>(null);

  return (
    <div>
      <FieldLabel>Foto de perfil</FieldLabel>
      <div
        className="relative mx-auto size-60 touch-none overflow-hidden rounded-full border-4 border-white bg-[#f1f3f6] shadow-[0_0_0_1px_#d7dce4]"
        onPointerDown={(event) => {
          if (!props.photoSource) return;
          event.currentTarget.setPointerCapture(event.pointerId);
          dragStart.current = { pointer: { x: event.clientX, y: event.clientY }, offset: props.offset };
        }}
        onPointerMove={(event) => {
          const start = dragStart.current;
          if (!start) return;
          props.onOffsetChange(props.clampOffset({
            x: start.offset.x + event.clientX - start.pointer.x,
            y: start.offset.y + event.clientY - start.pointer.y,
          }));
        }}
        onPointerUp={() => { dragStart.current = null; }}
      >
        {props.photoSource ? (
          <Image
            alt="Vista previa ajustable"
            className="pointer-events-none object-cover"
            fill
            src={props.photoSource}
            style={{ objectPosition: `${50 - props.offset.x / 2}% ${50 - props.offset.y / 2}%`, transform: `scale(${props.zoom})` }}
            unoptimized
          />
        ) : (
          <div className="flex size-full flex-col items-center justify-center gap-3 text-center text-[#697186]">
            <ImagePlus aria-hidden="true" className="size-10" />
            <span className="max-w-36 text-sm">Selecciona una imagen para ajustarla</span>
          </div>
        )}
      </div>

      <label className="mt-5 flex min-h-12 cursor-pointer items-center justify-center rounded-xl border border-[#d7dce4] px-4 text-sm font-semibold hover:bg-[#f8f9fb]">
        Seleccionar fotografía
        <input
          accept="image/jpeg,image/png,image/webp"
          className="sr-only"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (!file) return;
            if (file.size > 10 * 1024 * 1024) {
              props.onError("La imagen original no puede superar 10 MB.");
              return;
            }
            const reader = new FileReader();
            reader.onload = async () => {
              const source = String(reader.result);
              const preview = new window.Image();
              preview.src = source;
              await preview.decode();
              props.onImageSizeChange({ width: preview.naturalWidth, height: preview.naturalHeight });
              props.onSourceChange(source);
              props.onZoomChange(1);
              props.onOffsetChange({ x: 0, y: 0 });
            };
            reader.readAsDataURL(file);
          }}
          type="file"
        />
      </label>

      <div className="mt-5 flex items-center gap-3">
        <ZoomOut aria-hidden="true" className="size-5 text-[#697186]" />
        <input
          aria-label="Zoom de fotografía"
          className="w-full accent-[#9caf00]"
          disabled={!props.photoSource}
          max="3"
          min="1"
          onChange={(event) => {
            const nextZoom = Number(event.target.value);
            props.onZoomChange(nextZoom);
            props.onOffsetChange(props.clampOffset(props.offset, nextZoom));
          }}
          step="0.05"
          type="range"
          value={props.zoom}
        />
        <ZoomIn aria-hidden="true" className="size-5 text-[#697186]" />
      </div>
      <p className="mt-3 text-center text-xs leading-relaxed text-[#697186]">Arrastra la imagen para ajustar el enfoque y usa el control para acercar o alejar.</p>
    </div>
  );
}
