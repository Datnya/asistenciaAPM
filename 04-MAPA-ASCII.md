# APM Control — Mapa ASCII

> **Versión:** 1.0.0 | **Última actualización:** 2026-09-09
> Vista panorámica del diseño objetivo de APM Control. Este documento no reemplaza `03-ARQUITECTURA.md`; sirve para orientarse rápido.

---

## 1. Vista de alto nivel

```text
                    +----------------------+
                    |      APM GROUP       |
                    |     APM CONTROL      |
                    +----------+-----------+
                               |
             +-----------------+-----------------+
             |                                   |
             v                                   v
    +------------------+                +------------------+
    |    CONSULTOR     |                |      ADMIN       |
    | celular / PC     |                |   PC / celular   |
    +--------+---------+                +--------+---------+
             |                                   |
             | Next.js UI                        | Next.js UI
             +-----------------+-----------------+
                               |
                               v
                    +----------+-----------+
                    |  NEXT.JS EN VERCEL   |
                    | server actions/routes|
                    +----------+-----------+
                               |
                 +-------------+--------------+
                 |                            |
                 v                            v
        +------------------+         +--------------------+
        |  SUPABASE AUTH   |         | SUPABASE POSTGRES |
        | usuario/password |         | RLS + Realtime     |
        +------------------+         +--------------------+

GitHub
  |
  +-- código
  +-- migraciones SQL
  +-- APM-Control-DOCS
  `-- NO datos reales
```

---

## 2. Documentación — mapa mental

```text
00-INDICE
   |
   +--> 01-CONSTITUCION
   |       "qué no se rompe"
   |
   +--> 02-GOBERNANZA
   |       "cómo se cambia"
   |
   +--> 03-ARQUITECTURA
   |       "cómo funciona"
   |
   +--> 04-MAPA-ASCII
   |       "cómo se ve de un vistazo"
   |
   `--> 05-STACK-TECNOLOGICO
           "con qué se construye y por qué"
```

No hay docs por feature.

---

## 3. Árbol de pantallas objetivo

```text
/
|
`-- /login

/authenticated
|
+-- [CONSULTANT]
|   `-- /consultant
|       |
|       +-- estado sin jornada
|       +-- jornada abierta
|       +-- resumen jornada cerrada
|       +-- registrar jornada histórica
|       |
|       `-- /consultant/history
|           `-- /consultant/history/[id]
|
`-- [ADMIN]
    `-- /admin
        |
        +-- dashboard
        +-- attendance
        |   `-- attendance/[id]
        +-- users
        +-- clients
        `-- reports
```

En móvil las rutas no cambian; cambia el layout.

---

## 4. Auth — decisión de acceso

```text
+---------------------+
| Usuario + password  |
+----------+----------+
           |
           v
+-----------------------------+
| normalizar username         |
| ej: patricia.romero         |
+--------------+--------------+
               |
               v
+-----------------------------+
| crear alias Auth interno    |
| username@<auth-domain>      |
+--------------+--------------+
               |
               v
+-----------------------------+
| Supabase Auth               |
| signInWithPassword          |
+--------------+--------------+
               |
          auth OK?
        /          \
      no            sí
      |              |
      v              v
 [error login]   +----------------+
                 | leer profile   |
                 +-------+--------+
                         |
                    is_active?
                   /         \
                 no           sí
                 |             |
                 v             v
             [denegar]       role?
                            /     \
                         admin   consultant
                           |        |
                           v        v
                       /admin   /consultant
```

---

## 5. Creación de usuario admin

```text
ADMIN UI
   |
   v
[Crear nuevo usuario]
   |
   +-- nombre
   +-- apellido
   +-- username
   +-- password inicial
   `-- role
        |
        v
NEXT.JS SERVER
   |
   +-- verificar requester auth
   +-- verificar requester = admin activo
   +-- normalizar username
   +-- construir alias interno
   |
   v
SUPABASE ADMIN AUTH
   |
   +-- create auth user
   `-- password queda en Auth, NO en profiles
        |
        v
POSTGRES profiles
        |
        `-- user_id + username + nombre + role + active
```

Bootstrap inicial:

```text
scripts/bootstrap-admin.ts
        |
        `--> mismo resultado, sin ruta pública
```

