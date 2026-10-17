# ADR-006: Prisma como ORM

## Estado

Aceptado (2026-10-16).

## Contexto

El ORM puede ser:
- **A) Prisma:** ORM moderno con schema declarativo y migraciones automáticas.
- **B) Drizzle:** ORM ligero, SQL-first, TypeScript puro.
- **C) TypeORM:** ORM clásico, decoradores, integrado con NestJS.
- **D) SQL puro con `pg`:** sin ORM.

## Decisión

**Opción A — Prisma 6.x.**

- Schema declarativo en `prisma/schema.prisma`.
- Migraciones automáticas con `prisma migrate dev`.
- Cliente type-safe generado automáticamente.
- `prisma studio` para inspeccionar la BD.
- Soporte nativo de `Decimal`, `Timestamptz`, enums, relaciones.

## Alternativas consideradas

### Opción A — Prisma (elegida)

**Pros:**
- **DX excelente.** Schema declarativo, cliente type-safe, migraciones automáticas.
- **Migraciones versionadas.** Cada cambio genera un archivo SQL.
- **Prisma Studio.** Inspección visual de la BD.
- **Soporte de `Decimal` y `Timestamptz`.** Crítico para finanzas.
- **Comunidad grande.** Mucha documentación y ejemplos.

**Contras:**
- **No soporta índices parciales nativamente.** Hay que editarlos manualmente en `migration.sql`.
- **No soporta `CHECK` constraints nativamente.** Hay que editarlos manualmente.
- **Menos control sobre SQL.** El query builder no siempre genera el SQL óptimo.

### Opción B — Drizzle

**Pros:**
- **SQL-first.** Más control sobre el SQL generado.
- **Ligero.** Menos overhead que Prisma.
- **TypeScript puro.** Sin generación de cliente.

**Contras:**
- **Menos maduro.** Comunidad más chica.
- **Migraciones menos automáticas.** Más trabajo manual.
- **Sin Prisma Studio.**

### Opción C — TypeORM

**Pros:**
- Integrado con NestJS.
- Decoradores familiares.

**Contras:**
- **Menos moderno.** El proyecto está en declive.
- **Migraciones más manuales.**
- **Type-safety inferior a Prisma.**

### Opción D — SQL puro

**Pros:**
- Control total.

**Contras:**
- **Sin type-safety.**
- **Sin migraciones.**
- **Mucho código boilerplate.**

## Consecuencias

**Positivas:**
- DX excelente.
- Migraciones versionadas.
- Type-safety completo.
- Prisma Studio para inspección.

**Negativas:**
- **Índices parciales y CHECK manuales.** Mitigación: documentados en la migración SQL.
- **Menos control sobre SQL.** Aceptable para el MVP.

**Neutrales:**
- El schema Prisma es la fuente de verdad del modelo de datos.

## Referencias

- `docs/data-model.md` — modelo de datos.
- `apps/api/prisma/schema.prisma` — schema Prisma.
- `docs/acceptance-criteria.md` AC-GEN-01 a AC-GEN-12.
