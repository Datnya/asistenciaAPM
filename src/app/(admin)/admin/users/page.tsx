import { requireRole } from "@/lib/auth/guards";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function UsersPage() {
  await requireRole("admin");
  const supabase = await createServerSupabaseClient();
  const { data: users } = await supabase.from("profiles").select("user_id, username, first_name, last_name, role, is_active").order("last_name");

  return <main className="mx-auto max-w-5xl p-8"><p className="text-sm text-muted-foreground">Administración</p><h1 className="mt-2 text-3xl font-semibold">Usuarios</h1><p className="mt-3 text-muted-foreground">La creación, edición y restablecimiento se habilitarán sobre las operaciones server-only ya preparadas.</p><div className="mt-8 overflow-hidden rounded-xl border border-border"><table className="w-full text-left text-sm"><thead className="bg-muted"><tr><th className="p-3">Usuario</th><th className="p-3">Nombre</th><th className="p-3">Rol</th><th className="p-3">Estado</th></tr></thead><tbody>{users?.map((user) => <tr className="border-t border-border" key={user.user_id}><td className="p-3">{user.username}</td><td className="p-3">{user.first_name} {user.last_name}</td><td className="p-3">{user.role}</td><td className="p-3">{user.is_active ? "Activo" : "Inactivo"}</td></tr>)}</tbody></table></div></main>;
}
