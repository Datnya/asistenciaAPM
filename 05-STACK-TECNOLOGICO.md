# APM Control — Stack Tecnológico

> **Versión:** 1.0.0 | **Última actualización:** 2026-09-09
> **Estado:** stack objetivo pre-implementación. Las versiones exactas del proyecto, una vez instalado, las define `package.json` + lockfile. Este documento conserva las **decisiones**, no duplica cada dependencia transitiva.

---

## 1. Stack canónico

| Capa | Tecnología | Versión objetivo inicial | Justificación |
|------|------------|--------------------------|---------------|
| **Framework** | Next.js App Router | 16.x Active LTS, parche vigente al bootstrap | Una sola web full-stack, rutas por rol, Server Components/Actions y despliegue natural en Vercel |
| **React** | React | compatible con Next.js 16 | UI responsive, ecosistema maduro |
| **Lenguaje** | TypeScript | 5.x, `strict: true` | Proyecto nuevo: prevenir drift de tipos desde el inicio |
| **Runtime** | Node.js en Vercel | runtime soportado por Next.js/Vercel | Sin servidor propio |
| **Estilos** | Tailwind CSS | versión compatible con Next.js elegido | Sistema rápido de tokens y responsive |
| **Componentes UI** | shadcn/ui (Radix primitives) | versión vigente | Accesibilidad + componentes no opinados visualmente |
| **Iconos** | Lucide React | versión vigente | Iconografía profesional, consistente y liviana |
| **Formularios** | React Hook Form + Zod | versiones vigentes | Formularios controlados + validación compartible/type-safe |
| **Auth** | Supabase Auth | managed | Password hashing, sesiones y Admin API sin implementar auth propia |
| **Base de datos** | PostgreSQL (Supabase) | managed | Relacional, constraints, RLS, funciones SQL, índices |
| **Cliente Supabase** | `@supabase/supabase-js` + soporte SSR/server oficial | versión estable compatible | Browser con RLS + servidor con cookies/sesión |
| **Realtime** | Supabase Realtime | managed | Dashboard admin actualizado sin polling agresivo |
| **Excel** | ExcelJS | versión vigente | Crear `.xlsx`, estilos, fórmulas/valores e imágenes/logo |
| **Testing unit/integration** | Vitest + Testing Library | versión compatible | Lógica de horas, validadores y UI |
| **Testing E2E** | Playwright | versión vigente | Flujos críticos reales en browser móvil/escritorio |
| **Hosting** | Vercel | managed | Preview por branch + producción desde main |
| **Repositorio** | GitHub | — | Código, docs y migraciones; no datos operativos |

### Regla de versiones

Antes del primer `npm install`, usar releases estables con parches de seguridad vigentes. Después:

```text
package.json + package-lock.json = fuente de verdad de versiones instaladas
05-STACK-TECNOLOGICO.md          = fuente de verdad de por qué existen
```

No actualizar majors “porque sí”.

---

## 2. Decisiones clave y alternativas descartadas

### Decisión 1 — Next.js full-stack vs SPA separada + backend aparte

**Elegido:** Next.js App Router.

Razones:

- aplicación pequeña pero con operaciones server-only;
- auth y cookies pueden gestionarse en el mismo proyecto;
- Excel server-side;
- Admin API de Supabase necesita frontera servidor;
- rutas protegidas por rol;
- Vercel es el hosting objetivo.

**Descartado:** React/Vite SPA + API independiente.

No aporta suficiente valor para este producto y duplica despliegues/fronteras.

---

### Decisión 2 — Supabase vs “guardar DB en GitHub”

**Elegido:** Supabase PostgreSQL + Auth + RLS + Realtime.

**Descartado:** JSON/CSV/archivos en GitHub como DB.

Razones:

- concurrencia;
- datos personales/operativos;
- autenticación;
- consultas mensuales;
- constraints;
- auditoría;
- actualización en tiempo real.

GitHub conserva **migraciones**, no registros reales.

---

