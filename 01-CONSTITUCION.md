# APM Control — Constitución

> **Versión:** 1.0.0 | **Vigencia desde:** 2026-09-09
> Este documento define **principios inmutables del producto**. Cambiar algo de aquí requiere una decisión explícita del owner y seguir `02-GOBERNANZA.md`.

---

## 1. Misión

APM Control es una aplicación web interna de APM Group para que los **consultores registren su asistencia y actividad diaria con la menor fricción posible**, y para que **administración disponga de un historial confiable, auditable y exportable a Excel** sin reconstruir información manualmente.

El producto prioriza tres cosas:

1. **Simplicidad para el consultor.** Pocos botones, un flujo evidente y usable desde celular.
2. **Trazabilidad para administración.** Saber quién registró qué, cuándo lo registró y qué fue corregido después.
3. **Reportabilidad.** Poder responder rápidamente cuántos días y cuántas horas declaradas trabajó un consultor, para qué cliente y con qué áreas tuvo actividad.

---

## 2. Principios inmutables

### 2.1 Producto

1. **El consultor ve una interfaz mínima.** La pantalla principal debe mostrar únicamente lo necesario para su estado actual: iniciar jornada, registrar actividades, cerrar jornada, ver historial y horas acumuladas.
2. **El administrador y el consultor NO comparten la misma interfaz.** Comparten sistema y datos, no navegación ni permisos.
3. **APM Control es responsive desde el diseño.** Celular y escritorio son ciudadanos de primera clase; no existe una “versión móvil” separada.
4. **Una jornada pertenece a un solo consultor, una sola fecha y un solo cliente.** Un consultor puede estar asignado a varios clientes, pero no registrar dos clientes dentro de la misma jornada.
5. **No se permiten fechas futuras.** Sí se permiten fechas pasadas mediante el flujo histórico.
6. **No hay cronómetro.** La plataforma nunca muestra “llevas X horas” calculadas a partir de ingreso y salida.
7. **Ingreso y salida son evidencia de asistencia.** En una jornada histórica, su diferencia propone por defecto las horas computables; el consultor puede reemplazarla manualmente antes de confirmar.
8. **Las horas computables se guardan en `HH:MM` como valor confirmado por el consultor.** En jornada actual se declaran manualmente; en histórica puede aceptarse o sustituirse la propuesta automática.
9. **El almuerzo u otras pausas nunca se descuentan automáticamente.** El consultor declara el tiempo que debe ser considerado según el servicio realizado.
10. **Una jornada cerrada es inmutable para el consultor.** Después de confirmar salida, todo queda en solo lectura.
11. **No existe salida válida sin actividades.** Debe haber al menos una actividad con área y descripción antes de cerrar la jornada.
12. **El historial del consultor siempre permanece visible para él**, incluyendo sus horas declaradas acumuladas.

### 2.2 Usuarios y acceso

13. **Solo existen dos roles:** `admin` y `consultant`.
14. **Solo un admin crea usuarios.** No existe registro público ni auto-registro.
15. **El usuario visible es un `username`, no un correo.** El producto pide `usuario + contraseña`.
16. **La autenticación técnica usa un correo real y único**, asociado al perfil y administrado solo desde las operaciones privilegiadas; ese detalle jamás se expone al consultor.
17. **No hay recuperación de contraseña por correo.** Si un consultor olvida la contraseña, pide a un admin que la restablezca.
18. **El consultor no puede cambiar su propia contraseña.** La gestión de credenciales es administrativa.
19. **Nadie puede leer una contraseña existente.** El admin puede restablecerla, nunca verla. Las contraseñas viven bajo Supabase Auth y no se guardan en tablas propias.
20. **Un usuario desactivado pierde acceso, pero su historial no se borra.** Desactivar ≠ eliminar.
21. **El botón administrativo es “Crear nuevo usuario”** y permite crear tanto `admin` como `consultant`.
22b. **El rol autorizado vive en `auth.users.app_metadata.role`; `profiles.role` es un espejo operativo server-maintained.** El usuario jamás puede proponer o editar su propio rol.
23. **El rol se define al crear la cuenta.** Cambiar de rol no es un flujo cotidiano; cualquier soporte futuro para cambiarlo requiere revisión de seguridad.

### 2.3 Jornadas

