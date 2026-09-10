# APM Control — Arquitectura del Sistema

> **Versión:** 1.0.0 | **Última actualización:** 2026-09-09
> **Estado:** arquitectura objetivo pre-implementación. Este documento describe lo que Codex debe construir. Después del primer MVP debe sincronizarse contra el código y la BD reales.

---

## 1. Vista de alto nivel

```text
┌──────────────────────────────────────────────────────────────────────────┐
│                            APM CONTROL                                   │
│                                                                          │
│  ┌────────────────────────────────────────────────────────────────────┐  │
│  │                CAPA 1: PRESENTACIÓN — Next.js                     │  │
│  │                                                                    │  │
│  │   CONSULTOR                                ADMIN                   │  │
│  │   ┌─────────────────────┐                  ┌─────────────────────┐ │  │
│  │   │ Mi jornada          │                  │ Dashboard           │ │  │
│  │   │ Actividades         │                  │ Asistencias         │ │  │
│  │   │ Historial           │                  │ Usuarios            │ │  │
│  │   │ Horas acumuladas    │                  │ Clientes            │ │  │
│  │   └─────────────────────┘                  │ Reportes            │ │  │
│  │                                            └─────────────────────┘ │  │
│  └───────────────────────────────┬────────────────────────────────────┘  │
│                                  │                                       │
│                                  v                                       │
│  ┌────────────────────────────────────────────────────────────────────┐  │
│  │          CAPA 2: SERVIDOR — Next.js Server Actions/Routes         │  │
│  │                                                                    │  │
│  │  Auth username→alias   Admin users/passwords   Excel export       │  │
│  │  Validaciones          Correcciones auditadas  Session guards     │  │
│  └───────────────────────────────┬────────────────────────────────────┘  │
│                                  │                                       │
│                                  v                                       │
│  ┌────────────────────────────────────────────────────────────────────┐  │
│  │               CAPA 3: SUPABASE                                    │  │
│  │                                                                    │  │
│  │  Auth            PostgreSQL + RLS           Realtime              │  │
│  │  credenciales    perfiles/clientes          jornadas abiertas      │  │
│  │                  jornadas/actividades        dashboard admin       │  │
│  │                  auditoría                                         │  │
│  └────────────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────────────┘

GitHub = código + migraciones + estos docs
Vercel = aplicación desplegada + server runtime
Supabase = auth + datos reales
```

---

## 2. Fronteras del sistema

### 2.1 Lo que SÍ hace APM Control

- autentica `admin` y `consultant`;
- crea/desactiva usuarios;
- restablece contraseñas desde admin;
- crea/desactiva clientes;
- asigna varios clientes a un consultor;
- registra una jornada por fecha;
- captura ingreso y salida;
- captura actividades por área;
- captura horas confirmadas; en histórica propone la diferencia ingreso/salida y permite edición manual;
- solicita geolocalización sin bloquear;
- muestra historial y acumulado al consultor;
- muestra actividad actual al admin;
- corrige con auditoría y elimina asistencias únicamente desde ADMIN;
- exporta Excel filtrado o global.

### 2.2 Lo que NO hace en el MVP

- pagos;
- planillas/nómina;
- cálculo automático de horas laborales;
- cronómetro;
- descuentos automáticos de almuerzo;
- vacaciones/permisos/licencias;
- firma digital;
- reconocimiento facial;
- geofencing;
- reverse geocoding;
- app nativa iOS/Android;
- email transaccional;
- notificaciones push;
- rol gerencia;
- dos clientes en un mismo día;
- jornadas overnight;
- IA.

---

## 3. Estructura objetivo de aplicación

La estructura exacta puede ajustarse a convenciones de Next.js 16, pero estas responsabilidades deben mantenerse.

