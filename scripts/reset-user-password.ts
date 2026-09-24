import { createClient } from "@supabase/supabase-js";
import { loadEnvConfig } from "@next/env";
import { emitKeypressEvents } from "node:readline";

import { assertValidUsername } from "../src/lib/auth/username";

function requiredEnvironment(name: "NEXT_PUBLIC_SUPABASE_URL" | "SUPABASE_SECRET_KEY") {
  const value = process.env[name];
  if (!value) throw new Error(`${name} debe estar configurada.`);
  return value;
}

async function readHiddenPassword(label: string): Promise<string> {
  if (!process.stdin.isTTY) {
    throw new Error("Ejecuta este comando desde una terminal interactiva.");
  }

  process.stdout.write(label);
  emitKeypressEvents(process.stdin);
  process.stdin.setRawMode(true);
  process.stdin.resume();

  return new Promise((resolve, reject) => {
    let value = "";
    const finish = () => {
      process.stdin.off("keypress", onKeypress);
      process.stdin.setRawMode(false);
      process.stdout.write("\n");
    };
    const onKeypress = (character: string, key: { ctrl?: boolean; name?: string }) => {
      if (key.ctrl && key.name === "c") {
        finish();
        reject(new Error("Operación cancelada."));
      } else if (key.name === "return" || key.name === "enter") {
        finish();
        resolve(value);
      } else if (key.name === "backspace") {
        value = value.slice(0, -1);
      } else if (character) {
        value += character;
      }
    };
    process.stdin.on("keypress", onKeypress);
  });
}

async function main() {
  loadEnvConfig(process.cwd());

  const rawUsername = process.argv[2];
  if (!rawUsername) {
    throw new Error("Uso: npm run maintenance:reset-password -- <usuario>");
  }

  const username = assertValidUsername(rawUsername);
  const password = await readHiddenPassword("Nueva contraseña (mínimo 8 caracteres): ");
  if (password.length < 8) throw new Error("La nueva contraseña debe tener al menos 8 caracteres.");

  const admin = createClient(
    requiredEnvironment("NEXT_PUBLIC_SUPABASE_URL"),
    requiredEnvironment("SUPABASE_SECRET_KEY"),
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
  const { data: profile, error: profileError } = await admin
    .from("profiles")
    .select("user_id")
    .eq("username", username)
    .maybeSingle();
  if (profileError || !profile) throw new Error("No se encontró una cuenta para ese usuario.");

  const { error } = await admin.auth.admin.updateUserById(profile.user_id, { password });
  if (error) throw new Error("No fue posible restablecer la contraseña.");

  console.log(`Contraseña restablecida para ${username}.`);
}

void main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "No fue posible restablecer la contraseña.");
  process.exitCode = 1;
});
