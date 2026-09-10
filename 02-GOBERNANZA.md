# APM Control — Gobernanza

> **Versión:** 1.0.0 | **Vigencia desde:** 2026-09-09
> Este documento define **cómo se toman decisiones y cómo se ejecutan cambios** en APM Control. La Constitución dice qué no se rompe; este documento dice cómo trabajar sin romperlo.

---

## 1. Roles operativos

| Rol | Quién es | Qué puede decidir |
|-----|----------|-------------------|
| **Owner del producto** | Responsable designado por APM Group | Requisitos, prioridades, UX, reglas de negocio, cambios a la Constitución, go-live |
| **Administrador funcional** | Usuario `admin` de APM Control | Usuarios, clientes, asignaciones, correcciones de asistencia y reportes dentro de las reglas existentes |
| **Agente IA de desarrollo** | Codex | Implementar, refactorizar, probar y documentar bajo dirección del owner; no decide producto |
| **Consultor** | Usuario `consultant` | Registrar su propia información dentro de los flujos permitidos; no decide reglas ni arquitectura |

**Regla:** Codex puede proponer alternativas, pero no convertir una propuesta en decisión de producto por su cuenta.

---

## 2. Ciclo de cambio

```text
[idea / bug / solicitud]
        |
        v
[leer docs afectados]
        |
        v
[¿contradice 01-CONSTITUCION?]
        |
        +-- sí --> [detener implementación]
        |          [explicar conflicto al owner]
        |          [si owner aprueba: actualizar Constitución primero]
        |
        +-- no --> [diseñar cambio mínimo]
                     |
                     v
                [si toca BD: migración + RLS + invariantes]
                     |
                     v
                [implementar]
                     |
                     v
                [lint + typecheck + tests + build]
                     |
                     v
                [UAT si cambia UI/flujo]
                     |
                     v
                [actualizar docs canónicos si cambió arquitectura/stack/regla]
                     |
                     v
                [commit]
                     |
                     v
                [Preview Vercel desde branch]
                     |
                     v
                [merge a main]
                     |
                     v
                [Production Vercel]
```

### Regla de oro

**Antes de afirmar que algo existe en el proyecto, corroborarlo contra el código o la BD real.**

Mientras APM Control esté en pre-implementación, los documentos son prescriptivos. Después de implementar una pieza, pasan a ser descriptivos solo cuando se corroboren.

---

## 3. Orden de implementación inicial

No construir todo en una sola instrucción a Codex.

### Fase 0 — Fundaciones

- Crear proyecto Next.js + TypeScript.
- Configurar Tailwind/shadcn/Lucide.
- Conectar Supabase.
- Crear estructura de env vars sin secretos versionados.
- Conectar GitHub ↔ Vercel.
- Añadir scripts `lint`, `typecheck`, `test`, `build`.

**Done when:** app base compila local y en Preview Vercel.

### Fase 1 — Auth y usuarios

- Migraciones de perfiles/roles.
- Login por username visible.
- Alias técnico de Auth server-side.
- Primer admin mediante bootstrap seguro.
- Middleware/gates de usuario activo.
- CRUD administrativo de usuarios.
- Restablecimiento de contraseña solo admin.

**Done when:** admin entra, crea consultant, consultant entra y no puede acceder a `/admin`.

### Fase 2 — Clientes y asignaciones

- Tabla clientes.
- Tabla asignaciones.
- CRUD admin.
- Consultant solo ve clientes activos que tiene asignados.

### Fase 3 — Jornada actual

- Inicio de jornada.
- Confirmación de ingreso.
- Geolocalización de entrada no bloqueante.
- Actividades CRUD mientras está abierta.
- Cierre con salida + horas declaradas.
- Geolocalización de salida.
- Confirmación final.

### Fase 4 — Histórico

- Flujo de fecha pasada.
- Se guarda como registro histórico y se cierra en la misma operación.
- `record_mode='historical'`.
- Ubicación, si existe, es de envío, no del pasado.

### Fase 5 — Historial consultor

- Listado de jornadas.
- Detalle solo lectura.
- Total de horas declaradas.

### Fase 6 — Admin operativo

- Dashboard.
- Realtime de jornadas.
- Filtros.
- Detalle.
- Cierre administrativo de pendiente.

### Fase 7 — Correcciones y auditoría

- Corrección con motivo.
- Auditoría append-only.
- Anulación sin hard-delete.

### Fase 8 — Excel

- Detalle + resumen.
- Filtros.
- Branding APM.
- Descarga móvil/escritorio.

### Fase 9 — Producción

- UAT móvil real.
- UAT escritorio.
- Revisión RLS.
- Revisión secretos.
- Pruebas E2E críticas.
- Merge a `main` y go-live.

---

## 4. Convenciones de código

### 4.1 Commits

Conventional commits en español:

```text
feat(scope):       funcionalidad nueva
fix(scope):        corrección de comportamiento
refactor(scope):   cambio interno sin alterar comportamiento
security(scope):   endurecimiento o cierre de vulnerabilidad
style(scope):      presentación/UI sin cambio funcional
test(scope):       pruebas
docs(scope):       documentación
chore(scope):      tooling/config/dependencias
perf(scope):       rendimiento sin cambio funcional
```

Scopes recomendados:

```text
auth
users
clients
attendance
activities
reports
audit
geo
ui
db
deploy
docs
```

**Prohibido:** tipos compuestos como `feat+fix:`.

### 4.2 Branches

```text
main                 producción
feat/<descripcion>   funcionalidad
fix/<descripcion>    bug
security/<desc>      seguridad
docs/<desc>          docs
refactor/<desc>      refactor
```

Reglas:

1. No desarrollar features directamente sobre `main` salvo hotfix autorizado.
2. Toda branch parte de `main` actualizado.
3. Toda branch obtiene Preview Deployment en Vercel.
4. Solo mergear cuando build y checks estén en verde.
5. Producción sale de `main`.

### 4.3 Nombres

- Código y DB: inglés técnico consistente (`attendance_sessions`, `declared_minutes`).
- Texto visible al usuario: español profesional.
- Componentes: `PascalCase`.
- Funciones/variables: `camelCase`.
- Tablas/columnas: `snake_case`.
- Enums DB: valores ingleses estables, labels UI traducidos.

---

## 5. Migraciones Supabase

### 5.1 Regla general

**Toda modificación de esquema se versiona en `supabase/migrations/`.**

No crear tablas/columnas/policies manualmente en producción y olvidarlas fuera del repo.

Cada migración debe:

1. ser idempotente cuando sea razonable;
2. añadir constraints relevantes;
3. habilitar RLS si crea tabla de negocio;
4. crear policies mínimas;
5. conservar datos existentes;
6. evitar hard-delete accidental;
7. tener rollback conceptual documentable aunque no exista `down` automático.

### 5.2 Si el cambio toca datos sensibles

Considerar sensibles dentro del contexto del producto:

- username y nombre de usuario;
- coordenadas;
- registros de asistencia;
- clientes asignados;
- correcciones y auditoría;
- credenciales de Auth.

La UI nunca decide por sí sola quién puede leer/escribir estos datos.

### 5.3 Cambios masivos

Antes de un backfill/update masivo:

1. ejecutar consulta de conteo;
2. simular qué filas cambiarán;
3. respaldar si el cambio no es trivialmente reversible;
4. aplicar con condición acotada;
5. volver a contar/verificar;
6. no tocar auditoría histórica.

---

## 6. Panel de invariantes

Antes de mergear cualquier cambio que toque:

```text
supabase/migrations/*
auth / login
RLS
roles
is_active
attendance_sessions
attendance_activities
attendance_audit_log
report totals
```

se deben verificar como mínimo estas invariantes:

```text
[ ] No existe más de 1 jornada no anulada por consultant/date
[ ] No existe más de 1 jornada open por consultant
[ ] No existen fechas futuras
[ ] closed no puede ser modificado por consultant
[ ] salida no puede cerrarse con 0 actividades
[ ] declared_minutes es independiente de entry/exit
[ ] totals/reportes suman declared_minutes
[ ] inactive user no lee/escribe datos
[ ] consultant solo ve sus datos
[ ] consultant solo usa clientes asignados
[ ] admin correction deja audit log
[ ] audit log no tiene UPDATE/DELETE desde app
[ ] no hay secret key en bundle/browser/git
```

En el MVP estos checks pueden empezar como tests SQL/integration. Si el proyecto crece, consolidarlos en un script ejecutable.

---

## 7. Cambios que requieren decisión explícita del owner

No implementar silenciosamente ninguno de estos cambios:

- crear un tercer rol;
- permitir dos clientes por jornada;
- calcular horas automáticamente;
- introducir cronómetro;
- bloquear registro por geolocalización;
- permitir al consultor editar jornada cerrada;
- permitir self-service de contraseña;
- incluir recuperación por email;
- almacenar más datos personales;
- añadir mapas/reverse geocoding;
- añadir notificaciones push/email;
- cambiar Supabase/Vercel/GitHub como pilares;
- cambiar `main` como producción;
- eliminar auditoría o permitir hard-delete;
- cambiar catálogo de áreas de forma incompatible;
- añadir documentos canónicos nuevos.

El proceso es:

```text
propuesta
  -> impacto
  -> decisión owner
  -> actualizar Constitución/Arquitectura/Stack
  -> implementar
```

---

## 8. Tech debt

### 8.1 Qué sí puede quedar como deuda