23. **Máximo una jornada por consultor y fecha.** No se permiten duplicados del mismo día mientras el registro exista.
24. **Máximo una jornada abierta por consultor.** Una jornada pendiente bloquea iniciar otra, aunque sea de otra fecha.
25. **La jornada actual es secuencial:** confirmar ingreso → registrar/editar actividades → confirmar salida.
26. **La hora de ingreso queda bloqueada para el consultor desde su confirmación.** Solo un admin puede corregirla después.
27. **La hora de salida queda bloqueada para el consultor desde el cierre.** Solo un admin puede corregirla después.
28. **Mientras la jornada está abierta, el consultor puede crear, editar y eliminar sus actividades.** No puede editar la hora de ingreso ni cambiar la identidad de la jornada después de confirmarla salvo reglas explícitas de UI previas al cierre.
29. **La descripción de cada actividad es obligatoria y breve.** Máximo 250 caracteres.
30. **Las áreas se seleccionan desde catálogo canónico.** Si se elige `Otro`, el nombre específico del área pasa a ser obligatorio.
31. **Las actividades no requieren hora propia.** El negocio necesita saber con qué áreas se reunió y para qué, no reconstruir una línea de tiempo minuto a minuto.
32. **La jornada histórica se registra como histórica.** Las marcas técnicas de creación no se reinterpretan como si hubieran ocurrido el día trabajado.
33. **No se soportan jornadas que crucen medianoche en el MVP.** Para una jornada de la fecha X, la salida debe ser igual o posterior al ingreso de esa fecha.

### 2.4 Horas declaradas

34. **La única cifra que suma al acumulado es `declared_minutes`.** Ningún otro campo puede reemplazarla implícitamente.
35. **`declared_minutes` nace del valor `HH:MM` confirmado por el consultor.** En jornada histórica se propone la diferencia entre ingreso y salida; puede reemplazarse manualmente. Ejemplo: `08:30` → 510 minutos.
36. **En jornada actual, ingreso `08:00` y salida `17:30` NO implican 9h30.** El consultor declara el total. En una jornada histórica, ese intervalo sí genera la propuesta inicial editable.
37. **El sistema valida formato y rango.** La propuesta automática se limita al formulario histórico y nunca inicia un cronómetro ni reemplaza una edición manual.
38. **Los reportes, tarjetas y resúmenes usan siempre horas declaradas.** Si una interfaz muestra otra métrica, debe nombrarla explícitamente y no mezclarla con “horas trabajadas”.

### 2.5 Actividades y áreas

39. Catálogo inicial de áreas:

```text
Gerencia
Calidad
Operaciones
Recursos Humanos
SST
Logística
Administración
Finanzas
Comercial
Producción
Otro
```

40. **`Otro` requiere `other_area_name`.** No se permite guardar “Otro” sin especificación.
41. **Cada actividad requiere descripción.** Ejemplo: “Revisión de indicadores del sistema de gestión”.
42. **Una jornada puede tener muchas actividades y repetir un área.** No se deduplican automáticamente porque pueden existir reuniones/actividades distintas con la misma área.
43. **La descripción explica la finalidad de la actividad, no es un informe extenso.** Máximo 250 caracteres.

### 2.6 Geolocalización

44. **Se solicita geolocalización al registrar ingreso y salida de una jornada actual.**
45. **Rechazar o no poder obtener ubicación NO bloquea la asistencia.** Se guarda el estado `denied`, `unavailable` o equivalente como incidencia.
46. **En una jornada histórica, la ubicación obtenida hoy no prueba dónde estuvo el consultor en la fecha pasada.** Si se captura, se guarda explícitamente como `submission_location`, no como ubicación histórica de ingreso/salida.
47. **No se hace reverse geocoding en el MVP.** Se almacenan latitud, longitud, precisión y estado de captura; no se añade un proveedor de mapas solo para traducir coordenadas.
48. **Las coordenadas no aparecen por defecto en el Excel gerencial.** Son evidencia administrativa secundaria, no el objetivo principal del reporte.

### 2.7 Datos y auditoría

49. **Supabase PostgreSQL es la única fuente de verdad operativa.** GitHub contiene código y migraciones, nunca datos reales de asistencia.
50. **Los timestamps técnicos del servidor son distintos de los horarios de negocio introducidos por el usuario.** Ambos se conservan.
51. **Una corrección administrativa de una jornada cerrada no requiere motivo manual.**
52. **Toda corrección administrativa genera auditoría** con actor, fecha técnica, valor anterior y valor nuevo.
53. **La auditoría es append-only para jornadas existentes.** No se edita ni elimina de forma aislada desde la aplicación; se elimina únicamente como parte de la eliminación física confirmada de su jornada por ADMIN.
54. **Solo un ADMIN puede eliminar físicamente una jornada desde la UI**, tras una confirmación explícita. La eliminación retira también sus actividades y cualquier auditoría asociada.
55. **Eliminar una jornada es irreversible** y no puede realizarse desde una cuenta CONSULTANT.
56. **Los clientes se desactivan, no se borran si tienen historia asociada.**
57. **Los usuarios se desactivan, no se borran si tienen historia asociada.**

### 2.8 Arquitectura

