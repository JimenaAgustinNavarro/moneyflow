# MoneyFlow — Reglas de dominio financiero

**Versión:** 1.0
**Fecha:** 2026-10-16
**Estado:** Aprobado

Este documento es la **fuente de verdad del dominio financiero** de MoneyFlow. Todas las decisiones de modelo de datos, contratos de API, validaciones y pruebas derivan de aquí. Si una regla cambia, se actualiza este documento primero y luego el código.

---

## 0. Convenciones generales

- **Moneda:** Soles peruanos (PEN) en el MVP. La columna `currency` existe en `accounts` y `transactions` para futuras monedas, pero el sistema opera solo con PEN.
- **Zona horaria:** `America/Lima` (UTC-5) para todos los cálculos temporales (recurrencias, presupuestos, reportes).
- **Precisión monetaria:** `Decimal(12, 2)`. Nunca `Float`.
- **Precisión de fecha:** `DateTime` con zona horaria (`Timestamptz`).
- **IDs:** UUID v4 (`String @id @default(uuid())`).
- **Soft delete:** se usa en entidades financieras (`users`, `accounts`, `categories`, `transactions`, `recurrences`, `obligations`, `budgets`, `savings_goals`, `goal_contributions`, `tags`). Los borrados son lógicos: se marca `deletedAt = now()` y se filtran en las queries. Los datos se pueden restaurar con el endpoint `POST /:entidad/:id/restore`. Hard delete solo en pivotes (`transaction_tags`, `budget_categories`) y datos efímeros (`refresh_tokens`, `notifications`).

---

## 1. Definiciones base

### 1.1 Cuenta (`account`)

Un contenedor de dinero del usuario. Ejemplos: efectivo, cuenta bancaria, billetera digital, tarjeta de crédito.

**Tipos:** `CASH`, `BANK`, `WALLET`, `CREDIT`.

**Campos clave:**
- `userId`: dueño de la cuenta.
- `name`: nombre visible (ej. "BCP Ahorros").
- `type`: uno de los tipos definidos.
- `currency`: ISO 4217 (default `PEN`).
- `initialBalance`: saldo al crear la cuenta.
- `balance`: saldo actual persistido.
- `archived`: booleano (default `false`).

**Regla única:** `(userId, name)` es único. No puede haber dos cuentas con el mismo nombre para el mismo usuario.

### 1.2 Movimiento (`transaction`)

Un registro de dinero que entra o sale de una cuenta.

**Tipos:** `INCOME`, `EXPENSE`, `TRANSFER`.

**Estados:** `PENDING`, `CONFIRMED`, `CANCELLED`.

**Campos clave:**
- `userId`: dueño del movimiento.
- `accountId`: cuenta afectada.
- `categoryId`: categoría (nullable para transferencias).
- `type`: `INCOME`, `EXPENSE` o `TRANSFER`.
- `amount`: monto positivo (siempre `> 0`).
- `currency`: ISO 4217.
- `date`: fecha del movimiento.
- `status`: `PENDING`, `CONFIRMED` o `CANCELLED`.
- `transferId`: UUID que agrupa las dos patas de una transferencia (nullable).
- `counterpartAccountId`: cuenta destino en transferencias (nullable).
- `obligationId`: obligación pagada por este movimiento (nullable).
- `goalId`: meta de ahorro afectada (nullable).

### 1.3 Ingreso (`INCOME`)

Movimiento donde el dinero **entra** a una cuenta.

**Regla:** `amount > 0`.

**Efecto en saldo:** `balance += amount` (si `status = CONFIRMED`).

### 1.4 Egreso (`EXPENSE`)

Movimiento donde el dinero **sale** de una cuenta.

**Regla:** `amount > 0`.

**Efecto en saldo:** `balance -= amount` (si `status = CONFIRMED`).

### 1.5 Transferencia (`TRANSFER`)

Movimiento entre dos cuentas del **mismo usuario**. No es un ingreso ni un egreso.

