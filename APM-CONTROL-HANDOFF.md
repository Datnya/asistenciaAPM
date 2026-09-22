# APM Control — Contexto de traspaso para IA

> **Propósito:** permitir que otra IA continúe el desarrollo sin reconstruir el contexto.
> **Snapshot:** 2026-09-22, repositorio en commit `f5ce5cd` sobre `main`.
> **Estatus:** documento operativo de traspaso solicitado por el owner. **No sustituye** los seis documentos canónicos ni contiene claves, contraseñas o tokens.

---

## 1. Inicio obligatorio para cualquier modelo

Antes de modificar código, datos, seguridad, deploy o dependencias, leer completos y en este orden:

1. `00-INDICE.md`
2. `01-CONSTITUCION.md`
3. `02-GOBERNANZA.md`
4. `03-ARQUITECTURA.md`
5. `04-MAPA-ASCII.md`
6. `05-STACK-TECNOLOGICO.md`

Los seis son la fuente canónica. Este archivo solo concentra el estado corroborado al momento de este snapshot. Si hay contradicción, manda `01-CONSTITUCION.md`; si el código difiere, señalar el drift al owner antes de cambiar comportamiento.

Reglas de trabajo relevantes:

- `main` representa producción; para cambios nuevos usar una rama y Preview de Vercel antes de producción.
- No agregar paquetes, roles, servicios o funcionalidades por anticipado.
- Un cambio de esquema requiere migración versionada en `supabase/migrations/`, RLS/constraints y verificación.
- Nunca exponer la clave secreta de Supabase, contraseñas ni tokens; tampoco incluirlos en commits, logs o este documento.
- Ejecutar `npm run lint`, `npm run typecheck`, `npm test` y `npm run build` antes de declarar terminada una modificación de aplicación.

---

## 2. Qué es el producto

**APM Control** es una aplicación web interna de APM Group para registrar asistencia y actividades de consultores, conservar un historial trazable y permitir administración y exportación de reportes Excel.

La aplicación es una sola web responsive para móvil y escritorio, con dos experiencias separadas:

| Rol | Experiencia |
|---|---|
| `consultant` | Registra su propia jornada, sus actividades, sus horas declaradas y revisa su historial/acumulado. |
| `admin` | Crea y administra cuentas de consultor, revisa detalles y asistencias, corrige o elimina una asistencia con controles y descarga Excel individual. |

No existe rol adicional, registro público, recuperación por correo, app móvil nativa, geofencing, seguimiento continuo, mapas, nómina, cronómetro ni cálculo automático de horas para una jornada actual.

---

## 3. Reglas de negocio que no deben romperse

### Jornadas y horas

- Una jornada pertenece a un consultor, una fecha y un cliente.
- Como máximo existe una jornada por consultor/fecha mientras exista el registro, y una sola jornada `open` por consultor.
- No se permiten fechas futuras ni jornadas que crucen medianoche.
- Jornada actual: ingreso confirmado → actividades → salida. Al confirmar el ingreso, el consultor ya no puede cambiarlo; una cerrada queda solo lectura para el consultor.
- No se puede cerrar sin al menos una actividad. Cada actividad exige área y descripción de 1 a 250 caracteres; `Otro` exige área específica.
- `declared_minutes` es la única cifra que alimenta acumulados, tarjetas, historial y Excel. Es una conversión normalizada de `HH:MM`.
- **Jornada actual:** las horas declaradas son manuales; `salida - ingreso` no se usa, no se muestra ni se deriva como horas computables.
- **Jornada histórica:** se registra cerrada en una sola operación. La diferencia ingreso/salida propone `HH:MM` por defecto, pero el consultor puede escoger **“Colocar manualmente las horas”** y reemplazarla. Solo el valor confirmado se guarda/suma.
- Las jornadas históricas usan `record_mode='historical'`; las actuales usan `record_mode='live'`.
- Historiales y exportación individual están ordenados de fecha más reciente a más antigua.

### Geolocalización

- En ingreso y salida de una jornada actual se intenta obtener ubicación puntual del navegador.
- Rechazar GPS, no tener permiso o fallar el navegador **no bloquea** el registro; se guarda el estado de incidencia.
- En jornada histórica, una ubicación actual es solo `submission_location_*`, nunca evidencia retroactiva de ingreso o salida.
- No hay tracking continuo, geofence ni reverse geocoding.

