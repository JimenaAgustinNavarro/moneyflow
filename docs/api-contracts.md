# MoneyFlow — Contratos de API

**Versión:** 1.0
**Fecha:** 2026-10-16
**Estado:** Aprobado

Este documento define los contratos de API del MVP de MoneyFlow. Todos los endpoints derivan de `docs/domain-rules.md` y `docs/data-model.md`. Si una regla cambia, se actualiza este documento primero y luego el código.

---

## 0. Convenciones generales

### 0.1 Base URL

/api/v1

text

**Ejemplo:** `GET http://localhost:3001/api/v1/accounts`

### 0.2 Autenticación

**Todas las rutas excepto `POST /auth/register`, `POST /auth/login`, `POST /auth/refresh` y `GET /health` requieren:**
Authorization: Bearer <access_token>

text

**El access token:**

- Es un JWT firmado con `RS256` (o `HS256` con secreto fuerte).
- Expira en **15 minutos**.
- Payload: `{ sub: userId, email, iat, exp }`.

**El refresh token:**

- Es opaco (no JWT).
- Expira en **30 días**.
- Se guarda hasheado en `refresh_tokens`.
- Se rota en cada uso.

### 0.3 Formato de respuestas

**Éxito (2xx):**

````json
{
  "data": { ... }
}
Listas (sin paginación):

json
{
  "data": [ ... ]
}
Listas (con paginación):

json
{
  "data": [ ... ],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 145,
    "totalPages": 8
  }
}
Errores (4xx, 5xx):

Todas las respuestas de error HTTP usan el siguiente formato:

```json
{
  "statusCode": 404,
  "message": "Cuenta no encontrada.",
  "error": "Not Found",
  "timestamp": "2026-10-16T14:30:00.000-05:00",
  "path": "/api/v1/accounts/abc-123"
}
````

- `message` es un string para errores simples y un array de strings para
  errores de validación.
- `timestamp` es una fecha ISO 8601 en la zona horaria `America/Lima`, con
  offset `-05:00`.
- `path` contiene la ruta solicitada sin parámetros de consulta.
- Los errores no controlados responden con estado `500`, `message` genérico
  `"Error interno del servidor"` y `error` `"Internal Server Error"`. No se
  exponen mensajes internos ni stack traces en la respuesta.

### 0.4 Códigos de error estándar

Código Significado
400 Bad Request — validación fallida
401 Unauthorized — token inválido o ausente
403 Forbidden — sin permiso
404 Not Found — recurso no encontrado (o no pertenece al usuario)
409 Conflict — conflicto de estado o unicidad
422 Unprocessable Entity — validación de negocio
500 Internal Server Error — error no controlado

### 0.5 Formato de montos

Todos los montos se devuelven como string:

json
"amount": "150.50"
Nunca como number (evita problemas de precisión de float).

El frontend los parsea con parseFloat o Decimal.js.

0.6 Formato de fechas
Fechas con hora: ISO 8601 con timezone (America/Lima, offset -05:00):

json
"date": "2026-10-16T14:30:00-05:00"
Fechas sin hora: ISO 8601 fecha simple:

json
"targetDate": "2026-12-31"
0.7 IDs
Todos los IDs son UUID v4 (string):

json
"id": "550e8400-e29b-41d4-a716-446655440000"
0.8 Paginación
Endpoints con paginación: GET /transactions, GET /transfers, GET /obligations, GET /notifications.

Query params:

text
?page=1&limit=20
page: número de página (default 1).

limit: items por página (default 20, máximo 100).

Response:

json
{
"data": [ ... ],
"meta": { "page": 1, "limit": 20, "total": 145, "totalPages": 8 }
}
Endpoints sin paginación: GET /accounts, /categories, /budgets, /savings-goals, /tags, /recurrences.

Response:

json
{
"data": [ ... ]
}
0.9 Soft delete
Endpoints de restauración: POST /:entidad/:id/restore.

Query param de auditoría: ?includeDeleted=true.

Entidades con soft delete: users, accounts, categories, transactions, recurrences, obligations, budgets, savings_goals, goal_contributions, tags.

Entidades sin soft delete (hard delete): refresh_tokens, notifications, transaction_tags, budget_categories.

0.10 Aislamiento multi-tenant
Todos los endpoints filtran por userId del token.

Nunca se confía en el userId del body.

Si un recurso no pertenece al usuario → 404 (no 403, para no filtrar existencia).

### 1. Módulo Auth (/auth)

1.1 POST /auth/register
Descripción: Registrar un nuevo usuario.

Auth: No.

Body:

json
{
"email": "jimena@example.com",
"password": "minimo8chars",
"name": "Jimena Agustín"
}
Validaciones:

email: válido, único.

password: mínimo 8 caracteres.

name: 1-100 caracteres.

Response (201):

json
{
"data": {
"id": "550e8400-...",
"email": "jimena@example.com",
"name": "Jimena Agustín",
"createdAt": "2026-10-16T14:30:00-05:00"
}
}
Errores:

400: validación fallida.

409: email ya registrado.

Reglas de negocio: domain-rules.md sección 0 (convenciones).

1.2 POST /auth/login
Descripción: Iniciar sesión y obtener tokens.

Auth: No.

Body:

json
{
"email": "jimena@example.com",
"password": "minimo8chars"
}
Response (200):

json
{
"data": {
"accessToken": "eyJhbGciOi...",
"refreshToken": "opaque-refresh-token",
"user": {
"id": "550e8400-...",
"email": "jimena@example.com",
"name": "Jimena Agustín"
}
}
}
Errores:

400: validación fallida.

401: credenciales inválidas.

Reglas de negocio: domain-rules.md sección 0.

1.3 POST /auth/refresh
Descripción: Renovar el access token usando el refresh token.

Auth: No (recibe el refresh token en el body).

Body:

json
{
"refreshToken": "opaque-refresh-token"
}
Response (200):

json
{
"data": {
"accessToken": "eyJhbGciOi...",
"refreshToken": "new-opaque-refresh-token"
}
}
Errores:

400: validación fallida.

401: refresh token inválido o expirado.

Reglas de negocio:

Rotación: el refresh token viejo se revoca (revokedAt = now()).

Nuevo token: se emite uno nuevo.

1.4 POST /auth/logout
Descripción: Revocar el refresh token actual.

Auth: Sí.

Body:

json
{
"refreshToken": "opaque-refresh-token"
}
Response (204): sin body.

Errores:

401: token inválido.

1.5 GET /auth/me
Descripción: Obtener datos del usuario autenticado.

Auth: Sí.

Response (200):

json
{
"data": {
"id": "550e8400-...",
"email": "jimena@example.com",
"name": "Jimena Agustín",
"timezone": "America/Lima",
"createdAt": "2026-10-16T14:30:00-05:00"
}
}
Errores:

401: token inválido.

2. Módulo Users (/users)
   2.1 PATCH /users/me
   Descripción: Actualizar nombre y/o timezone del usuario.

Auth: Sí.

Body:

json
{
"name": "Jimena Agustín Ruiz",
"timezone": "America/Lima"
}
Validaciones:

name: 1-100 caracteres.

timezone: IANA timezone válida.

Response (200):

json
{
"data": {
"id": "550e8400-...",
"email": "jimena@example.com",
"name": "Jimena Agustín Ruiz",
"timezone": "America/Lima",
"updatedAt": "2026-10-16T15:00:00-05:00"
}
}
Errores:

400: validación fallida.

401: token inválido.

2.2 PATCH /users/me/password
Descripción: Cambiar contraseña.

Auth: Sí.

Body:

json
{
"currentPassword": "minimo8chars",
"newPassword": "nuevominimo8chars"
}
Validaciones:

currentPassword: debe coincidir con la contraseña actual.

newPassword: mínimo 8 caracteres, distinto del actual.

Response (204): sin body.

Errores:

400: validación fallida.

401: contraseña actual incorrecta.

Reglas de negocio: al cambiar la contraseña, se revocan todos los refresh tokens del usuario.

2.3 DELETE /users/me
Descripción: Eliminar la cuenta del usuario (soft delete).

Auth: Sí.

Body:

json
{
"password": "minimo8chars"
}
Validaciones:

password: debe coincidir.

Response (204): sin body.

Errores:

401: contraseña incorrecta.

Reglas de negocio:

Se marca deletedAt = now().

Se revocan todos los refresh tokens.

Los datos quedan en la BD (soft delete).

3. Módulo Accounts (/accounts)
   3.1 GET /accounts
   Descripción: Listar cuentas del usuario.

Auth: Sí.

Query params:

archived (opcional): true | false — filtrar por archivadas.
Si no se especifica, se asume false (solo cuentas no archivadas).
Para ver las archivadas, usar ?archived=true.

includeDeleted (opcional): true — incluir cuentas borradas (auditoría).

Response (200):

json
{
"data": [
{
"id": "550e8400-...",
"name": "BCP Ahorros",
"type": "BANK",
"currency": "PEN",
"initialBalance": "1000.00",
"balance": "1500.50",
"archived": false,
"deletedAt": null,
"createdAt": "2026-10-16T14:30:00-05:00",
"updatedAt": "2026-10-16T15:00:00-05:00"
}
]
}
Errores:

401: token inválido.

3.2 POST /accounts
Descripción: Crear una cuenta.

Auth: Sí.

Body:

json
{
"name": "BCP Ahorros",
"type": "BANK",
"initialBalance": "1000.00"
}
Validaciones:

name: 1-60 caracteres, único por usuario (considerando soft delete).

type: uno de CASH, BANK, WALLET, CREDIT.

initialBalance: número >= 0 (en MVP no se permite saldo inicial negativo).

currency: opcional, default "PEN".

Response (201):

json
{
"data": {
"id": "550e8400-...",
"name": "BCP Ahorros",
"type": "BANK",
"currency": "PEN",
"initialBalance": "1000.00",
"balance": "1000.00",
"archived": false
}
}
Errores:

400: validación fallida.

409: ya existe una cuenta con ese nombre.

Reglas de negocio:

balance = initialBalance al crear.

userId del token, nunca del body.

3.3 GET /accounts/:id
Descripción: Obtener detalle de una cuenta.

Auth: Sí.

Response (200):

json
{
"data": {
"id": "550e8400-...",
"name": "BCP Ahorros",
"type": "BANK",
"currency": "PEN",
"initialBalance": "1000.00",
"balance": "1500.50",
"archived": false,
"createdAt": "2026-10-16T14:30:00-05:00",
"updatedAt": "2026-10-16T15:00:00-05:00"
}
}
Errores:

401: token inválido.

404: cuenta no encontrada o no pertenece al usuario.

3.4 PATCH /accounts/:id
Descripción: Actualizar nombre, tipo o archived de una cuenta.

Auth: Sí.

Body:

json
{
"name": "BCP Ahorros 2",
"type": "BANK",
"archived": true
}
Validaciones:

name: 1-60 caracteres, único por usuario.

type: uno de CASH, BANK, WALLET, CREDIT.

archived: booleano.

Response (200): igual que GET /accounts/:id.

Errores:

400: validación fallida.

404: cuenta no encontrada.

409: nombre duplicado.

Reglas de negocio:

No se puede cambiar initialBalance después de crear la cuenta.

No se puede cambiar currency después de crear la cuenta.

3.5 DELETE /accounts/:id
Descripción: Eliminar (soft delete) una cuenta.

Auth: Sí.

Response (204): sin body.

Errores:

404: cuenta no encontrada.

409: la cuenta tiene movimientos o transferencias CONFIRMED (usar archived = true en su lugar).

Reglas de negocio:

domain-rules.md sección 3.4: no se puede borrar una cuenta con movimientos o transferencias CONFIRMED.

Se marca deletedAt = now().

3.6 POST /accounts/:id/restore
Descripción: Restaurar una cuenta borrada.

Auth: Sí.

Response (200): cuenta restaurada.

Errores:

404: cuenta no encontrada (o no está borrada).

409: ya existe otra cuenta con ese nombre (conflicto de unicidad).

Reglas de negocio:

deletedAt = null.

Este endpoint se usará desde la interfaz en MF-16 (vista de cuentas eliminadas).

Se valida que no haya conflicto de unicidad.

3.7 POST /accounts/:id/recalculate
Descripción: Recalcular el saldo de una cuenta desde los movimientos CONFIRMED.

Auth: Sí.

Response (200):

json
{
"data": {
"id": "550e8400-...",
"balance": "1500.50",
"recalculatedAt": "2026-10-16T15:00:00-05:00"
}
}
Errores:

404: cuenta no encontrada.

Reglas de negocio:

Deriva el balance desde `initialBalance` y los registros confirmados del ledger.

Útil para auditar inconsistencias.

4. Módulo Categories (/categories)
   4.1 GET /categories
   Descripción: Listar categorías (del sistema + del usuario).

Auth: Sí.

Query params:

type (opcional): INCOME | EXPENSE.

includeDeleted (opcional): true | false (default false).

Los valores distintos de INCOME/EXPENSE para type o de true/false para
includeDeleted devuelven 400.

Response (200):

json
{
"data": [
{
"id": "550e8400-...",
"name": "Sueldo",
"type": "INCOME",
"parentId": null,
"icon": "wallet",
"color": "#10b981",
"isSystem": true,
"createdAt": "2026-01-01T00:00:00-05:00"
}
]
}
Errores:

401: token inválido.

Reglas de negocio:

Devuelve categorías del sistema (isSystem = true, userId = null) + categorías del usuario.

4.2 POST /categories
Descripción: Crear una categoría del usuario.

Auth: Sí.

Body:

json
{
"name": "Mascotas",
"type": "EXPENSE",
"parentId": null,
"icon": "paw-print",
"color": "#f59e0b"
}
Validaciones:

name: 1-60 caracteres, único por (userId, name, type).

type: INCOME | EXPENSE.

parentId: opcional. Si viene, debe ser una categoría del usuario o del sistema, del mismo tipo.

La categoría padre debe estar activa, ser accesible y no tener otro padre.
Si no existe, está eliminada o no es accesible, se devuelve 404. Si ya tiene un padre o
su type no coincide, se devuelve 422.

icon: opcional, string.

color: opcional, hex.

Response (201): igual que GET /categories/:id.

Errores:

400: validación fallida.

409: nombre duplicado.

404: categoría padre no encontrada o no accesible.

422: jerarquía superior a 2 niveles o type distinto al del padre.

Reglas de negocio:

domain-rules.md sección 6.3: jerarquía máximo 2 niveles. Si parentId viene, el padre debe tener parentId = null.

No se puede crear una categoría del sistema (solo el seed puede).

4.3 GET /categories/:id
Descripción: Obtener detalle de una categoría.

Auth: Sí.

Response (200): igual que GET /categories.

Errores:

404: categoría no encontrada o no accesible.

4.4 PATCH /categories/:id
Descripción: Actualizar nombre, icono o color.

Auth: Sí.

Body:

json
{
"name": "Mascotas y veterinaria",
"icon": "dog",
"color": "#ef4444"
}
Validaciones:

Solo categorías del usuario (isSystem = false).

name: único por (userId, name, type).

Response (200): igual que GET /categories/:id.

Errores:

400: validación fallida.

403: categoría del sistema.

404: categoría no encontrada.

409: nombre duplicado.

4.5 DELETE /categories/:id
Descripción: Eliminar (soft delete) una categoría del usuario.

Auth: Sí.

Response (204): sin body.

Errores:

403: categoría del sistema (no se puede borrar).

404: categoría no encontrada.

409: categoría con movimientos CONFIRMED (reasignar primero).

409: categoría con subcategorías activas.

Reglas de negocio:

domain-rules.md sección 6.5: no se puede borrar una categoría del sistema.

Si la categoría tiene movimientos CONFIRMED no eliminados (`deletedAt = null`), error 409
(reasignar primero). Los movimientos PENDING, CANCELLED o eliminados no bloquean el borrado.

No se puede borrar una categoría que tenga subcategorías activas; primero deben eliminarse
o reasignarse.

4.6 POST /categories/:id/restore
Descripción: Restaurar una categoría borrada.

Auth: Sí.

Response (200): categoría restaurada.

Errores:

404: categoría no encontrada.

409: conflicto de unicidad.

Seed de categorías del sistema:

- INCOME: Sueldo (`wallet`, `#10b981`), Freelance (`briefcase`, `#059669`),
  Inversiones (`trending-up`, `#0ea5e9`), Otros ingresos (`plus-circle`, `#6366f1`).