```text
src/
├── app/
│   ├── (public)/
│   │   └── login/
│   │       └── page.tsx
│   │
│   ├── (consultant)/
│   │   └── consultant/
│   │       ├── page.tsx                 # estado/jornada actual
│   │       ├── profile/
│   │       │   └── page.tsx             # perfil propio solo lectura
│   │       ├── history/
│   │       │   └── page.tsx
│   │       └── history/[id]/
│   │           └── page.tsx
│   │
│   ├── (admin)/
│   │   └── admin/
│   │       ├── page.tsx                 # dashboard
│   │       ├── profile/page.tsx          # perfil propio administrativo
│   │       ├── consultants/[id]/page.tsx # detalle de consultor
│   │       ├── attendance/
│   │       │   ├── page.tsx
│   │       │   └── [id]/page.tsx
│   │       ├── users/page.tsx
│   │       ├── clients/page.tsx
│   │       └── reports/page.tsx
│   │
│   └── api/
│       ├── auth/login/route.ts           # si se opta por route sobre server action
│       ├── admin/users/...               # operaciones Auth privilegiadas
│       └── reports/attendance/route.ts   # xlsx server-side
│
├── components/
│   ├── ui/                               # shadcn
│   ├── auth/
│   ├── consultant/
│   ├── admin/
│   └── shared/
│
├── lib/
│   ├── supabase/
│   │   ├── browser.ts
│   │   ├── server.ts
│   │   └── admin.ts                      # SERVER ONLY
│   ├── auth/
│   │   ├── username.ts                   # normalización + alias interno
│   │   └── guards.ts
│   ├── attendance/
│   │   ├── hours.ts                      # HH:MM <-> minutos
│   │   ├── areas.ts
│   │   └── validation.ts
│   ├── reports/
│   │   └── attendance-xlsx.ts
│   └── geo/
│       └── types.ts
│
└── types/
    └── database.ts

supabase/
├── migrations/
└── tests/                                # SQL/invariantes cuando aplique

public/
└── branding/
    └── apm-logo.*                        # asset oficial cuando se proporcione
```

**No crear capas vacías “por arquitectura limpia”.** Cada carpeta debe existir porque tiene un consumidor real.

---

## 4. Autenticación y sesiones

### 4.1 UX de login

El usuario ve únicamente:

```text
APM Control

Usuario
[ patricia.romero ]

Contraseña
[ •••••••••••• ]

[ Ingresar ]
```

No aparece campo email, enlace “olvidé mi contraseña” ni registro.

### 4.2 Cómo usar username con Supabase Auth

Supabase Auth administra la contraseña. APM Control mantiene un `username` humano y genera un **alias email técnico** únicamente para Auth.

Concepto:

```text
username visible:     patricia.romero
normalizado:          patricia.romero
AUTH_USERNAME_DOMAIN: dominio técnico configurado en servidor
alias interno:        patricia.romero@<AUTH_USERNAME_DOMAIN>
```

Reglas:

1. El dominio técnico viene de env var; no se codifica como dato de negocio.
2. El alias no se muestra en UI ni reportes.
3. El login transforma username→alias y ejecuta Auth password sign-in.
4. Al editar username, admin actualiza de forma coordinada:
   - alias de `auth.users`;
   - `profiles.username`.
5. Si la actualización de Auth falla, no se considera actualizado el username.
6. No se envían correos a estos aliases.
7. Las cuentas se crean con email técnico confirmado desde Admin API.

### 4.3 Contraseñas

- solo Supabase Auth guarda/verifica password;
- `profiles` no tiene columna password;
- admin crea una password inicial;
- admin puede establecer una nueva password;
- admin nunca obtiene la password actual;
- consultant no tiene endpoint/UI para cambiarla;
- passwords nunca se imprimen en logs.

### 4.4 Primer admin

Existe un problema circular: un admin crea usuarios, pero al inicio no existe ninguno.

Solución canónica:

```text
scripts/bootstrap-admin.ts
```

Debe:

1. ejecutarse local/server-side con secret key;
2. recibir nombre, username y password sin versionarlos;
3. crear Auth user;
4. crear profile con `role='admin'`;
5. confirmar que ambos existen;
6. ser idempotente respecto del username o fallar claramente;
7. no ser una ruta pública del producto.

### 4.5 Autoridad de rol y estado

- `auth.users.id` = identidad técnica.
- `auth.users.app_metadata.role` = rol autorizado (`admin` / `consultant`).
- `profiles.role` = espejo operativo mantenido por servidor para listados/joins; el usuario no lo modifica.
- `profiles.is_active` = estado operativo de acceso y debe ser consultado también por RLS.

No autorizar usando `role` recibido del browser ni usando solo el espejo de UI.

### 4.6 Usuario inactivo

Después de autenticar:

```text
Auth OK
  -> leer profile por auth.uid()
  -> ¿profile.is_active?
       no -> cerrar/rechazar sesión
       sí -> continuar
```