### Administración y auditoría

- Solo ADMIN crea usuarios, restablece contraseñas, modifica datos de consultor y ejecuta operaciones privilegiadas.
- CONSULTANT no ve datos de otros consultores, no accede a `/admin`, no modifica credenciales ni una jornada cerrada.
- Usuario desactivado pierde acceso aunque conserve una sesión anterior; su historial no se borra.
- Una corrección administrativa crea una auditoría con actor, timestamp, antes y después. **No exige motivo manual.**
- Solo ADMIN puede eliminar una asistencia; se exige confirmación explícita y la eliminación es física/irreversible. Se eliminan junto con ella actividades y auditoría asociada, por lo que deja de contar en totales, historial y Excel.
- Clientes y usuarios se desactivan, no se eliminan desde UI si tienen historia asociada.

---

## 4. Estado funcional implementado

### Acceso y perfiles

- Login en `/login` con usuario visible + contraseña; el correo técnico no aparece en UI.
- Redirección por rol hacia `/admin` o `/consultant`.
- Guards server-side validan usuario autenticado, `profiles.is_active`, `auth.users.app_metadata.role` y el espejo `profiles.role`.
- Hay perfil administrativo y perfil de consultor.
- El consultor puede reemplazar/ajustar únicamente su foto de perfil; no puede editar usuario, rol, DNI, celular ni contraseña.
- ADMIN puede crear consultores desde dashboard, asignar un cliente inicial y cargar/recortar foto. Puede editar nombre, DNI, celular, username, cliente, contraseña opcional y foto de un consultor.
- El recorte permite arrastrar la imagen dentro de sus límites y aplicar zoom antes de guardarla.

### Flujo del consultor

- Dashboard de consultor con branding APM, métricas y estado de jornada.
- Menú de usuario con cierre de sesión.
- Formulario de ingreso: fecha, tipo de jornada (`remote`/`onsite`), cliente asignado y hora de ingreso. Solo la fecha actual abre una jornada live.
- Registro histórico desde el mismo formulario cuando se selecciona una fecha pasada: fecha, tipo, cliente, ingreso, salida, horas propuestas/manuales y una actividad obligatoria; se confirma y se registra cerrado.
- Jornada abierta: crear, editar y eliminar actividades propias; cerrar con hora de salida y horas declaradas manuales; modal de confirmación y mensaje de éxito.
- Si una jornada de un día previo quedó abierta, se muestra el aviso de pendiente y bloquea cualquier jornada nueva hasta cerrarla.
- Historial y acumulados se obtienen de jornadas `closed` y `declared_minutes`.

### Flujo administrativo

- Dashboard con tarjetas de consultores; al seleccionar una tarjeta se abre el detalle de ese consultor.
- Detalle muestra identificación del consultor, cliente(s), DNI/celular, métricas, asistencias y acciones.
- ADMIN puede editar asistencia (fecha, cliente, tipo, ingreso, salida y horas declaradas) por RPC transaccional. No se solicita motivo de corrección.
- ADMIN puede eliminar una asistencia con modal de confirmación explícita.
- La descarga de Excel individual abre un filtro de rango `desde/hasta`; solo con rango válido genera el archivo.
- Excel se genera server-side, lleva logo y branding APM, incluye resumen/detalle y usa siempre `declared_minutes`; no calcula horas desde las marcas horarias.

### Alcance aún pendiente o por corroborar antes de prometerlo

No asumir que los siguientes objetivos del diseño ya están disponibles solo porque figuran en los documentos canónicos:

- Rutas separadas de administración para asistencias, clientes y reportes globales (`/admin/attendance`, `/admin/clients`, `/admin/reports`) no aparecen hoy como rutas implementadas en `src/app`.
- La exportación implementada es por consultor; la exportación global debe comprobarse/implementarse antes de ofrecerla.
- No se encontró una suscripción Realtime activa en el código actual; la UI se refresca mediante revalidación/`router.refresh` tras acciones.
- No hay pruebas E2E Playwright configuradas en `package.json`; existen pruebas unitarias Vitest de utilidades de username y horas.
- La jornada histórica actual solicita una actividad en su formulario. Si se decide permitir múltiples actividades en una sola histórica, debe diseñarse e implementarse sin romper la regla de al menos una.