- EXPENSE: Alquiler (`home`, `#ef4444`), Comida (`utensils`, `#f59e0b`),
  Transporte (`car`, `#3b82f6`), Salud (`heart-pulse`, `#ec4899`),
  Ocio (`gamepad-2`, `#8b5cf6`), Educación (`graduation-cap`, `#14b8a6`),
  Servicios (`receipt`, `#f97316`), Otros gastos (`more-horizontal`, `#64748b`).

La seed es idempotente y crea únicamente las categorías del sistema que aún no existan.

5. Módulo Transactions (/transactions)
   5.1 GET /transactions
   Descripción: Listar movimientos con filtros.

Auth: Sí.

Query params:

accountId (opcional): UUID.

categoryId (opcional): UUID.

type (opcional): INCOME | EXPENSE.

status (opcional): PENDING | CONFIRMED | CANCELLED.

from (opcional): YYYY-MM-DD.

to (opcional): YYYY-MM-DD.

page (opcional): default 1.

limit (opcional): default 20, máximo 100.

includeDeleted (opcional): true.

Response (200):

json
{
"data": [
{
"id": "550e8400-...",
"accountId": "550e8400-...",
"categoryId": "550e8400-...",
"type": "EXPENSE",
"amount": "150.50",
"currency": "PEN",
"description": "Supermercado",
"date": "2026-10-15T10:00:00-05:00",
"status": "CONFIRMED",
"createdAt": "2026-10-15T10:00:00-05:00",
"updatedAt": "2026-10-15T10:00:00-05:00"
}
],
"meta": {
"page": 1,
"limit": 20,
"total": 145,
"totalPages": 8
}
}
Errores:

400: validación fallida.

401: token inválido.