### Decisión 3 — Supabase Auth vs tabla propia de passwords

**Elegido:** Supabase Auth.

APM Control no implementa hashing, salts, sessions ni recuperación propia.

El username visible se traduce a un alias técnico de Auth.

**Descartado:**

```text
users.password
users.password_hash implementado a mano
password cifrada reversible para que admin la vea
```

La contraseña no es dato administrativo consultable.

---

### Decisión 4 — Username visible vs email visible

**Elegido:** `username + password`.

El negocio no necesita correo del consultor para entrar.

Implementación técnica:

```text
username -> normalización -> alias email interno -> Supabase Auth
```

El dominio del alias está en `AUTH_USERNAME_DOMAIN` server-side/configurado.

No hay email recovery en MVP.

---

### Decisión 5 — Horas declaradas vs horas calculadas

**Elegido:** horas declaradas manualmente.

```text
UI: HH:MM
DB: declared_minutes integer
```

**Descartado:**

```text
exit_time - entry_time
cronómetro
break deductions
almuerzo automático
```

La razón de negocio es explícita: el tratamiento del almuerzo puede variar y el consultor indica cuántas horas deben considerarse.

---

### Decisión 6 — Tiempo de negocio vs timestamp técnico

**Elegido:** conservar ambos por separado.

```text
work_date / entry_time / exit_time    dato declarado de la jornada
created_at / recorded_at / closed_at  auditoría técnica del sistema
```

Especialmente necesario porque se permiten fechas pasadas.

---

### Decisión 7 — Geolocalización bloqueante vs no bloqueante

**Elegido:** no bloqueante.

El sistema intenta capturar ubicación y precisión. Si browser/usuario la niega, la jornada sigue y queda status de incidencia.

**Descartado:** impedir trabajar si GPS falla.

No hay geofence ni tracking continuo.

---

### Decisión 8 — Operaciones DB directas vs server-only

**Elegido:** modelo híbrido seguro.

Browser puede usar Supabase con publishable key **solo** para operaciones que RLS pueda proteger claramente.

Van server-side obligatoriamente:

- crear Auth users;
- restablecer password;
- cambiar alias Auth;
- generar Excel si usa consultas privilegiadas;
- cualquier uso de secret key;
- correcciones administrativas transaccionales si la estrategia DB lo requiere.

RLS sigue activo aunque una pantalla esté protegida por routing.

---

### Decisión 9 — Admin corrections: update libre vs auditado

**Elegido:** operación atómica con `reason` + `attendance_audit_log`.

**Descartado:** editar y sobrescribir silenciosamente.

Preferencia técnica: función PostgreSQL/RPC transaccional para update + audit.

---

### Decisión 10 — Excel client-side vs server-side

**Elegido:** ExcelJS server-side.

Razones:

- no exponer consultas administrativas;
- controlar branding;
- soportar logo;
- descargar igual desde móvil/escritorio;
- lógica única de totales.

---

### Decisión 11 — Vercel Git integration vs deploy manual cotidiano

**Elegido:** integración GitHub↔Vercel.

```text
feature branch -> Preview
main           -> Production
```

El owner valida Preview antes de mergear cambios funcionales relevantes.

---

### Decisión 12 — Estado global

**Elegido inicialmente:** no añadir Redux/Zustand/TanStack Query por defecto.

Next.js + estado local + Supabase son suficientes para el MVP.

Agregar una librería de server-state solo si aparece complejidad real de caché/invalidation que lo justifique.

---

## 3. Variables de entorno