---

## 5. Datos y Supabase

### Proyecto conectado

- Supabase project ref: `iksnqcpmyfstuwahhysw`.
- La aplicación conecta con Supabase mediante `.env.local` en desarrollo y variables equivalentes en Vercel.
- El servidor MCP de Supabase fue añadido en Codex para ese proyecto. Cada nuevo agente/entorno debe autenticar su propia sesión MCP; nunca debe reutilizar ni pedir tokens de otra sesión.
- La URL pública y la publishable key son las únicas variables aptas para cliente; la secret key es estrictamente server-only.

Variables requeridas (los valores reales **no** se versionan ni se copian a este documento):

```ini
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
SUPABASE_SECRET_KEY=
AUTH_USERNAME_DOMAIN=
```

`.env.local` está ignorado por Git. El alias técnico de login se compone como `username@AUTH_USERNAME_DOMAIN`; nunca debe mostrarse al usuario.

### Patrón de clientes Supabase

| Archivo | Uso |
|---|---|
| `src/lib/supabase/browser.ts` | Cliente de navegador con clave publishable y RLS. |
| `src/lib/supabase/server.ts` | Cliente SSR/server con cookies y contexto autenticado. |
| `src/lib/supabase/admin.ts` | Cliente server-only con `SUPABASE_SECRET_KEY`; solo después de validar ADMIN activo. |

No usar el cliente admin desde componentes cliente ni para eludir RLS por comodidad.

### Modelo de datos aplicado

| Tabla/servicio | Responsabilidad |
|---|---|
| `auth.users` | Identidad técnica, password hasheada y `app_metadata.role`. |
| `profiles` | Perfil de producto 1:1: username, nombre, apellido, rol espejo, estado, DNI, celular y `avatar_path`. |
| `clients` | Clientes activos/inactivos. |
| `consultant_client_assignments` | Asignaciones consultor-cliente activas. |
| `attendance_sessions` | Jornada: fecha, cliente, `live`/`historical`, `open`/`closed`, horarios, tipo remoto/presencial, minutos declarados y estado de GPS. |
| `attendance_activities` | Actividades de una jornada: área, área específica y descripción. |
| `attendance_audit_log` | Auditoría de correcciones admin: actor, acción, snapshots antes/después, timestamp y motivo nullable por compatibilidad. |
| Storage `profile-photos` | Bucket privado para avatares JPG procesados. |

Migraciones existentes, en orden:

```text
202609090001_profiles_and_auth.sql
20260910143000_add_attendance_work_type_and_historical_rpc.sql
20260910145500_add_attendance_audit_and_admin_corrections.sql
20260910150000_harden_attendance_audit_log.sql
20260910151500_add_client_to_admin_attendance_correction.sql
20260910153212_admin_consultants_and_clients.sql
20260910160000_make_admin_correction_reason_optional.sql
20260910172204_consultant_attendance_and_profile_phone.sql
```

Constraints y defensas importantes:

- índice único parcial por `(consultant_user_id, work_date)`;
- índice único parcial de una sesión `open` por consultor;
- fecha no futura en zona `America/Lima`;
- rango `declared_minutes` entre 1 y 1440;
- cierre requiere salida, minutos declarados y `closed_at`;
- salida no anterior al ingreso;
- cliente activo y asignado se valida en servidor/trigger/RPC;
- RLS habilitado en tablas de negocio; las mutaciones sensibles se hacen mediante Server Actions/cliente admin tras `requireRole`;
- RPCs relevantes: `create_historical_attendance`, `apply_admin_attendance_correction`, `delete_admin_attendance`.

---

## 6. Autenticación, cuentas actuales y seguridad

### Roles

Solo hay `admin` y `consultant`.

