# ADR-008: Soft delete híbrido

## Estado

Aceptado (2026-10-16).

## Contexto

Cuando el usuario borra una entidad, hay 2 formas de hacerlo:
- **A) Hard delete:** se borra físicamente de la BD.
- **B) Soft delete:** se marca `deletedAt = now()` y se filtra en las queries.

En una app financiera, hay que decidir:
- **¿Soft delete en todo?** Complejo, pero seguro.
- **¿Hard delete en todo?** Simple, pero sin recuperación.
- **¿Híbrido?** Soft delete en entidades financieras, hard delete en datos efímeros.

## Decisión

**Opción C — Soft delete híbrido.**

**Soft delete (`deletedAt DateTime?`):**
- `users`
- `accounts`
- `categories`
- `transactions`
- `recurrences`
- `obligations`
- `budgets`
- `savings_goals`
- `goal_contributions`
- `tags`

**Hard delete:**
- `refresh_tokens` (se revocan con `revokedAt`)
- `notifications` (efímeras)
- `transaction_tags` (pivote)
- `budget_categories` (pivote)

**Endpoints:**
- `POST /:entidad/:id/restore` para restaurar.
- `GET /:entidad?includeDeleted=true` para auditar.

**Índices únicos parciales** (`WHERE deleted_at IS NULL`) para permitir reusar nombres.

## Alternativas consideradas

### Opción A — Hard delete en todo

**Pros:**
- Simple.
- Menos storage.
- Sin filtros `deletedAt` en queries.

**Contras:**
- **Sin recuperación.** Si el usuario borra una cuenta por error, pierde todo el historial.
- **Sin auditoría.** No hay forma de saber qué se borró.
- **Malo para finanzas.** Los datos financieros son sensibles.

### Opción B — Soft delete en todo

**Pros:**
- Recuperación en todo.
- Auditoría en todo.

**Contras:**
- **Complejidad innecesaria** en pivotes y datos efímeros.
- **Storage.** Los datos borrados se quedan para siempre.
- **Filtros en todas las queries**, incluso en las que no importa.

### Opción C — Híbrido (elegida)

**Pros:**
- Recuperación en lo importante (datos financieros).
- Sin complejidad en lo efímero.
- Balance entre simplicidad y seguridad.

**Contras:**
- **Hay que decidir caso por caso.**
- **Algunas queries siguen necesitando filtro `deletedAt`.**

## Consecuencias

**Positivas:**
- Recuperación de datos financieros.
- Auditoría en entidades críticas.
- Sin overhead en pivotes.

**Negativas:**
- Todas las queries de entidades con soft delete necesitan `WHERE deletedAt IS NULL`.
- Los índices únicos tienen que ser parciales.
- **Mitigación:** documentado en `docs/data-model.md` sección 6.

**Neutrales:**
- Los datos financieros se conservan indefinidamente. Si el usuario quiere borrado real (GDPR), se hace con un endpoint especial (fuera del MVP).

## Referencias

- `docs/domain-rules.md` sección 12 (soft delete).
- `docs/data-model.md` sección 6 (soft delete).
- `docs/api-contracts.md` sección 0.9 (soft delete).
- `docs/acceptance-criteria.md` AC-GEN-06 a AC-GEN-09.