RLS de las tablas de negocio también debe verificar `is_active`, para que una sesión antigua no sea suficiente para seguir operando.

### 4.7 Routing por rol

```text
login OK
  |
  v
app_metadata.role
  |
  +-- admin ------> /admin
  |
  +-- consultant -> /consultant
```

Si consultant escribe `/admin` manualmente, debe recibir redirect/forbidden sin datos.

La vista `/consultant/profile` es informativa salvo por la foto de perfil: el propio consultor puede reemplazarla y ajustarla antes de guardarla. No expone edición de username, rol, estado, DNI, celular ni contraseña; esas operaciones permanecen exclusivamente bajo administración.

---

## 5. Modelo de datos canónico

> Los nombres son parte del contrato inicial. Si durante implementación aparece una razón fuerte para cambiarlos, actualizar este documento antes/junto al código.

### 5.1 `profiles`

Identidad de producto asociada 1:1 a Supabase Auth.

| Columna | Tipo conceptual | Regla |
|---------|-----------------|-------|
| `user_id` | uuid PK/FK | = `auth.users.id` |
| `username` | text/citext unique | normalizado, no vacío |
| `first_name` | text | obligatorio |
| `last_name` | text | obligatorio |
| `role` | enum | espejo de `app_metadata.role`; server-maintained |
| `is_active` | boolean | default true |
| `dni` | text nullable | DNI peruano de 8 dígitos; único cuando se registra |
| `phone_number` | text nullable | celular peruano de 9 dígitos, empieza por 9 |
| `avatar_path` | text nullable | ruta de foto de perfil en Storage privado |
| `created_at` | timestamptz | server |
| `updated_at` | timestamptz | server |

No almacenar email técnico como dato de UI salvo necesidad operativa futura.

### 5.2 `clients`

| Columna | Tipo conceptual | Regla |
|---------|-----------------|-------|
| `id` | uuid PK | generado |
| `name` | text | obligatorio, unique razonable |
| `is_active` | boolean | default true |
| `created_at` | timestamptz | server |
| `updated_at` | timestamptz | server |

No hard-delete si tiene asignaciones/jornadas.

### 5.3 `consultant_client_assignments`

| Columna | Tipo conceptual | Regla |
|---------|-----------------|-------|
| `id` | uuid PK | generado |
| `consultant_user_id` | uuid FK profiles | debe ser consultant |
| `client_id` | uuid FK clients | cliente |
| `is_active` | boolean | asignación visible/usable |
| `created_at` | timestamptz | server |

Constraint único por `(consultant_user_id, client_id)`.

Un consultant puede tener N clientes asignados. Una jornada selecciona solo 1.

### 5.4 `attendance_sessions`

Tabla principal de jornadas.

| Columna | Tipo conceptual | Regla |
|---------|-----------------|-------|
| `id` | uuid PK | generado |
| `consultant_user_id` | uuid FK | dueño |
| `client_id` | uuid FK | 1 cliente |
| `work_date` | date | ≤ fecha actual Lima |
| `record_mode` | enum | `live` / `historical` |
| `status` | enum | `open` / `closed`; `voided` queda solo como compatibilidad de datos heredados y no se genera en el flujo actual |
| `entry_time` | time | horario de negocio |
| `entry_recorded_at` | timestamptz | cuándo servidor recibió/confirmó ingreso live |
| `entry_latitude` | numeric nullable | solo live si granted |
| `entry_longitude` | numeric nullable | solo live si granted |
| `entry_accuracy_m` | numeric nullable | precisión browser |
| `entry_location_status` | enum nullable | `granted/denied/unavailable/timeout` |
| `exit_time` | time nullable | requerido al cerrar |
| `exit_recorded_at` | timestamptz nullable | cuándo servidor confirmó salida live |
| `exit_latitude` | numeric nullable | live |
| `exit_longitude` | numeric nullable | live |
| `exit_accuracy_m` | numeric nullable | live |
| `exit_location_status` | enum nullable | estado captura |
| `declared_minutes` | integer nullable | requerido al cerrar; 1..1440 |
| `submission_latitude` | numeric nullable | histórica: ubicación de envío |
| `submission_longitude` | numeric nullable | histórica |
| `submission_accuracy_m` | numeric nullable | histórica |
| `submission_location_status` | enum nullable | histórica |
| `closed_at` | timestamptz nullable | server |
| `voided_at` | timestamptz nullable | campo heredado; no se usa en nuevas operaciones |
| `created_at` | timestamptz | server |
| `updated_at` | timestamptz | server |

