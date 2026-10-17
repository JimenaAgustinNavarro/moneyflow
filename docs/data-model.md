# MoneyFlow — Modelo de datos

**Versión:** 1.0
**Fecha:** 2026-10-16
**Estado:** Aprobado

Este documento describe el modelo de datos del MVP de MoneyFlow. Todas las tablas, columnas, tipos, índices, constraints y relaciones derivan de `docs/domain-rules.md`.

**Base de datos:** PostgreSQL 16.
**ORM:** Prisma 6.x.
**Convenciones:** modelos en singular PascalCase, tablas en plural snake_case, columnas en camelCase (Prisma) → snake_case (BD).

---

## 0. Convenciones generales

- **IDs:** `String @id @default(uuid())` (UUID v4).
- **Timestamps:** `createdAt DateTime @default(now())` y `updatedAt DateTime @updatedAt`.
- **Montos:** `Decimal @db.Decimal(12, 2)`. Nunca `Float`.
- **Fechas:** `DateTime @db.Timestamptz(6)`.
- **Soft delete:** se usa en entidades financieras (10 tablas). Los borrados son lógicos: `deletedAt = now()`. Hard delete solo en pivotes y datos efímeros.
- **Enums:** definidos como `enum` de Prisma.
- **FKs:** siempre con `onDelete` explícito (`Restrict` por defecto, `Cascade` solo donde esté justificado).
- **Índices:** en columnas usadas para filtrar por usuario + fecha.

---

## 1. Diagrama entidad-relación

