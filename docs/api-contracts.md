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

```json
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


{
  "statusCode": 404,
  "message": "Cuenta no encontrada.",
  "error": "Not Found",
  "timestamp": "2026-10-16T14:30:00-05:00",
  "path": "/api/v1/accounts/abc-123"
}




### 0.4 Códigos de error estándar

Código	Significado
400	Bad Request — validación fallida
401	Unauthorized — token inválido o ausente
403	Forbidden — sin permiso
404	Not Found — recurso no encontrado (o no pertenece al usuario)
409	Conflict — conflicto de estado o unicidad
422	Unprocessable Entity — validación de negocio
500	Internal Server Error — error no controlado
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
Endpoints con paginación: GET /transactions, GET /obligations, GET /notifications.

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

409: la cuenta tiene movimientos CONFIRMED (usar archived = true en su lugar).

Reglas de negocio:

domain-rules.md sección 3.4: no se puede borrar una cuenta con movimientos CONFIRMED.

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

domain-rules.md sección 2.4: recalcula balance sumando todos los movimientos CONFIRMED.

Útil para auditar inconsistencias.

4. Módulo Categories (/categories)
4.1 GET /categories
Descripción: Listar categorías (del sistema + del usuario).

Auth: Sí.

Query params:

type (opcional): INCOME | EXPENSE.

includeDeleted (opcional): true.

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

icon: opcional, string.

color: opcional, hex.

Response (201): igual que GET /categories/:id.

Errores:

400: validación fallida.

409: nombre duplicado.

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

Reglas de negocio:

domain-rules.md sección 6.5: no se puede borrar una categoría del sistema.

Si la categoría tiene movimientos, error 409 (reasignar primero).

4.6 POST /categories/:id/restore
Descripción: Restaurar una categoría borrada.

Auth: Sí.

Response (200): categoría restaurada.

Errores:

404: categoría no encontrada.

409: conflicto de unicidad.

5. Módulo Transactions (/transactions)
5.1 GET /transactions
Descripción: Listar movimientos con filtros.

Auth: Sí.

Query params:

accountId (opcional): UUID.

categoryId (opcional): UUID.

type (opcional): INCOME | EXPENSE | TRANSFER.

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
      "transferId": null,
      "counterpartAccountId": null,
      "obligationId": null,
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

Filtra por userId del token.

Ordenado por date descendente.

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

domain-rules.md sección 2.4: actualiza accounts.balance en la misma transacción.

domain-rules.md sección 3.1: valida que amount > 0.

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

422: tipo de categoría no coincide.

Reglas de negocio:

domain-rules.md sección 3.2: recalcula accounts.balance si cambia accountId o amount o status.

Toda la operación en una transacción de BD.

5.5 DELETE /transactions/:id
Descripción: Eliminar (soft delete) un movimiento.

Auth: Sí.

Response (204): sin body.

Errores:

404: movimiento no encontrado.

Reglas de negocio:

domain-rules.md sección 3.3: recalcula accounts.balance.

Si el movimiento tiene obligationId, la obligación pasa de PAID a PENDING.

Si es transferencia, se borran ambas patas por transferId.

5.6 POST /transactions/:id/restore
Descripción: Restaurar un movimiento borrado.

Auth: Sí.

Response (200): movimiento restaurado.

Errores:

404: movimiento no encontrado.

422: la cuenta asociada está borrada o archivada.

5.7 POST /transfers
Descripción: Crear una transferencia entre dos cuentas del mismo usuario.

Auth: Sí.

Body:

json
{
  "originAccountId": "550e8400-...",
  "destinationAccountId": "550e8400-...",
  "amount": "500.00",
  "description": "Ahorro mensual",
  "date": "2026-10-15T10:00:00-05:00"
}
Validaciones:

originAccountId y destinationAccountId: distintas, del mismo usuario.

amount: > 0.

Misma moneda (en MVP, siempre PEN).

Response (201):

json
{
  "data": {
    "transferId": "550e8400-...",
    "origin": {
      "id": "550e8400-...",
      "accountId": "550e8400-...",
      "type": "TRANSFER",
      "amount": "500.00",
      "counterpartAccountId": "550e8400-..."
    },
    "destination": {
      "id": "550e8400-...",
      "accountId": "550e8400-...",
      "type": "TRANSFER",
      "amount": "500.00",
      "counterpartAccountId": "550e8400-..."
    }
  }
}
Errores:

400: validación fallida.

404: cuenta no encontrada.

422: cuentas iguales o monedas distintas.

Reglas de negocio:

domain-rules.md sección 4: se crean dos movimientos enlazados con transferId compartido.

domain-rules.md sección 4.3: las transferencias no cuentan como ingreso ni egreso.

Toda la operación en una transacción de BD.

5.8 DELETE /transfers/:transferId
Descripción: Eliminar (soft delete) ambas patas de una transferencia.

Auth: Sí.

Response (204): sin body.

Errores:

404: transferencia no encontrada.

Reglas de negocio:

domain-rules.md sección 4.4: se borran ambas patas por transferId.

Recalcula balance de las 2 cuentas.

---

## 6. Módulo Recurrences (`/recurrences`)

### 6.1 `GET /recurrences`

**Descripción:** Listar recurrencias del usuario.

**Auth:** Sí.

**Query params:**
- `active` (opcional): `true` | `false`.
- `includeDeleted` (opcional): `true`.

**Response (200):**
```json
{
  "data": [
    {
      "id": "550e8400-...",
      "name": "Luz",
      "amount": "120.00",
      "type": "EXPENSE",
      "categoryId": "550e8400-...",
      "accountId": "550e8400-...",
      "frequency": "MONTHLY",
      "dayOfPeriod": 15,
      "startDate": "2026-01-15T00:00:00-05:00",
      "endDate": null,
      "active": true,
      "createdAt": "2026-01-15T10:00:00-05:00"
    }
  ]
}
Errores:

401: token inválido.

6.2 POST /recurrences
Descripción: Crear una recurrencia.

Auth: Sí.

Body:

json
{
  "name": "Luz",
  "amount": "120.00",
  "type": "EXPENSE",
  "categoryId": "550e8400-...",
  "accountId": "550e8400-...",
  "frequency": "MONTHLY",
  "dayOfPeriod": 15,
  "startDate": "2026-01-15T00:00:00-05:00",
  "endDate": null
}
Validaciones:

name: 1-60 caracteres.

amount: > 0.

type: INCOME | EXPENSE.

categoryId: opcional, del tipo correcto.

accountId: opcional, del usuario.

frequency: WEEKLY | MONTHLY | YEARLY.

dayOfPeriod: según frecuencia (1-7 semanal, 1-31 mensual, 1-366 anual).

startDate: válida.

endDate: opcional, >= startDate.

Response (201): igual que GET /recurrences.

Errores:

400: validación fallida.

404: categoría o cuenta no encontrada.

422: dayOfPeriod fuera de rango para la frecuencia.

Reglas de negocio:

domain-rules.md sección 5.1: se crea la recurrencia. No se generan obligaciones inmediatamente. El cron diario se encarga.

domain-rules.md sección 5.2: el cron genera obligaciones para los próximos 30 días con idempotencia por (recurrenceId, periodStart).

6.3 GET /recurrences/:id
Descripción: Obtener detalle de una recurrencia.

Auth: Sí.

Response (200): igual que GET /recurrences.

Errores:

404: recurrencia no encontrada.

6.4 PATCH /recurrences/:id
Descripción: Actualizar una recurrencia.

Auth: Sí.

Body: igual que POST /recurrences (todos los campos opcionales).

Response (200): igual que GET /recurrences/:id.

Errores:

400: validación fallida.

404: recurrencia no encontrada.

Reglas de negocio:

domain-rules.md sección 5.4: solo se puede editar una recurrencia active = true.

Los cambios afectan a obligaciones futuras, no a las ya generadas.

6.5 DELETE /recurrences/:id
Descripción: Eliminar (soft delete) una recurrencia.

Auth: Sí.

Response (204): sin body.

Errores:

404: recurrencia no encontrada.

Reglas de negocio:

domain-rules.md sección 5.6:

Borra las obligaciones PENDING asociadas.

Borra las obligaciones OVERDUE asociadas.