---

## 6. Clientes y asignaciones

```text
                  +------------------+
                  |     CLIENTE      |
                  +--------+---------+
                           |
                           | N
                           |
                           v
                +---------------------+
                | consultant_client_  |
                | assignments         |
                +----------+----------+
                           |
                           | N
                           v
                  +------------------+
                  |    CONSULTOR     |
                  +------------------+
```

Ejemplo:

```text
Patricia
  +-- Cliente A
  +-- Cliente B
  `-- Cliente C

Jornada 09/09
  `-- SOLO Cliente B
```

---

## 7. Jornada actual — flujo completo

```text
[Consultant entra]
        |
        v
[¿existe jornada OPEN?]
      /     \
    sí       no
    |         |
    v         v
[continuar]  [iniciar hoy]
              |
              +-- cliente
              +-- ingreso HH:MM
              |
              v
        [confirmar ingreso]
              |
              v
     [solicitar ubicación]
       /       |       \
 granted    denied   unavailable
    |          |          |
    +----------+----------+
               |
               v
        [crear OPEN]
               |
               v
     +---------------------+
     |  JORNADA EN CURSO   |
     +----------+----------+
                |
                +--> [+ actividad]
                |       |
                |       +-- área
                |       +-- si Otro: especificar
                |       `-- descripción <=250
                |
                +--> [editar actividad]
                |
                +--> [eliminar actividad]
                |
                `--> [registrar salida]
                         |
                         v
                 ¿hay >=1 actividad?
                    /          \
                  no            sí
                  |              |
                  v              v
               [bloquear]   salida HH:MM
                            horas HH:MM
                                 |
                                 v
                          [confirmación final]
                                 |
                                 v
                         [solicitar ubicación]
                                 |
                                 v
                       [cerrar transaccional]
                                 |
                                 v
                            status=CLOSED
                                 |
                                 v
                          [solo lectura]
```

**Nunca aparece un contador.**

---

## 8. Horas — mapa de la regla más importante

```text
             INGRESO 08:00
                  |
                  |          SALIDA 17:30
                  |                |
                  +--------+-------+
                           |
                           v
                  diferencia = 09:30
                           |
                           +--> jornada actual: NO SE USA
                           |
                           `--> jornada histórica: propuesta editable

CONSULTOR declara: 08:00
          |
          v
HH:MM -> minutos
08:00 -> 480
          |
          +--> tarjeta acumulado
          +--> resumen mensual
          +--> Excel
          `--> dashboard admin
```

Si alguien implementa:

```text
horas = salida - ingreso
```

la implementación viola la Constitución si se aplica a jornada actual o reemplaza una edición manual histórica.

---

## 9. Actividades — estructura

```text
JORNADA
  |
  +-- Actividad #1
  |     Área: Calidad
  |     Descripción: Revisión de indicadores
  |
  +-- Actividad #2
  |     Área: SST
  |     Descripción: Seguimiento de acciones
  |
  `-- Actividad #3
        Área: Otro
        Área específica: Mantenimiento
        Descripción: Revisión de procedimiento
```

No existe:

```text
hora de actividad
cronómetro por actividad
tiempo por actividad
```

---

## 10. Jornada histórica

```text
[Registrar jornada anterior]
          |
          +-- fecha pasada
          +-- cliente
          +-- ingreso
          +-- N actividades
          +-- salida
          `-- horas declaradas
                 |
                 v
          [confirmación única]
                 |
                 v
         [geo actual opcional]
                 |
                 v
    +----------------------------+
    | INSERT record_mode=historical |
    | status=closed              |
    +----------------------------+

work_date = fecha pasada
created_at = AHORA
submission_location = ubicación AHORA
```

No falsificar `created_at` ni ubicación histórica.

---

## 11. Jornada pendiente

```text
Consultant
   |
   v
¿OPEN existe?
   |
  sí
   |
   v
+-----------------------------------------+
| Tienes una jornada pendiente de cierre |
| 08/09/2026 · Cliente A                 |
| Ingreso: 08:05                         |
+--------------------+--------------------+
                     |
                     v
              [Continuar jornada]

[Nueva jornada] = BLOQUEADA
[Histórica]      = BLOQUEADA
```

