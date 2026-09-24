"use server";

import { revalidatePath } from "next/cache";

import { requireRole } from "@/lib/auth/guards";
import { createConsultantSchema } from "@/lib/auth/schemas";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { ensureProfilePhotosBucket, PROFILE_PHOTOS_BUCKET } from "@/lib/supabase/profile-photos";

export type CreateConsultantResult =
  | { success: true; username: string }
  | { success: false; error: string };

function splitFullName(fullName: string) {
  const parts = fullName.trim().split(/\s+/);
  return {
    firstName: parts.slice(0, -1).join(" "),
    lastName: parts.at(-1) ?? "",
  };
}

async function rollbackCreatedUser(userId: string, avatarPath?: string) {
  const admin = createAdminSupabaseClient();
  await admin.from("consultant_client_assignments").delete().eq("consultant_user_id", userId);
  await admin.from("profiles").delete().eq("user_id", userId);
  if (avatarPath) await admin.storage.from(PROFILE_PHOTOS_BUCKET).remove([avatarPath]);
  await admin.auth.admin.deleteUser(userId);
}

export async function createConsultantAccount(formData: FormData): Promise<CreateConsultantResult> {
  await requireRole("admin");

  const parsed = createConsultantSchema.safeParse({
    fullName: formData.get("fullName"),
    dni: formData.get("dni"),
    phoneNumber: formData.get("phoneNumber"),
    username: formData.get("username"),
    email: formData.get("email"),
    password: formData.get("password"),
    clientName: formData.get("clientName"),
  });
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  }

  const avatar = formData.get("avatar");
  if (avatar instanceof File && avatar.size > 2 * 1024 * 1024) {
    return { success: false, error: "La fotografía ajustada no puede superar 2 MB." };
  }
  if (avatar instanceof File && avatar.size > 0 && avatar.type !== "image/jpeg") {
    return { success: false, error: "La fotografía debe enviarse en formato JPG." };
  }

  const admin = createAdminSupabaseClient();
  const data = parsed.data;

  const [{ data: usernameExists }, { data: dniExists }] = await Promise.all([
    admin.from("profiles").select("user_id").eq("username", data.username).maybeSingle(),
    admin.from("profiles").select("user_id").eq("dni", data.dni).maybeSingle(),
  ]);
  if (usernameExists) return { success: false, error: "Ese nombre de usuario ya está registrado." };
  if (dniExists) return { success: false, error: "Ese DNI ya está registrado." };

  let { data: client } = await admin
    .from("clients")
    .select("id, is_active")
    .eq("name", data.clientName)
    .maybeSingle();

  if (client && !client.is_active) {
    return { success: false, error: "El cliente indicado está inactivo." };
  }
  if (!client) {
    const { data: createdClient, error: clientError } = await admin
      .from("clients")
      .insert({ name: data.clientName, is_active: true })
      .select("id, is_active")
      .single();
    if (clientError || !createdClient) {
      const { data: racedClient } = await admin
        .from("clients")
        .select("id, is_active")
        .eq("name", data.clientName)
        .maybeSingle();
      client = racedClient;
    } else {
      client = createdClient;
    }
  }
  if (!client?.is_active) {
    return { success: false, error: "No fue posible preparar el cliente asignado." };
  }

  const { firstName, lastName } = splitFullName(data.fullName);
  const { data: authData, error: authError } = await admin.auth.admin.createUser({
    email: data.email,
    password: data.password,
    email_confirm: true,
    app_metadata: { role: "consultant" },
  });
  if (authError || !authData.user) {
    return { success: false, error: "No fue posible crear las credenciales del consultor." };
  }

  const userId = authData.user.id;
  let avatarPath: string | undefined;

  try {
    if (avatar instanceof File && avatar.size > 0) {
      await ensureProfilePhotosBucket(admin);
      avatarPath = `${userId}/${crypto.randomUUID()}.jpg`;
      const { error: uploadError } = await admin.storage
        .from(PROFILE_PHOTOS_BUCKET)
        .upload(avatarPath, Buffer.from(await avatar.arrayBuffer()), {
          contentType: "image/jpeg",
          upsert: false,
        });
      if (uploadError) throw new Error("No fue posible guardar la fotografía del consultor.");
    }

    const { error: profileError } = await admin.from("profiles").insert({
      user_id: userId,
      username: data.username,
      auth_email: data.email,
      first_name: firstName,
      last_name: lastName,
      dni: data.dni,
      phone_number: data.phoneNumber,
      avatar_path: avatarPath ?? null,
      role: "consultant",
      is_active: true,
    });
    if (profileError) throw new Error("No fue posible completar el perfil del consultor.");

    const { error: assignmentError } = await admin.from("consultant_client_assignments").insert({
      consultant_user_id: userId,
      client_id: client.id,
      is_active: true,
    });
    if (assignmentError) throw new Error("No fue posible asignar el cliente al consultor.");
  } catch (error) {
    await rollbackCreatedUser(userId, avatarPath);
    return {
      success: false,
      error: error instanceof Error ? error.message : "No fue posible crear el consultor.",
    };
  }

  revalidatePath("/admin");
  revalidatePath("/admin/users");
  return { success: true, username: data.username };
}

