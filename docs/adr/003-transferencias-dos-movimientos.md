# ADR-003: Transferencias como dos movimientos enlazados

## Estado

Aceptado (2026-10-16).

## Contexto

Una transferencia entre dos cuentas propias puede modelarse como:
- **A) Una entidad `transfers` separada** con dos patas (`origin`, `destination`).
- **B) Dos movimientos enlazados** con `transferId` compartido.
- **C) Un movimiento único** con `accountId` origen y `counterpartAccountId` destino.

## Decisión

**Opción B — Dos movimientos enlazados con `transferId` compartido.**

Cada transferencia crea:
- **Pata origen:** `type: "TRANSFER"`, `accountId = origen`, `counterpartAccountId = destino`, `amount > 0`.
- **Pata destino:** `type: "TRANSFER"`, `accountId = destino`, `counterpartAccountId = origen`, `amount > 0`.

Ambas patas tienen el mismo `transferId`, `amount`, `date`, `status`.

## Alternativas consideradas

### Opción A — Entidad `transfers` separada

**Pros:**
- Modelo más limpio conceptualmente. "Una transferencia es una entidad".

**Contras:**
- **Doble representación.** El saldo de una cuenta se calcula con `transactions`, pero las transferencias están en otra tabla. Habría que hacer join en cada query de saldo.
- **Reportes más complejos.** Los reportes de movimientos tienen que unir `transactions` + `transfers`.
- **Más código.** Cada operación (crear, editar, borrar) toca 2 tablas.

### Opción B — Dos movimientos enlazados (elegida)

**Pros:**
- **Modelo simple.** Todo está en `transactions`.
- **Saldos triviales.** `balance = SUM(transactions WHERE accountId = X)`.
- **Reportes unificados.** `WHERE type != 'TRANSFER'` excluye transferencias.
- **Menos código.** Crear = 2 inserts. Borrar = 2 soft deletes.

**Contras:**
- **Redundancia.** Cada transferencia son 2 filas.
- **Riesgo de desincronización.** Las 2 patas deben tener el mismo `amount`, `date`, `status`.

### Opción C — Un movimiento único

**Pros:**
- Menos filas.

**Contras:**
- **Saldo inconsistente.** El saldo de origen y destino no se puede calcular con un solo movimiento.
- **Reportes confusos.** Un movimiento con 2 cuentas no cabe en el modelo.

## Consecuencias

**Positivas:**
- Saldos triviales. Una sola tabla.
- Reportes unificados. `WHERE type != 'TRANSFER'`.
- Menos código.

**Negativas:**
- Redundancia (2 filas por transferencia).
- **Riesgo de desincronización.** Si una pata se edita y la otra no, la transferencia queda inconsistente.
- **Mitigación:** crear/editar/borrar transferencias en una transacción de BD.

**Neutrales:**
- El `transferId` es un UUID que agrupa las 2 patas. No es FK a una tabla.

## Referencias

- `docs/domain-rules.md` sección 4 (transferencias).
- `docs/data-model.md` sección 2.4 (`transactions`).
- `docs/api-contracts.md` sección 5.7 y 5.8.
- `docs/acceptance-criteria.md` AC-TRF-05, AC-TRF-07.