58. **Una sola aplicación Next.js** sirve login, consultor y admin.
59. **Supabase** provee Auth, PostgreSQL, RLS y Realtime.
60. **Vercel** aloja la aplicación; **GitHub** versiona código y documentación.
61. **Las operaciones de privilegio elevado nunca se ejecutan desde el browser.** Crear usuarios, restablecer contraseñas y usar la clave secreta de Supabase son operaciones server-only.
62. **RLS es obligatorio en todas las tablas con datos de negocio.** El frontend nunca se considera una barrera de seguridad.
63. **`main` representa producción.** Las ramas de feature usan Preview Deployments antes de merge.
64. **El código nuevo usa TypeScript estricto.** No se inicia deuda intencional de tipos en un proyecto nuevo.

### 2.9 UX y branding

65. **Paleta canónica:** verde APM `#B0BF12`, negro y blanco.
66. **El verde se usa como acento/acción, no como texto pequeño sobre blanco si compromete contraste.** Preferir negro sobre verde y negro sobre blanco.
67. **Logo APM visible en superficies principales** y embebido en reportes Excel cuando exista el asset oficial.
68. **Iconos profesionales y consistentes.** Usar Lucide; no emojis como iconografía funcional del producto.
69. **El consultor no recibe un dashboard saturado.** Una acción primaria por estado y contenido secundario reducido.
70. **Confirmaciones críticas usan modal/alerta clara.** Cerrar jornada, eliminar una asistencia y correcciones administrativas no ocurren por clic accidental.
71. **Touch targets mínimos de 44 px** en móvil para acciones principales.

---

## 3. Invariantes de negocio

Estas reglas deben tener defensa en UI **y** en servidor/BD cuando corresponda.

| Invariante | Defensa mínima |
|------------|----------------|
| 1 jornada por consultor/fecha | índice único parcial en DB |
| 1 jornada abierta por consultor | índice único parcial en DB |
| Sin fecha futura | CHECK/validación server-side |
| Jornada cerrada no editable por consultor | RLS + validación server-side |
| Ingreso confirmado no editable por consultor | permisos de UPDATE + flujo |
| Salida requiere ≥1 actividad | transacción/RPC de cierre |
| `Otro` requiere nombre | CHECK/validación |
| Descripción 1..250 chars | CHECK + schema Zod |
| Horas declaradas >0 y ≤24h | CHECK + schema Zod |
| Total = suma de `declared_minutes` | query única; nunca timestamps |
| Usuario inactivo sin acceso | middleware/server + RLS |
| Admin correction auditada | función/endpoint transaccional |
| Audit log append-only | permisos DB |
| Cliente de jornada debe estar asignado al consultor | validación server/DB |

Si una regla solo existe como texto en este documento y no existe un mecanismo técnico que la haga cumplir, la implementación está incompleta.

---

## 4. Decisiones que no se reabren sin owner

1. No introducir cronómetro ni contador de jornada.
2. No calcular horas trabajadas restando ingreso y salida en jornada actual; en histórica se permite solo como propuesta inicial editable.
3. No usar GitHub como base de datos.
4. No crear rol “gerencia” en el MVP.
5. No permitir dos clientes en una misma jornada.
6. No permitir autoservicio de contraseña al consultor.
7. No mostrar contraseñas actuales al admin.
8. No exigir geolocalización para poder registrar asistencia.
9. No borrar usuarios ni clientes con hard-delete desde la UI; la asistencia puede ser eliminada únicamente por ADMIN con confirmación explícita.
10. No permitir al consultor modificar una jornada cerrada.
11. No permitir salida sin actividades.
12. No dividir el producto en app móvil nativa + web. Es una sola web responsive.
13. No agregar mapas, email, notificaciones push o IA si no existe necesidad aprobada.
14. No crear una colección de documentos adicionales para cada feature.

---

## 5. Anti-patrones prohibidos

| Anti-patrón | Por qué está prohibido |
|-------------|------------------------|
| `workedHours = exit - entry` | contradice el modelo contractual de horas declaradas |
| Guardar `password` en `profiles` | inseguro; Supabase Auth ya resuelve credenciales |
| Admin “ver contraseña” | una contraseña segura no es reversible |
| `localStorage` como fuente de verdad | se pierde/corrompe y no es auditable |
| Guardar asistencias en JSON dentro del repo | Git no es una DB y expone datos |
| Confiar en `role` enviado por el cliente | escalamiento de privilegios |
| Confiar solo en ocultar botones | seguridad visual ≠ autorización |
| Hard delete para “corregir” | destruye trazabilidad |
| Guardar hora histórica como `created_at` falso | mezcla dato de negocio con auditoría técnica |
| Bloquear asistencia por GPS | un fallo de permiso/browser no puede impedir trabajar |
| Agregar dependencia para una función trivial | aumenta superficie y mantenimiento |
| Crear un documento por pantalla | vuelve la documentación ruido y facilita drift |