### 3.1 Browser-safe

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
```

La publishable key no es un secreto; su seguridad depende de RLS.

### 3.2 Server-only

```bash
SUPABASE_SECRET_KEY=
AUTH_USERNAME_DOMAIN=
```

`SUPABASE_SECRET_KEY` bypassa privilegios normales y **jamás** puede importarse desde Client Components ni llevar prefijo `NEXT_PUBLIC_`.

`AUTH_USERNAME_DOMAIN` construye aliases técnicos. Ejemplo conceptual:

```text
patricia.romero@<AUTH_USERNAME_DOMAIN>
```

El valor real se configura en cada entorno.

### 3.3 Opcionales futuros

No crear env vars hasta tener consumidor real.

Ejemplos que **NO existen en MVP**:

```text
RESEND_API_KEY
GOOGLE_MAPS_API_KEY
SENTRY_DSN
REDIS_URL
OPENAI_API_KEY
```

No instalar/configurar servicios anticipadamente.

---

## 4. Supabase — patrón de clientes

### 4.1 Browser client

Usa:

```text
SUPABASE URL + publishable key + sesión del usuario
```

RLS decide qué puede leer/escribir.

### 4.2 Server user client

Server Components/Actions usan contexto autenticado del usuario para queries normales.

Preferir este cliente cuando no se necesitan privilegios elevados.

### 4.3 Admin client

Archivo claramente marcado server-only, por ejemplo:

```text
src/lib/supabase/admin.ts
```

Usa secret key únicamente después de verificar que el requester es admin activo.

Consumidores permitidos:

```text
create user
reset password
update auth alias
operaciones administrativas que explícitamente lo necesiten
bootstrap
```

No usar secret client por comodidad para saltarse RLS.

---

## 5. Modelo de autenticación

### 5.1 Normalización de username

Una función única, testeada.

Concepto:

```ts
normalizeUsername(' Patricia.Romero ') -> 'patricia.romero'
```

Reglas sugeridas:

- lowercase;
- trim;
- remover/normalizar caracteres incompatibles;
- puntos/guiones/underscore permitidos;
- no espacios;
- unique case-insensitive.

### 5.2 Alias técnico

Función única:

```ts
buildAuthAlias(username)
```

No repetir string concatenation en 5 lugares.

### 5.3 Password reset admin

UI:

```text
Nueva contraseña
Confirmar contraseña
[Restablecer]
```

Servidor:

```text
verificar admin -> updateUserById -> success
```

No existe endpoint “get password”.

---

## 6. Design System APM

### 6.1 Colores canónicos

```text
APM Green       #B0BF12
Black           #000000
White           #FFFFFF
```

Tokens derivados permitidos para UI:

```text
background      #FFFFFF
foreground      #0A0A0A
primary         #B0BF12
primary-fg      #0A0A0A
muted           gris neutro claro
border          gris neutro
success         usar semántico accesible sin reemplazar branding
warning/error   semánticos solo cuando son necesarios
```

El producto sigue siendo visualmente APM aunque use grises neutros para jerarquía.

### 6.2 Uso del verde

Sí:

- botón primario;
- indicador activo;
- borde/acento;
- chips seleccionados;
- encabezados Excel;
- detalles de marca.

Evitar:

- párrafos completos verdes;
- texto verde pequeño sobre blanco;
- fondos verdes enormes sin propósito;
- usar 5 tonos de verde inventados.

### 6.3 Logo

Asset oficial esperado:

```text
/public/branding/apm-logo.*
```

Usos:

- login;
- header/sidebar;
- Excel.

No deformar proporción ni recrear el logo con texto.

### 6.4 Tipografía

Usar tipografía sans moderna, profesional y altamente legible. Preferir la integración estándar de fuentes de Next.js cuando corresponda.

Jerarquía:

```text
Page title       28-32 desktop / 24 móvil
Section title    18-22
Body             14-16
Label            13-14
Metric           28-36 según contexto
```

No fuentes decorativas.

### 6.5 Iconografía

Lucide.

Ejemplos conceptuales:

```text
Clock       ingreso/salida
Users       usuarios
Building2   clientes
Clipboard   actividades
FileDown    reportes
MapPin      ubicación
LogOut      cerrar sesión
Pencil      editar
Ban         desactivar/anular según contexto
```

No mezclar librerías de iconos.

---

## 7. UI del consultor

### 7.1 Principio

**Una acción primaria según estado.**

Sin jornada:

```text
[ Registrar ingreso ]
```

Jornada abierta:

```text
[ + Actividad ]
...
[ Registrar salida ]
```

Cerrada:

```text
Resumen
(sin editar)
```

### 7.2 Componentes sugeridos

```text
ConsultantHeader
AttendanceStatusCard
StartAttendanceForm
ActivityList
ActivityFormSheet/Modal
CloseAttendanceForm
AttendanceConfirmationDialog
HistoricalAttendanceForm
HistoryList
HoursSummaryCard
```

### 7.3 Móvil

- single column;
- cards, no tabla apretada;
- botones de ancho completo cuando sea apropiado;
- 44px mínimo para acciones táctiles;
- forms con teclado correcto (`inputMode=numeric` para horas si aplica);
- modales adaptados a sheet/drawer si mejoran ergonomía.

---

## 8. UI del admin

### 8.1 Layout

Desktop: sidebar compacta + contenido.

Móvil: header + menú sheet/drawer.

### 8.2 Componentes sugeridos

```text
AdminShell
AdminSidebar
MetricCard
ActiveConsultantsList
AttendanceTable
AttendanceFilters
AttendanceDetail
AuditTimeline
UserTable
CreateUserDialog
ResetPasswordDialog
ClientTable
ClientAssignmentsDialog
ReportFilters
ExportButton
```

### 8.3 Tablas

Desktop sí puede usar tablas.

Móvil debe convertir filas a cards/listas o usar un patrón responsive útil; no obligar scroll horizontal para el flujo principal.

---

## 9. Formularios y validación

React Hook Form + Zod para formularios con más de un campo/estado significativo.

Schemas canónicos sugeridos:

```text
loginSchema
createUserSchema
resetPasswordSchema
clientSchema
startAttendanceSchema
activitySchema
closeAttendanceSchema
historicalAttendanceSchema
adminCorrectionSchema
reportFilterSchema
```

Lógica de horas vive en una utilidad compartida, no reimplementada en cada schema.

---

## 10. ExcelJS

### 10.1 Reglas

- importar server-side;
- generar workbook en memoria;
- logo como imagen si el asset existe;
- definir widths;
- wrap text para actividades;
- freeze header de detalle;
- auto-filter razonable;
- fechas en formato Perú legible;
- horas declaradas a partir de minutos.

### 10.2 No usar fórmulas para redefinir negocio

Se pueden usar fórmulas de presentación si son seguras, pero el total canónico se calcula desde `declared_minutes` consultados.

No crear una fórmula Excel que reste ingreso/salida.

---

## 11. Fechas y timezone

Timezone de negocio:

```text
America/Lima
```

DB:

```text
timestamptz -> UTC técnico
work_date   -> date negocio
time        -> hora negocio
```

La aplicación formatea para Perú.

Evitar bugs de UTC alrededor de medianoche.

No agregar librería de fechas por defecto si `Intl`, Temporal disponible/estable en runtime elegido o helpers pequeños cubren el caso. Si se agrega `date-fns`, documentar la razón.

---

## 12. Realtime

Supabase Realtime se usa solo donde aporta valor visible:

```text
Admin Dashboard -> sessions INSERT/UPDATE
Admin Attendance detail -> refresh cuando cambia sesión/actividad relevante
```

No suscribir cada pantalla a toda la DB.

La suscripción debe limpiarse al desmontar.

---

## 13. Testing

### 13.1 Unitarios prioritarios

```text
HH:MM -> minutos
minutos -> display
24:00 válido
00:00 inválido
08:75 inválido
normalización username
alias builder
area Other validation
250 chars
filtros reporte
```

### 13.2 Integración/DB

```text
unique consultant/date
unique open consultant
RLS ownership
inactive denied
consultant no update closed
close requires activity
admin audit atomic
void excluded totals
assigned client enforcement
```

### 13.3 E2E Playwright

Flujos críticos:

```text
admin creates consultant
consultant login
live attendance happy path
GPS denied path
activity edit while open
closed immutable
historical attendance
open session blocks new
admin correction + audit
Excel download
```

Configurar viewport desktop + móvil.

---

## 14. Scripts npm objetivo

```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "eslint .",
    "typecheck": "tsc --noEmit",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:e2e": "playwright test"
  }
}
```

El nombre exacto puede adaptarse al scaffold, pero Gobernanza asume que existen comandos equivalentes para lint/type/test/build.

---

## 15. Vercel

### 15.1 Git integration

```text
GitHub repo
  |
  +-- main ---------> Production
  |
  `-- other branch -> Preview
```

