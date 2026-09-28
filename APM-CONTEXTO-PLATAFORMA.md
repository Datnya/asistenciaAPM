# APM Control - Contexto operativo para continuidad

> **Estado:** producción activa, sincronizado contra el código de `main` y la auditoría del 2026-09-28.
> **Último cambio funcional relevante:** `ad822f1 feat(attendance): mejora jornadas y actividades`.
> **Objetivo de este documento:** entregar a una persona o modelo de IA el contexto suficiente para entender, mantener y extender APM Control sin depender de conversaciones previas.

---

## 1. Qué es la plataforma

**APM Control** es una plataforma interna de APM Group para registrar la asistencia de sus consultores.

La aplicación permite que un consultor:

- marque el inicio de su jornada;
- registre una o más actividades realizadas;
- marque la salida y confirme las horas trabajadas;
- registre una jornada de una fecha anterior;
- consulte su historial, el detalle de cada jornada y el total de horas;
- actualice su foto y número de celular.

También existe un rol administrativo que crea y administra consultores, clientes y asistencias, pero la interfaz principal de uso diario es la del consultor.

### Entornos y fuentes de verdad

| Elemento | Fuente / ubicación |
|---|---|
| Producción | `https://asistencia-apm.vercel.app` |
| Código de producción | Rama `main` de `https://github.com/Datnya/asistenciaAPM` |
| Hosting | Vercel con despliegue automático desde `main` |
| Autenticación, datos y archivos | Supabase, proyecto de producción `iksnqcpmyfstuwahhysw` |
| Base de datos | PostgreSQL administrado por Supabase |
| Fotos de perfil | Supabase Storage, bucket privado `profile-photos` |
| Documentación de diseño histórico | `00-INDICE.md` a `05-STACK-TECNOLOGICO.md` |

**Nunca** guardar claves, contraseñas, correos personales, coordenadas reales ni exportaciones de datos en GitHub.

---

## 2. Stack técnico

| Capa | Tecnología |
|---|---|
| Aplicación | Next.js 16 con App Router y React 19 |
| Lenguaje | TypeScript |
| Estilos | Tailwind CSS 4 |
| Base de datos y Auth | Supabase (`@supabase/supabase-js`, `@supabase/ssr`) |
| Validación | Zod |
| Iconos | Lucide React |
| Exportación | ExcelJS |
| Pruebas | Vitest |

Comandos principales desde la raíz del repositorio:

```bash
npm run dev
npm run typecheck
npm run lint
npm test
npm run build
```

Antes de publicar un cambio deben pasar, como mínimo, `typecheck`, `lint`, `test` y `build`.

---

## 3. Autenticación y roles

Hay exactamente dos roles:

| Rol | Ruta inicial | Uso |
|---|---|---|
| `consultant` | `/consultant` | Registra y consulta sus propias jornadas. |
| `admin` | `/admin` | Gestiona consultores, clientes y registros. |

### Inicio de sesión

El usuario inicia sesión con su **nombre de usuario visible** y contraseña, no con el correo.

1. El formulario recibe `username` y contraseña.
2. El servidor busca el correo real asociado en `profiles.auth_email`.
3. Supabase Auth valida el correo y la contraseña.
4. La aplicación confirma que el usuario está activo y que el rol de `auth.users.app_metadata.role` coincide con `profiles.role`.
5. El usuario es enviado a `/admin` o `/consultant` según su rol.

El correo real es solo técnico para Supabase Auth; no se muestra en el dashboard del consultor.

### Reglas de seguridad de Auth

- Las contraseñas viven exclusivamente en Supabase Auth, nunca en `profiles` ni en el repositorio.
- Los perfiles inactivos no pueden ingresar.
- Las operaciones con privilegios usan `SUPABASE_SECRET_KEY` solamente del lado del servidor.
- La clave de servicio no debe tener prefijo `NEXT_PUBLIC_` ni aparecer en código cliente.
- Si se expone una clave de servicio, se debe rotar en Supabase y actualizar Vercel antes de revocar la anterior.

Variables necesarias en el servidor:

```text
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
SUPABASE_SECRET_KEY
AUTH_USERNAME_DOMAIN
```

No escribir sus valores en este documento, tickets, commits ni chats.

### Mantenimiento de credenciales

Existen herramientas locales, solo para personal autorizado con `.env.local` configurado:

```bash
npm run maintenance:update-email -- <usuario>
npm run maintenance:reset-password -- <usuario>
```

Estas herramientas conservan el UID y los datos del perfil. La contraseña se solicita sin mostrarla en pantalla.

---

## 4. Modelo de datos operativo

### Tablas relevantes

| Tabla | Propósito |
|---|---|
| `profiles` | Perfil operativo: usuario, rol, estado, correo técnico de Auth, DNI, celular y foto. |
| `clients` | Clientes de APM. |
| `consultant_client_assignments` | Relación entre consultores y clientes asignados. |
| `attendance_sessions` | Una jornada de asistencia. |
| `attendance_activities` | Actividades vinculadas a una jornada. |
| `attendance_audit_log` | Auditoría de correcciones administrativas de jornadas. |

### `attendance_sessions`

Campos funcionales principales:

- `consultant_user_id`: consultor dueño de la jornada.
- `client_id`: un cliente por jornada.
- `work_date`: fecha de trabajo.
- `record_mode`: `live` o `historical`.
- `status`: `open`, `closed` o `voided`.
- `work_type`: `remote` o `onsite`.
- `entry_time` y `exit_time`.
- `declared_minutes`: horas finales expresadas como minutos.
- datos de geolocalización y estado del permiso, cuando estén disponibles.

### `attendance_activities`

Cada actividad contiene:

- área (`area_code`);
- área específica obligatoria si se selecciona `other`;
- descripción o motivo obligatorio, máximo 250 caracteres.

Áreas disponibles: gerencia, calidad, operaciones, recursos humanos, SST, logística, administración, finanzas, comercial, producción y otro.

### Reglas protegidas por base de datos y servidor

- Máximo una jornada no anulada por consultor y fecha.
- Máximo una jornada abierta por consultor.
- No se permiten fechas futuras.
- La salida no puede ser anterior al ingreso.
- Las horas declaradas deben estar entre 1 minuto y 24 horas.
- Una jornada cerrada requiere por lo menos una actividad.
- El cliente debe estar activo y asignado al consultor.
- Las tablas tienen RLS habilitado; el consultor solo puede leer sus propios registros y el administrador puede consultar todos.
- Las escrituras de asistencia se ejecutan con acciones de servidor autenticadas, no con permisos directos del navegador.

Las migraciones de Supabase viven en `supabase/migrations/`. Si se agrega una migración, debe aplicarse también en el proyecto de producción por el procedimiento controlado de Supabase; subir código a Vercel no ejecuta SQL automáticamente.

---

## 5. Interfaz y flujo del consultor

### 5.1 Navegación visible

| Sección / botón | Qué hace |
|---|---|
| **Dashboard** | Página principal del consultor: asistencia actual, métricas e historial. |
| **Perfil** | Permite actualizar foto de perfil y número de celular. |
| Menú de usuario | Muestra la identidad del consultor y contiene **Cerrar sesión**. |
| **Registrar asistencia** | Abre el flujo para iniciar una jornada actual o registrar una jornada anterior. |

### 5.2 Registrar una jornada de hoy

1. En Dashboard, pulsar **Registrar asistencia**.
2. Seleccionar la fecha de hoy.
3. Elegir tipo de jornada: **Remota** o **Presencial**.
4. Elegir un cliente activo asignado.
5. Indicar la hora de ingreso y confirmar.
6. La jornada queda abierta. El consultor puede añadir, editar o eliminar actividades mientras siga abierta.

Al confirmar el ingreso, el navegador intenta capturar la ubicación. Si el permiso se rechaza o no está disponible, la jornada continúa y se registra la incidencia; no bloquea la asistencia.

### 5.3 Actividades durante una jornada abierta

En la tarjeta de jornada abierta se muestran:

| Elemento | Función |
|---|---|
| **Actividad** | Abre un formulario para añadir otra actividad. |
| Ícono de lápiz | Edita una actividad existente. |
| Ícono de papelera | Elimina una actividad existente, tras confirmar. |
| **Registrar salida** | Abre el cierre de la jornada. Solo está disponible si existe al menos una actividad. |

Para cada actividad se debe seleccionar un área y escribir el motivo o concepto. Si se escoge **Otro**, también se debe especificar el nombre del área.

### 5.4 Registrar salida y horas declaradas

Al pulsar **Registrar salida**:

1. Se ingresa la hora de salida.
2. El campo **Horas trabajadas declaradas** se llena automáticamente con la diferencia entre ingreso y salida.
3. El consultor puede editar ese valor si las horas computables reales fueron distintas.
4. El formato es `HH:MM`; por ejemplo, `07:30`. Es válido escribir `6`, que se normaliza a `06:00` al salir del campo.
5. Se confirma el cierre. Desde ese momento, la jornada queda en solo lectura para el consultor.

La aplicación no usa cronómetro. El cálculo es una propuesta y la cantidad declarada confirmada es la que se acumula.

### 5.5 Registrar una jornada anterior

Cuando se selecciona una fecha anterior a hoy, el mismo cuadro se transforma en **Registrar jornada anterior**.

El consultor debe completar fecha, tipo, cliente, hora de ingreso, hora de salida y horas declaradas. Las horas se calculan automáticamente, pero también son editables.

La sección **Actividades realizadas** permite:

- registrar una actividad inicial;
- usar **Agregar actividad** para añadir una o varias más;
- seleccionar un área y motivo para cada actividad;
- eliminar actividades adicionales antes de confirmar.

Al confirmar, la jornada histórica se crea y se cierra en una sola operación. No se pueden registrar fechas futuras ni una fecha que ya tenga una jornada no anulada.

### 5.6 Métricas e historial

El dashboard muestra:

| Elemento | Cálculo / contenido |
|---|---|
| **Horas acumuladas** | Suma de `declared_minutes` de jornadas cerradas. |
| **Días con asistencia** | Número de jornadas cerradas. |
| **Cliente asignado hoy** | Cliente de la jornada abierta o cliente asignado disponible. |
| **Estado de hoy** | Indica si hay una jornada abierta o si aún no se marcó ingreso. |
| **Historial de jornadas** | Lista de jornadas cerradas con fecha, cliente, tipo, horas y acciones. |

En cada fila del historial existe el botón **Ver jornada completa**. Abre un cuadro de solo lectura con:

- hora de ingreso;
- hora de salida;
- horas declaradas;
- lista de todas las actividades con su área y descripción.

---

## 6. Interfaz del administrador

El administrador puede:

- crear y editar consultores, sus credenciales, cliente asignado y foto;
- activar o desactivar cuentas;
- crear clientes al asignarlos;
- visualizar el detalle e historial de cada consultor;
- descargar un reporte Excel de asistencias;
- abrir **Ver jornada completa** para revisar cada actividad;
- editar actividades desde el lápiz dentro del detalle de jornada;
- corregir fecha, cliente, tipo, ingreso, salida y horas de una asistencia;
- eliminar una asistencia.

El consultor no puede editar una jornada cerrada. El administrador sí puede corregirla. Las correcciones de asistencia se registran en `attendance_audit_log`; si se amplía la edición administrativa de actividades, se debe mantener también una trazabilidad equivalente.

---

## 7. Límites y capacidad

### Estado actual del límite de jornadas

**Actualmente NO hay un límite total de 50 jornadas por consultor.**

La plataforma solo limita una jornada por consultor y fecha, y una abierta a la vez. Por ello, un consultor puede superar 50 jornadas a lo largo del tiempo. Tampoco hay un máximo técnico de actividades por jornada.

### Capacidad objetivo solicitada

El objetivo de **10 consultores x 50 jornadas = 500 jornadas** es ampliamente viable.

Escenario conservador de planificación:

| Recurso | Escenario | Resultado esperado |
|---|---:|---|
| Jornadas | 10 x 50 | 500 jornadas |
| Actividades | Hasta 20 por jornada | 10,000 actividades |
| Fotos | 10 fotos de hasta 2 MB | Hasta 20 MB en Storage |
| Base de datos | Texto de actividades limitado a 250 caracteres | Muy por debajo de la cuota Free de 500 MB en este escenario |

La auditoría del 2026-09-28 encontró 2 consultores, 7 jornadas y 11 actividades, sin cierres incompletos, horas inválidas, horarios inconsistentes ni actividades huérfanas.

### Recomendación pendiente

Si 50 es una regla de negocio y no solo una estimación, implementar una migración y validación que impida crear la jornada 51 por consultor. También se recomienda un máximo explícito de actividades por jornada, por ejemplo 20.

### Límites operativos de Supabase Free

El proyecto usa Supabase Free. Referencias oficiales vigentes al 2026-09-28:

- 500 MB de base de datos antes de modo solo lectura.
- 1 GB de Storage.
- 50,000 usuarios activos mensuales.
- Los proyectos Free se pausan luego de una semana sin actividad.

El volumen objetivo no presenta riesgo de almacenamiento. El riesgo relevante es la pausa por inactividad, que ya ocurrió una vez. Para una operación permanente de asistencia se recomienda evaluar Supabase Pro.

---

## 8. Auditoría técnica más reciente

Auditoría terminada el 2026-09-28:

| Revisión | Resultado |
|---|---|
| Rutas públicas de producción (`/` y `/login`) | Responden HTTP 200 |
| `npm run typecheck` | Correcto |
| `npm run lint` | Correcto |
| `npm test` | 9 pruebas correctas |
| `npm run build` | Correcto |
| `npm audit --omit=dev --audit-level=high` | 0 vulnerabilidades encontradas |
| Integridad de datos de asistencia | Sin incidencias en la revisión de datos actuales |

Esto reduce el riesgo, pero no sustituye las pruebas manuales de extremo a extremo antes de un cambio relevante. Se debe probar con una cuenta de consultor de prueba: jornada actual, actividades, salida con cálculo automático y manual, jornada pasada con varias actividades, historial, perfil y cierre de sesión.

---

## 9. Archivos importantes del repositorio

| Zona | Archivos principales |
|---|---|
| Login | `src/app/(public)/login/actions.ts`, `src/app/(public)/login/login-form.tsx` |
| Guardas de roles | `src/lib/auth/guards.ts` |
| Resolución usuario -> correo | `src/lib/auth/auth-email.ts` |
| Dashboard consultor | `src/app/(consultant)/consultant/page.tsx` |
| Acciones de asistencia consultor | `src/app/(consultant)/consultant/attendance-actions.ts` |
| Formulario de asistencia | `src/components/consultant/attendance-action.tsx` |
| Historial consultor | `src/components/consultant/attendance-history.tsx` |
| Administración de asistencias | `src/app/(admin)/admin/attendance-actions.ts` |
| Acciones visuales de asistencia admin | `src/components/admin/attendance-actions.tsx` |
| Detalle de consultor admin | `src/app/(admin)/admin/consultants/[id]/page.tsx` |
| Consultas admin | `src/lib/admin/consultants.ts` |
| Validaciones | `src/lib/attendance/validation.ts` |
| Utilidades de horas | `src/lib/attendance/hours.ts` |
| Migraciones SQL | `supabase/migrations/` |

---

## 10. Reglas para futuras modificaciones

1. Empezar con `git status` y preservar cambios ajenos.
2. Leer este documento y luego los archivos específicos del flujo a modificar.
3. No exponer ni copiar secretos de `.env.local`, Vercel o Supabase.
4. Mantener las validaciones tanto en la interfaz como en el servidor y, para reglas críticas, en PostgreSQL.
5. No editar `auth.users` directamente con SQL. Usar Supabase Admin API o los scripts de mantenimiento.
6. Toda operación administrativa sensible debe verificar `requireRole("admin")` en servidor.
7. No permitir que el cliente escriba directamente en tablas de asistencia.
8. Para cambios de esquema, crear una migración versionada en `supabase/migrations/` y aplicarla controladamente en producción.
9. Ejecutar pruebas, tipos, lint y build antes de `git push origin main`.
10. Después del push, confirmar que Vercel completó el despliegue antes de anunciar producción.

---

## 11. Cómo entregar este contexto a otro modelo de IA

Indicarle:

> Lee completo `APM-CONTEXTO-PLATAFORMA.md` antes de analizar o modificar el repositorio de APM Control. Respeta sus reglas de seguridad, revisa el estado actual del repositorio y continúa desde la rama `main`.

Después, describir únicamente el cambio deseado. El modelo debería usar este archivo como contexto operativo actual y corroborar el código antes de modificarlo.

---

## 12. Pendientes recomendados

1. Implementar el límite obligatorio de 50 jornadas por consultor y un límite de actividades por jornada.
2. Rotar cualquier clave de servicio que haya sido expuesta y actualizar Vercel.
3. Evaluar Supabase Pro para evitar la pausa automática del proyecto Free.
4. Crear una cuenta de prueba no productiva y ejecutar una prueba manual completa antes de cambios mayores.
5. Añadir auditoría explícita para cambios administrativos de actividades, no solo para correcciones de campos de la jornada.