Reglas de negocio:

Filtra por `userId` del token. `type` acepta `INCOME` o `EXPENSE`. La API expone el campo `date`, que se mapea desde `occurredAt` en Prisma.

Ordenado por `date` descendente y, en caso de empate, `createdAt` descendente.

`from` y `to` son inclusivos y se interpretan en `America/Lima`; `to` incluye
el día completo. La paginación empieza en 1 y `limit` no puede superar 100.

5.2 POST /transactions
Descripción: Crear un movimiento (ingreso o egreso).

Auth: Sí.

Body:

json
{
"accountId": "550e8400-...",
"categoryId": "550e8400-...",
"type": "EXPENSE",
"amount": "150.50",
"description": "Supermercado",
"date": "2026-10-15T10:00:00-05:00",
"status": "CONFIRMED"
}
Validaciones:

accountId: debe pertenecer al usuario.

La cuenta no puede estar archivada ni eliminada. Una cuenta archivada o una
fecha futura devuelve 400; una cuenta eliminada o inaccesible devuelve 404.

categoryId: debe pertenecer al usuario o ser del sistema, del tipo correcto.

type: INCOME | EXPENSE (no TRANSFER, para eso hay un endpoint aparte).

amount: > 0.

date: no futura.

status: default CONFIRMED.

Response (201):

json
{
"data": {
"id": "550e8400-...",
"accountId": "550e8400-...",
"categoryId": "550e8400-...",
"type": "EXPENSE",
"amount": "150.50",
"currency": "PEN",
"description": "Supermercado",
"date": "2026-10-15T10:00:00-05:00",
"status": "CONFIRMED",
"createdAt": "2026-10-15T10:00:00-05:00"
}
}
Errores:

400: validación fallida.

404: cuenta o categoría no encontrada.

422: tipo de categoría no coincide con el tipo de movimiento.

Reglas de negocio:

El saldo de la cuenta se deriva del ledger y no se persiste en `accounts`.

domain-rules.md sección 3.1: valida que amount > 0.

Solo los movimientos `CONFIRMED` se incluyen al derivar el saldo. `PENDING` y
`CANCELLED` no lo modifican. El status predeterminado es `CONFIRMED`.

5.3 GET /transactions/:id
Descripción: Obtener detalle de un movimiento.

Auth: Sí.

Response (200): igual que POST /transactions.

Errores:

404: movimiento no encontrado.

5.4 PATCH /transactions/:id
Descripción: Editar un movimiento.

Auth: Sí.

Body:

json
{
"amount": "200.00",
"description": "Supermercado grande",
"categoryId": "550e8400-..."
}
Validaciones:

Igual que POST /transactions.

Response (200): igual que GET /transactions/:id.

Errores:

400: validación fallida.

404: movimiento no encontrado.

409: se intenta cambiar `type` de un movimiento `CONFIRMED`.

422: tipo de categoría no coincide.

Reglas de negocio:

domain-rules.md sección 3.2: revierte el efecto anterior y aplica el nuevo
efecto de saldo si cambia `accountId`, `amount`, `type` o `status`.

`type` solo puede cambiar si el movimiento está `PENDING` o `CANCELLED`.
Si cambia `accountId`, la cuenta destino debe pertenecer al usuario y no estar
archivada ni eliminada; la moneda del movimiento pasa a ser la de esa cuenta.

Toda la operación en una transacción de BD.

5.5 DELETE /transactions/:id
Descripción: Eliminar (soft delete) un movimiento.

Auth: Sí.

Response (204): sin body.

Errores:

404: movimiento no encontrado.

Reglas de negocio:

El borrado lógico excluye el movimiento del balance derivado si estaba
`CONFIRMED`. Las transferencias se cancelan desde `/transfers`, no desde este
endpoint.

5.6 POST /transactions/:id/restore
Descripción: Restaurar un movimiento borrado.

Auth: Sí.

Response (200): movimiento restaurado.

Errores:

404: movimiento no encontrado.

422: la cuenta asociada está borrada o archivada.

5.7 GET /transfers
Descripción: Listar transferencias del usuario.

Auth: Sí.

Query params:

accountId (opcional): UUID; filtra transferencias de entrada o salida de la cuenta.

from, to (opcional): fechas ISO 8601 inclusivas; las fechas `YYYY-MM-DD` abarcan el día completo en `America/Lima`.

includeCancelled (opcional): `true` incluye transferencias canceladas para auditoría.

page (opcional): default 1.

limit (opcional): default 20, máximo 100.

Por defecto solo se listan transferencias `CONFIRMED`.

Response (200): `{ "data": [Transfer], "meta": { "page": 1, "limit": 20, "total": 0, "totalPages": 0 } }`.

5.8 GET /transfers/:id
Descripción: Obtener una transferencia por ID, incluidas las canceladas.

Auth: Sí.

Response (200): `{ "data": Transfer }`.

404: transferencia no encontrada o no pertenece al usuario.

5.9 POST /transfers
Descripción: Crear una transferencia confirmada entre dos cuentas del usuario.

Auth: Sí.

Body: `{ "originAccountId": "UUID", "destinationAccountId": "UUID", "amount": "500.00", "description": "Ahorro mensual", "date": "2026-10-15T10:00:00-05:00" }`.

Validaciones: cuentas distintas, activas, del usuario y de la misma moneda; monto mayor a cero; fecha ISO 8601 no futura.

Response (201): `{ "data": Transfer }`.

Transfer: `{ "id": "UUID", "originAccountId": "UUID", "destinationAccountId": "UUID", "amount": "500.00", "currency": "PEN", "description": "Ahorro mensual", "occurredAt": "2026-10-15T15:00:00.000Z", "status": "CONFIRMED", "cancelledAt": null, "createdAt": "2026-10-15T15:00:00.000Z", "updatedAt": "2026-10-15T15:00:00.000Z" }`.

400: validación fallida o cuenta archivada. 404: cuenta no encontrada. 422: cuentas iguales o monedas distintas.

La fecha de entrada `date` se persiste como `occurredAt`. La transferencia se registra como una sola entidad y su efecto en el balance se deriva del ledger.

