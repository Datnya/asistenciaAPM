import { createClient } from "@supabase/supabase-js";

import { buildAuthAlias, assertValidUsername } from "../src/lib/auth/username";

async function main() {
  const [firstName, lastName, rawUsername, password] = process.argv.slice(2);
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secret = process.env.SUPABASE_SECRET_KEY;
  const domain = process.env.AUTH_USERNAME_DOMAIN;

  if (!firstName || !lastName || !rawUsername || !password || !url || !secret || !domain) {
    throw new Error(
      "Uso: npm run bootstrap:admin -- <nombre> <apellido> <usuario> <contraseña>. Configura las variables de entorno.",
    );
  }

  const username = assertValidUsername(rawUsername);
  const admin = createClient(url, secret, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data: existing } = await admin
    .from("profiles")
    .select("user_id")
    .eq("username", username)
    .maybeSingle();
  if (existing) throw new Error("Ya existe un perfil con ese username.");

  const { data: authData, error: authError } = await admin.auth.admin.createUser({
    email: buildAuthAlias(username, domain),
    password,
    email_confirm: true,
    app_metadata: { role: "admin" },
  });
  if (authError || !authData.user) {
    throw new Error(authError?.message ?? "No fue posible crear el usuario Auth.");
  }

  const { error: profileError } = await admin.from("profiles").insert({
    user_id: authData.user.id,
    username,
    first_name: firstName.trim(),
    last_name: lastName.trim(),
    role: "admin",
    is_active: true,
  });
  if (profileError) {
    await admin.auth.admin.deleteUser(authData.user.id);
    throw new Error("No fue posible crear el perfil; el usuario Auth fue revertido.");
  }

  console.log(`Admin creado: ${username}`);
}

void main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "No fue posible crear el admin.");
  process.exitCode = 1;
});