- mejoras visuales no bloqueantes;
- optimizaciones de queries cuando todavía no hay escala;
- filtros secundarios;
- analytics internos;
- refinamientos de animación;
- automatización adicional de QA.

### 8.2 Qué NO se acepta como deuda

- RLS ausente;
- contraseñas en tablas propias;
- secret key expuesta;
- totals calculados desde ingreso/salida;
- jornadas duplicadas por race condition;
- correcciones sin auditoría;
- usuario inactivo con acceso;
- reportes que no coinciden con DB;
- docs que afirman una arquitectura distinta a la real después de corroborar.

---

## 9. Proceso para archivar o reemplazar una funcionalidad

Si una feature deja de usarse:

1. Confirmar que ningún flujo activo depende de ella.
2. Retirar navegación primero.
3. Mantener datos históricos.
4. Eliminar código muerto en un cambio separado si ya es seguro.
5. Actualizar los cinco documentos canónicos donde corresponda.
6. No dejar texto que haga parecer activa una feature archivada.

---

## 10. Deploy

### 10.1 Entornos

```text
Local        -> desarrollo
Preview      -> branch/PR en Vercel
Production   -> main
```

### 10.2 Flujo

```bash
git checkout main
git pull

git checkout -b feat/<cambio>
# implementar

npm run lint
npm run typecheck
npm run test
npm run build

git add -A
git commit -m "feat(scope): descripcion"
git push -u origin feat/<cambio>
# revisar Preview Vercel
# UAT si aplica
# merge a main
```

El merge/push a `main` dispara producción mediante la integración Git de Vercel.

### 10.3 No hacer

- no desplegar producción desde una branch de feature;
- no probar migraciones destructivas directamente en prod;
- no asumir que “build pasó” equivale a “RLS está bien”;
- no mezclar env vars Preview y Production sin revisar scopes.

---

## 11. Secretos y variables de entorno

### 11.1 Reglas

1. `.env*` reales están en `.gitignore`.
2. Solo se versiona `.env.example` si el proyecto lo necesita; nunca valores.
3. La clave pública/publishable de Supabase puede estar en cliente.
4. La secret key de Supabase **solo** vive server-side.
5. Ningún log imprime contraseñas, secret keys o tokens de sesión.
6. El alias técnico de email no se muestra al usuario.
7. Preview y Production usan sus propios valores en Vercel.

### 11.2 Rotación

Si un secreto entra a Git:

1. retirarlo del working tree;
2. rotarlo inmediatamente;
3. actualizar Vercel/local;
4. verificar que el viejo dejó de funcionar;
5. después evaluar limpieza de historia si corresponde.

No basta con “borrar el archivo del último commit”.

---

## 12. UAT obligatorio

### Consultor móvil

Probar en navegador móvil real:

- login;
- inicio jornada;
- permitir/rechazar ubicación;
- agregar actividad;
- editar actividad;
- agregar `Otro`;
- cerrar jornada;
- historial;
- descarga no requerida en consultor.

### Admin escritorio

- login;
- crear consultant;
- asignar clientes;
- ver jornada activa;
- corregir registro con motivo;
- anular;
- filtrar;
- descargar Excel.

### Casos de bloqueo

- jornada abierta previa;
- intento de fecha futura;
- salida sin actividades;
- consultant entrando a `/admin`;
- usuario desactivado;
- password incorrecta;
- GPS rechazado.

---

## 13. Gobernanza de documentación

### 13.1 Solo seis archivos

La documentación canónica de APM Control es:

```text
00-INDICE.md
01-CONSTITUCION.md
02-GOBERNANZA.md
03-ARQUITECTURA.md
04-MAPA-ASCII.md
05-STACK-TECNOLOGICO.md
```

**Codex no debe crear `README`, `DECISIONS`, `AUTH_FLOW`, `DATABASE`, `REPORTS`, `DESIGN_SYSTEM`, `FEATURE-*` ni equivalentes por iniciativa propia.** Esa información ya tiene un hogar.

### 13.2 Dónde actualizar cada cosa

| Cambio | Documento principal |
|--------|---------------------|
| Regla que no debe romperse | `01-CONSTITUCION.md` |
| Proceso de trabajo/deploy | `02-GOBERNANZA.md` |
| Flujo, tabla, RLS, ruta, componente | `03-ARQUITECTURA.md` |
| Vista rápida/árbol/mapa | `04-MAPA-ASCII.md` |
| Librería, versión, diseño, env var | `05-STACK-TECNOLOGICO.md` |
| Navegación entre docs/estado global | `00-INDICE.md` |

### 13.3 Después de implementar

Cada vez que un cambio modifica una afirmación documentada:

- código y doc viajan en el mismo cambio;
- actualizar versión/fecha relevante;
- si existe drift previo, registrarlo y corregirlo;
- no conservar dos versiones “por si acaso”. Git ya conserva el historial.