5.10 PATCH /transfers/:id
Descripción: Editar parcialmente una transferencia.

Auth: Sí.

Body: cualquier subconjunto de `originAccountId`, `destinationAccountId`, `amount`, `description` y `date`.

Response (200): `{ "data": Transfer }`.

409: transferencia cancelada. 404: transferencia o cuenta no encontrada. 422: cuentas iguales o monedas distintas.

Solo se pueden editar transferencias `CONFIRMED`. El cambio se realiza de forma transaccional y actualiza la fuente del balance derivado.

5.11 DELETE /transfers/:id
Descripción: Cancelar una transferencia; no elimina el registro.

Auth: Sí.

Response (204): sin body.

409: transferencia ya cancelada. 404: transferencia no encontrada o no pertenece al usuario.

El estado pasa de `CONFIRMED` a `CANCELLED` y se registra `cancelledAt`. El balance derivado deja de incluir la transferencia.

---

## 6. Módulos complementarios

### 6.1-6.7 Recurrencias

Todas las operaciones requieren autenticación.

#### GET /recurrences

Lista las recurrencias del usuario sin paginación. Filtros opcionales: `active`, `type`, `accountId`, `categoryId` e `includeDeleted`.

Response `200`: `{ "data": [] }`. Cada recurrencia incluida contiene `accountId`, `accountName`, `categoryId` y `categoryName`.

#### POST /recurrences

Response `201`:

```json
{
  "data": {
    "id": "uuid",
    "accountId": "uuid",
    "accountName": "Cuenta principal",
    "categoryId": "uuid",
    "categoryName": "Servicios",
    "currency": "PEN"
  }
}
```

#### GET /recurrences/:id

Response `200`: recurrencia individual dentro de `{ data }`, incluyendo `accountId`, `accountName`, `categoryId` y `categoryName`. Los nombres relacionados pueden ser `null` si la relación no existe.

#### PATCH /recurrences/:id

Cuerpo opcional con los mismos campos que POST. Response `200` dentro de `{ data }`.

#### DELETE /recurrences/:id

Soft delete. Response `204`, sin cuerpo.

#### POST /recurrences/:id/restore

Response `200` dentro de `{ data }`, con `deletedAt` restaurado a `null`.

#### PATCH /recurrences/:id/toggle

Alterna `active`. Response `200` dentro de `{ data }`.

#### Cuerpo común

- `name`: texto requerido, máximo 255 caracteres.
- `type`: `INCOME` | `EXPENSE`.
- `amount`: decimal positivo con máximo dos decimales.
- `currency`: tres letras mayúsculas; opcional, por defecto `PEN`.
- `description`: texto opcional, máximo 500 caracteres.
- `frequency`: `WEEKLY`, `BIWEEKLY`, `MONTHLY`, `QUARTERLY` o `YEARLY`.
- `dayOfPeriod`: entero opcional de 1 a 31.
- `startDate`: ISO 8601 con zona horaria.
- `endDate`: ISO 8601 opcional con zona horaria, posterior o igual a `startDate`.
- `accountId`: UUID requerido, cuenta activa, no eliminada y propiedad del usuario.
- `categoryId`: UUID opcional, categoría propia o de sistema compatible con `type`.

#### Respuestas y cálculo

- `nextDueDate` se calcula desde la hora actual, no se persiste y usa la zona America/Lima (`-05:00`). Es `null` si la recurrencia terminó o si la siguiente ocurrencia excede `endDate`.
- Frecuencias semanales avanzan 7 días y quincenales 14 días. Mensuales, trimestrales y anuales ajustan el día solicitado al último día disponible del mes. El día 31 de febrero se representa como 28 o 29 según corresponda.
- Errores comunes: `400` para validación, `401` sin autenticación y `404` para recursos inexistentes o ajenos al usuario.
- La creación de recurrencias no genera obligaciones; esa generación corresponde a MF-27.
- El listado no incluye paginación. Para volúmenes mayores de 100 recurrencias se evaluará paginación en FIX-RECURRENCE-02.

### 6.8 `GET /dashboard/summary`

**Descripción:** Obtener un resumen financiero para el usuario autenticado.

**Auth:** Sí.

**Query params:**

- `period` (opcional): `month` (valor predeterminado), `last_month`,
  `last_3_months` o `custom`.
- `from` y `to` (obligatorios cuando `period=custom`): fecha ISO 8601. Las fechas sin hora
  incluyen el día completo en `America/Lima` (UTC-05:00); las fechas y horas deben incluir
  zona horaria.
- `accountId` (opcional): UUID de cuenta para filtrar los movimientos y el balance.

**Response (200):**

```json
{
  "data": {
    "period": {
      "from": "2026-10-01T00:00:00.000-05:00",
      "to": "2026-10-31T23:59:59.999-05:00"
    },
    "totalBalance": "1250.00",
    "periodIncome": "1500.00",
    "periodExpense": "250.00",
    "netFlow": "1250.00",
    "topCategories": [
      {
        "categoryId": "550e8400-...",
        "categoryName": "Alimentación",
        "total": "180.00",
        "count": 4
      }
    ],
    "recentTransactions": [
      {
        "id": "550e8400-...",
        "type": "EXPENSE",
        "amount": "45.00",
        "currency": "PEN",
        "date": "2026-10-28T12:30:00.000-05:00",
        "description": "Almuerzo",
        "categoryId": "550e8400-...",
        "categoryName": "Alimentación"
      }
    ],
    "committedMoney": "1250.00",
    "upcomingPayments": [
      {
        "id": "550e8400-...",
        "name": "Alquiler",
        "amount": "850.00",
        "currency": "PEN",
        "dueDate": "2026-10-30T00:00:00.000-05:00",
        "status": "PENDING",
        "accountName": "Cuenta principal",
        "categoryName": "Vivienda"
      }
    ],
    "topBudgets": [
      {
        "id": "550e8400-...",
        "name": "Alimentación mensual",
        "limit": "600.00",
        "currency": "PEN",
        "periodType": "MONTHLY",
        "startDate": "2026-10-01T00:00:00.000-05:00",
        "endDate": "2026-10-31T00:00:00.000-05:00",
        "spent": "420.00",
        "percentage": 70,
        "status": "UNDER_LIMIT",
        "alertThreshold": 80
      }
    ]
  }
}
```