**Regla:** `amount > 0`. Cuenta origen y destino deben ser distintas. Ambas cuentas del mismo `userId`. Misma moneda (en MVP, siempre `PEN`).

**Efecto en saldo:**
- Cuenta origen: `balance -= amount`.
- Cuenta destino: `balance += amount`.

**No cuenta como ingreso ni egreso en reportes ni presupuestos.** Se excluye por `type = 'TRANSFER'`.

### 1.6 Categoría (`category`)

Clasificación de movimientos.

**Tipos:** `INCOME` o `EXPENSE`. Una categoría es de un solo tipo.

**Origen:** sistema (`userId = null`, `isSystem = true`) o usuario (`userId != null`).

**Jerarquía:** máximo 2 niveles (categoría padre + subcategorías). `parentId` nullable.

**Regla única:** `(userId, name, type)` es único.

### 1.7 Obligación (`obligation`)

Un compromiso de pago futuro. Ejemplo: "pagar la luz antes del 15 de cada mes".

**Origen:**
- Recurrente (`recurrenceId != null`).
- Puntual (`recurrenceId = null`).

**Estados:** `PENDING`, `PAID`, `OVERDUE`, `CANCELLED`.

**Campos clave:**
- `amount`: monto a pagar.
- `dueDate`: fecha de vencimiento.
- `paidAt`: fecha de pago (nullable).
- El movimiento que paga la obligación se vincula desde `Transaction.obligationId` (nullable).
- `periodStart`: inicio del período (para recurrencias, idempotencia).

**Regla de idempotencia:** el service valida que `recurrenceId` y `periodStart` estén presentes juntos para obligaciones recurrentes. Un `CHECK` en la base de datos exige que ambos sean nulos o ambos no nulos, y un índice único parcial sobre `(recurrenceId, periodStart)` evita duplicados.

### 1.8 Presupuesto (`budget`)

Un límite de gasto por categoría en un período.

**Períodos:** `WEEKLY` (semanal), `MONTHLY` (mensual).

**Campos clave:**
- `amount`: límite.
- `startDate`: inicio del presupuesto.
- `endDate`: fin (nullable = indefinido).
- `alertThreshold`: porcentaje (default `80`) para alerta.
- `active`: booleano.

**Categorías asociadas:** `budget_categories` (N:M).

### 1.9 Meta de ahorro (`savings_goal`)

Un objetivo de ahorro con monto y fecha opcional.

**Estados:** `ACTIVE`, `COMPLETED`, `CANCELLED`.

**Campos clave:**
- `targetAmount`: monto objetivo.
- `currentAmount`: monto acumulado (persistido).
- `targetDate`: fecha límite (nullable).
- `accountId`: cuenta asociada (nullable).

**Aportes/retiros:** `goal_contributions` (N por meta). Tipos: `DEPOSIT`, `WITHDRAWAL`.

### 1.10 Etiqueta (`tag`)

Clasificación transversal de movimientos.

**Regla única:** `(userId, name)` es único.

**Relación:** `transaction_tags` (N:M).

---

## 2. Cálculo de saldo de cuenta

### 2.1 Fórmula exacta
saldo = saldo_inicial

SUM(ingresos confirmados)

SUM(egresos confirmados)

SUM(transferencias entrantes confirmadas)

SUM(transferencias salientes confirmadas)

text

**Solo se incluyen movimientos con `status = 'CONFIRMED'`.**

**Los movimientos `PENDING` y `CANCELLED` NO afectan el saldo.**

### 2.2 Obligaciones pendientes vs saldo

**Regla:** una obligación `PENDING` **NO reduce el saldo** de ninguna cuenta.

**Razón:** la obligación es un compromiso futuro, no un movimiento real. El dinero sigue disponible hasta que se pague.

### 2.3 Obligaciones pagadas vs saldo

**Regla:** al pagar una obligación, se crea (o vincula) un movimiento `EXPENSE` con `status = 'CONFIRMED'`. Ese movimiento **SÍ afecta el saldo**.

