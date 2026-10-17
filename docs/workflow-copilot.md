# MoneyFlow — Flujo de trabajo con Copilot

**Versión:** 1.0
**Fecha:** 2026-10-16
**Estado:** Aprobado

Este documento define el flujo de trabajo estándar con el agente Copilot en VS Code. Es la guía operativa del día a día. Cualquier persona (yo, un futuro colaborador) debe poder leerlo y saber cómo se trabaja una tarjeta de Trello.

---

## 1. Principio fundamental

**El agente NO commitea.** El control de commits es del responsable del proyecto. El agente deja los cambios en staging y espera instrucciones.

**Razón:** el responsable revisa cada cambio antes de commitear. Esto evita que el agente introduzca bugs, malas prácticas o cambios fuera de alcance sin supervisión.

---

## 2. Flujo de 3 fases

Cada tarjeta de Trello se ejecuta en **3 fases**:

| Fase | Quién | Qué entrega |
|---|---|---|
| **1. Investigación + Plan** | Agente | Plan en markdown (sin código). |
| **2. Revisión + Corrección** | Responsable + Agente | Plan corregido (sin código). |
| **3. Implementación** | Agente | Código + verificación. |
| **Commit** | Responsable | Commit manual. |

### 2.1 Fase 1 — Investigación + Plan

**Qué hace el agente:**
- Lee `AGENTS.md` del proyecto (si existe).
- Lee los documentos de referencia (`docs/domain-rules.md`, `docs/data-model.md`, `docs/api-contracts.md`, `docs/acceptance-criteria.md`, `docs/adr/`).
- Investiga el código existente (solo lectura).
- Propone un **plan de implementación** con:
  - Resumen de la tarea.
  - Estado verificado del repo.
  - Archivos a crear/modificar (rutas exactas).
  - Contenido propuesto de cada archivo clave.
  - Orden de ejecución paso a paso.
  - Tests propuestos.
  - Criterios de aceptación.
  - Riesgos y ambigüedades.
  - Estimación.
  - Preguntas para el responsable.

**Qué NO hace el agente:**
- NO escribe código.
- NO modifica archivos.
- NO toca Git.
- NO instala dependencias.

**Al terminar:** el agente se detiene y reporta el plan.

### 2.2 Fase 2 — Revisión + Corrección

**Qué hace el responsable:**
- Lee el plan del agente.
- Detecta errores, huecos, malas interpretaciones.
- Propone correcciones (o pide correcciones al agente).

**Qué hace el agente:**
- Aplica las correcciones al plan.
- Devuelve el plan corregido.
- Se detiene y espera luz verde.

**Si algo falla:** vuelve a Fase 2 hasta que el plan esté aprobado.

### 2.3 Fase 3 — Implementación

**Qué hace el agente:**
- Aplica el plan aprobado.
- Escribe el código.
- Ejecuta los tests.
- Verifica `tsc --noEmit`, `lint`, `build`.
- Deja los cambios en staging (`git add -A`).
- Reporta el resultado.

**Qué NO hace el agente:**
- NO commitea.
- NO hace `git push`.
- NO hace `git tag`.
- NO hace `git reset`.

**Al terminar:** el responsable revisa el trabajo, lo valida, y commitea manualmente.

### 2.4 Commit

**Qué hace el responsable:**
- Revisa el `git diff --cached`.
- Valida que los criterios de aceptación se cumplen.
- Si todo está bien: `git commit` + `git push`.
- Si algo falla: pide correcciones (vuelve a Fase 3).

---

## 3. Plantilla de prompt de Fase 1

**Copiá esta plantilla y adaptala a cada tarjeta.**