#### Índices/constraints obligatorios

```text
UNIQUE parcial:
(consultant_user_id, work_date)
WHERE status <> 'voided' (compatibilidad con registros heredados; los nuevos registros se eliminan físicamente)

UNIQUE parcial:
(consultant_user_id)
WHERE status = 'open'

TRIGGER/validación server: work_date no puede ser futura en America/Lima
CHECK declared_minutes IS NULL OR 1..1440
CHECK closed => exit_time NOT NULL
CHECK closed => declared_minutes NOT NULL
No se permiten nuevas anulaciones: un ADMIN elimina físicamente tras confirmar.
```

La validación de “cliente asignado” puede necesitar trigger/RPC/server validation porque cruza tablas. Debe existir en servidor aunque la UI filtre el dropdown.

### 5.5 `attendance_activities`

| Columna | Tipo conceptual | Regla |
|---------|-----------------|-------|
| `id` | uuid PK | generado |
| `session_id` | uuid FK | jornada |
| `area_code` | enum/text | catálogo canónico |
| `other_area_name` | text nullable | obligatorio si `area_code='other'` |
| `description` | varchar(250) | 1..250 chars |
| `created_at` | timestamptz | técnico; NO se muestra como hora de reunión |
| `updated_at` | timestamptz | técnico |

No hay campo de “hora de actividad”.

### 5.6 `attendance_audit_log`

Append-only.

| Columna | Tipo conceptual | Regla |
|---------|-----------------|-------|
| `id` | uuid PK | generado |
| `attendance_session_id` | uuid FK | jornada afectada |
| `actor_user_id` | uuid FK | admin que cambió |
| `action` | enum/text | `update`, `admin_close`, etc. |
| `before_data` | jsonb | snapshot previo relevante |
| `after_data` | jsonb | snapshot posterior relevante |
| `reason` | text nullable | no requerido; se conserva para compatibilidad |
| `created_at` | timestamptz | server |

No UPDATE ni DELETE aislado desde el producto. La única excepción es eliminar, junto con su jornada y actividades, la auditoría asociada cuando ADMIN confirma la eliminación física.

---

## 6. Catálogo de áreas

Fuente canónica inicial:

```ts
[
  { code: 'management', label: 'Gerencia' },
  { code: 'quality', label: 'Calidad' },
  { code: 'operations', label: 'Operaciones' },
  { code: 'human_resources', label: 'Recursos Humanos' },
  { code: 'sst', label: 'SST' },
  { code: 'logistics', label: 'Logística' },
  { code: 'administration', label: 'Administración' },
  { code: 'finance', label: 'Finanzas' },
  { code: 'commercial', label: 'Comercial' },
  { code: 'production', label: 'Producción' },
  { code: 'other', label: 'Otro' }
]
```

En el MVP puede vivir como constante tipada en código + constraint de DB compatible. No hace falta tabla editable si el admin no necesita gestionar el catálogo.

---

## 7. Semántica temporal — regla crítica

APM Control maneja **dos tipos de tiempo** que nunca deben mezclarse.

### 7.1 Tiempo de negocio

Lo que el consultor declara:

```text
work_date   = 2026-09-09
entry_time  = 08:10
exit_time   = 17:30
```

Describe la jornada reportada.

### 7.2 Tiempo técnico

Lo que el servidor registra:

```text
created_at
entry_recorded_at
exit_recorded_at
closed_at
audit.created_at
```

Describe cuándo ocurrió una acción dentro del sistema.

### 7.3 Horas computables

Tercera dimensión independiente:

```text
declared_minutes = 480
UI = 08:00
```

En jornada actual, **nunca**:

```text
declared_minutes = exit_time - entry_time
```

Ejemplo válido:

```text
Ingreso:             08:00
Salida:              17:30
Diferencia reloj:     9:30    # dato derivable, NO usado
Horas declaradas:     8:00    # 480 min, sí suma
```

En jornada histórica, la diferencia ingreso/salida prellena `HH:MM` como propuesta; el consultor puede editarla antes de guardar y el valor confirmado es el que suma.

---

## 8. Flujo principal — jornada actual

