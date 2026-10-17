# ADR-002: Saldos persistidos con endpoint de recálculo

## Estado

Aceptado (2026-10-16).

## Contexto

El saldo de una cuenta puede calcularse de 3 formas:
- **A) Calculado on-the-fly:** `SUM(movimientos)` en cada request.
- **B) Persistido:** columna `balance` en `accounts`, actualizada en cada movimiento.
- **C) Híbrido:** persistido + endpoint de recálculo para auditar.

## Decisión

**Opción C — Híbrido.**

- `accounts.balance` se persiste en la BD.
- Se actualiza **dentro de la misma transacción** que crea/edita/borra un movimiento.
- Existe un endpoint `POST /accounts/:id/recalculate` que recalcula desde cero sumando movimientos `CONFIRMED`.
- Existe un test de consistencia: tras N operaciones, `balance === SUM(movimientos CONFIRMED)`.

## Alternativas consideradas

### Opción A — Calculado on-the-fly

**Pros:**
- Siempre correcto. Sin desincronización.
- Sin lógica de actualización.

**Contras:**
- **Rendimiento.** Con 10,000 movimientos por cuenta, cada `GET /accounts` hace un `SUM` de 10,000 filas.
- **Complejidad en queries.** Cada lectura de cuenta requiere un join o subquery.
- **No hay valor persistido.** No se puede auditar ni comparar.

### Opción B — Solo persistido

**Pros:**
- Rápido. `balance` es una columna.
- Sin cálculo en lecturas.

**Contras:**
- **Riesgo de desincronización.** Si un bug actualiza `balance` sin el movimiento, o viceversa, la BD queda inconsistente para siempre.
- **Sin forma de auditar.** No hay "verdad absoluta" contra la cual comparar.

### Opción C — Híbrido (elegida)

**Pros:**
- **Rendimiento de B:** `balance` es una columna.
- **Auditoría de A:** el endpoint de recálculo permite verificar.
- **Test de consistencia:** detecta desincronización temprano.

**Contras:**
- **Complejidad.** Hay que mantener la lógica de actualización.
- **Disciplina.** Todos los movimientos deben actualizar `balance` en la misma transacción.

## Consecuencias

**Positivas:**
- Lecturas rápidas (`balance` es una columna).
- Auditoría disponible (endpoint `recalculate`).
- Consistencia verificable (test).

**Negativas:**
- Si alguien olvida actualizar `balance` en un movimiento, la BD queda inconsistente hasta el recálculo.
- **Mitigación:** code review + test de consistencia.

**Neutrales:**
- El endpoint `recalculate` es "caro" (SUM de todos los movimientos), pero solo se usa para auditoría, no en cada request.

## Referencias

- `docs/domain-rules.md` sección 2.4 (persistencia del saldo).
- `docs/api-contracts.md` sección 3.7 (`POST /accounts/:id/recalculate`).
- `docs/acceptance-criteria.md` AC-ACC-18, AC-ACC-19.