| Capacidad | ADMIN | CONSULTANT |
|---|---:|---:|
| Ingresar a `/admin` | Sí | No |
| Crear/restablecer cuentas | Sí, server-only | No |
| Ver/editar consultores | Sí | No |
| Crear/editar actividad propia abierta | No como flujo normal | Sí |
| Cerrar su propia jornada | No como flujo normal | Sí |
| Corregir/eliminar asistencia | Sí, auditado/confirmado | No |
| Generar Excel | Sí | No |
| Cambiar contraseña propia | Gestión administrativa | No |

### Cuentas administrativas verificadas en este snapshot

- `datnya.monzon` — ADMIN, activa.
- `patricia.romero` — ADMIN, activa; creada y verificada el 2026-09-22 con `app_metadata.role='admin'`, `profiles.role='admin'` e `is_active=true`.

Las contraseñas no se registran aquí. Si se requiere una nueva, un ADMIN debe restablecerla server-side; nunca se puede leer una existente desde Supabase ni desde la aplicación.

---

## 7. Stack, branding y UX

### Stack instalado

- Next.js `16.3.4` App Router + React `19.2.8`.
- TypeScript estricto, Tailwind CSS 4 y utilidades de `tailwind-merge`/`clsx`.
- Supabase: `@supabase/supabase-js` y `@supabase/ssr`.
- Formularios: React Hook Form + Zod.
- Iconos: Lucide React.
- Excel: ExcelJS server-side.
- Pruebas unitarias: Vitest.

No introducir Redux, Zustand, TanStack Query, Prisma, Drizzle, Redis, Maps, Sentry, Resend, Firebase, Framer Motion u OpenAI SDK sin decisión explícita del owner y actualización de `05-STACK-TECNOLOGICO.md`.

### Branding obligatorio

| Elemento | Valor/regla |
|---|---|
| Verde APM | `#B0BF12` como color canónico; el código actual utiliza derivados cercanos para gradientes/estados visuales. |
| Base | Negro `#000000` y blanco `#FFFFFF`, con grises neutros para superficie/bordes. |
| Logo oficial | `public/branding/apm-logo.jpg`; usarlo en login, shell de la plataforma y Excel sin deformar su proporción. |
| Tipografía | Sans moderna y legible; evitar fuentes decorativas. |
| Iconos | Solo Lucide, no emojis funcionales. |
| Verde en UX | Acción primaria, estado activo, chips y encabezados Excel; evitar texto verde pequeño sobre fondo blanco por contraste. |
| Responsive | Diseño mobile-first; touch targets principales de al menos 44 px y no tablas horizontales comprimidas para el consultor. |

La UI ya tiene login compacto para que se vea completo sin scroll en pantalla de laptop, dashboard de consultor y dashboard/detalle administrativo con el lenguaje visual de APM.

---

## 8. Rutas y archivos para orientarse rápido

### Rutas existentes relevantes

```text
/                         -> redirección/entrada
/login                    -> login
/consultant               -> dashboard, ingreso, actividad, salida e histórico integrado
/consultant/profile       -> perfil y foto propia
/admin                    -> dashboard de consultores y alta de consultor
/admin/consultants/[id]   -> detalle, edición, corrección/eliminación y Excel individual
/admin/profile            -> perfil administrativo
/admin/users              -> listado básico de usuarios
/api/admin/consultants/[id]/attendance-export -> XLSX individual protegido
/api/profile-photos/[userId]                  -> avatar privado protegido
```

### Archivos de mayor impacto

```text
src/lib/auth/guards.ts                         # sesión activa y requireRole
src/lib/auth/username.ts                       # normalización + alias técnico
src/lib/supabase/admin.ts                      # cliente secreto server-only
src/app/(public)/login/actions.ts              # login username -> alias
src/app/(consultant)/consultant/attendance-actions.ts
src/components/consultant/attendance-action.tsx
src/app/(admin)/admin/attendance-actions.ts
src/app/(admin)/admin/consultants/actions.ts
src/components/admin/new-consultant-dialog.tsx
src/components/admin/edit-consultant-dialog.tsx
src/lib/admin/consultants.ts                   # consultas y orden de historial/export
src/app/api/admin/consultants/[id]/attendance-export/route.ts
src/lib/attendance/hours.ts                    # HH:MM <-> minutos y cálculo propuesto histórico
supabase/migrations/*                          # contrato real versionado de DB/RLS
```

---