### 8.1 Estado inicial

Al entrar `/consultant`:

1. verificar sesión;
2. verificar profile active + consultant;
3. buscar jornada `open` del usuario;
4. si existe, mostrar esa jornada;
5. si no existe, permitir iniciar hoy o ir a registro histórico.

### 8.2 Inicio de jornada live

Formulario mínimo:

```text
Fecha:    [ hoy, no futura ]
Cliente:  [ cliente asignado ]
Ingreso:  [ HH:MM ]

[ Registrar ingreso ]
```

Para hoy, `entry_time` puede precargarse con hora local Lima, pero el consultor puede ajustarla **antes de confirmar**.

Confirmación profesional:

```text
Confirmar inicio de jornada

Registrarás tu ingreso para hoy a las 08:10 a. m.
en Cliente ABC.

Después de confirmar, no podrás modificar la hora de ingreso.

[Cancelar] [Confirmar ingreso]
```

Al confirmar:

1. intentar geolocalización;
2. si granted, guardar coords + accuracy;
3. si denied/unavailable/timeout, guardar status y continuar;
4. servidor crea `attendance_sessions(status='open', record_mode='live')`;
5. `entry_recorded_at=server now`.

### 8.3 Jornada abierta

UI:

```text
Jornada de hoy
Cliente ABC
Ingreso 08:10

Actividades
[ + Registrar actividad ]

Calidad
Revisión de indicadores del sistema de gestión
[Editar] [Eliminar]

SST
Revisión de acciones pendientes
[Editar] [Eliminar]

[ Registrar salida ]
```

No mostrar contador.

### 8.4 Actividad

```text
Área *
[ Calidad v ]

Descripción *
[ Revisión de indicadores... ]
0/250

[ Guardar actividad ]
```

Si área=`Otro`:

```text
Área específica *
[ Mantenimiento ]
```

Mientras sesión=`open`, consultant puede INSERT/UPDATE/DELETE sus actividades de esa sesión.

### 8.5 Cierre

Requisitos previos:

```text
session.status == open
activities.count >= 1
exit_time válido
exit_time >= entry_time
declared HH:MM válido > 00:00 y <= 24:00
```

Formulario:

```text
Hora de salida *
[ 17:30 ]

Horas realizadas *
[ 08 : 00 ]

Estas horas son declaradas por ti y serán las que sumen al reporte.
```

Confirmación:

```text
Confirmar cierre de jornada

Registrarás tu jornada de hoy:
Ingreso: 08:10 a. m.
Salida:  05:30 p. m.
Horas declaradas: 08 h 00 min

Una vez confirmada, no podrás modificar esta información.

¿Deseas cerrar y registrar la jornada?

[Cancelar] [Confirmar salida]
```

Al confirmar:

1. solicitar geolocalización de salida;
2. ejecutar operación server-side/transaccional de cierre;
3. revalidar que hay actividades;
4. guardar salida + declared_minutes + geo status;
5. `status='closed'`;
6. `closed_at=server now`;
7. UI pasa a resumen solo lectura.

---

## 9. Jornada histórica

Una fecha pasada no usa el flujo “dejar jornada abierta”. Se registra completa porque la actividad ya ocurrió.

Formulario:

```text
Fecha *             [ 08/09/2026 ]
Cliente *           [ Cliente ABC ]
Hora ingreso *      [ 08:00 ]

Actividades *
  - Calidad / Revisión de indicadores
  - Gerencia / Presentación de avances

Hora salida *       [ 17:15 ]
Horas realizadas * [ 09:15 calculadas ] [ Colocar manualmente las horas ]

[ Registrar jornada anterior ]
```

Antes de enviar, modal de confirmación con todos los datos principales.

Al confirmar:

```text
record_mode = historical
status = closed
work_date = fecha elegida
entry_time/exit_time = horarios declarados
created_at/closed_at = ahora técnico
entry_recorded_at = NULL
exit_recorded_at = NULL
submission_location_* = ubicación actual si disponible
```

**Nunca copiar `created_at` hacia la fecha histórica.**

Si ya existe una jornada para esa fecha, bloquear.

Si existe cualquier jornada `open` del consultor, primero debe cerrarse/resolverse.

---

## 10. Jornada pendiente

Si el consultant tiene una sesión `open`:

```text
Tienes una jornada pendiente de cierre
8 de septiembre de 2026 · Cliente ABC
Ingreso registrado: 08:05 a. m.

Debes cerrar esta jornada antes de registrar una nueva.

[ Continuar jornada ]
```

No ofrecer “crear otra”.

El admin puede cerrar la jornada desde detalle administrativo si el consultant lo solicita. Debe ingresar salida y horas declaradas si faltan; la operación queda auditada.

---

## 11. Historial del consultor

### 11.1 Tarjetas

```text
Horas acumuladas
74 h 30 min

Jornadas registradas
10
```

`Horas acumuladas` = `SUM(declared_minutes)` de jornadas `closed` existentes.

### 11.2 Tabla/listado

```text
09/09/2026  Cliente A  08:10 - 17:30  08:00
05/09/2026  Cliente B  09:00 - 16:30  07:00
```

En móvil puede ser cards; en desktop tabla.

### 11.3 Detalle

Solo lectura:

- fecha;
- cliente;
- ingreso;
- salida;
- horas declaradas;
- actividades;
- estado;
- incidencia de ubicación si aplica.

No mostrar botones de edición en closed.

---

## 12. Panel admin

### 12.1 Navegación

```text
Dashboard
Asistencias
Usuarios
Clientes
Reportes
```

### 12.2 Dashboard

Indicadores mínimos:

```text
Consultores trabajando ahora
Jornadas finalizadas hoy
Jornadas pendientes
Horas declaradas este mes
```

“Trabajando ahora” = sesiones `open` con `record_mode='live'`.

Listado:

```text
Patricia Romero
Cliente ABC
Ingreso 08:10
Estado: En jornada
```

No mostrar contador transcurrido; sería inconsistente con la Constitución. Puede mostrar hora de ingreso sin derivar “horas trabajadas”.

### 12.3 Asistencias

Filtros:

- consultor;
- cliente;
- mes;
- rango de fechas;
- estado.

Columnas desktop:

```text
Fecha | Consultor | Cliente | Ingreso | Salida | Horas declaradas | Estado
```

Detalle incluye actividades y geolocalización administrativa.

### 12.4 Usuarios

Acciones:

```text
Crear nuevo usuario
Editar nombre
Editar username
Restablecer contraseña
Activar / desactivar
Asignar clientes (consultant)
```

Creación:

```text
Nombre completo
DNI
Número de celular
Username sugerido
Contraseña inicial
Cliente asignado (para consultor)
Foto de perfil opcional y ajustable
```

El username sugerido puede ser `nombre.apellido`; si existe, sugerir sufijo (`nombre.apellido2`).

La foto se procesa en el navegador a JPG cuadrado antes del envío y se almacena en un bucket privado de Supabase Storage. Solo el propio usuario autenticado o una cuenta ADMIN pueden solicitarla mediante el servidor; nunca se usa una URL pública.

### 12.5 Clientes

Acciones:

```text
Crear
Editar nombre
Activar/desactivar
Ver consultores asignados
Asignar/desasignar consultores
```

Un cliente inactivo no aparece en nuevas jornadas, pero sí en historial.

---

## 13. Correcciones administrativas

### 13.1 Qué puede corregir admin

En una jornada, admin puede corregir:

- fecha;
- cliente;
- ingreso;
- salida;
- horas declaradas;
- actividades;
- cierre pendiente;
- eliminación física con confirmación explícita.

Debe respetar invariantes: no crear duplicados, no fecha futura, cliente válido, etc.

### 13.2 Modal

```text
Modificar registro

Valor actual:  08:30
Nuevo valor:   08:00

[Cancelar] [Guardar modificación]
```

### 13.3 Transaccionalidad

Las correcciones no deben depender de “UPDATE y luego INSERT audit” desde el browser.

Implementar una operación server-side/DB transaccional que:

1. compruebe identidad admin;
2. lea estado anterior;
3. valide nuevo estado;
4. actualice jornada/actividades;
5. inserte audit log;
6. haga commit como una sola unidad.

Puede ser una RPC PostgreSQL segura o una ruta server-side que invoque una función SQL transaccional. Preferir que la atomicidad viva en DB.

### 13.4 Eliminación de asistencia

Solo ADMIN puede eliminar una asistencia. Antes de eliminar:

```text
mostrar confirmación explícita
explicar que la eliminación es irreversible
eliminar actividades y auditoría asociada junto con la jornada
```