**Efecto neto:** el saldo se reduce en el monto de la obligación pagada, en la fecha de pago.

### 2.4 Persistencia del saldo

**Regla:** `accounts.balance` se persiste en la BD.

**Actualización:** cuando se crea, edita o borra un movimiento `CONFIRMED`, el saldo de la cuenta se actualiza en la misma transacción de base de datos.

**Recálculo:** existe un endpoint `POST /accounts/:id/recalculate` que recalcula el saldo desde cero sumando todos los movimientos `CONFIRMED`. Se usa para auditar o reparar inconsistencias.

**Test obligatorio:** tras N operaciones aleatorias, `balance` persistido == `SUM(movimientos confirmados)`.

---

## 3. Edición y borrado de movimientos

### 3.1 Creación

**Regla:** al crear un movimiento, se valida:
- `amount > 0`.
- `accountId` pertenece al `userId`.
- `categoryId` (si viene) pertenece al `userId` o es del sistema.
- `type` es uno de `INCOME`, `EXPENSE`, `TRANSFER`.
- Si `type = TRANSFER`, existe `counterpartAccountId` y es distinta de `accountId`.
- `date` no es futura (en el MVP).

**Efecto:** se actualiza `accounts.balance` en la misma transacción.

### 3.2 Edición

**Regla:** se puede editar un movimiento pasado.

**Efectos:**
- Si cambia `accountId`, se recalcula el saldo de la cuenta vieja y la nueva.
- Si cambia `amount`, se recalcula el saldo de la cuenta.
- Si cambia `status`, se recalcula el saldo (si pasa de `PENDING` a `CONFIRMED`, suma; si pasa de `CONFIRMED` a `CANCELLED`, resta).
- **Toda la operación ocurre en una transacción de base de datos.**

### 3.3 Borrado

**Regla:** soft delete en el MVP. Se marca `deletedAt` y se conserva el movimiento para auditoría e historial financiero.

**Efectos:**
- Se recalcula el saldo de la cuenta afectada.
- Si el movimiento tiene `obligationId`, la obligación pasa de `PAID` a `PENDING` y `paidAt` se limpia.
- Si el movimiento es una transferencia, se borran **ambas patas** (por `transferId`).

### 3.4 Borrado de cuenta con movimientos

**Regla:** no se puede borrar una cuenta con movimientos `CONFIRMED`.

**Alternativa:** archivar la cuenta (`archived = true`). Una cuenta archivada:
- No aparece en la lista de cuentas activas.
- No se puede usar para nuevos movimientos.
- Conserva su historial y saldo.
- Se puede desarchivar.

**Si el usuario insiste en borrarla:** debe mover o borrar primero todos los movimientos.

---

## 4. Transferencias

### 4.1 Modelo

Una transferencia se modela como **dos movimientos enlazados** por un `transferId` compartido:
- Pata origen: `type = TRANSFER`, `accountId = cuenta_origen`, `counterpartAccountId = cuenta_destino`, `amount` positivo.
- Pata destino: `type = TRANSFER`, `accountId = cuenta_destino`, `counterpartAccountId = cuenta_origen`, `amount` positivo.

**Ambas patas tienen el mismo `transferId`, `amount`, `date` y `status`.**

### 4.2 Reglas

- Cuenta origen y destino deben ser **distintas**.
- Ambas cuentas del **mismo usuario**.
- Misma moneda (en MVP, siempre `PEN`).
- `amount > 0`.

### 4.3 Efecto en reportes

**Regla:** las transferencias **NO cuentan** como ingreso ni egreso.

**Razón:** el dinero no entra ni sale del patrimonio del usuario, solo se mueve entre cuentas propias.

**En reportes:** se excluyen con `type != 'TRANSFER'`.

**En presupuestos:** se excluyen con `type != 'TRANSFER'`.

### 4.4 Edición y borrado