`totalBalance` suma nominalmente los balances de cuentas activas (no archivadas ni
eliminadas); no convierte entre monedas. `recentTransactions` contiene los diez movimientos
confirmados más recientes, independientemente del período, y respeta `accountId` cuando se
envía. Los importes se serializan como strings con dos decimales. Las fechas de período y
movimientos se devuelven en `America/Lima` con offset `-05:00`.

`committedMoney` suma `Obligation.amount` de las obligaciones que vencen dentro del período
seleccionado y tienen estado `PENDING`, `PARTIALLY_PAID` u `OVERDUE`. Devuelve `0.00` cuando
no existen obligaciones que cumplan esos filtros.

`upcomingPayments` contiene como máximo las cinco próximas obligaciones con estado `PENDING` o
`PARTIALLY_PAID`, ordenadas por `dueDate` ascendente. Incluye los nombres de cuenta y categoría;
`categoryName` es `null` si la obligación no tiene categoría.

`topBudgets` contiene como máximo los tres presupuestos activos cuyo porcentaje de consumo sea
más alto, calculado como `spent / limit * 100`. Incluye el estado calculado como `UNDER_LIMIT`
cuando el porcentaje es menor que `alertThreshold`, `NEAR_LIMIT` cuando está entre el umbral y
100, y `OVER_LIMIT` cuando supera 100. El gasto se calcula con movimientos `EXPENSE` confirmados
dentro del período propio de cada presupuesto.

`categoryName` es `null` si el movimiento no tiene una categoría asociada o si no se encuentra
su registro de categoría. Los importes de obligaciones y presupuestos se serializan con dos
decimales.

**Errores:**

- 400: período no válido, parámetros ISO 8601 incorrectos, falta `from` o `to` en período
  personalizado, o rango invertido.
- 401: token ausente o inválido.
7. Modulo Obligations (/obligations)

### Endpoints
- POST /obligations crea una obligacion con accountId obligatorio.
- GET /obligations lista sin paginacion con filtros.
- GET /obligations/upcoming devuelve las cinco proximas obligaciones pendientes o parcialmente pagadas.
- GET /obligations/:id incluye los pagos.
- POST /obligations/:id/pay registra pagos parciales o totales.
- PATCH /obligations/:id modifica una obligacion activa.
- DELETE /obligations/:id aplica soft delete con CANCELLED.
- POST /obligations/:id/restore restaura como PENDING.
- POST /obligations/generate genera solo el periodo actual e es idempotente.

### DTO de creacion
name, amount, dueDate, accountId y type son obligatorios. categoryId, currency, description, recurrenceId, periodStart y periodEnd son opcionales.

### Pago
amount es opcional; si se omite se paga el saldo restante. accountId es obligatorio y paidAt y description son opcionales. Se crea una transaccion EXPENSE CONFIRMED, un ObligationPayment CONFIRMED y se actualiza el estado de la obligacion.

### Filtros
status, from, to, overdue, recurrenceId, accountId, categoryId e includeDeleted. No existe paginacion. Las fechas usan ISO 8601 y hora Lima -05:00.

OVERDUE se calcula on-the-fly. ObligationStatus: PENDING, PARTIALLY_PAID, PAID, OVERDUE, CANCELLED.

Errores: 400 monto invalido o excedente; 401 token ausente o invalido; 404 recurso inexistente o ajeno; 409 pagada o cancelada.

8. Módulo Budgets (/budgets)
8.1 GET /budgets
Lista presupuestos del usuario. Query params: status (UNDER_LIMIT | NEAR_LIMIT | OVER_LIMIT), active (true | false) e includeDeleted (true). No hay paginacion. Respuesta: { data: [{ id, name, limit, currency, periodType, startDate, endDate, alertThreshold, active, status, categories, createdAt, updatedAt, deletedAt }] }. Errores 401.

8.2 POST /budgets
Body: name (1-255), limit decimal mayor que cero, currency opcional AAA (default PEN), periodType (WEEKLY | MONTHLY | QUARTERLY | YEARLY), startDate ISO Lima, endDate opcional, categoryIds UUID[] no vacio y alertThreshold opcional 1-100 (default 80). Respuesta 201. Errores 400 y 404.

8.3 GET /budgets/:id
Respuesta 200 con detalle y categorias activas. Errores 404.

8.4 GET /budgets/:id/usage
Respuesta 200: { data: { spent, limit, percentage, status, alertThreshold, period: { startDate, endDate } } }. spent suma solo transacciones EXPENSE CONFIRMED no eliminadas de categorias activas dentro del periodo. Estados: UNDER_LIMIT, NEAR_LIMIT, OVER_LIMIT. Errores 404.

8.5 POST /budgets/:id/copy
Body: startDate ISO, endDate opcional y name opcional. Copia limite, moneda, periodo, umbral, estado activo y categorias activas. No copia gasto ni transacciones. Respuesta 201. Errores 400 y 404.

8.6 PATCH /budgets/:id
Campos opcionales del DTO de creacion y categoryIds para quitar, restaurar o crear relaciones. Respuesta 200. Errores 400 y 404.

8.7 DELETE /budgets/:id
Soft delete del presupuesto y relaciones activas. Respuesta 204. Errores 404.

8.8 POST /budgets/:id/restore
Restauracion del presupuesto y relaciones eliminadas. Respuesta 200. Errores 404.

Montos con dos decimales y fechas ISO 8601 con America/Lima (-05:00). La unicidad de budget_categories es parcial para relaciones activas.

9. Módulo Savings Goals (/savings-goals)
9.1 GET /savings-goals
Descripción: Listar metas de ahorro.

Auth: Sí.

Query params:

status (opcional): ACTIVE | COMPLETED | CANCELLED.

includeDeleted (opcional): true.

Response (200):

json
{
  "data": [
    {
      "id": "550e8400-...",
      "name": "Vacaciones",
      "targetAmount": "2000.00",
      "currentAmount": "500.00",
      "targetDate": "2027-06-30",
      "accountId": "550e8400-...",
      "status": "ACTIVE",
      "progreso": 25.00,
      "createdAt": "2026-10-01T00:00:00-05:00"
    }
  ]
}
Errores:

401: token inválido.

9.2 POST /savings-goals
Descripción: Crear una meta de ahorro.

Auth: Sí.

Body:

json
{
  "name": "Vacaciones",
  "targetAmount": "2000.00",
  "targetDate": "2027-06-30",
  "accountId": "550e8400-..."
}
Validaciones:

name: 1-60 caracteres.

targetAmount: > 0.

targetDate: opcional, futura.

accountId: opcional, cuenta del usuario.

Response (201): igual que GET /savings-goals.

Errores:

400: validación fallida.

404: cuenta no encontrada.

Reglas de negocio:

currentAmount = 0.

status = ACTIVE.

9.3 GET /savings-goals/:id
Descripción: Obtener detalle de una meta.

Auth: Sí.

Response (200): igual que GET /savings-goals.

Errores:

404: meta no encontrada.

9.4 PATCH /savings-goals/:id
Descripción: Actualizar una meta.

Auth: Sí.

Body:

json
{
  "name": "Vacaciones 2027",
  "targetAmount": "2500.00",
  "targetDate": "2027-07-31",
  "accountId": "550e8400-..."
}
Validaciones:

Solo metas ACTIVE.

Response (200): igual que GET /savings-goals/:id.

Errores:

400: validación fallida.

404: meta no encontrada.

409: la meta está COMPLETED o CANCELLED.

9.5 DELETE /savings-goals/:id
Descripción: Eliminar (soft delete) una meta.

Auth: Sí.

Response (204): sin body.

Errores:

404: meta no encontrada.

Reglas de negocio:

domain-rules.md sección 8.6:

Los aportes y retiros se borran en cascada.

Si la meta tiene accountId, los movimientos de la cuenta NO se borran. Solo se desvinculan.

9.6 POST /savings-goals/:id/restore
Descripción: Restaurar una meta borrada.

Auth: Sí.

Response (200): meta restaurada.

Errores:

404: meta no encontrada.

10. Módulo Goal Contributions (/savings-goals/:goalId/contributions)
10.1 GET /savings-goals/:goalId/contributions
Descripción: Listar aportes y retiros de una meta.

Auth: Sí.

Response (200):

json
{
  "data": [
    {
      "id": "550e8400-...",
      "goalId": "550e8400-...",
      "transactionId": "550e8400-...",
      "amount": "500.00",
      "type": "DEPOSIT",
      "date": "2026-10-15T10:00:00-05:00",
      "createdAt": "2026-10-15T10:00:00-05:00"
    }
  ]
}
Errores:

404: meta no encontrada.

10.2 POST /savings-goals/:goalId/contributions
Descripción: Registrar un aporte o retiro.

Auth: Sí.

Body:

json
{
  "type": "DEPOSIT",
  "amount": "500.00",
  "date": "2026-10-15T10:00:00-05:00",
  "transactionId": "550e8400-..."
}
Validaciones:

type: DEPOSIT | WITHDRAWAL.

amount: > 0.

date: no futura.

transactionId: opcional, movimiento del usuario.

Si type = WITHDRAWAL, amount <= currentAmount de la meta.

Response (201): igual que GET /savings-goals/:goalId/contributions.

Errores:

400: validación fallida.

404: meta o movimiento no encontrado.

422: retiro mayor al acumulado.

Reglas de negocio:

domain-rules.md sección 8.2: currentAmount += amount (DEPOSIT) o -= amount (WITHDRAWAL).

domain-rules.md sección 8.5: si currentAmount >= targetAmount, status = COMPLETED.

Si transactionId viene: el movimiento debe ser del tipo correcto (INCOME para DEPOSIT, EXPENSE para WITHDRAWAL) y no debe estar ya vinculado a otra meta.

transactions_obligation_id_unique... (no aplica acá). El índice goal_contributions_transaction_id_unique WHERE deleted_at IS NULL garantiza 1:1.

10.3 DELETE /savings-goals/:goalId/contributions/:id
Descripción: Eliminar (soft delete) un aporte.

Auth: Sí.

Response (204): sin body.

Errores:

404: aporte no encontrado.

Reglas de negocio:

domain-rules.md sección 8.2: currentAmount -= amount (si era DEPOSIT) o += amount (si era WITHDRAWAL).

Si status = COMPLETED y el retiro reduce por debajo de targetAmount, status = ACTIVE.

10.4 POST /savings-goals/:goalId/contributions/:id/restore
Descripción: Restaurar un aporte borrado.

Auth: Sí.

Response (200): aporte restaurado.

Errores:

404: aporte no encontrado.

409: conflicto de unicidad (si el movimiento ya está vinculado a otro aporte).

11. Módulo Tags (/tags)
11.1 GET /tags
Descripción: Listar etiquetas del usuario.

Auth: Sí.

Query params:

includeDeleted (opcional): true.

Response (200):

json
{
  "data": [
    {
      "id": "550e8400-...",
      "name": "urgente",
      "color": "#ef4444",
      "createdAt": "2026-10-01T00:00:00-05:00"
    }
  ]
}
Errores:

401: token inválido.

11.2 POST /tags
Descripción: Crear una etiqueta.

Auth: Sí.

Body:

json
{
  "name": "urgente",
  "color": "#ef4444"
}
Validaciones:

name: 1-30 caracteres, único por (userId, name).

color: opcional, hex.

Response (201): igual que GET /tags.

Errores:

400: validación fallida.

409: nombre duplicado.

11.3 PATCH /tags/:id
Descripción: Actualizar una etiqueta.

Auth: Sí.

Body:

json
{
  "name": "muy-urgente",
  "color": "#dc2626"
}
Validaciones:

name: único por (userId, name).

Response (200): igual que GET /tags.

Errores:

400: validación fallida.

404: etiqueta no encontrada.

409: nombre duplicado.

11.4 DELETE /tags/:id
Descripción: Eliminar (soft delete) una etiqueta.

Auth: Sí.

Response (204): sin body.

Errores:

404: etiqueta no encontrada.

Reglas de negocio:

Los transaction_tags asociados se borran en cascada (hard delete, porque es pivote).

Los movimientos siguen existiendo, solo se desetiquetan.

11.5 POST /tags/:id/restore
Descripción: Restaurar una etiqueta borrada.

Auth: Sí.

Response (200): etiqueta restaurada.

Errores:

404: etiqueta no encontrada.

409: conflicto de unicidad.

12. Módulo Notifications (/notifications)
12.1 GET /notifications
Descripción: Listar notificaciones del usuario.

Auth: Sí.

Query params:

unreadOnly (opcional): true — solo no leídas.

page (opcional): default 1.

limit (opcional): default 20, máximo 100.

Response (200):

json
{
  "data": [
    {
      "id": "550e8400-...",
      "type": "OBLIGATION_DUE",
      "title": "Pago próximo",
      "message": "La obligación \"Luz\" vence en 3 días.",
      "readAt": null,
      "createdAt": "2026-10-12T10:00:00-05:00"
    }
  ],
  "meta": { "page": 1, "limit": 20, "total": 15, "totalPages": 1 }
}
Errores:

401: token inválido.

Reglas de negocio:

Ordenado por createdAt descendente.

Sin soft delete (hard delete, si el usuario quiere borrar una notificación).

12.2 PATCH /notifications/:id/read
Descripción: Marcar una notificación como leída.

Auth: Sí.

Response (200):

json
{
  "data": {
    "id": "550e8400-...",
    "readAt": "2026-10-16T15:00:00-05:00"
  }
}
Errores:

404: notificación no encontrada.

12.3 PATCH /notifications/read-all
Descripción: Marcar todas las notificaciones como leídas.

Auth: Sí.

Response (200):

json
{
  "data": {
    "updated": 15
  }
}
Errores:

401: token inválido.

13. Módulo Health (/health)
13.1 GET /health
Descripción: Verificar que la API está viva.

Auth: No.

Response (200):

json
{
  "status": "ok",
  "timestamp": "2026-10-16T14:30:00-05:00"
}
Errores: ninguno.

Nota: este endpoint está fuera del prefijo /api/v1 (registrado directamente en /health).

14. Tabla resumen de endpoints
#	Método	Ruta	Auth	Paginación
1	POST	/auth/register	No	—
2	POST	/auth/login	No	—
3	POST	/auth/refresh	No	—
4	POST	/auth/logout	Sí	—
5	GET	/auth/me	Sí	—
6	PATCH	/users/me	Sí	—
7	PATCH	/users/me/password	Sí	—
8	DELETE	/users/me	Sí	—
9	GET	/accounts	Sí	No
10	POST	/accounts	Sí	—
11	GET	/accounts/:id	Sí	—
12	PATCH	/accounts/:id	Sí	—
13	DELETE	/accounts/:id	Sí	—
14	POST	/accounts/:id/restore	Sí	—
15	POST	/accounts/:id/recalculate	Sí	—
16	GET	/categories	Sí	No
17	POST	/categories	Sí	—
18	GET	/categories/:id	Sí	—
19	PATCH	/categories/:id	Sí	—
20	DELETE	/categories/:id	Sí	—
21	POST	/categories/:id/restore	Sí	—
22	GET	/transactions	Sí	Sí
23	POST	/transactions	Sí	—
24	GET	/transactions/:id	Sí	—
25	PATCH	/transactions/:id	Sí	—
26	DELETE	/transactions/:id	Sí	—
27	POST	/transactions/:id/restore	Sí	—
28	GET	/transfers	Sí	Filtros y paginación
29	GET	/transfers/:id	Sí	—
30	POST	/transfers	Sí	Crear transferencia
31	PATCH	/transfers/:id	Sí	Editar confirmada
32	DELETE	/transfers/:id	Sí	Cancelar
33	GET	/recurrences	Sí	No
34	POST	/recurrences	Sí	—
35	GET	/recurrences/:id	Sí	—
36	PATCH	/recurrences/:id	Sí	—
37	DELETE	/recurrences/:id	Sí	—
38	POST	/recurrences/:id/restore	Sí	—
39	PATCH	/recurrences/:id/toggle	Sí	—
40	GET	/obligations	Sí	Sí
41	GET	/obligations/upcoming	Sí	No
42	POST	/obligations	Sí	—
43	GET	/obligations/:id	Sí	—
44	POST	/obligations/:id/pay	Sí	—
45	PATCH	/obligations/:id	Sí	—
46	DELETE	/obligations/:id	Sí	—
47	POST	/obligations/:id/restore	Sí	—
48	GET	/budgets	Sí	No
49	POST	/budgets	Sí	—
50	GET	/budgets/:id	Sí	—
51	GET	/budgets/:id/usage	Sí	—
52	PATCH	/budgets/:id	Sí	—
53	DELETE	/budgets/:id	Sí	—
54	POST	/budgets/:id/restore	Sí	—
55	POST	/budgets/:id/copy	Sí	—
56	GET	/savings-goals	Sí	No
57	POST	/savings-goals	Sí	—
58	GET	/savings-goals/:id	Sí	—
59	PATCH	/savings-goals/:id	Sí	—
60	DELETE	/savings-goals/:id	Sí	—
61	POST	/savings-goals/:id/restore	Sí	—
62	GET	/savings-goals/:goalId/contributions	Sí	No
63	POST	/savings-goals/:goalId/contributions	Sí	—
64	DELETE	/savings-goals/:goalId/contributions/:id	Sí	—
65	POST	/savings-goals/:goalId/contributions/:id/restore	Sí	—
66	GET	/tags	Sí	No
67	POST	/tags	Sí	—
68	PATCH	/tags/:id	Sí	—
69	DELETE	/tags/:id	Sí	—
70	POST	/tags/:id/restore	Sí	—
71	GET	/notifications	Sí	Sí
72	PATCH	/notifications/:id/read	Sí	—
73	PATCH	/notifications/read-all	Sí	—
74	GET	/health	No	—
Total: 74 endpoints.

15. Preguntas abiertas
(Esta sección debe quedar vacía antes de cerrar el Sprint 1.)

Sin preguntas abiertas por el momento.
```
