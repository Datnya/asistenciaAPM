# APM Control — Índice maestro

> **Versión:** 1.0.0 | **Vigencia desde:** 2026-09-09
> **Estado:** diseño canónico pre-implementación.
> Esta carpeta es la **fuente canónica de documentación de APM Control**. Antes de escribir código, Codex debe leer estos documentos completos. Una vez exista código, toda afirmación de implementación deberá corroborarse contra el repositorio real antes de actualizar estos archivos.

---

## 1. Mapa de documentos

| # | Documento | Qué responde | Cuándo consultarlo |
|---|-----------|--------------|-------------------|
| 00 | [INDICE.md](00-INDICE.md) | "Qué documentos existen y cuál consultar" | Primero, siempre |
| 01 | [CONSTITUCION.md](01-CONSTITUCION.md) | "Qué principios NO se rompen nunca" | Antes de tomar decisiones funcionales o estructurales |
| 02 | [GOBERNANZA.md](02-GOBERNANZA.md) | "Cómo se decide, implementa, prueba y despliega un cambio" | Antes de modificar producto, BD, auth o deploy |
| 03 | [ARQUITECTURA.md](03-ARQUITECTURA.md) | "Cómo está diseñado APM Control end-to-end" | Para implementar flujos, tablas, permisos, reportes y pantallas |
| 04 | [MAPA-ASCII.md](04-MAPA-ASCII.md) | "Cómo se ve todo de un vistazo" | Para orientarse rápido antes de tocar una zona del sistema |
| 05 | [STACK-TECNOLOGICO.md](05-STACK-TECNOLOGICO.md) | "Qué tecnologías usamos, por qué y cuáles no" | Antes de agregar/cambiar librerías, servicios o patrones |

**No crear documentos adicionales por defecto.** Una nueva regla de negocio, dependencia, flujo o decisión se incorpora al documento que corresponda. Solo el owner puede decidir que el proyecto necesita un documento nuevo.

---

## 2. Qué es APM Control

APM Control es una aplicación web interna de **APM Group** para registrar y auditar la asistencia de consultores que prestan servicios a clientes de la empresa.

Debe funcionar correctamente en **celulares y computadoras** desde una URL desplegada en Vercel.

El producto tiene solo dos experiencias:

1. **Consultor:** registra su jornada, cliente, actividades, hora de ingreso, hora de salida y horas declaradas; consulta su historial y su acumulado.
2. **Administrador:** gestiona usuarios y clientes, ve jornadas en tiempo real, corrige registros con trazabilidad y descarga reportes Excel.

---

## 3. Foto funcional canónica — 2026-09-09

Esta sección resume las decisiones ya cerradas. Si otro documento parece contradecirla, revisar primero `01-CONSTITUCION.md`.

| Área | Decisión canónica |
|------|-------------------|
| Usuarios iniciales | ~5 consultores |
| Roles | Solo `admin` y `consultant` |
| Creación de cuentas | Solo un admin crea usuarios |
| Identificador visible | `username` basado en nombre + apellido |
| Recuperación de contraseña | No hay autoservicio ni correo; admin restablece |
| Contraseña visible | Nunca. Ni consultor ni admin pueden leer la contraseña actual |
| Clientes | Un consultor puede estar asignado a varios clientes |
| Cliente por jornada | Exactamente uno |
| Jornadas por día | Máximo una jornada no anulada por consultor y fecha |
| Jornadas abiertas | Máximo una abierta por consultor |
| Días permitidos | Cualquier día, incluidos sábados, domingos y feriados |
| Fechas pasadas | Permitidas mediante flujo histórico |
| Fechas futuras | Prohibidas |
| Hora ingreso/salida | Se registra y queda bloqueada para el consultor tras confirmar |
| Cálculo de horas | **NO** se calcula por ingreso/salida |
| Horas computables | Las declara manualmente el consultor en formato `HH:MM` |
| Acumulados | Suma de horas declaradas, convertidas internamente a minutos |
| Cronómetro | Prohibido |
| Actividades | Una o más por jornada; `área + descripción` |
| Descripción | Obligatoria, máximo 250 caracteres |
| Área `Otro` | Habilita nombre de área específico obligatorio |
| Edición consultor | Solo actividades mientras la jornada está abierta |
| Jornada cerrada | Solo lectura para consultor |
| Correcciones | Solo admin, siempre con motivo y auditoría |
| Salida sin actividades | Prohibida |
| Jornada anterior abierta | Bloquea iniciar otra |
| Geolocalización | Se solicita; si falla/rechaza, el registro continúa y queda incidencia |
| Tiempo real admin | Sí, para jornadas activas/cambios relevantes |
| Reportes | Excel por consultor o global, con filtros y branding APM |
| Branding | Verde `#B0BF12`, negro y blanco |
| Nombre | **APM Control** |

---

## 4. Fuente de verdad por dominio

| Dominio | Fuente de verdad |
|---------|-----------------|
| Código | GitHub, rama `main` para producción |
| Documentación | Esta carpeta `APM-Control-DOCS/` |
| Usuarios y credenciales | Supabase Auth |
| Rol autorizado | Supabase Auth `app_metadata.role` |
| Perfil/estado activo | PostgreSQL `profiles` en Supabase |
| Clientes y asignaciones | PostgreSQL en Supabase |
| Jornadas y actividades | PostgreSQL en Supabase |
| Auditoría | PostgreSQL en Supabase, append-only |
| Archivos Excel | Se generan bajo demanda; no son fuente de verdad |
| Hosting | Vercel |
| Branding | Tokens definidos en `05-STACK-TECNOLOGICO.md` |