Admin puede resolverla con cierre administrativo y auditoría.

---

## 12. Estados de jornada

```text
           +--------+
           |  OPEN  |
           +---+----+
               |
               | close
               v
          +----------+
          |  CLOSED  |
          +-----+----+
                |
                | admin elimina (confirmación)
                v
          +--------------------------+
          | eliminada físicamente DB |
          +--------------------------+
```

ADMIN puede eliminar desde `OPEN` o `CLOSED` tras confirmación explícita. La operación elimina la jornada, sus actividades y su auditoría asociada.

No hay transición:

```text
CLOSED -> OPEN por consultant
eliminada físicamente -> CLOSED
```

Si se necesita una corrección, admin modifica de forma auditada; no “reabre” para que consultant edite.

---

## 13. DB — relaciones principales

```text
Supabase auth.users
        |
        | 1:1
        v
+-------------------+
| profiles          |
| user_id           |
| username          |
| role              |
| is_active         |
+----+----------+---+
     |          |
     |          | consultant
     |          v
     |   +-------------------------------+
     |   | consultant_client_assignments |
     |   +---------------+---------------+
     |                   |
     |                   v
     |             +-----------+
     +------------>| clients   |
                   +-----------+

profiles (consultant)
        |
        | 1:N
        v
+------------------------+
| attendance_sessions    |
| work_date              |
| client_id              |
| entry_time             |
| exit_time              |
| declared_minutes       |
| status                 |
+-----------+------------+
            |
            | 1:N
            v
+------------------------+
| attendance_activities  |
| area_code              |
| other_area_name        |
| description            |
+------------------------+

attendance_sessions
        |
        | 1:N
        v
+------------------------+
| attendance_audit_log   |
| actor_admin            |
| before / after         |
| reason                 |
+------------------------+
```

---

## 14. Constraints — defensa contra doble clic/race

```text
UNIQUE consultant + work_date
Mientras exista el registro

UNIQUE consultant
WHERE status = open
```

Resultado:

```text
Tab A: Registrar ingreso ----+
                             +--> solo 1 INSERT gana
Tab B: Registrar ingreso ----+

El segundo recibe conflicto limpio.
```

No confiar solo en disabled button.

---

## 15. RLS — mapa de acceso

```text
                         +----------------+
                         | authenticated  |
                         +--------+-------+
                                  |
                             profile active?
                              /          \
                            no            sí
                            |              |
                         DENY            role
                                        /    \
                              consultant      admin
                                  |             |
                                  v             v
                         SOLO SU PERÍMETRO   PERÍMETRO ADMIN
```

Consultant:

```text
profiles             -> propio
assignments          -> propios
clients              -> asignados
sessions             -> propias
activities           -> propias y write solo si session OPEN
audit                -> sin write
```

Admin:

```text
lectura global
CRUD lógico usuarios/clientes
corrección asistencia mediante operación auditada
Auth Admin API SOLO desde servidor
```

---

## 16. Geolocalización — árbol

```text
[acción ingreso/salida]
         |
         v
navigator.geolocation
   /        |         \
 OK       DENIED     ERROR/TIMEOUT
 |           |           |
 v           v           v
coords     status      status
accuracy   denied      unavailable/timeout
   \         |           /
    +--------+----------+
             |
             v
       REGISTRO CONTINÚA
```

Histórico:

```text
ubicación capturada hoy
        |
        v
submission_location
        |
        X
NO se llama entry_location histórica
```

---

## 17. Dashboard admin

```text
+--------------------------------------------------------+
| APM CONTROL                                            |
|                                                        |
| [Trabajando ahora] [Cerradas hoy] [Pendientes] [Horas]|
|        3               2            1        86h30    |
|                                                        |
| ACTIVIDAD ACTUAL                                       |
| Patricia Romero | Cliente A | Ingreso 08:10 | En curso|
| Juan Pérez      | Cliente B | Ingreso 09:00 | En curso|
+--------------------------------------------------------+
```

**No mostrar:** “Patricia lleva 6h21”.

Eso sería un contador implícito y puede confundirse con horas computables.

---

## 18. Corrección administrativa