Conserva las obligaciones PAID (historial) y las deja con recurrenceId = null.

Se marca deletedAt = now() en la recurrencia.

6.6 POST /recurrences/:id/restore
Descripción: Restaurar una recurrencia borrada.

Auth: Sí.

Response (200): recurrencia restaurada.

Errores:

404: recurrencia no encontrada.

Reglas de negocio:

deletedAt = null.

El cron vuelve a generar obligaciones futuras.

6.7 PATCH /recurrences/:id/toggle
Descripción: Pausar o reactivar una recurrencia.

Auth: Sí.

Body: ninguno.

Response (200):

json
{
  "data": {
    "id": "550e8400-...",
    "active": false,
    "updatedAt": "2026-10-16T15:00:00-05:00"
  }
}
Errores:

404: recurrencia no encontrada.

Reglas de negocio:

Cambia active = !active.

Si active = false, el cron deja de generar obligaciones.

Las obligaciones PENDING existentes se conservan.

7. Módulo Obligations (/obligations)
7.1 GET /obligations
Descripción: Listar obligaciones con filtros.

Auth: Sí.

Query params:

status (opcional): PENDING | PAID | OVERDUE | CANCELLED.

from (opcional): YYYY-MM-DD (sobre dueDate).

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
      "recurrenceId": "550e8400-...",
      "name": "Luz",
      "amount": "120.00",
      "dueDate": "2026-10-15T00:00:00-05:00",
      "status": "PENDING",
      "paidAt": null,
      "periodStart": "2026-10-01T00:00:00-05:00",
      "createdAt": "2026-09-15T10:00:00-05:00"
    }
  ],
  "meta": { "page": 1, "limit": 20, "total": 45, "totalPages": 3 }
}
Errores:

401: token inválido.

Reglas de negocio:

Ordenado por dueDate ascendente.

7.2 GET /obligations/upcoming
Descripción: Próximas N obligaciones (para dashboard).

Auth: Sí.

Query params:

days (opcional): default 30. Rango: 1-365.

Response (200):

json
{
  "data": [
    {
      "id": "550e8400-...",
      "name": "Luz",
      "amount": "120.00",
      "dueDate": "2026-10-15T00:00:00-05:00",
      "daysUntilDue": 5,
      "status": "PENDING"
    }
  ]
}
Errores:

401: token inválido.

Reglas de negocio:

Solo devuelve obligaciones PENDING o OVERDUE con dueDate <= now() + days.

Ordenado por dueDate ascendente.

7.3 POST /obligations
Descripción: Crear una obligación puntual (sin recurrencia).

Auth: Sí.

Body:

json
{
  "name": "Cumpleaños de mamá",
  "amount": "200.00",
  "dueDate": "2026-11-15T00:00:00-05:00"
}
Validaciones:

name: 1-60 caracteres.

amount: > 0.

dueDate: válida.

Response (201): igual que GET /obligations.

Errores:

400: validación fallida.

Reglas de negocio:

recurrenceId = null.

status = PENDING.

7.4 GET /obligations/:id
Descripción: Obtener detalle de una obligación.

Auth: Sí.

Response (200): igual que GET /obligations.

Errores:

404: obligación no encontrada.

7.5 POST /obligations/:id/pay
Descripción: Marcar una obligación como pagada.

Auth: Sí.

Body:

json
{
  "accountId": "550e8400-...",
  "categoryId": "550e8400-...",
  "date": "2026-10-15T10:00:00-05:00"
}
Validaciones:

accountId: cuenta del usuario.

categoryId: categoría del usuario o del sistema, tipo EXPENSE.

date: no futura.

Response (200):

json
{
  "data": {
    "obligation": {
      "id": "550e8400-...",
      "status": "PAID",
      "paidAt": "2026-10-15T10:00:00-05:00"
    },
    "transaction": {
      "id": "550e8400-...",
      "accountId": "550e8400-...",
      "type": "EXPENSE",
      "amount": "120.00",
      "obligationId": "550e8400-..."
    }
  }
}
Errores:

400: validación fallida.

404: obligación no encontrada.

409: la obligación ya está pagada.

Reglas de negocio:

domain-rules.md sección 5.3:

Se crea un movimiento EXPENSE con status = CONFIRMED, obligationId = obligación.id.

La obligación pasa a PAID con paidAt seteado.

Una obligación pagada no se puede pagar dos veces. Error 409 si se intenta.

Toda la operación en una transacción de BD.

El índice único parcial transactions_obligation_id_unique WHERE deleted_at IS NULL garantiza 1:1.

7.6 PATCH /obligations/:id
Descripción: Editar una obligación PENDING.

Auth: Sí.

Body:

json
{
  "name": "Luz de casa",
  "amount": "130.00",
  "dueDate": "2026-11-15T00:00:00-05:00"
}
Validaciones:

Solo obligaciones PENDING.

Response (200): igual que GET /obligations/:id.

Errores:

404: obligación no encontrada.

409: la obligación está PAID (no se puede editar).

7.7 DELETE /obligations/:id
Descripción: Eliminar (soft delete) una obligación PENDING o OVERDUE.

Auth: Sí.

Response (204): sin body.

Errores:

404: obligación no encontrada.

409: la obligación está PAID.

Reglas de negocio:

Solo se pueden borrar PENDING o OVERDUE.

Si está PAID, hay que anular el pago primero (borrar el movimiento vinculado).

7.8 POST /obligations/:id/restore
Descripción: Restaurar una obligación borrada.

Auth: Sí.

Response (200): obligación restaurada.

Errores:

404: obligación no encontrada.

8. Módulo Budgets (/budgets)
8.1 GET /budgets
Descripción: Listar presupuestos del usuario.

Auth: Sí.

Query params:

active (opcional): true | false.

includeDeleted (opcional): true.

Response (200):

json
{
  "data": [
    {
      "id": "550e8400-...",
      "name": "Comida mensual",
      "period": "MONTHLY",
      "amount": "800.00",
      "startDate": "2026-10-01T00:00:00-05:00",
      "endDate": null,
      "alertThreshold": 80,
      "active": true,
      "categories": [
        { "id": "550e8400-...", "name": "Comida", "type": "EXPENSE" }
      ],
      "createdAt": "2026-10-01T00:00:00-05:00"
    }
  ]
}
Errores:

401: token inválido.

8.2 POST /budgets
Descripción: Crear un presupuesto.

Auth: Sí.

Body:

json
{
  "name": "Comida mensual",
  "period": "MONTHLY",
  "amount": "800.00",
  "startDate": "2026-10-01T00:00:00-05:00",
  "endDate": null,
  "alertThreshold": 80,
  "categoryIds": ["550e8400-...", "550e8400-..."]
}
Validaciones:

name: 1-60 caracteres.

period: WEEKLY | MONTHLY.

amount: > 0.

startDate: válida.

endDate: opcional, >= startDate.

alertThreshold: 1-100.

categoryIds: al menos 1, todas del usuario o del sistema, tipo EXPENSE.

Response (201): igual que GET /budgets/:id.

Errores:

400: validación fallida.

404: categoría no encontrada.

422: categorías duplicadas o de tipo incorrecto.

Reglas de negocio:

domain-rules.md sección 7.1: un presupuesto aplica a 1+ categorías.

domain-rules.md sección 7.2: el gasto computable excluye transferencias y movimientos sin categoría.

8.3 GET /budgets/:id
Descripción: Obtener detalle de un presupuesto.

Auth: Sí.

Response (200): igual que GET /budgets.

Errores:

404: presupuesto no encontrado.

8.4 GET /budgets/:id/usage
Descripción: Uso actual del presupuesto.

Auth: Sí.

Query params:

periodStart (opcional): YYYY-MM-DD — período a consultar. Default: período actual.

Response (200):

json
{
  "data": {
    "budgetId": "550e8400-...",
    "periodStart": "2026-10-01T00:00:00-05:00",
    "periodEnd": "2026-10-31T23:59:59-05:00",
    "amount": "800.00",
    "gastoComputable": "450.50",
    "saldoRestante": "349.50",
    "porcentajeUtilizado": 56.31,
    "alertThreshold": 80,
    "alertaActiva": false
  }
}
Errores:

404: presupuesto no encontrado.