## 9. Repositorio, despliegue y comandos

### GitHub

- Repositorio remoto: `https://github.com/Datnya/asistenciaAPM.git`
- Rama actual/productiva: `main`.
- Commit de referencia del snapshot: `f5ce5cd` (`feat(attendance): agiliza correcciones y horas históricas`).

### Vercel

Hay **dos proyectos Vercel distintos** conectados al mismo código. Ambos fueron desplegados con el mismo estado y respondían HTTP 200 en `/login` en este snapshot:

| Uso | URL |
|---|---|
| Enlace principal recomendado | `https://asistencia-apm.vercel.app/login` |
| Proyecto duplicado actual | `https://apmcontrodeasistencia.vercel.app/login` |

No son dos aplicaciones ni dos bases de datos. Para evitar confusión, usar el primer enlace. Eliminar el proyecto duplicado es una acción externa/destructiva que requiere aprobación explícita del owner.

En ambos proyectos deben existir, con valores correctos y secretos protegidos, las cuatro variables de la sección 5 en los scopes necesarios de Vercel (Development, Preview y Production). Si vuelve a aparecer “El acceso no está configurado”, revisar primero que `AUTH_USERNAME_DOMAIN` esté cargada en el scope del despliegue y redeployar.

### Desarrollo y verificación local

```powershell
npm install
npm run dev

npm run lint
npm run typecheck
npm test
npm run build
```

Para bootstrap de un primer ADMIN existe `npm run bootstrap:admin`; no incluir datos de acceso en scripts ni commits.

Verificaciones realizadas antes del último despliegue de aplicación:

- `npm run lint` ✓
- `npm run typecheck` ✓
- `npm test` ✓ (7 pruebas)
- `npm run build` ✓
- despliegue de los dos proyectos Vercel ✓
- `/login` en ambos aliases devolvió HTTP 200 ✓

---

## 10. Drift y precauciones para el siguiente cambio

1. Los encabezados de `00`, `03`, `04` y `05` todavía hablan de “pre-implementación” o “arquitectura objetivo”, pero el repositorio ya tiene MVP funcional. No reescribirlos sin una revisión consciente; cuando se actualicen, deben corroborarse contra código y BD.
2. `03-ARQUITECTURA.md` sección 19 contiene la fila “Admin corrige sin reason | bloquear”, que contradice la Constitución actual y la migración `20260910160000_make_admin_correction_reason_optional.sql`. La regla vigente es: **se permite corregir sin motivo manual y siempre se audita**.
3. `05-STACK-TECNOLOGICO.md` aún dice “operación atómica con `reason` + audit”; el campo `reason` es hoy nullable/compatibilidad, no requisito UI. La auditoría sí es obligatoria.
4. Antes de tocar jornadas, leer especialmente Constitución §§ 2.3, 2.4 y Arquitectura §§ 7–10: la diferencia ingreso/salida solo puede proponerse en histórica; jamás debe convertirse en cronómetro o reemplazar horas manuales live.
5. Antes de tocar Supabase: inspeccionar schema/policies reales, conservar migraciones, evitar cambios destructivos en producción y verificar role + `is_active` tanto en servidor como en DB.
6. Antes de tocar Excel: mantener el cálculo como `SUM(declared_minutes)` y el orden descendente por `work_date`; nunca usar fórmulas de ingreso/salida para definir horas.
7. Antes de tocar deploy: confirmar el proyecto Vercel objetivo para no seguir manteniendo accidentalmente los dos proyectos.

---

## 11. Checklist breve para retomar una tarea

```text
[ ] Leer los seis documentos canónicos en orden.
[ ] Identificar si la solicitud cambia una regla constitucional.
[ ] Si toca Supabase, revisar schema/RLS/migraciones reales antes de escribir SQL.
[ ] Mantener secretos y contraseñas fuera de UI, Git, logs y documentación.
[ ] Implementar el cambio mínimo necesario.
[ ] Ejecutar lint, typecheck, test y build.
[ ] Verificar los invariantes afectados y hacer UAT según rol/móvil o desktop.
[ ] Actualizar los documentos canónicos que realmente cambien.
[ ] Commit convencional, push y Preview; producción solo desde main.
```