```text
ADMIN abre jornada
      |
      v
[Editar]
      |
      +-- dato nuevo
      |
      v
[operación transaccional]
      |
      +--> UPDATE dato
      |
      `--> INSERT audit_log
              |
              +-- before
              +-- after
              +-- actor
              `-- server timestamp
```

Si falla audit, no debe quedar corrección “sin huella”.

---

## 19. Export Excel

```text
ADMIN /reportes
      |
      +-- consultant: uno/todos
      +-- client: uno/todos
      +-- mes
      +-- rango fechas
      `-- estado
             |
             v
      [Generar Excel]
             |
             v
       NEXT.JS SERVER
             |
             v
      consulta Supabase
             |
             +--> SUM(declared_minutes)
             +--> jornadas
             `--> actividades
                    |
                    v
                 ExcelJS
                    |
           +--------+--------+
           |                 |
           v                 v
       Hoja Resumen       Hoja Detalle
           |                 |
           +--------+--------+
                    |
                    v
                 .xlsx
```

---

## 20. Excel — ejemplo conceptual

```text
HOJA RESUMEN

APM GROUP — REPORTE DE ASISTENCIA
Periodo: Septiembre 2026

Consultor           Días   Horas declaradas
Patricia Romero      12       94:30
Juan Pérez            8       61:15


HOJA DETALLE

Fecha       Consultor        Cliente    Ingreso Salida Horas  Áreas
09/09/26    Patricia Romero  Cliente A  08:10   17:30  08:00  Calidad, SST
```

Las descripciones completas viven en columna `Detalle de actividades`.

---

## 21. Responsive — consultor

Desktop:

```text
+------------------------------------------------+
| logo      APM Control                   usuario|
+------------------------------------------------+
|                                                |
|         +--------------------------+           |
|         | Jornada de hoy           |           |
|         | Cliente                  |           |
|         | Ingreso                  |           |
|         | Actividades              |           |
|         |                          |           |
|         | [ + actividad ]          |           |
|         |                          |           |
|         | [ Registrar salida ]     |           |
|         +--------------------------+           |
+------------------------------------------------+
```

Móvil:

```text
+----------------------+
| APM Control      user|
+----------------------+
| Jornada de hoy       |
| Cliente A            |
| Ingreso 08:10        |
|                      |
| Actividades          |
| [card] Calidad       |
| [card] SST           |
|                      |
| [+ Actividad]        |
|                      |
| [Registrar salida]   |
+----------------------+
```

No convertir el móvil en una tabla horizontal comprimida.

---

## 22. Responsive — admin

Desktop:

```text
+-----------+--------------------------------------+
| APM       | Dashboard                            |
| Dashboard |                                      |
| Asistencia| métricas + tabla                     |
| Usuarios  |                                      |
| Clientes  |                                      |
| Reportes  |                                      |
+-----------+--------------------------------------+
```

Móvil:

```text
+----------------------+
| APM Control      menu|
+----------------------+
| Dashboard            |
| métricas 2x2 / 1 col |
| actividad cards      |
+----------------------+
```

Sidebar se convierte en sheet/drawer; no encoger sidebar completo.

---

## 23. Mapa de código crítico

```text
Si tocas...                         Revisa...

Auth / username alias          -> 01 Constitución + 03 §4
Admin user mutations           -> 03 §4 + RLS + secret server-only
attendance_sessions            -> 01 horas/invariantes + 03 §7-10
attendance_activities          -> closed/open rules
hours.ts                       -> regla NO auto-cálculo
reports                        -> SUM(declared_minutes)
geolocation                    -> no bloquear + histórico semántico
RLS                            -> usuario inactivo + ownership
correcciones admin             -> atomicidad + audit_log
Vercel deploy                  -> 02 Gobernanza
nueva dependencia              -> 05 Stack
UI consultant                  -> minimalismo + no contador
```

---

## 24. Regla de lectura rápida para Codex

Si Codex solo tiene 2 minutos antes de trabajar:

```text
1. 01-CONSTITUCION § horas + jornadas
2. 04-MAPA-ASCII §7 + §8 + §15
3. 03-ARQUITECTURA sección que va a tocar
4. 05-STACK si añade tecnología
5. 02-GOBERNANZA antes de commit/deploy
```