```text
====================================================================
MF-NN — {Título de la tarjeta}
FASE 1 de 3 — INVESTIGACIÓN + PLAN (SOLO LECTURA)
====================================================================

RUTAS:
- Backend (EDITABLE): C:\Users\Jimena\Documentos\moneyflow\apps\api
- Frontend (EDITABLE): C:\Users\Jimena\Documentos\moneyflow\apps\web
- Shared (EDITABLE): C:\Users\Jimena\Documentos\moneyflow\packages\shared

Lee AGENTS.md del proyecto si existe. Si no existe, ignoralo.

====================================================================
REGLA DE COMMITS
====================================================================

NO ejecutes git commit, git tag, git push, git reset ni ningún
comando que altere el historial.

Al terminar, deja los cambios en staging y reporta. El responsable
commitea después de validar.

====================================================================
REGLA DE ESTA FASE
====================================================================

Esta es FASE 1 de 3. SOLO INVESTIGACIÓN Y PLAN.
NO escribas código. NO edites archivos. NO instales dependencias.

Sí puedes ejecutar comandos de lectura (git status, git log,
cat, etc.).

Al terminar, devuelve un PLAN en markdown y DETENTE.

====================================================================
CONTEXTO DEL PROYECTO
====================================================================

MoneyFlow es una aplicación web de gestión y planificación de
finanzas personales. Monorepo con npm workspaces:
- apps/api: NestJS 11 + Prisma 6 + PostgreSQL 16.
- apps/web: Next.js 15 + React 19 + Tailwind 4.
- packages/shared: tipos compartidos (zod).

Estado actual (Sprint 1 cerrado):
- Monorepo configurado y funcionando.
- apps/api con NestJS, PrismaService y conexión a PostgreSQL
  verificada.
- apps/web con Next.js y Tailwind.
- Schema Prisma con 14 modelos y 10 enums (soft delete híbrido).
- Migración init aplicada.
- docs/domain-rules.md, docs/data-model.md, docs/api-contracts.md,
  docs/acceptance-criteria.md, docs/adr/, docs/workflow-copilot.md
  redactados y aprobados.

====================================================================
TARJETA TRELLO
====================================================================

Código: MF-NN
Título: {Título de la tarjeta}
Sprint: {Número del sprint}
Módulo: {Módulo}
Prioridad: {Alta/Media/Baja}
Dependencias: {MF-XX cerrada / ninguna}

====================================================================
DESCRIPCIÓN DE LA TAREA
====================================================================

{Descripción detallada de la tarea. Qué debe hacer, qué NO debe
hacer, criterios de aceptación. Referenciar docs relevantes.}

====================================================================
ALCANCE (QUÉ SÍ)
====================================================================

{Lista de cosas que SÍ debe hacer el agente.}

====================================================================
QUÉ NO HACER (FUERA DE ALCANCE)
====================================================================

{Lista de cosas que NO debe hacer el agente.}

====================================================================
CONVENCIONES
====================================================================

- Todo el código, comentarios, docs en español.
- Sin any.
- Montos: Decimal(12, 2). Fechas: Timestamptz(6).
- IDs: UUID v4.
- Commits en español con conventional commits (aunque en esta
  Fase 1 no commitees).

====================================================================
CRITERIOS DE ACEPTACIÓN
====================================================================

{Lista de criterios verificables. Referenciar AC-XXX-NN de
docs/acceptance-criteria.md.}

====================================================================
PASO 0 — RECONOCIMIENTO (SOLO LECTURA)
====================================================================

cd C:\Users\Jimena\Documentos\moneyflow
git status
git branch --show-current
git log --oneline -3

Confirmar working tree limpio y rama dev.

====================================================================
FASE 1 — INVESTIGACIÓN (SOLO LECTURA)
====================================================================

{Lista de archivos a leer, comandos de búsqueda, etc.}

====================================================================
FASE 2 — PLAN (PROPONER, NO EDITAR)
====================================================================

Presentar:
1. Resumen de la tarea.
2. Estado verificado del repo.
3. Archivos a crear/modificar (rutas exactas).
4. Contenido propuesto de cada archivo clave.
5. Orden de ejecución paso a paso.
6. Tests propuestos.
7. Criterios de aceptación.
8. Riesgos y ambigüedades.
9. Estimación.
10. Preguntas para el responsable.

DETENERSE al final de Fase 2. Esperar confirmación.

====================================================================
FASE 3 — IMPLEMENTACIÓN (tras confirmación)
====================================================================

Aplicar el plan aprobado.

====================================================================
VERIFICACIÓN
====================================================================

- npx tsc --noEmit limpio.
- npm run test verde.
- npm run lint limpio.
- npm run build exit 0.
- git status sin commit.

====================================================================
REGLAS DURAS
====================================================================

- NO commit. NO console.log. NO as any.
- Si algo no cuadra, DETENERSE y reportar.
- Si algún archivo requiere más cambios de los previstos,
  DETENERSE y reportar.

====================================================================
FORMATO DE ENTREGA
====================================================================

## Fase 1 — Investigación
{Pegar fragmentos con archivo:línea.}

## Fase 2 — Plan
{Plan completo en markdown.}

## PAUSA — esperar confirmación.

## Fase 3 — Implementación (tras confirmación)
{Diffs + outputs.}

DETENERSE al final. NO commitear.
4. Plantilla de prompt de Fase 3
Cuando el plan está aprobado, se le pasa esta plantilla al agente:

text
====================================================================
MF-NN — {Título de la tarjeta}
FASE 3 de 3 — IMPLEMENTACIÓN
====================================================================

RUTAS:
- Backend (EDITABLE): C:\Users\Jimena\Documentos\moneyflow\apps\api
- Frontend (EDITABLE): C:\Users\Jimena\Documentos\moneyflow\apps\web
- Shared (EDITABLE): C:\Users\Jimena\Documentos\moneyflow\packages\shared

====================================================================
REGLA DE COMMITS (CRÍTICA)
====================================================================

NO ejecutes:
- git commit
- git tag
- git push
- git reset
- Ningún comando que altere el historial.

Cuando termines:
1. Ejecuta `git add -A` para staging.
2. Ejecuta `git status` y `git diff --cached --stat`.
3. NO hagas commit.
4. Reporta el resultado.

El responsable revisará los cambios y ejecutará el commit manualmente.

====================================================================
CONTEXTO
====================================================================

Fase 1 (investigación) y Fase 2 (plan corregido) están aprobadas.
Aplicar el plan final.

{Resumen del plan aprobado.}

====================================================================
CAMBIOS A APLICAR
====================================================================

{Lista de cambios con detalle. Diffs propuestos.}

====================================================================
ORDEN DE EJECUCIÓN
====================================================================

{Orden numerado de ejecución.}

====================================================================
VERIFICACIÓN
====================================================================

- npx tsc --noEmit limpio.
- npm run test verde.
- npm run lint limpio.
- npm run build exit 0.
- git add -A.
- git status y git diff --cached --stat.
- NO commitear.

====================================================================
REGLAS DURAS
====================================================================

- NO commit. NO console.log. NO as any.
- NO tocar archivos fuera del alcance.
- Si algo falla, DETENERSE y reportar.

====================================================================
FORMATO DE ENTREGA
====================================================================

1. Lista de archivos creados/modificados.
2. Diff de cada archivo.
3. Output de tsc, tests, lint, build.
4. git status y git diff --cached --stat.
5. Confirmación de que NO se commiteó.

DETENERSE al final. NO commitear.
5. Definition of Done
Cada tarjeta está terminada cuando:

□ La funcionalidad cumple los requisitos del plan.
□ La validación existe en el backend.
□ Los permisos están comprobados (aislamiento por usuario).
□ Se manejan los errores esperables.
□ Las pruebas relevantes pasan.
□ La interfaz incluye estados de carga y ausencia de datos (frontend).
□ El diseño es responsive (frontend).
□ La documentación está actualizada.
□ Los cambios están versionados en Git.
□ tsc --noEmit, lint, build, test pasan.
□ El commit está hecho y pusheado.
6. Convención de commits
Formato: conventional commits en español.

text
<tipo>(<alcance>): <descripción corta> (MF-NN)
Tipos:

feat: nueva funcionalidad.

fix: corrección de bug.

docs: documentación.

style: formato (sin cambios funcionales).

refactor: refactorización.

test: tests.

build: build / dependencias.

ci: CI/CD.

chore: mantenimiento.

Alcances típicos:

auth, users, accounts, categories, transactions, transfers, recurrences, obligations, budgets, savings-goals, tags, notifications.

db, api, web, shared.

Ejemplos:

text
feat(auth): implementar registro y login con JWT (MF-12)

fix(accounts): recalcular saldo correctamente al editar movimientos (MF-18)

docs(adr): redactar ADR-009 sobre rate limiting (MF-45)

chore(db): agregar migración para índices de reportes (MF-33)
7. Convención de ramas
Formato: tipo/MF-NN-descripcion-corta.

Tipos:

feat/MF-NN-descripcion

fix/MF-NN-descripcion

docs/MF-NN-descripcion

chore/MF-NN-descripcion

test/MF-NN-descripcion

Ejemplos:

text
feat/MF-12-auth-jwt
fix/MF-18-recalcular-saldo
docs/MF-03-domain-rules
test/MF-25-transactions-tests
Flujo:

bash
# 1. Asegurarte de estar en dev actualizado
git checkout dev
git pull origin dev

# 2. Crear rama de la tarjeta
git checkout -b feat/MF-12-auth-jwt

# 3. Trabajar. El agente deja los cambios en staging.

# 4. Commitear manualmente
git commit -m "feat(auth): implementar registro y login con JWT (MF-12)"

# 5. Push
git push origin feat/MF-12-auth-jwt

# 6. Merge a dev (o crear PR)
git checkout dev
git merge --no-ff feat/MF-12-auth-jwt
git branch -d feat/MF-12-auth-jwt
git push origin dev
8. Cómo se relacionan Trello, prompts y commits
text
Trello (tarjeta MF-NN)
   ↓
Prompt de Fase 1 → Agente investiga y propone plan
   ↓
Revisión del plan (Fase 2)
   ↓
Plan aprobado
   ↓
Prompt de Fase 3 → Agente implementa
   ↓
Cambios en staging (sin commit)
   ↓
Revisión del responsable
   ↓
Commit + push (responsable)
   ↓
Trello: tarjeta a "Done"
Cada tarjeta de Trello:

Tiene un código único (MF-NN).

Tiene un título descriptivo.

Tiene una descripción detallada.

Tiene un checklist de criterios.

Tiene prioridad y dependencias.

9. Manejo de errores
Si el agente se sale del alcance
Síntoma: modifica archivos que no estaban en el plan, agrega funcionalidades no pedidas, o commitea sin permiso.

Acción: detenerlo con un mensaje claro: "DETENERSE. Solo los archivos X, Y, Z están en el alcance. Revertir cambios fuera de alcance."

Prevención: las "Reglas duras" del prompt deben ser explícitas.

Si el agente no puede resolver algo
Síntoma: reporta "no puedo", "no sé", o inventa una solución.

Acción: el responsable le da más contexto o divide la tarea en tarjetas más pequeñas.

Prevención: el plan de Fase 1 debe detectar ambigüedades antes de implementar.

Si el build falla después de la implementación
Síntoma: tsc --noEmit o npm run build falla.

Acción: el agente debe reportar el error completo y esperar instrucciones. NO improvisar.

Prevención: los tests deben correr en Fase 3 antes de reportar.

Si el agente commitea sin permiso
Síntoma: aparece un commit en git log que el responsable no autorizó.

Acción: git reset --soft HEAD~1 para deshacer el commit (los cambios quedan en staging). Luego reportar al agente.

Prevención: la regla de commits está en el prompt de Fase 3 y en AGENTS.md.

10. Checklist antes de cerrar una tarjeta
□ El plan de Fase 1 fue revisado y aprobado.
□ El plan de Fase 2 fue corregido si era necesario.
□ La implementación de Fase 3 está completa.
□ tsc --noEmit pasa.
□ npm run lint pasa.
□ npm run test pasa.
□ npm run build pasa.
□ Los criterios de aceptación se cumplen.
□ Los archivos están en staging.
□ El responsable revisó el diff.
□ El commit está hecho y pusheado.
□ La tarjeta de Trello está en "Done".
11. Preguntas abiertas
(Esta sección debe quedar vacía antes de cerrar el Sprint 1.)

Sin preguntas abiertas por el momento.
