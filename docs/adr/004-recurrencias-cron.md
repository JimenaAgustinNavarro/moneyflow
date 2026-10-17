# ADR-004: Recurrencias con cron diario + constraint único

## Estado

Aceptado (2026-10-16).

## Contexto

Los pagos recurrentes (luz, agua, alquiler) generan obligaciones periódicas. Hay 2 formas de generarlas:
- **A) Generación programada:** un cron diario crea las obligaciones del período.
- **B) Generación on-read:** cada vez que el usuario abre el dashboard, se generan las obligaciones faltantes.

En cualquiera de las 2, hay un riesgo: **duplicados** si el proceso corre dos veces.

## Decisión

**Opción A — Cron diario + constraint único `(recurrenceId, periodStart)`.**

- Un cron diario (a las 00:00 `America/Lima`) genera las obligaciones de los próximos 30 días.
- La tabla `obligations` tiene un constraint único `(recurrenceId, periodStart)`.
- Si el cron corre dos veces para el mismo período, la segunda falla con P2002 (que se captura y se ignora).
- La migración agrega un **índice único parcial** (`WHERE deleted_at IS NULL`) y un **CHECK** de idempotencia.

## Alternativas consideradas

### Opción A — Cron diario (elegida)

**Pros:**
- **Idempotencia garantizada.** El constraint único bloquea duplicados.
- **Predecible.** Las obligaciones se generan a la misma hora todos los días.
- **Testeable.** El cron se puede correr manualmente en tests.
- **Escalable.** El cron procesa solo lo que falta, no todo.

**Contras:**
- **Requiere infraestructura de cron.** En un monolito NestJS, se usa `@nestjs/schedule`.
- **Delay.** Si el cron falla un día, las obligaciones se generan al día siguiente.

### Opción B — On-read

**Pros:**
- Sin cron. Menos infraestructura.
- Siempre al día.

**Contras:**
- **Requests lentos.** Cada `GET /dashboard` puede generar obligaciones, lo que agrega latencia.
- **Race conditions.** Si dos requests simultáneos generan la misma obligación, hay duplicados.
- **Difícil de testear.** El comportamiento depende del estado del dashboard.

## Consecuencias

**Positivas:**
- Idempotencia garantizada por BD.
- Generación predecible.
- Testeable manualmente.

**Negativas:**
- Requiere `@nestjs/schedule` o un servicio externo de cron.
- **Delay de 1 día** si el cron falla.

**Neutrales:**
- El rango de 30 días es configurable.

## Referencias

- `docs/domain-rules.md` sección 5.2 (generación de obligaciones).
- `docs/data-model.md` sección 2.6 (constraint `(recurrenceId, periodStart)`).
- `docs/api-contracts.md` sección 6.2 (crear recurrencia).
- `docs/acceptance-criteria.md` AC-REC-12, AC-OBL-18, AC-OBL-19.