**GitHub no es una base de datos.** Nunca almacenar registros operativos de asistencia, contraseñas, coordenadas reales o datos de usuarios dentro del repositorio.

---

## 5. Estados del producto

### 5.1 Estado actual

`PRE-IMPLEMENTACIÓN`

Todavía no existe código canónico de APM Control. Por tanto:

- `01-CONSTITUCION.md` define las reglas inmutables.
- `03-ARQUITECTURA.md` define el diseño objetivo que Codex debe implementar.
- `05-STACK-TECNOLOGICO.md` define el stack objetivo.
- Ningún documento debe fingir que una ruta, tabla o componente ya existe hasta que realmente exista.

### 5.2 Cuándo cambia a implementación corroborada

Después del primer MVP funcional:

1. Corroborar rutas, tablas, policies, scripts y dependencias contra el código real.
2. Actualizar encabezados a `sincronizado contra código` con fecha.
3. Registrar discrepancias reales en este índice si las hubiera.
4. No mantener dos descripciones paralelas de la misma cosa.

---

## 6. Fases de implementación

El orden de construcción recomendado es deliberado:

```text
[Fase 0] scaffold + repositorio + Vercel + Supabase local/dev
    |
    v
[Fase 1] auth + perfiles + roles + bootstrap primer admin
    |
    v
[Fase 2] clientes + asignaciones consultor-cliente
    |
    v
[Fase 3] jornada actual: ingreso -> actividades -> salida
    |
    v
[Fase 4] jornada histórica
    |
    v
[Fase 5] historial y acumulados del consultor
    |
    v
[Fase 6] dashboard + gestión admin + realtime
    |
    v
[Fase 7] correcciones + auditoría + anulaciones
    |
    v
[Fase 8] reportes Excel
    |
    v
[Fase 9] QA responsive + seguridad + producción
```

No construir reportes ni dashboard antes de que las reglas de datos y jornadas estén estables.

---

## 7. Decisiones abiertas antes del primer go-live

No bloquean el inicio del código, pero deben resolverse antes de producción:

| Tema | Estado |
|------|--------|
| Asset final del logo APM para UI/Excel | Pendiente de colocar en el repo |
| Nombre de dominio productivo | Puede empezar con URL de Vercel; dominio propio no es requisito MVP |
| Primer usuario admin | Se crea mediante bootstrap server-side seguro |
| Proyecto Supabase producción | Pendiente de crear/configurar |
| Proyecto Vercel producción | Pendiente de conectar al repositorio GitHub |
| UAT en celular real | Obligatorio antes de producción |

---

## 8. Cómo mantener estos documentos sanos

1. **No documentar imaginación como realidad.** Antes de escribir “existe X”, corroborar X en código/BD.
2. **No duplicar listas.** Si una lista canónica vive en un documento, los demás apuntan a ella.
3. **No crear docs por cada feature.** Incorporar el cambio en Constitución, Gobernanza, Arquitectura, Mapa o Stack según corresponda.
4. **Una decisión estructural se documenta antes o junto al código.** Nunca semanas después.
5. **Toda modificación de reglas de negocio revisa Constitución.** Si la contradice, no se implementa silenciosamente.
6. **Toda modificación de datos revisa Arquitectura y Gobernanza.** Incluye migraciones y RLS.
7. **Toda dependencia nueva revisa Stack.** Si no hay una razón clara, no se agrega.
8. **El Índice conserva solo contexto útil.** No convertirlo en un diario infinito de commits.

---

## 9. Quick links — escenarios comunes

| Quiero... | Leer |
|-----------|------|
| Entender el producto antes de empezar | `01-CONSTITUCION.md` |
| Saber si una idea rompe una regla | `01-CONSTITUCION.md` + `02-GOBERNANZA.md` |
| Implementar login/usuarios | `03-ARQUITECTURA.md` § Auth + `05-STACK-TECNOLOGICO.md` |
| Implementar jornadas | `03-ARQUITECTURA.md` § Flujo de jornada |
| Implementar RLS o migraciones | `03-ARQUITECTURA.md` § Datos + `02-GOBERNANZA.md` |
| Ver toda la app rápidamente | `04-MAPA-ASCII.md` |
| Implementar UI/branding | `05-STACK-TECNOLOGICO.md` § Design System |
| Agregar una librería | `05-STACK-TECNOLOGICO.md` + `02-GOBERNANZA.md` |
| Desplegar | `02-GOBERNANZA.md` § Deploy |
| Generar Excel | `03-ARQUITECTURA.md` § Reportes + `05-STACK-TECNOLOGICO.md` |

---

## 10. Regla para Codex

Al abrir este proyecto por primera vez:

1. Leer `00` → `01` → `02` → `03` → `04` → `05`.
2. Resumir el entendimiento antes de construir.
3. No inventar requisitos ausentes.
4. No reemplazar decisiones cerradas por “mejores prácticas” sin discutirlas.
5. No crear documentación adicional salvo solicitud explícita.
6. Si el código futuro contradice los docs, **detenerse y señalar el drift**; no decidir unilateralmente cuál gana.