- **Editar:** se editan ambas patas en una transacción.
- **Borrar:** se borran ambas patas por `transferId`.

---

## 5. Pagos recurrentes y obligaciones

### 5.1 Modelo de recurrencia

Una recurrencia (`recurrence`) define un patrón de pagos:

- `frequency`: `WEEKLY`, `MONTHLY`, `YEARLY`.
- `dayOfPeriod`: día del período (1-7 para semanal, 1-31 para mensual, 1-366 para anual).
- `startDate`: inicio de la recurrencia.
- `endDate`: fin (nullable = indefinida).
- `active`: booleano.

### 5.2 Generación de obligaciones

**Regla:** un cron diario genera las obligaciones del período correspondiente.

**Idempotencia:** el service valida que `recurrenceId` y `periodStart` estén presentes juntos. La BD refuerza esta regla con un `CHECK` y un índice único parcial sobre `(recurrenceId, periodStart)`. Si el cron corre dos veces, la segunda no crea duplicados.

**Rango de generación:** el cron genera obligaciones para los próximos **30 días**. Las obligaciones más lejanas se generan cuando se acercan.

### 5.3 Pago de obligación

**Regla:** al marcar una obligación como pagada:
- Se elige cuenta de pago, categoría y fecha.
- Se crea un movimiento `EXPENSE` con `status = CONFIRMED`, `obligationId = obligación.id`.
- La obligación pasa a `PAID` con `paidAt` seteado. El movimiento queda vinculado mediante `Transaction.obligationId`.
- **Una obligación pagada no se puede pagar dos veces.** Si se intenta, error 409.

### 5.4 Edición de obligación

**Regla:** solo se puede editar una obligación `PENDING`.

**Si está `PAID`:** hay que anular el pago primero (borrar el movimiento vinculado), lo que devuelve la obligación a `PENDING`.

### 5.5 Obligaciones vencidas

**Regla:** un cron diario marca como `OVERDUE` las obligaciones `PENDING` con `dueDate < now()`.

**Una obligación `OVERDUE` sigue sin afectar el saldo.** Solo se marca para notificar al usuario.

### 5.6 Borrado de recurrencia

**Regla:** al borrar lógicamente una recurrencia, sus obligaciones dependientes no se borran en cascada y conservan su historial. Si se elimina físicamente una recurrencia, `recurrenceId` de las obligaciones se establece en `null`.

---

## 6. Categorías

### 6.1 Categorías del sistema

**Origen:** `userId = null`, `isSystem = true`.

**Características:**
- No editables.
- No borrables.
- Visibles para todos los usuarios.
- Ejemplos: "Sueldo", "Alquiler", "Comida", "Transporte", "Salud", "Ocio".

### 6.2 Categorías del usuario

**Origen:** `userId != null`, `isSystem = false`.

**Características:**
- Editables (nombre, ícono, color).
- Borrables **si no tienen movimientos asociados**.
- Si tienen movimientos, hay que reasignarlos primero.

### 6.3 Jerarquía

**Regla:** máximo 2 niveles.
- Nivel 1: categoría padre (`parentId = null`).
- Nivel 2: subcategoría (`parentId != null`).

**No se permiten 3 niveles.**

### 6.4 Tipos

**Regla:** una categoría es de un solo tipo: `INCOME` o `EXPENSE`.

**Consecuencia:** un movimiento `INCOME` solo puede usar categorías `INCOME`. Un movimiento `EXPENSE` solo puede usar categorías `EXPENSE`. Una transferencia no usa categoría.

### 6.5 Borrado de categoría

- **Categoría del sistema:** no se puede borrar.
- **Categoría del usuario sin movimientos:** se borra.
- **Categoría del usuario con movimientos:** error 409. Hay que reasignar los movimientos primero.

---

## 12. Soft delete

### 12.1 Tablas con soft delete

