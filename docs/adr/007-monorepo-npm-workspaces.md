# ADR-007: Monorepo con npm workspaces

## Estado

Aceptado (2026-10-16).

## Contexto

El proyecto tiene 3 paquetes: `apps/api` (NestJS), `apps/web` (Next.js), `packages/shared` (tipos compartidos). Hay 3 formas de organizarlos:
- **A) npm workspaces:** monorepo con workspaces nativos de npm.
- **B) Turborepo / Nx:** monorepo con orquestador de tareas.
- **C) Repos separados:** cada paquete es un repo independiente.

## Decisión

**Opción A — Monorepo con npm workspaces.**

- `package.json` raíz con `workspaces: ["apps/*", "packages/*"]`.
- Dependencias compartidas en la raíz.
- Scripts raíz que delegan a los workspaces (`npm run build --workspaces`).
- Lifecycle hooks (`predev`, `prebuild`, `pretest`) que compilan `packages/shared` antes de los workspaces.

## Alternativas consideradas

### Opción A — npm workspaces (elegida)

**Pros:**
- **Sin dependencias externas.** npm ya viene con Node.
- **Simple.** `npm install` en la raíz instala todo.
- **Suficiente.** Para 3 paquetes, no hace falta más.
- **Cache de dependencias.** npm cachea los paquetes entre workspaces.

**Contras:**
- **Sin cache de tareas.** A diferencia de Turborepo, no cachea builds.
- **Sin paralelización inteligente.** Los scripts raíz corren secuencialmente.

### Opción B — Turborepo / Nx

**Pros:**
- **Cache de tareas.** Builds más rápidos.
- **Paralelización.** Corre tareas en paralelo.
- **Grafos de dependencias.**

**Contras:**
- **Complejidad.** Configuración extra.
- **Overkill.** Para 3 paquetes, no se justifica.
- **Curva de aprendizaje.**

### Opción C — Repos separados

**Pros:**
- Independencia total.

**Contras:**
- **Sincronización manual.** Cambiar `shared` requiere publicar en npm y actualizar en api/web.
- **Difícil de testear.** No se puede testear el cambio completo en un solo commit.

## Consecuencias

**Positivas:**
- Simple.
- Sin dependencias externas.
- `npm install` resuelve todo.

**Negativas:**
- Sin cache de tareas. Aceptable para el MVP.
- Sin paralelización. Aceptable para 3 paquetes.

**Neutrales:**
- Si el proyecto crece a 10+ paquetes, se puede migrar a Turborepo.

## Referencias

- `package.json` raíz.
- `docs/domain-rules.md` sección 0.
- Plan maestro del proyecto, sección 9.
