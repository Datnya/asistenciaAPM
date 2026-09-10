import { UserRound } from "lucide-react";
import Link from "next/link";

import { NewConsultantDialog } from "@/components/admin/new-consultant-dialog";
import { ProfileAvatar } from "@/components/shared/profile-avatar";
import { listActiveClientNames, listConsultants } from "@/lib/admin/consultants";
import { requireRole } from "@/lib/auth/guards";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  await requireRole("admin");
  const [consultants, clientNames] = await Promise.all([listConsultants(), listActiveClientNames()]);

  return (
    <main className="px-4 py-8 sm:px-6 lg:px-9 lg:py-12 xl:px-10 2xl:px-12">
      <section className="mx-auto w-full max-w-[1340px]">
        <div className="flex flex-col gap-7 xl:flex-row xl:items-center xl:justify-between">
          <h1 className="text-[38px] leading-none font-extrabold tracking-[-0.045em] sm:text-[48px]">Dashboard</h1>
          <NewConsultantDialog clientNames={clientNames} />
        </div>

        {consultants.length ? (
          <div className="mt-10 grid gap-6 xl:grid-cols-2">
            {consultants.map((consultant) => (
              <Link
                aria-label={`Ver detalle de ${consultant.fullName}`}
                className="group flex min-h-[190px] items-center gap-6 rounded-[17px] border border-[#eff0f2] bg-white px-6 py-7 shadow-[0_12px_40px_rgba(15,23,42,0.045)] transition hover:-translate-y-0.5 hover:border-[#dfe6c7] hover:shadow-[0_18px_44px_rgba(15,23,42,0.09)] focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-[#92a300]"
                href={`/admin/consultants/${consultant.userId}`}
                key={consultant.userId}
              >
                <ProfileAvatar
                  avatarPath={consultant.avatarPath}
                  className="size-28 text-2xl sm:size-[142px]"
                  fullName={consultant.fullName}
                  userId={consultant.userId}
                />
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-3">
                    <h2 className="truncate text-[25px] font-bold tracking-[-0.04em] sm:text-[29px]">{consultant.fullName}</h2>
                    {!consultant.isActive ? <span className="rounded-full bg-[#f0f1f3] px-3 py-1 text-xs font-semibold text-[#697186]">Inactivo</span> : null}
                  </div>
                  <p className="mt-1 text-lg text-[#657189]">Consultor</p>
                  <p className="mt-2 line-clamp-2 text-base leading-relaxed text-[#657189] sm:text-[18px]">
                    Cliente asignado: {consultant.clients.map((client) => client.name).join(", ") || "Sin cliente asignado"}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="mt-10 rounded-[20px] border border-[#eff0f2] bg-white px-6 py-20 text-center shadow-[0_12px_40px_rgba(15,23,42,0.045)]">
            <div className="mx-auto flex size-20 items-center justify-center rounded-full bg-[#f1f5e8] text-[#5d7900]">
              <UserRound aria-hidden="true" className="size-10" />
            </div>
            <h2 className="mt-5 text-2xl font-bold">Aún no hay consultores</h2>
            <p className="mx-auto mt-2 max-w-lg text-[#697186]">Usa “Agregar nuevo consultor” para crear el primer perfil con sus credenciales y cliente asignado.</p>
          </div>
        )}
      </section>
    </main>
  );
}