| Tabla | Razón |
|---|---|
| `users` | Datos personales del usuario |
| `accounts` | Datos financieros críticos |
| `categories` | Referenciadas por movimientos históricos |
| `transactions` | Datos financieros críticos |
| `recurrences` | Historial de obligaciones |
| `obligations` | Historial de pagos |
| `budgets` | Historial de presupuestos |
| `savings_goals` | Historial de ahorros |
| `goal_contributions` | Historial de aportes |
| `tags` | Referenciadas por movimientos históricos |

### 12.2 Tablas con hard delete

| Tabla | Razón |
|---|---|
| `refresh_tokens` | Se revocan (`revokedAt`), no se borran |
| `notifications` | Datos efímeros |
| `transaction_tags` | Pivote (se borra al desetiquetar) |
| `budget_categories` | Pivote (se borra al desasociar) |

### 12.3 Regla general

Toda entidad con soft delete tiene:
- Columna `deletedAt DateTime? @db.Timestamptz(6)`.
- Índices únicos parciales (`WHERE deleted_at IS NULL`).
- Filtro `deletedAt: null` en todas las queries de lectura.
- Endpoint `POST /:entidad/:id/restore` para restaurar.
- Query param `includeDeleted=true` para auditar.

### 12.4 Filtro en queries

Todas las queries de lectura filtran `deletedAt: null`.

Ejemplo:

```ts
const accounts = await prisma.account.findMany({
  where: { userId, deletedAt: null },
});
```

### 12.5 Borrado lógico

Cuando el usuario borra una entidad:

```ts
await prisma.account.update({
  where: { id },
  data: { deletedAt: new Date() },
});
```

Consecuencias:
- El registro sigue en la BD.
- Se filtra en las queries de lectura.
- Se puede restaurar.
- Los índices únicos parciales permiten crear una entidad con el mismo nombre.

### 12.6 Restauración

Endpoint: `POST /:entidad/:id/restore`.

Efecto:
- `deletedAt = null`.
- Se valida que no haya conflicto de unicidad.
- Si hay conflicto → error 409.

### 12.7 Cascada de soft delete

Regla: borrar una entidad con soft delete NO borra en cascada las entidades dependientes.

Ejemplo: borrar una cuenta NO borra sus movimientos. Los movimientos quedan con `accountId` apuntando a una cuenta borrada. Se conserva el historial.

### 12.8 Borrado de entidades con dependencias

Regla: no se puede borrar (soft) una entidad con dependencias activas.

Ejemplo:
- Borrar una cuenta con movimientos CONFIRMED → error 409.
- Alternativa: archivar la cuenta (`archived = true`).

Excepción: categories con movimientos → se puede borrar (soft).

### 12.9 Auditoría

Query param: `?includeDeleted=true`.

Efecto: devuelve también las entidades borradas. Solo accesible para el dueño de los datos.

---

## 7. Presupuestos

### 7.1 Definición

Un presupuesto aplica a **una o varias categorías** durante un **período**.

**Períodos:**
- `WEEKLY`: lunes 00:00 a domingo 23:59:59 (`America/Lima`).
- `MONTHLY`: día 1 00:00 al último día del mes 23:59:59 (`America/Lima`).

### 7.2 Gasto computable
gasto_computable = SUM(egresos confirmados
con categoría en el presupuesto,
en el período)

text

**Excluye:**
- Transferencias (`type = 'TRANSFER'`).
- Movimientos sin categoría.
- Movimientos `PENDING` o `CANCELLED`.
- Movimientos fuera del período.

### 7.3 Uso del presupuesto
porcentaje_utilizado = (gasto_computable / budget.amount) * 100
saldo_restante = budget.amount - gasto_computable

text

### 7.4 Alertas

**Regla:** cuando `porcentaje_utilizado >= alertThreshold` (default `80`), se genera una notificación.

**La alerta no bloquea el gasto.** Solo avisa.

### 7.5 Copiar presupuestos entre períodos