```mermaid
erDiagram
    User ||--o{ Account : "tiene"
    User ||--o{ Category : "crea"
    User ||--o{ Transaction : "registra"
    User ||--o{ Recurrence : "define"
    User ||--o{ Obligation : "tiene"
    User ||--o{ Budget : "define"
    User ||--o{ SavingsGoal : "define"
    User ||--o{ Tag : "crea"
    User ||--o{ RefreshToken : "tiene"
    User ||--o{ Notification : "recibe"

    Account ||--o{ Transaction : "afecta"
    Account ||--o{ SavingsGoal : "asociada"

    Category ||--o{ Transaction : "clasifica"
    Category ||--o{ Category : "padre-hijo"
    Category ||--o{ BudgetCategory : "presupuestada"

    Transaction ||--o{ TransactionTag : "etiquetada"
    Tag ||--o{ TransactionTag : "etiqueta"

    Recurrence ||--o{ Obligation : "genera"

    Obligation ||--o| Transaction : "pagada por"

    Budget ||--o{ BudgetCategory : "incluye"

    SavingsGoal ||--o{ GoalContribution : "recibe"

    Transaction ||--o| GoalContribution : "aporta"
2. Tablas del MVP
2.1 users
Propósito: usuarios del sistema. Cada usuario es dueño de sus datos.

Columna	Tipo	Restricciones	Notas
id	String	@id @default(uuid())	UUID v4
email	String	—	Login
passwordHash	String	—	Argon2id
name	String	—	Nombre visible
timezone	String	@default("America/Lima")	Para futuro
createdAt	DateTime	@default(now())	—
updatedAt	DateTime	@updatedAt	—
deletedAt	DateTime?	@db.Timestamptz(6) @map("deleted_at")	Soft delete
@@index([email]).

Índice único parcial `users_email_unique` en la migración SQL (`WHERE deleted_at IS NULL`).

Map: @@map("users").

2.2 accounts
Propósito: cuentas del usuario (efectivo, banco, billetera, tarjeta).

Columna	Tipo	Restricciones	Notas
id	String	@id @default(uuid())	—
userId	String	FK → users.id, onDelete: Cascade	Dueño
name	String	—	Nombre visible
type	AccountType	—	CASH, BANK, WALLET, CREDIT
currency	String	@default("PEN")	ISO 4217
initialBalance	Decimal	@db.Decimal(12, 2), @default(0)	Saldo inicial
balance	Decimal	@db.Decimal(12, 2), @default(0)	Saldo persistido
archived	Boolean	@default(false)	—
createdAt	DateTime	@default(now())	—
updatedAt	DateTime	@updatedAt	—
deletedAt	DateTime?	@db.Timestamptz(6) @map("deleted_at")	Soft delete
Constraints:

@@index([userId, name]).

Índice único parcial `accounts_user_id_name_unique` en la migración SQL (`WHERE deleted_at IS NULL`).

@@index([userId]).

Map: @@map("accounts").

Enum AccountType: CASH, BANK, WALLET, CREDIT.

2.3 categories
Propósito: clasificación de movimientos. Pueden ser del sistema o del usuario.

Columna	Tipo	Restricciones	Notas
id	String	@id @default(uuid())	—
userId	String?	FK → users.id, onDelete: Cascade	null = categoría del sistema
name	String	—	—
type	CategoryType	—	INCOME o EXPENSE
parentId	String?	FK → categories.id, onDelete: SetNull	Jerarquía (máx 2 niveles)
icon	String?	—	Nombre de ícono Lucide
color	String?	—	Hex color
isSystem	Boolean	@default(false)	—
createdAt	DateTime	@default(now())	—
deletedAt	DateTime?	@db.Timestamptz(6) @map("deleted_at")	Soft delete
Constraints:

@@index([userId, name, type]).

Índice único parcial `categories_user_id_name_type_unique` en la migración SQL (`WHERE deleted_at IS NULL`).

@@index([userId]).

@@index([parentId]).

Map: @@map("categories").

Enum CategoryType: INCOME, EXPENSE.

2.4 transactions
Propósito: movimientos de dinero (ingresos, egresos, transferencias).

Columna	Tipo	Restricciones	Notas
id	String	@id @default(uuid())	—
userId	String	FK → users.id, onDelete: Cascade	Dueño
accountId	String	FK → accounts.id, onDelete: Restrict	Cuenta afectada
categoryId	String?	FK → categories.id, onDelete: SetNull	null en transferencias
type	TransactionType	—	INCOME, EXPENSE, TRANSFER
amount	Decimal	@db.Decimal(12, 2)	Positivo, > 0
currency	String	@default("PEN")	ISO 4217
description	String?	—	—
date	DateTime	@db.Timestamptz(6)	Fecha del movimiento
status	TransactionStatus	@default(CONFIRMED)	PENDING, CONFIRMED, CANCELLED
transferId	String?	—	Agrupa las 2 patas de una transferencia
counterpartAccountId	String?	FK → accounts.id, onDelete: SetNull	Cuenta destino en transferencias
obligationId	String?	FK → obligations.id, onDelete: SetNull	Obligación pagada
createdAt	DateTime	@default(now())	—
updatedAt	DateTime	@updatedAt	—
deletedAt	DateTime?	@db.Timestamptz(6) @map("deleted_at")	Soft delete
Constraints:

@@index([userId, date]).

@@index([accountId, date]).

@@index([categoryId, date]).

@@index([transferId]).

@@index([obligationId]).

Map: @@map("transactions").

Enum TransactionType: INCOME, EXPENSE, TRANSFER.
Enum TransactionStatus: PENDING, CONFIRMED, CANCELLED.

2.5 recurrences
Propósito: reglas de recurrencia para pagos recurrentes.

Columna	Tipo	Restricciones	Notas
id	String	@id @default(uuid())	—
userId	String	FK → users.id, onDelete: Cascade	Dueño
name	String	—	Ej. "Luz"
amount	Decimal	@db.Decimal(12, 2)	Monto esperado
type	TransactionType	—	INCOME o EXPENSE
categoryId	String?	FK → categories.id, onDelete: SetNull	—
accountId	String?	FK → accounts.id, onDelete: SetNull	Cuenta sugerida
frequency	RecurrenceFrequency	—	WEEKLY, MONTHLY, YEARLY
dayOfPeriod	Int	—	1-7, 1-31, 1-366 según frecuencia
startDate	DateTime	@db.Timestamptz(6)	—
endDate	DateTime?	@db.Timestamptz(6)	null = indefinida
active	Boolean	@default(true)	—
createdAt	DateTime	@default(now())	—
updatedAt	DateTime	@updatedAt	—
deletedAt	DateTime?	@db.Timestamptz(6) @map("deleted_at")	Soft delete
Constraints:

@@index([userId]).

@@index([active]).

Map: @@map("recurrences").

Enum RecurrenceFrequency: WEEKLY, MONTHLY, YEARLY.

2.6 obligations
Propósito: obligaciones de pago (recurrentes o puntuales).

Columna	Tipo	Restricciones	Notas
id	String	@id @default(uuid())	—
userId	String	FK → users.id, onDelete: Cascade	Dueño
recurrenceId	String?	FK → recurrences.id, onDelete: SetNull	null = puntual
name	String	—	—
amount	Decimal	@db.Decimal(12, 2)	—
dueDate	DateTime	@db.Timestamptz(6)	—
status	ObligationStatus	@default(PENDING)	PENDING, PAID, OVERDUE, CANCELLED
paidAt	DateTime?	@db.Timestamptz(6)	Fecha de pago
periodStart	DateTime?	@db.Timestamptz(6)	Para idempotencia
createdAt	DateTime	@default(now())	—
updatedAt	DateTime	@updatedAt	—
deletedAt	DateTime?	@db.Timestamptz(6) @map("deleted_at")	Soft delete
Constraints:

@@index([recurrenceId, periodStart]).

Índice único parcial `obligations_recurrence_id_period_start_unique` en la migración SQL (`WHERE deleted_at IS NULL`). El service valida que ambos campos sean nulos o ambos tengan valor y la BD lo refuerza con un `CHECK`.

@@index([userId, dueDate]).

@@index([status]).

Map: @@map("obligations").

Enum ObligationStatus: PENDING, PAID, OVERDUE, CANCELLED.

2.7 budgets
Propósito: presupuestos por categoría en un período.

Columna	Tipo	Restricciones	Notas
id	String	@id @default(uuid())	—
userId	String	FK → users.id, onDelete: Cascade	Dueño
name	String	—	—
period	BudgetPeriod	—	WEEKLY, MONTHLY
amount	Decimal	@db.Decimal(12, 2)	Límite
startDate	DateTime	@db.Timestamptz(6)	—
endDate	DateTime?	@db.Timestamptz(6)	null = indefinido
alertThreshold	Int	@default(80)	Porcentaje
active	Boolean	@default(true)	—
createdAt	DateTime	@default(now())	—
updatedAt	DateTime	@updatedAt	—
deletedAt	DateTime?	@db.Timestamptz(6) @map("deleted_at")	Soft delete
Constraints:

@@index([userId]).

@@index([active]).

Map: @@map("budgets").

Enum BudgetPeriod: WEEKLY, MONTHLY.

2.8 budget_categories
Propósito: relación N:M entre presupuestos y categorías.

Columna	Tipo	Restricciones	Notas
id	String	@id @default(uuid())	—
budgetId	String	FK → budgets.id, onDelete: Cascade	—
categoryId	String	FK → categories.id, onDelete: Cascade	—
Constraints:

@@unique([budgetId, categoryId]).

@@index([budgetId]).

@@index([categoryId]).

Map: @@map("budget_categories").

2.9 savings_goals
Propósito: metas de ahorro del usuario.

Columna	Tipo	Restricciones	Notas
id	String	@id @default(uuid())	—
userId	String	FK → users.id, onDelete: Cascade	Dueño
name	String	—	—
targetAmount	Decimal	@db.Decimal(12, 2)	Monto objetivo
currentAmount	Decimal	@db.Decimal(12, 2), @default(0)	Acumulado
targetDate	DateTime?	@db.Timestamptz(6)	Fecha límite
accountId	String?	FK → accounts.id, onDelete: SetNull	Cuenta asociada
status	GoalStatus	@default(ACTIVE)	ACTIVE, COMPLETED, CANCELLED
createdAt	DateTime	@default(now())	—
updatedAt	DateTime	@updatedAt	—
deletedAt	DateTime?	@db.Timestamptz(6) @map("deleted_at")	Soft delete
Constraints:

@@index([userId]).

@@index([status]).

Map: @@map("savings_goals").

Enum GoalStatus: ACTIVE, COMPLETED, CANCELLED.

2.10 goal_contributions
Propósito: aportes y retiros de una meta.

Columna	Tipo	Restricciones	Notas
id	String	@id @default(uuid())	—
goalId	String	FK → savings_goals.id, onDelete: Cascade	—
transactionId	String?	FK → transactions.id, onDelete: SetNull	Movimiento vinculado
amount	Decimal	@db.Decimal(12, 2)	Positivo
type	ContributionType	—	DEPOSIT o WITHDRAWAL
date	DateTime	@db.Timestamptz(6)	—
createdAt	DateTime	@default(now())	—
deletedAt	DateTime?	@db.Timestamptz(6) @map("deleted_at")	Soft delete
Constraints:

@@index([goalId]).

@@index([transactionId]).

Índice único parcial `goal_contributions_transaction_id_unique` en la migración SQL (`WHERE deleted_at IS NULL`).

Map: @@map("goal_contributions").

Enum ContributionType: DEPOSIT, WITHDRAWAL.

2.11 tags
Propósito: etiquetas transversales para clasificar movimientos.

Columna	Tipo	Restricciones	Notas
id	String	@id @default(uuid())	—
userId	String	FK → users.id, onDelete: Cascade	Dueño
name	String	—	—
color	String?	—	Hex color
createdAt	DateTime	@default(now())	—
deletedAt	DateTime?	@db.Timestamptz(6) @map("deleted_at")	Soft delete
Constraints:

@@index([userId, name]).

Índice único parcial `tags_user_id_name_unique` en la migración SQL (`WHERE deleted_at IS NULL`).

@@index([userId]).

Map: @@map("tags").

2.12 transaction_tags
Propósito: relación N:M entre movimientos y etiquetas.

Columna	Tipo	Restricciones	Notas
transactionId	String	FK → transactions.id, onDelete: Cascade	—
tagId	String	FK → tags.id, onDelete: Cascade	—
Constraints:

@@id([transactionId, tagId]) — PK compuesta.

@@index([tagId]).

Map: @@map("transaction_tags").

2.13 refresh_tokens
Propósito: refresh tokens para auth JWT.

Columna	Tipo	Restricciones	Notas
id	String	@id @default(uuid())	—
userId	String	FK → users.id, onDelete: Cascade	—
tokenHash	String	—	Hash del token
expiresAt	DateTime	@db.Timestamptz(6)	—
revokedAt	DateTime?	@db.Timestamptz(6)	null = activo
createdAt	DateTime	@default(now())	—
userAgent	String?	—	—
ip	String?	—	—
Constraints:

@@index([userId]).

@@index([tokenHash]).

Map: @@map("refresh_tokens").

2.14 notifications (placeholder MVP)
Propósito: notificaciones del sistema.

Columna	Tipo	Restricciones	Notas
id	String	@id @default(uuid())	—
userId	String	FK → users.id, onDelete: Cascade	—
type	NotificationType	—	Tipo de notificación
title	String	—	—
message	String	—	—
readAt	DateTime?	@db.Timestamptz(6)	null = no leída
createdAt	DateTime	@default(now())	—
Constraints:

@@index([userId, readAt]).

Map: @@map("notifications").

Enum NotificationType: OBLIGATION_DUE, OBLIGATION_OVERDUE, BUDGET_ALERT, GOAL_NO_PROGRESS, LIQUIDITY_WARNING.

3. Reglas de diseño
3.1 IDs
Todos los IDs son String @id @default(uuid()) (UUID v4).

Las tablas pivote (transaction_tags) usan PK compuesta.

3.2 Timestamps
Todas las entidades principales tienen `createdAt` y `updatedAt` (excepto pivotes y refresh_tokens). Las 10 tablas con soft delete también tienen `deletedAt`.

updatedAt se actualiza automáticamente con @updatedAt.

3.3 FKs y borrado
Cascade: cuando el hijo no tiene sentido sin el padre (accounts → transactions, budgets → budget_categories).

Restrict: cuando el hijo no debe borrarse si el padre tiene dependencias (accounts en transactions).

SetNull: cuando el hijo puede quedar huérfano (categories en transactions).

3.4 Montos
Siempre Decimal @db.Decimal(12, 2). Nunca Float.

Razón: precisión monetaria.

3.5 Fechas
Siempre DateTime @db.Timestamptz(6). Nunca DateTime sin zona.

Razón: consistencia con America/Lima.

3.6 Enums de Prisma
Todos los enums se definen como enum de Prisma. No se usan strings libres.

3.7 Índices
Por usuario + fecha: @@index([userId, date]) en tablas grandes.

Por FK: @@index([accountId]), @@index([categoryId]), etc.

Los índices únicos de entidades con soft delete son parciales y se crean en la migración SQL. Véase la sección 6.

3.8 Convenciones de nombres
Modelo Prisma: User, Account, Transaction (singular PascalCase).

Tabla BD: users, accounts, transactions (plural snake_case).

Mapeo: @@map("users").

Columna Prisma: userId, createdAt (camelCase).

Columna BD: user_id, created_at (snake_case).

Mapeo: @map("user_id").

4. Resumen de tablas
#	Tabla	Propósito	Registros estimados
1	users	Usuarios	1 por usuario
2	accounts	Cuentas	5-10 por usuario
3	categories	Categorías	20-50 por usuario
4	transactions	Movimientos	100-1000 por mes por usuario
5	recurrences	Recurrencias	5-20 por usuario
6	obligations	Obligaciones	10-50 por mes por usuario
7	budgets	Presupuestos	5-15 por usuario
8	budget_categories	Pivote	N:M
9	savings_goals	Metas	1-5 por usuario
10	goal_contributions	Aportes	5-50 por meta
11	tags	Etiquetas	5-20 por usuario
12	transaction_tags	Pivote	N:M
13	refresh_tokens	Refresh tokens	1-5 por usuario
14	notifications	Notificaciones	10-100 por usuario
5. Preguntas abiertas
(Esta sección debe quedar vacía antes de cerrar el Sprint 1.)

Sin preguntas abiertas por el momento.

## 6. Soft delete

### 6.1 Tablas con deletedAt

| Tabla | Columna |
|---|---|
| `users` | `deletedAt DateTime? @db.Timestamptz(6) @map("deleted_at")` |
| `accounts` | idem |
| `categories` | idem |
| `transactions` | idem |
| `recurrences` | idem |
| `obligations` | idem |
| `budgets` | idem |
| `savings_goals` | idem |
| `goal_contributions` | idem |
| `tags` | idem |

### 6.2 Índices únicos parciales

Los índices únicos de tablas con soft delete son parciales (`WHERE deleted_at IS NULL`). Se agregan manualmente en la migración SQL porque Prisma no los soporta nativamente.

| Tabla | Índice | Columna(s) | Condición |
|---|---|---|---|
| `users` | `users_email_unique` | `email` | `WHERE deleted_at IS NULL` |
| `accounts` | `accounts_user_id_name_unique` | `(user_id, name)` | `WHERE deleted_at IS NULL` |
| `categories` | `categories_user_id_name_type_unique` | `(user_id, name, type)` | `WHERE deleted_at IS NULL` |
| `obligations` | `obligations_recurrence_id_period_start_unique` | `(recurrence_id, period_start)` | `WHERE deleted_at IS NULL` |
| `tags` | `tags_user_id_name_unique` | `(user_id, name)` | `WHERE deleted_at IS NULL` |
| `transactions` | `transactions_obligation_id_unique` | `obligation_id` | `WHERE deleted_at IS NULL` |
| `goal_contributions` | `goal_contributions_transaction_id_unique` | `transaction_id` | `WHERE deleted_at IS NULL` |

### 6.3 Queries de lectura

Todas las queries de lectura de entidades con soft delete filtran `deletedAt: null`.

### 6.4 Restauración

Endpoint: `POST /:entidad/:id/restore`.

Efecto: `deletedAt = null`. Valida que no haya conflicto de unicidad.

### 6.5 Auditoría

Query param: `?includeDeleted=true`.

### 6.6 Idempotencia de obligaciones recurrentes

El service valida que `recurrenceId` y `periodStart` estén presentes juntos para obligaciones recurrentes. La migración agrega esta restricción:

```sql
ALTER TABLE obligations
  ADD CONSTRAINT obligations_recurrence_period_check
  CHECK (
    (recurrence_id IS NULL AND period_start IS NULL)
    OR
    (recurrence_id IS NOT NULL AND period_start IS NOT NULL)
  );
```