export async function updateConsultantAccount(formData: FormData): Promise<CreateConsultantResult> {
  await requireRole("admin");
  const userId = String(formData.get("userId") ?? "");
  if (!/^[0-9a-f-]{36}$/i.test(userId)) return { success: false, error: "Consultor no válido." };
  const rawPassword = String(formData.get("password") ?? "");
  const parsed = createConsultantSchema.omit({ password: true }).safeParse({
    fullName: formData.get("fullName"), dni: formData.get("dni"), phoneNumber: formData.get("phoneNumber"), username: formData.get("username"), email: formData.get("email"), clientName: formData.get("clientName"),
  });
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  if (rawPassword && rawPassword.length < 8) return { success: false, error: "La nueva contraseña debe tener al menos 8 caracteres." };
  const admin = createAdminSupabaseClient();
  const { data: current } = await admin.from("profiles").select("username, auth_email, avatar_path, role").eq("user_id", userId).maybeSingle();
  if (!current || current.role !== "consultant") return { success: false, error: "El consultor no existe." };
  const data = parsed.data;
  const [{ data: usernameExists }, { data: dniExists }] = await Promise.all([
    admin.from("profiles").select("user_id").eq("username", data.username).neq("user_id", userId).maybeSingle(),
    admin.from("profiles").select("user_id").eq("dni", data.dni).neq("user_id", userId).maybeSingle(),
  ]);
  if (usernameExists) return { success: false, error: "Ese nombre de usuario ya está registrado." };
  if (dniExists) return { success: false, error: "Ese DNI ya está registrado." };
  let { data: client } = await admin.from("clients").select("id, is_active").eq("name", data.clientName).maybeSingle();
  if (client && !client.is_active) return { success: false, error: "El cliente indicado está inactivo." };
  if (!client) {
    const { data: created, error } = await admin.from("clients").insert({ name: data.clientName, is_active: true }).select("id, is_active").single();
    if (error || !created) return { success: false, error: "No fue posible preparar el cliente." };
    client = created;
  }
  const avatar = formData.get("avatar");
  if (avatar instanceof File && (avatar.size > 2 * 1024 * 1024 || avatar.type !== "image/jpeg")) return { success: false, error: "La fotografía debe ser JPG y no superar 2 MB." };
  let avatarPath: string | undefined;
  try {
    if (avatar instanceof File && avatar.size) {
      await ensureProfilePhotosBucket(admin);
      avatarPath = `${userId}/${crypto.randomUUID()}.jpg`;
      const { error } = await admin.storage.from(PROFILE_PHOTOS_BUCKET).upload(avatarPath, Buffer.from(await avatar.arrayBuffer()), { contentType: "image/jpeg", upsert: false });
      if (error) throw new Error("No fue posible guardar la fotografía.");
    }
    const { firstName, lastName } = splitFullName(data.fullName);
    const { error: authError } = await admin.auth.admin.updateUserById(userId, {
      email: data.email,
      ...(rawPassword ? { password: rawPassword } : {}),
    });
    if (authError) throw new Error("No fue posible actualizar las credenciales.");
    const { error: profileError } = await admin.from("profiles").update({
      username: data.username, auth_email: data.email, first_name: firstName, last_name: lastName, dni: data.dni, phone_number: data.phoneNumber,
      ...(avatarPath ? { avatar_path: avatarPath } : {}),
    }).eq("user_id", userId);
    if (profileError) throw new Error("No fue posible actualizar el perfil.");
    await admin.from("consultant_client_assignments").update({ is_active: false }).eq("consultant_user_id", userId).eq("is_active", true);
    const { error: assignmentError } = await admin.from("consultant_client_assignments").upsert({ consultant_user_id: userId, client_id: client.id, is_active: true }, { onConflict: "consultant_user_id,client_id" });
    if (assignmentError) throw new Error("No fue posible actualizar el cliente asignado.");
    if (avatarPath && current.avatar_path) await admin.storage.from(PROFILE_PHOTOS_BUCKET).remove([current.avatar_path]);
  } catch (error) {
    if (avatarPath) await admin.storage.from(PROFILE_PHOTOS_BUCKET).remove([avatarPath]);
    return { success: false, error: error instanceof Error ? error.message : "No fue posible actualizar el consultor." };
  }
  revalidatePath("/admin"); revalidatePath(`/admin/consultants/${userId}`); revalidatePath("/consultant"); revalidatePath("/consultant/profile");
  return { success: true, username: data.username };
}
