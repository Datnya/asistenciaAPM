import { CircleCheck, ShieldCheck } from "lucide-react";

import { ProfileAvatar } from "@/components/shared/profile-avatar";
import { requireRole } from "@/lib/auth/guards";

export const dynamic = "force-dynamic";

export default async function AdminProfilePage() {
  const { profile } = await requireRole("admin");
  const fullName = `${profile.first_name} ${profile.last_name}`.trim();

  return (
    <main className="px-4 py-8 sm:px-6 lg:px-9 lg:py-12 xl:px-10 2xl:px-12">
      <section className="mx-auto w-full max-w-[1340px]">
        <h1 className="text-[38px] leading-none font-extrabold tracking-[-0.045em] sm:text-[46px]">Perfil</h1>
        <p className="mt-3 text-lg text-[#697186] sm:text-[22px]">Tu información administrativa de APM Control.</p>

        <div className="mt-10 max-w-3xl rounded-[18px] border border-[#eff0f2] bg-white p-6 shadow-[0_12px_40px_rgba(15,23,42,0.045)] sm:p-9">
          <div className="flex flex-col gap-5 border-b border-[#eceef1] pb-8 sm:flex-row sm:items-center">
            <ProfileAvatar avatarPath={profile.avatar_path} className="size-20 text-2xl" fullName={fullName} userId={profile.user_id} />
            <div><h2 className="text-2xl font-bold tracking-[-0.03em]">{fullName}</h2><p className="mt-1 text-[#697186]">Administración</p></div>
          </div>
          <dl className="grid gap-5 pt-8 sm:grid-cols-2">
            <div className="rounded-2xl bg-[#f8f9fb] p-5"><dt className="text-sm font-medium text-[#697186]">Usuario</dt><dd className="mt-2 font-semibold">{profile.username}</dd></div>
            <div className="rounded-2xl bg-[#f8f9fb] p-5"><dt className="flex items-center gap-2 text-sm font-medium text-[#697186]"><ShieldCheck aria-hidden="true" className="size-4" /> Rol</dt><dd className="mt-2 font-semibold">Administración</dd></div>
            <div className="rounded-2xl bg-[#f8f9fb] p-5 sm:col-span-2"><dt className="flex items-center gap-2 text-sm font-medium text-[#697186]"><CircleCheck aria-hidden="true" className="size-4 text-[#6d8a00]" /> Estado</dt><dd className="mt-2 font-semibold">Cuenta activa</dd></div>
          </dl>
        </div>
      </section>
    </main>
  );
}
