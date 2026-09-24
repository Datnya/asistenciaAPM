import { loadEnvConfig } from "@next/env";
import { createClient } from "@supabase/supabase-js";
import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";

import { authEmailSchema } from "../src/lib/auth/schemas";
import { assertValidUsername } from "../src/lib/auth/username";

function requiredEnvironment(name: "NEXT_PUBLIC_SUPABASE_URL" | "SUPABASE_SECRET_KEY") {
  const value = process.env[name];
  if (!value) throw new Error(`${name} debe estar configurada.`);
  return value;
}

async function main() {
  loadEnvConfig(process.cwd());

  const rawUsername = process.argv[2];
  if (!rawUsername) throw new Error("Uso: npm run maintenance:update-email -- <usuario>");
  const username = assertValidUsername(rawUsername);

  const prompt = createInterface({ input, output });
  const rawEmail = await prompt.question("Correo electrónico real: ");
  prompt.close();
  const parsedEmail = authEmailSchema.safeParse(rawEmail);
  if (!parsedEmail.success) throw new Error(parsedEmail.error.issues[0]?.message ?? "Correo no válido.");
  const email = parsedEmail.data;

  const admin = createClient(
    requiredEnvironment("NEXT_PUBLIC_SUPABASE_URL"),
    requiredEnvironment("SUPABASE_SECRET_KEY"),
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
  const { data: profile, error: profileError } = await admin
    .from("profiles")
    .select("user_id, auth_email")
    .eq("username", username)
    .maybeSingle();
  if (profileError || !profile) throw new Error("No se encontró una cuenta para ese usuario.");

  const { data: authData, error: authLookupError } = await admin.auth.admin.getUserById(profile.user_id);
  if (authLookupError || !authData.user.email) throw new Error("No fue posible leer las credenciales actuales.");
  const previousEmail = authData.user.email;

  const { error: authError } = await admin.auth.admin.updateUserById(profile.user_id, {
    email,
    email_confirm: true,
  });
  if (authError) throw new Error("No fue posible actualizar el correo en Supabase Auth.");

  const { error: updateProfileError } = await admin
    .from("profiles")
    .update({ auth_email: email })
    .eq("user_id", profile.user_id);
  if (!updateProfileError) {
    console.log(`Correo actualizado para ${username}.`);
    return;
  }

  await admin.auth.admin.updateUserById(profile.user_id, { email: previousEmail, email_confirm: true });
  throw new Error("No fue posible actualizar el perfil; el correo de Auth fue restaurado.");
}

void main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "No fue posible actualizar el correo.");
  process.exitCode = 1;
});