Reglas de negocio:

domain-rules.md sección 7.2: gasto computable = SUM(egresos confirmados con categoría del presupuesto, en el período).

domain-rules.md sección 7.3: porcentajeUtilizado = (gastoComputable / amount) * 100.

domain-rules.md sección 7.4: alerta cuando porcentajeUtilizado >= alertThreshold.

8.5 PATCH /budgets/:id
Descripción: Actualizar un presupuesto.

Auth: Sí.

Body: igual que POST /budgets (todos los campos opcionales).

Response (200): igual que GET /budgets/:id.

Errores:

400: validación fallida.

404: presupuesto no encontrado.

8.6 DELETE /budgets/:id
Descripción: Eliminar (soft delete) un presupuesto.

Auth: Sí.

Response (204): sin body.

Errores:

404: presupuesto no encontrado.

8.7 POST /budgets/:id/restore
Descripción: Restaurar un presupuesto borrado.

Auth: Sí.

Response (200): presupuesto restaurado.

Errores:

404: presupuesto no encontrado.

8.8 POST /budgets/:id/copy
Descripción: Copiar un presupuesto a otro período.

Auth: Sí.

Body:

json
{
  "newStartDate": "2026-11-01T00:00:00-05:00",
  "newEndDate": "2026-11-30T23:59:59-05:00"
}
Validaciones:

newStartDate: válida.

newEndDate: opcional, >= newStartDate.

Response (201): nuevo presupuesto.

Errores:

400: validación fallida.

404: presupuesto origen no encontrado.

Reglas de negocio:

domain-rules.md sección 7.5: copia amount, alertThreshold y categorías.

No copia el gasto computable (se recalcula).

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
28	POST	/transfers	Sí	—
29	DELETE	/transfers/:transferId	Sí	—
30	GET	/recurrences	Sí	No
31	POST	/recurrences	Sí	—
32	GET	/recurrences/:id	Sí	—
33	PATCH	/recurrences/:id	Sí	—
34	DELETE	/recurrences/:id	Sí	—
35	POST	/recurrences/:id/restore	Sí	—
36	PATCH	/recurrences/:id/toggle	Sí	—
37	GET	/obligations	Sí	Sí
38	GET	/obligations/upcoming	Sí	No
39	POST	/obligations	Sí	—
40	GET	/obligations/:id	Sí	—
41	POST	/obligations/:id/pay	Sí	—
42	PATCH	/obligations/:id	Sí	—
43	DELETE	/obligations/:id	Sí	—
44	POST	/obligations/:id/restore	Sí	—
45	GET	/budgets	Sí	No
46	POST	/budgets	Sí	—
47	GET	/budgets/:id	Sí	—
48	GET	/budgets/:id/usage	Sí	—
49	PATCH	/budgets/:id	Sí	—
50	DELETE	/budgets/:id	Sí	—
51	POST	/budgets/:id/restore	Sí	—
52	POST	/budgets/:id/copy	Sí	—
53	GET	/savings-goals	Sí	No
54	POST	/savings-goals	Sí	—
55	GET	/savings-goals/:id	Sí	—
56	PATCH	/savings-goals/:id	Sí	—
57	DELETE	/savings-goals/:id	Sí	—
58	POST	/savings-goals/:id/restore	Sí	—
59	GET	/savings-goals/:goalId/contributions	Sí	No
60	POST	/savings-goals/:goalId/contributions	Sí	—
61	DELETE	/savings-goals/:goalId/contributions/:id	Sí	—
62	POST	/savings-goals/:goalId/contributions/:id/restore	Sí	—
63	GET	/tags	Sí	No
64	POST	/tags	Sí	—
65	PATCH	/tags/:id	Sí	—
66	DELETE	/tags/:id	Sí	—
67	POST	/tags/:id/restore	Sí	—
68	GET	/notifications	Sí	Sí
69	PATCH	/notifications/:id/read	Sí	—
70	PATCH	/notifications/read-all	Sí	—
71	GET	/health	No	—
Total: 71 endpoints.

15. Preguntas abiertas
(Esta sección debe quedar vacía antes de cerrar el Sprint 1.)

Sin preguntas abiertas por el momento.
