# Architecture Decision Records — MoneyFlow

Este directorio contiene los ADRs (Architecture Decision Records) del proyecto MoneyFlow. Cada ADR documenta una decisión arquitectónica importante: contexto, decisión, alternativas y consecuencias.

## Índice

| ADR | Título | Estado | Fecha |
|---|---|---|---|
| [ADR-001](./001-monolito-modular.md) | Monolito modular en lugar de microservicios | Aceptado | 2026-10-16 |
| [ADR-002](./002-saldos-persistidos.md) | Saldos persistidos con endpoint de recálculo | Aceptado | 2026-10-16 |
| [ADR-003](./003-transferencias-dos-movimientos.md) | Transferencias como dos movimientos enlazados | Aceptado | 2026-10-16 |
| [ADR-004](./004-recurrencias-cron.md) | Recurrencias con cron diario + constraint único | Aceptado | 2026-10-16 |
| [ADR-005](./005-jwt-propio.md) | JWT propio con refresh token rotativo | Aceptado | 2026-10-16 |
| [ADR-006](./006-prisma-orm.md) | Prisma como ORM | Aceptado | 2026-10-16 |
| [ADR-007](./007-monorepo-npm-workspaces.md) | Monorepo con npm workspaces | Aceptado | 2026-10-16 |
| [ADR-008](./008-soft-delete-hibrido.md) | Soft delete híbrido | Aceptado | 2026-10-16 |

## Formato

Cada ADR sigue el formato estándar:

- **Estado:** Aceptado / Propuesto / Rechazado / Deprecado.
- **Contexto:** qué problema motiva la decisión.
- **Decisión:** qué se decidió.
- **Alternativas consideradas:** opciones evaluadas con pros y contras.
- **Consecuencias:** positivas, negativas y neutrales.
- **Referencias:** enlaces a docs relacionados.

## Cómo agregar un ADR

1. Copiar el template de un ADR existente.
2. Asignar el siguiente número (ADR-NNN).
3. Documentar contexto, decisión, alternativas y consecuencias.
4. Actualizar el índice de este README.
5. Commitear con `docs(adr): agregar ADR-NNN <título>`.