Una jornada eliminada deja de existir en días, horas, historial y reportes.

---

## 14. RLS y autorización

### 14.1 Principio

Cada tabla de negocio tiene RLS habilitado.

La UI oculta opciones por UX; RLS protege datos.

### 14.2 Matriz conceptual

| Tabla | Consultant | Admin |
|-------|------------|-------|
| `profiles` | leer propio perfil mínimo | leer perfiles; writes sensibles vía server admin |
| `clients` | leer activos asignados | CRUD lógico |
| `consultant_client_assignments` | leer propias activas | gestionar |
| `attendance_sessions` | leer propias; crear; cerrar propia abierta bajo reglas | leer todas; correcciones vía operación admin |
| `attendance_activities` | CRUD propias solo si sesión open | leer/corregir con auditoría |
| `attendance_audit_log` | sin acceso directo o solo lo estrictamente decidido | lectura admin; insert solo mecanismo auditado |

### 14.3 Estado activo

Toda policy relevante de consultant debe incorporar que su profile está activo.

### 14.4 Admin operations con Auth

Crear usuario, cambiar username técnico y restablecer password requieren cliente Supabase con secret key.

Flujo obligatorio:

```text
browser request
  -> Next.js server
  -> validar sesión solicitante
  -> validar app_metadata.role=admin + profile.is_active
  -> recién entonces usar Supabase admin client
```

No confiar en `role='admin'` enviado en body.

---

## 15. Realtime

Objetivo: que admin vea cambios de jornadas sin recargar.

Subscripciones mínimas:

- `attendance_sessions` INSERT/UPDATE;
- opcionalmente `attendance_activities` para refrescar detalle activo.

Realtime es **mejora de sincronización**, no fuente de verdad. Si se desconecta, al recargar/query debe verse el estado correcto desde PostgreSQL.

No construir lógica de negocio que solo exista dentro de un evento Realtime.

---

## 16. Geolocalización

### 16.1 Jornada live

Entrada y salida llaman `navigator.geolocation.getCurrentPosition` con timeout razonable.

Resultados normalizados:

```text
granted
permission_denied
position_unavailable
timeout
unsupported
```

Mapear a enum DB estable.

### 16.2 No bloqueante

Si falla:

```text
Ubicación no disponible
Tu asistencia se registrará igualmente.
```

El registro continúa.

### 16.3 Privacidad funcional

- no seguimiento continuo;
- no background location;
- no ruta del consultor durante el día;
- no geofence;
- no dirección inferida;
- solo captura puntual en acciones explícitas.

### 16.4 Histórico

Solo `submission_location_*` porque la ubicación actual no prueba el pasado.

---

## 17. Reportes Excel

### 17.1 Desde admin

Filtros combinables:

```text
Consultor: todos / uno
Cliente: todos / uno
Mes
Rango de fechas
Estado: closed por defecto
```

Dos modos:

```text
A) un consultor
B) todos los consultores
```

### 17.2 Workbook

Hoja 1: `Resumen`

Para export individual:

```text
APM Group
Reporte de Asistencia
Consultor: Patricia Romero
Periodo: Septiembre 2026

Días trabajados: 12
Horas declaradas: 94 h 30 min
Clientes atendidos: 2
```

Para global:

```text
Consultor | Días trabajados | Horas declaradas | Clientes
```

Hoja 2: `Detalle`

```text
Fecha
Consultor
Cliente
Hora ingreso
Hora salida
Horas declaradas
Áreas
Detalle de actividades
Estado
```

`Áreas` puede concatenar labels únicos para lectura rápida.

`Detalle de actividades` concatena cada actividad de forma legible, sin perder descripción.

### 17.3 Cálculo

```text
Total horas = SUM(attendance_sessions.declared_minutes WHERE status='closed')
```

No derivar de entry/exit.

### 17.4 Branding

- logo APM en cabecera si asset disponible;
- verde `#B0BF12`;
- negro/blanco;
- títulos claros;
- columnas legibles;
- freeze header;
- filtros/autofilter si aporta utilidad;
- formato de horas humano (`94 h 30 min`) y/o Excel duration consistente.

### 17.5 Generación

Server-side con ExcelJS. El browser recibe `.xlsx` descargable.

La exportación no crea un “registro paralelo”; consulta DB en ese momento.