Variables separadas por scope:

```text
Development
Preview
Production
```

### 15.2 Preview con datos

Idealmente Preview usa proyecto/branch Supabase de desarrollo o datos de prueba, no producción, especialmente antes del go-live.

Si inicialmente se comparte proyecto Supabase por simplicidad, Codex debe dejarlo explícito y extremar que pruebas no ensucien datos reales. Preferencia: entorno no productivo separado.

---

## 16. GitHub

El repositorio contiene:

```text
src/
public/
supabase/migrations/
APM-Control-DOCS/
package.json
package-lock.json
configs
```

No contiene:

```text
.env
contraseñas
secret keys
exports con datos reales
copias de la DB
coordenadas reales
Excel gerenciales generados
```

---

## 17. Dependencias que NO se agregan por defecto

```text
Redux
Zustand
TanStack Query
Prisma
Drizzle
Redis/Upstash
Sentry
Resend
Google Maps
Mapbox
Moment.js
Framer Motion
OpenAI SDK
Firebase
```

No significa “prohibidas para siempre”. Significa que **no existe necesidad aprobada en el MVP**.

Agregar cualquiera requiere explicar qué problema real resuelve y actualizar este documento.

---

## 18. Configuración TypeScript

Proyecto nuevo: modo estricto.

Concepto:

```json
{
  "compilerOptions": {
    "strict": true,
    "noEmit": true,
    "noUncheckedIndexedAccess": true
  }
}
```

No copiar configuraciones loose de proyectos legacy.

Los detalles finales dependen del scaffold de Next.js vigente.

---

## 19. Seguridad técnica

| Riesgo | Defensa |
|--------|---------|
| Secret Supabase en browser | server-only module + env sin `NEXT_PUBLIC` |
| Consultant lee a otros | RLS por `auth.uid()` |
| Consultant edita closed | RLS/DB rules |
| Role forged en body | resolver actor desde sesión |
| Usuario desactivado con token viejo | RLS consulta estado activo |
| Doble jornada por doble tap | unique partial indexes |
| Password filtrada en logs | nunca loguear inputs sensibles |
| Admin correction sin audit | operación transaccional |
| Histórico falsifica timestamp | separar business time/server time |
| GPS usado como tracking | captura puntual solamente |

---

## 20. Límites y restricciones del MVP

| Restricción | Comportamiento |
|------------|----------------|
| ~5 consultores iniciales | no microservicios ni cache distribuido |
| Una jornada por fecha | constraint DB |
| Una open por consultant | constraint DB |
| Un cliente por jornada | `client_id` en session |
| Fecha futura | no permitida |
| Overnight | no soportado |
| Horas | manual `HH:MM`, 1..1440 min |
| Actividad | descripción 1..250 |
| GPS | best-effort, no bloqueante |
| Excel | admin-only |
| Password reset | admin-only |
| Realtime | admin dashboard, no regla de negocio |
| Offline real | no soportado como modo persistente; mostrar error de red y no fingir éxito |

---

## 21. Qué es fuente de verdad cuando haya código

```text
Versiones             -> package.json + package-lock.json
Tablas/constraints    -> supabase/migrations + schema real
Policies              -> migraciones + DB real
Rutas                  -> src/app
Variables consumidas  -> código + Vercel env config
Docs                   -> explicación de decisiones y mapa
```

Si este documento enumera una dependencia que ya no está instalada o una ruta que no existe, corregir el doc después de corroborar; no perpetuar el drift.