**Regla:** se puede copiar un presupuesto de un período a otro. Se copian:
- `amount`.
- `alertThreshold`.
- Categorías asociadas.

**No se copia:** el gasto computable (se recalcula para el nuevo período).

---

## 8. Metas de ahorro

### 8.1 Definición

Una meta tiene:
- `targetAmount`: monto objetivo.
- `currentAmount`: monto acumulado (persistido).
- `targetDate`: fecha límite (nullable).
- `accountId`: cuenta asociada (nullable).

### 8.2 Progreso
progreso = SUM(aportes) - SUM(retiros)

text

**Aportes:** `goal_contributions` con `type = 'DEPOSIT'`.
**Retiros:** `goal_contributions` con `type = 'WITHDRAWAL'`.

### 8.3 Aporte periódico necesario
aporte_periodico = (targetAmount - progreso_actual) / meses_restantes

text

**Si no hay `targetDate`:** no se calcula.

### 8.4 Estimación de fecha de finalización
fecha_estimada = now() + (targetAmount - progreso_actual) / aporte_promedio

text

**`aporte_promedio`:** promedio de los aportes de los últimos N meses (N configurable, default `3`).

### 8.5 Completar meta

**Regla:** cuando `progreso >= targetAmount`, la meta pasa a `COMPLETED`.

**No se puede retirar más de lo acumulado.** Si `retiro > progreso`, error 400.

### 8.6 Borrado de meta

**Regla:** se puede borrar una meta en cualquier estado.

**Los aportes y retiros se borran en cascada.**

**Si la meta tiene `accountId`, los movimientos de la cuenta NO se borran.** Solo se desvinculan.

---

## 9. Definición de "período"

### 9.1 Semanal

**Inicio:** lunes 00:00:00 (`America/Lima`).
**Fin:** domingo 23:59:59.999 (`America/Lima`).

**Cálculo:** `date_trunc('week', date)` en Postgres, con `America/Lima` como zona horaria.

### 9.2 Mensual

**Inicio:** día 1 a las 00:00:00 (`America/Lima`).
**Fin:** último día del mes a las 23:59:59.999 (`America/Lima`).

**Cálculo:** `date_trunc('month', date)` en Postgres, con `America/Lima` como zona horaria.

### 9.3 Anual

**Inicio:** 1 de enero a las 00:00:00 (`America/Lima`).
**Fin:** 31 de diciembre a las 23:59:59.999 (`America/Lima`).

**Cálculo:** `date_trunc('year', date)` en Postgres, con `America/Lima` como zona horaria.

### 9.4 Aplicación

**Todos los cálculos que dependan de "período" usan estas reglas:**
- Presupuestos.
- Reportes.
- Proyecciones.
- Calendario.

**Ningún cálculo usa UTC directo.** Siempre se convierte a `America/Lima` primero.

---

## 10. Reglas no negociables (resumen ejecutivo)

1. **Los cálculos financieros deben ser correctos.** Sin excepciones.
2. **El saldo persistido siempre coincide con la suma de movimientos confirmados.** Se verifica con un endpoint de recálculo.
3. **Las transferencias no cuentan como ingresos ni egresos.** En reportes ni presupuestos.
4. **Las obligaciones pendientes no afectan el saldo.** Solo al pagarse.
5. **Las recurrencias no generan duplicados.** Constraint único `(recurrenceId, periodStart)`.
6. **El frontend no es la fuente de verdad del saldo.** El backend lo calcula y lo persiste.
7. **Todos los datos están aislados por `userId`.** Nunca se confía en el `userId` del body.
8. **Los montos son `Decimal(12, 2)`.** Nunca `Float`.
9. **Las fechas son `Timestamptz`.** Zona horaria `America/Lima` para cálculos temporales.
10. **Cada operación financiera importante ocurre en una transacción de base de datos.**

---

## 11. Preguntas abiertas

**(Esta sección debe quedar vacía antes de cerrar el Sprint 1.)**

*Sin preguntas abiertas por el momento.*