---

## 18. Validaciones canónicas

### 18.1 Username

- trim;
- lowercase;
- normalizar espacios;
- permitir patrón simple seguro (`a-z`, `0-9`, `.`, `_`, `-`);
- longitud razonable;
- unique case-insensitive.

### 18.2 Horas declaradas

UI acepta `HH:MM`.

Ejemplos válidos:

```text
00:30
07:45
08:00
12:15
24:00
```

Inválidos:

```text
8 horas
8.5
08:75
-01:00
25:00
00:00
```

Conversión única:

```ts
minutes = hours * 60 + minutes
```

### 18.3 Actividades

```text
area requerido
other_area requerido iff area=other
description.trim length 1..250
```

### 18.4 Fechas

La fecha de negocio se interpreta en `America/Lima`.

No usar `new Date().toISOString().slice(0,10)` sin considerar UTC, porque cerca de medianoche puede producir fecha distinta a Lima.

---

## 19. Casos límite obligatorios

| Caso | Resultado |
|------|-----------|
| Consultant intenta segunda jornada misma fecha | bloquear |
| Consultant tiene open ayer e intenta hoy | mostrar pendiente; bloquear nueva |
| Fecha futura | bloquear |
| GPS rechazado | guardar incidencia y continuar |
| GPS unsupported | guardar incidencia y continuar |
| Cierra sin actividad | bloquear |
| `Otro` sin nombre | bloquear |
| Descripción >250 | bloquear |
| Consultant intenta editar closed | 403/denegado aunque manipule request |
| Admin corrige sin reason | bloquear |
| Usuario desactivado con sesión vieja | acceso denegado |
| Cliente desactivado con jornada histórica | historial sigue legible |
| Assignment desactivado | no aparece para nuevas jornadas |
| Dos taps rápidos en “Registrar ingreso” | DB evita duplicado |
| Dos tabs intentan abrir jornada | DB evita segunda open |
| Excel individual sin datos | generar reporte vacío informativo o bloquear con mensaje claro; no fallar |
| Alias username duplicado | creación falla/sugiere sufijo |
| Admin cambia username | Auth alias + profile quedan consistentes |

---

## 20. Observabilidad mínima

Para MVP:

- Vercel logs para errores server-side;
- errores de UI presentados con mensajes claros;
- no loguear passwords/tokens/coordenadas completas salvo diagnóstico controlado;
- errores de Excel retornan respuesta clara;
- fallos de Realtime no impiden consulta normal;
- errores de geolocalización son estado de negocio, no excepción fatal.

Eventos útiles sin analytics externo:

```text
user_created
user_deactivated
attendance_started
attendance_closed
attendance_historical_created
attendance_admin_corrected
attendance_deleted
report_exported
```

No hace falta crear una plataforma de analytics en el MVP.

---

## 21. Escalabilidad

Con ~5 consultores iniciales, optimizar para corrección y simplicidad, no para millones de eventos.

Diseños que sí deben ser correctos desde el inicio:

- índices por consultant/date/status;
- índices por client/date para reportes;
- RLS;
- queries paginadas en históricos/admin;
- Excel generado en servidor;
- audit append-only salvo eliminación física confirmada de su jornada por ADMIN.

No introducir Redis, colas, microservicios ni workers sin evidencia de necesidad.

---

## 22. Criterio de “MVP terminado”

APM Control está funcionalmente listo cuando:

```text
[ ] admin bootstrap funciona
[ ] admin crea admin/consultant
[ ] admin desactiva usuario
[ ] admin restablece password
[ ] admin crea/asigna clientes
[ ] consultant login por username
[ ] consultant inicia jornada actual
[ ] geo granted y denied funcionan
[ ] consultant CRUD actividades solo open
[ ] salida exige actividad
[ ] declared_minutes manda sobre entry/exit
[ ] consultant registra histórico
[ ] consultant ve historial/acumulado
[ ] jornada abierta bloquea nueva
[ ] admin ve jornadas activas
[ ] admin filtra historial
[ ] admin corrige con audit
[ ] admin elimina asistencia con confirmación explícita
[ ] Excel individual funciona
[ ] Excel global funciona
[ ] branding APM aplicado
[ ] móvil real probado
[ ] desktop probado
[ ] RLS adversarial probado
[ ] Production sale desde main
```
