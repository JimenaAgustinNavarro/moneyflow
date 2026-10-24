# MoneyFlow — Criterios de aceptación

**Versión:** 1.0
**Fecha:** 2026-10-16
**Estado:** Aprobado

Este documento define los criterios de aceptación verificables por módulo del MVP de MoneyFlow. Cada criterio tiene un ID único (`AC-XXX-NN`) que los tests automatizados del Sprint 8 referencian.

**Todos los criterios derivan de `docs/domain-rules.md`, `docs/data-model.md` y `docs/api-contracts.md`.**

---

## 0. Convenciones

- **ID de criterio:** `AC-{MÓDULO}-{NN}`. Ejemplo: `AC-AUTH-01`, `AC-ACC-03`.
- **Verificable de forma binaria:** sí/no. Sin ambigüedad.
- **Cada criterio tiene:** enunciado, cómo verificarlo, y tipo de test (unit, integration, e2e).

### Módulos

| Prefijo | Módulo |
|---|---|
| `AC-GEN` | Generales / transversales |
| `AC-AUTH` | Auth |
| `AC-USR` | Users |
| `AC-ACC` | Accounts |
| `AC-CAT` | Categories |
| `AC-TRX` | Transactions |
| `AC-TRF` | Transfers |
| `AC-REC` | Recurrences |
| `AC-OBL` | Obligations |
| `AC-BUD` | Budgets |
| `AC-GOL` | Savings Goals |
| `AC-CON` | Goal Contributions |
| `AC-TAG` | Tags |
| `AC-NOT` | Notifications |
| `AC-SEC` | Seguridad |
| `AC-PERF` | Rendimiento |
| `AC-A11Y` | Accesibilidad |
| `AC-RESP` | Responsive |

---

## 1. Criterios generales

### AC-GEN-01 — Aislamiento por usuario

**Enunciado:** un usuario A no puede leer, editar ni borrar recursos de un usuario B.

**Verificación:** request autenticado como usuario A a un recurso de usuario B → 404 (no 403, para no filtrar existencia).

**Tipo:** integration.

### AC-GEN-02 — `userId` nunca del body

**Enunciado:** los endpoints que crean recursos toman `userId` del token, nunca del body.

**Verificación:** enviar `{ userId: "otro-id" }` en el body → ignorado. El recurso se crea con el `userId` del token.

**Tipo:** unit.

### AC-GEN-03 — Montos como string

**Enunciado:** todos los montos se devuelven como `string` en JSON.

**Verificación:** `GET /accounts` → `initialBalance` y `balance` son `string`, no `number`.

**Tipo:** integration.

### AC-GEN-04 — Fechas ISO 8601 con timezone

**Enunciado:** todas las fechas con hora se devuelven en ISO 8601 con timezone (`America/Lima`, offset `-05:00`).

**Verificación:** `GET /transactions` → `date` matchea `/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}-05:00$/`.

**Tipo:** integration.

### AC-GEN-05 — Formato de error estándar

**Enunciado:** todos los errores (4xx, 5xx) devuelven el shape `{ statusCode, message, error, timestamp, path }`.

**Verificación:** request a endpoint inexistente → 404 con el shape.

**Tipo:** integration.

### AC-GEN-06 — Soft delete filtra en lecturas

**Enunciado:** las entidades con soft delete no aparecen en las lecturas por defecto.

**Verificación:** borrar una cuenta → `GET /accounts` no la devuelve.

**Tipo:** integration.

### AC-GEN-07 — Soft delete con `includeDeleted`

**Enunciado:** el query param `?includeDeleted=true` incluye las entidades borradas.

**Verificación:** borrar una cuenta → `GET /accounts?includeDeleted=true` la devuelve.

**Tipo:** integration.

### AC-GEN-08 — Restore disponible

**Enunciado:** cada entidad con soft delete tiene `POST /:entidad/:id/restore`.

**Verificación:** borrar una cuenta → `POST /accounts/:id/restore` → 200 y la cuenta se puede leer de nuevo.

**Tipo:** integration.

### AC-GEN-09 — Restore valida unicidad

**Enunciado:** si al restaurar hay conflicto de unicidad (por ejemplo, otra cuenta con el mismo nombre), devuelve 409.

**Verificación:** crear cuenta "BCP" → borrarla → crear otra "BCP" → intentar restaurar la primera → 409.

**Tipo:** integration.

### AC-GEN-10 — Paginación en endpoints grandes

**Enunciado:** `GET /transactions`, `GET /obligations` y `GET /notifications` devuelven `{ data, meta }`.

**Verificación:** `GET /transactions` → response tiene `meta: { page, limit, total, totalPages }`.

**Tipo:** integration.

### AC-GEN-11 — Endpoints pequeños sin paginación

**Enunciado:** `GET /accounts`, `/categories`, `/budgets`, `/savings-goals`, `/tags`, `/recurrences` devuelven `{ data }` sin `meta`.

**Verificación:** `GET /accounts` → response es `{ data }` sin `meta`.

**Tipo:** integration.

### AC-GEN-12 — Limpieza de datos huérfanos

**Enunciado:** los pivotes (`transaction_tags`, `budget_categories`) se borran en cascada (hard delete) cuando se borra la entidad padre.

**Verificación:** borrar un tag → `transaction_tags` asociados se borran.

**Tipo:** integration.

---

## 2. Auth

### AC-AUTH-01 — Registro válido

**Enunciado:** `POST /auth/register` con email válido, password de 8+ caracteres, name de 1-100 → 201 y devuelve el usuario sin password.

**Verificación:** request con datos válidos → 201, response tiene `id`, `email`, `name`, `createdAt`, **no** `passwordHash`.

**Tipo:** integration.

### AC-AUTH-02 — Registro con email duplicado

**Enunciado:** `POST /auth/register` con email ya registrado → 409.

**Verificación:** registrar email → registrar mismo email → 409.

**Tipo:** integration.

### AC-AUTH-03 — Registro con validación fallida

**Enunciado:** `POST /auth/register` con email inválido, password <8, o name vacío → 400.

**Verificación:** request con password de 5 chars → 400.

**Tipo:** unit (validación de DTO).

### AC-AUTH-04 — Login válido

**Enunciado:** `POST /auth/login` con credenciales correctas → 200 con `accessToken`, `refreshToken` y `user`.

**Verificación:** request con email/password correctos → 200, response tiene los 3 campos.

**Tipo:** integration.

### AC-AUTH-05 — Login con credenciales incorrectas

**Enunciado:** `POST /auth/login` con password incorrecto → 401.

**Verificación:** request con password incorrecto → 401.

**Tipo:** integration.

### AC-AUTH-06 — Access token expira en 15 min

**Enunciado:** el access token tiene `exp` a 15 minutos del `iat`.

**Verificación:** decodificar el JWT → `exp - iat = 900` segundos.

**Tipo:** unit.

### AC-AUTH-07 — Refresh token rota

**Enunciado:** `POST /auth/refresh` con un refresh token válido → 200 con nuevo access token y nuevo refresh token. El refresh token viejo queda revocado.

**Verificación:** usar refresh token → verificar que el viejo ya no funciona en un segundo intento.

**Tipo:** integration.

### AC-AUTH-08 — Refresh token inválido

**Enunciado:** `POST /auth/refresh` con refresh token inválido o expirado → 401.

**Verificación:** request con refresh token inventado → 401.

**Tipo:** integration.

### AC-AUTH-09 — Logout revoca refresh token

**Enunciado:** `POST /auth/logout` con refresh token válido → 204 y el token queda revocado.

**Verificación:** logout → intentar usar el refresh token → 401.

**Tipo:** integration.

### AC-AUTH-10 — `GET /auth/me` requiere auth

**Enunciado:** `GET /auth/me` sin Authorization → 401.

**Verificación:** request sin token → 401.

**Tipo:** integration.

### AC-AUTH-11 — `GET /auth/me` devuelve usuario

**Enunciado:** `GET /auth/me` con token válido → 200 con los datos del usuario (sin password).

**Verificación:** request con token → 200, response tiene `id`, `email`, `name`, `timezone`.

**Tipo:** integration.

---

## 3. Users

### AC-USR-01 — Actualizar nombre

**Enunciado:** `PATCH /users/me` con `name` válido → 200 y el nombre se actualiza.

**Verificación:** request con `{ name: "Nuevo Nombre" }` → 200, `GET /auth/me` devuelve el nuevo nombre.

**Tipo:** integration.

### AC-USR-02 — Actualizar timezone

**Enunciado:** `PATCH /users/me` con `timezone` válida → 200.

**Verificación:** request con `{ timezone: "America/Lima" }` → 200.

**Tipo:** integration.

### AC-USR-03 — Timezone inválida

**Enunciado:** `PATCH /users/me` con `timezone` inválida → 400.

**Verificación:** request con `{ timezone: "Foo/Bar" }` → 400.

**Tipo:** unit.

### AC-USR-04 — Cambiar contraseña correcto

**Enunciado:** `PATCH /users/me/password` con `currentPassword` correcto y `newPassword` válido → 204.

**Verificación:** request con datos correctos → 204, login con nueva contraseña → 200.

**Tipo:** integration.

### AC-USR-05 — Cambiar contraseña con actual incorrecta

**Enunciado:** `PATCH /users/me/password` con `currentPassword` incorrecto → 401.

**Verificación:** request con password actual incorrecta → 401.

**Tipo:** integration.

### AC-USR-06 — Cambio de contraseña revoca refresh tokens

**Enunciado:** al cambiar la contraseña, todos los refresh tokens del usuario se revocan.

**Verificación:** login → cambiar contraseña → usar refresh token viejo → 401.

**Tipo:** integration.

### AC-USR-07 — `newPassword` igual a `currentPassword`

**Enunciado:** `PATCH /users/me/password` con `newPassword === currentPassword` → 400.

**Verificación:** request con misma contraseña → 400.

**Tipo:** unit.

### AC-USR-08 — Eliminar cuenta requiere contraseña

**Enunciado:** `DELETE /users/me` sin `password` en el body → 400.

**Verificación:** request sin password → 400.

**Tipo:** integration.

### AC-USR-09 — Eliminar cuenta con contraseña incorrecta

**Enunciado:** `DELETE /users/me` con `password` incorrecto → 401.

**Verificación:** request con password incorrecto → 401.

**Tipo:** integration.

### AC-USR-10 — Eliminar cuenta hace soft delete

**Enunciado:** `DELETE /users/me` con password correcto → 204, el usuario queda con `deletedAt` seteado y sus refresh tokens revocados.

**Verificación:** request correcto → 204, login con las mismas credenciales → 401 (usuario borrado).

**Tipo:** integration.

---

## 4. Accounts

### AC-ACC-01 — Crear cuenta válida

**Enunciado:** `POST /accounts` con `name`, `type`, `initialBalance` válidos → 201.

**Verificación:** request con datos válidos → 201, response tiene `balance === initialBalance`.

**Tipo:** integration.

### AC-ACC-02 — Nombre duplicado

**Enunciado:** `POST /accounts` con un nombre que ya existe para el mismo usuario → 409.

**Verificación:** crear cuenta "BCP" → crear otra "BCP" → 409.

**Tipo:** integration.

### AC-ACC-03 — Mismo nombre para otro usuario

**Enunciado:** dos usuarios pueden tener una cuenta con el mismo nombre.

**Verificación:** usuario A crea "BCP" → usuario B crea "BCP" → 201 (ambos OK).

**Tipo:** integration.

### AC-ACC-04 — `initialBalance` negativo

**Enunciado:** `POST /accounts` con `initialBalance < 0` → 400.

**Verificación:** request con `initialBalance: "-100"` → 400.

**Tipo:** unit.

### AC-ACC-05 — `type` inválido

**Enunciado:** `POST /accounts` con `type` que no sea `CASH`, `BANK`, `WALLET` o `CREDIT` → 400.

**Verificación:** request con `type: "FOO"` → 400.

**Tipo:** unit.

### AC-ACC-06 — Listar cuentas del usuario

**Enunciado:** `GET /accounts` devuelve solo las cuentas del usuario autenticado.

**Verificación:** usuario A crea cuenta → usuario B hace `GET /accounts` → no ve la cuenta de A.

**Tipo:** integration.

### AC-ACC-07 — Filtro `archived`

**Enunciado:** `GET /accounts?archived=true` devuelve solo las archivadas.

**Verificación:** crear 2 cuentas (1 archivada, 1 activa) → `?archived=true` → solo devuelve la archivada.

**Tipo:** integration.

### AC-ACC-08 — Detalle de cuenta

**Enunciado:** `GET /accounts/:id` devuelve el detalle de una cuenta del usuario.

**Verificación:** request con ID válido → 200, response coincide con la cuenta creada.

**Tipo:** integration.

### AC-ACC-09 — Detalle de cuenta de otro usuario

**Enunciado:** `GET /accounts/:id` de una cuenta de otro usuario → 404 (no 403).

**Verificación:** usuario A crea cuenta → usuario B hace `GET /accounts/:id` → 404.

**Tipo:** integration.

### AC-ACC-10 — Actualizar cuenta

**Enunciado:** `PATCH /accounts/:id` con `name`, `type` o `archived` válidos → 200.

**Verificación:** request con `{ name: "Nuevo" }` → 200, `GET` devuelve el nuevo nombre.

**Tipo:** integration.

### AC-ACC-11 — No se puede cambiar `initialBalance`

**Enunciado:** `PATCH /accounts/:id` con `initialBalance` → ignorado o 400.

**Verificación:** request con `{ initialBalance: "2000" }` → 400 o ignorado.

**Tipo:** integration.

### AC-ACC-12 — No se puede cambiar `currency`

**Enunciado:** `PATCH /accounts/:id` con `currency` → ignorado o 400.

**Verificación:** request con `{ currency: "USD" }` → 400 o ignorado.

**Tipo:** integration.

### AC-ACC-13 — Borrar cuenta sin movimientos

**Enunciado:** `DELETE /accounts/:id` sin movimientos `CONFIRMED` → 204.

**Verificación:** crear cuenta sin movimientos → `DELETE` → 204, `GET` → 404.

**Tipo:** integration.

### AC-ACC-14 — Borrar cuenta con movimientos `CONFIRMED`

**Enunciado:** `DELETE /accounts/:id` con movimientos `CONFIRMED` → 409.

**Verificación:** crear cuenta → crear movimiento `CONFIRMED` → `DELETE` → 409.

**Tipo:** integration.

### AC-ACC-15 — Borrado es soft delete

**Enunciado:** después de `DELETE`, la cuenta queda con `deletedAt` seteado (no se borra de la BD).

**Verificación:** `DELETE` → `GET /accounts?includeDeleted=true` → la cuenta aparece.

**Tipo:** integration.

### AC-ACC-16 — Restaurar cuenta

**Enunciado:** `POST /accounts/:id/restore` → 200, la cuenta vuelve a aparecer en `GET /accounts`.

**Verificación:** borrar → restaurar → `GET /accounts` → la cuenta aparece.

**Tipo:** integration.

### AC-ACC-17 — Restaurar con conflicto de unicidad

**Enunciado:** si al restaurar hay otra cuenta con el mismo nombre, `POST /accounts/:id/restore` → 409.

**Verificación:** crear "BCP" → borrar → crear "BCP" → restaurar la primera → 409.

**Tipo:** integration.

### AC-ACC-18 — Recalcular saldo

**Enunciado:** `POST /accounts/:id/recalculate` recalcula el saldo desde los movimientos `CONFIRMED` y lo persiste.

**Verificación:** crear cuenta con `initialBalance: 1000` → crear movimiento `INCOME` de 500 → recalcular → `balance === 1500`.

**Tipo:** integration.

### AC-ACC-19 — Saldo persistido coincide con SUM

**Enunciado:** después de N operaciones, `balance` persistido === `SUM(movimientos CONFIRMED)`.

**Verificación:** crear cuenta, hacer 10 movimientos `CONFIRMED` → `GET /accounts/:id` → `balance` coincide con el cálculo.

**Tipo:** integration.

### AC-ACC-20 — Movimientos `PENDING` no afectan el saldo

**Enunciado:** un movimiento `PENDING` no altera `accounts.balance`.

**Verificación:** crear cuenta con `balance: 1000` → crear movimiento `PENDING` de 500 → `balance` sigue en 1000.

**Tipo:** unit.

---

## 5. Categories

### AC-CAT-01 — Crear categoría del usuario

**Enunciado:** `POST /categories` con `name` y `type` válidos → 201.

**Verificación:** request con datos válidos → 201, `isSystem: false`.

**Tipo:** integration.

### AC-CAT-02 — Nombre duplicado

**Enunciado:** `POST /categories` con nombre que ya existe para el mismo `(userId, type)` → 409.

**Verificación:** crear "Mascotas" tipo EXPENSE → crear otra "Mascotas" tipo EXPENSE → 409.

**Tipo:** integration.

### AC-CAT-03 — Mismo nombre, distinto tipo

**Enunciado:** se puede crear una categoría con el mismo nombre si el tipo es distinto.

**Verificación:** crear "Sueldo" EXPENSE → crear "Sueldo" INCOME → 201 (ambas OK).

**Tipo:** integration.

### AC-CAT-04 — `type` inválido

**Enunciado:** `POST /categories` con `type` que no sea `INCOME` o `EXPENSE` → 400.

**Verificación:** request con `type: "FOO"` → 400.

**Tipo:** unit.

### AC-CAT-05 — Jerarquía máximo 2 niveles

**Enunciado:** crear una subcategoría de una subcategoría → 422.

**Verificación:** crear padre → crear hijo → crear nieto (hijo del hijo) → 422.

**Tipo:** integration.

### AC-CAT-06 — `parentId` de tipo distinto

**Enunciado:** crear una subcategoría con `parentId` de una categoría de tipo distinto → 422.

**Verificación:** crear padre EXPENSE → crear hijo INCOME con `parentId` del padre → 422.

**Tipo:** integration.

### AC-CAT-07 — Categorías del sistema visibles

**Enunciado:** `GET /categories` devuelve las categorías del sistema + las del usuario.

**Verificación:** seed tiene "Sueldo" (`isSystem: true`) → `GET /categories` → devuelve "Sueldo" + las del usuario.

**Tipo:** integration.

### AC-CAT-08 — No se puede editar categoría del sistema

**Enunciado:** `PATCH /categories/:id` de una categoría `isSystem: true` → 403.

**Verificación:** request a una categoría del sistema → 403.

**Tipo:** integration.

### AC-CAT-09 — No se puede borrar categoría del sistema

**Enunciado:** `DELETE /categories/:id` de una categoría `isSystem: true` → 403.

**Verificación:** request a una categoría del sistema → 403.

**Tipo:** integration.

### AC-CAT-10 — Borrar categoría sin movimientos

**Enunciado:** `DELETE /categories/:id` sin movimientos `CONFIRMED` no eliminados ni
subcategorías activas → 204.

**Verificación:** crear categoría sin movimientos `CONFIRMED` no eliminados ni
subcategorías activas → `DELETE` → 204.

**Tipo:** integration.

### AC-CAT-11 — Borrar categoría con movimientos

**Enunciado:** `DELETE /categories/:id` con movimientos `CONFIRMED` → 409.

**Verificación:** crear categoría → crear movimiento `CONFIRMED` no eliminado con esa
categoría → `DELETE` → 409. Movimientos `PENDING`, `CANCELLED` o eliminados no bloquean
el borrado.

**Tipo:** integration.

### AC-CAT-12 — Restaurar categoría

**Enunciado:** `POST /categories/:id/restore` → 200.

**Verificación:** borrar → restaurar → 200.

**Tipo:** integration.

### AC-CAT-13 — Seed del sistema idempotente

**Enunciado:** ejecutar la seed varias veces deja una única instancia de cada categoría
del sistema documentada.

**Verificación:** ejecutar `npx prisma db seed` dos veces y comprobar que la segunda
ejecución no crea duplicados.

**Tipo:** integration.

### AC-CAT-14 — No borrar categoría con subcategorías activas

**Enunciado:** `DELETE /categories/:id` con subcategorías activas → 409.

**Verificación:** crear una categoría padre y una subcategoría activa → borrar el padre
→ 409. Después de eliminar la subcategoría, el padre se puede eliminar si no tiene
movimientos `CONFIRMED` no eliminados.

**Tipo:** integration.

### AC-CAT-15 — `parentId` no encontrado o inaccesible

**Enunciado:** crear una categoría con un `parentId` inexistente, eliminado o de otro
usuario → 404.

**Verificación:** enviar cada uno de esos valores como `parentId` en `POST /categories`
→ 404.

**Tipo:** integration.

---

## 6. Transactions

### AC-TRX-01 — Crear ingreso válido

**Enunciado:** `POST /transactions` con `type: "INCOME"`, `amount: "500"`, `accountId` y `categoryId` válidos → 201.

**Verificación:** request válido → 201, `status: "CONFIRMED"`.

**Tipo:** integration.

### AC-TRX-02 — Crear egreso válido

**Enunciado:** `POST /transactions` con `type: "EXPENSE"`, `amount: "150"` → 201.

**Verificación:** request válido → 201.

**Tipo:** integration.

### AC-TRX-03 — `amount` debe ser > 0

**Enunciado:** `POST /transactions` con `amount: "0"` o negativo → 400.

**Verificación:** request con `amount: "0"` → 400.

**Tipo:** unit.

### AC-TRX-04 — `type` no puede ser `TRANSFER`

**Enunciado:** `POST /transactions` con `type: "TRANSFER"` → 400 (para transferencias hay `POST /transfers`).

**Verificación:** request con `type: "TRANSFER"` → 400.

**Tipo:** unit.

### AC-TRX-05 — `accountId` de otro usuario

**Enunciado:** `POST /transactions` con `accountId` de otro usuario → 404.

**Verificación:** usuario A crea cuenta → usuario B intenta crear movimiento con esa cuenta → 404.

**Tipo:** integration.

### AC-TRX-06 — `categoryId` de tipo incorrecto

**Enunciado:** `POST /transactions` con `type: "INCOME"` y `categoryId` de tipo `EXPENSE` → 422.

**Verificación:** request con tipo/categoría inconsistentes → 422.

**Tipo:** integration.

### AC-TRX-07 — Fecha no futura

**Enunciado:** `POST /transactions` con `date` futura → 400.

**Verificación:** request con `date: now() + 1 day` → 400.

**Tipo:** unit.

### AC-TRX-08 — Actualiza saldo de la cuenta

**Enunciado:** al crear un movimiento `CONFIRMED`, el saldo de la cuenta se actualiza en la misma transacción.

**Verificación:** crear cuenta con `balance: 1000` → crear `INCOME` de 500 → `GET /accounts/:id` → `balance: 1500`.

**Tipo:** integration.

### AC-TRX-09 — Movimiento `PENDING` no afecta saldo

**Enunciado:** `POST /transactions` con `status: "PENDING"` → `accounts.balance` no cambia.

**Verificación:** crear `PENDING` → `GET /accounts/:id` → `balance` igual al anterior.

**Tipo:** integration.

### AC-TRX-10 — Listar movimientos con filtros

**Enunciado:** `GET /transactions?accountId=X&type=INCOME&from=2026-10-01&to=2026-10-31` devuelve solo los que cumplen los filtros.

**Verificación:** crear 5 movimientos con distintos filtros → `GET` con filtros → devuelve el subconjunto correcto.

**Tipo:** integration.

### AC-TRX-11 — Paginación

**Enunciado:** `GET /transactions?page=1&limit=10` devuelve máximo 10 items + `meta`.

**Verificación:** crear 15 movimientos → `GET` con `limit=10` → 10 items, `meta.total: 15`.

**Tipo:** integration.

### AC-TRX-12 — Ordenado por `date` descendente

**Enunciado:** `GET /transactions` devuelve los movimientos ordenados por `date` descendente.

**Verificación:** crear 3 movimientos con fechas distintas → `GET` → el más reciente primero.

**Tipo:** integration.

### AC-TRX-13 — Editar movimiento recalcula saldo

**Enunciado:** `PATCH /transactions/:id` con `amount` distinto → recalcula `accounts.balance`.

**Verificación:** crear `INCOME` de 500 → `PATCH` a 300 → `GET /accounts/:id` → `balance` disminuye en 200.

**Tipo:** integration.

### AC-TRX-14 — Editar `status` recalcula saldo

**Enunciado:** `PATCH /transactions/:id` con `status: "PENDING"` → `accounts.balance` se revierte.

**Verificación:** crear `CONFIRMED` de 500 → `PATCH` a `PENDING` → `balance` se revierte.

**Tipo:** integration.

### AC-TRX-15 — Borrar movimiento recalcula saldo

**Enunciado:** `DELETE /transactions/:id` → recalcula `accounts.balance`.

**Verificación:** crear `CONFIRMED` de 500 → `DELETE` → `balance` se revierte.

**Tipo:** integration.

### AC-TRX-16 — Borrado es soft delete

**Enunciado:** después de `DELETE`, el movimiento queda con `deletedAt` seteado.

**Verificación:** `DELETE` → `GET /transactions?includeDeleted=true` → el movimiento aparece.

**Tipo:** integration.

### AC-TRX-17 — Restaurar movimiento

**Enunciado:** `POST /transactions/:id/restore` → 200.

**Verificación:** borrar → restaurar → 200.

**Tipo:** integration.

### AC-TRX-18 — Restaurar con cuenta borrada

**Enunciado:** `POST /transactions/:id/restore` si la cuenta asociada está borrada → 422.

**Verificación:** crear movimiento → borrar cuenta → restaurar movimiento → 422.

**Tipo:** integration.

### AC-TRX-19 — Borrar movimiento con obligación vinculada

**Enunciado:** `DELETE /transactions/:id` de un movimiento con `obligationId` → la obligación pasa de `PAID` a `PENDING`.

**Verificación:** pagar obligación → `DELETE` movimiento → `GET /obligations/:id` → `status: "PENDING"`.

**Tipo:** integration.

### AC-TRX-20 — Borrar transferencia borra ambas patas

**Enunciado:** `DELETE /transfers/:transferId` borra las 2 patas de la transferencia.

**Verificación:** crear transferencia → `DELETE /transfers/:transferId` → `GET /transactions?includeDeleted=true` → ambas patas con `deletedAt`.

**Tipo:** integration.

---

## 7. Transfers

### AC-TRF-01 — Crear transferencia válida

**Enunciado:** `POST /transfers` con 2 cuentas distintas del mismo usuario, `amount > 0` → 201 con `transferId`, `origin` y `destination`.

**Verificación:** request válido → 201, response tiene las 2 patas.

**Tipo:** integration.

### AC-TRF-02 — Cuentas iguales

**Enunciado:** `POST /transfers` con `originAccountId === destinationAccountId` → 422.

**Verificación:** request con cuentas iguales → 422.

**Tipo:** unit.

### AC-TRF-03 — Cuentas de distinto usuario

**Enunciado:** `POST /transfers` con una cuenta de otro usuario → 404.

**Verificación:** usuario A crea cuenta → usuario B intenta transferir con esa cuenta → 404.

**Tipo:** integration.

### AC-TRF-04 — Monedas distintas

**Enunciado:** `POST /transfers` con cuentas de distinta moneda (en MVP no aplica, siempre PEN) → 422.

**Verificación:** (no aplica en MVP, pero el test debe existir para el futuro).

**Tipo:** unit.

### AC-TRF-05 — Afecta saldos correctamente

**Enunciado:** crear transferencia → `origin.balance -= amount`, `destination.balance += amount`.

**Verificación:** crear transferencia de 500 entre 2 cuentas → `GET /accounts` → `origin.balance` disminuido, `destination.balance` aumentado.

**Tipo:** integration.

### AC-TRF-06 — No cuenta como ingreso ni egreso

**Enunciado:** las transferencias no aparecen en reportes de ingresos ni egresos.

**Verificación:** crear transferencia → `GET /reports/income` y `GET /reports/expense` → no la incluyen.

**Tipo:** integration.

### AC-TRF-07 — Transferencia crea 2 movimientos enlazados

**Enunciado:** al crear una transferencia, se crean 2 filas en `transactions` con el mismo `transferId`.

**Verificación:** `POST /transfers` → `GET /transactions?includeDeleted=true` → 2 movimientos con el mismo `transferId`.

**Tipo:** integration.

### AC-TRF-08 — Borrar transferencia

**Enunciado:** `DELETE /transfers/:transferId` borra las 2 patas.

**Verificación:** crear transferencia → `DELETE /transfers/:transferId` → 204, ambas patas con `deletedAt`.

**Tipo:** integration.

---

## 8. Preguntas abiertas

**(Esta sección debe quedar vacía antes de cerrar el Sprint 1.)**

*Sin preguntas abiertas por el momento.*

---

## 9. Recurrences

### AC-REC-01 — Crear recurrencia válida

**Enunciado:** `POST /recurrences` con `name`, `amount`, `type`, `frequency`, `dayOfPeriod`, `startDate` válidos → 201.

**Verificación:** request válido → 201, response con `active: true`.

**Tipo:** integration.

### AC-REC-02 — `amount` debe ser > 0

**Enunciado:** `POST /recurrences` con `amount: "0"` o negativo → 400.

**Verificación:** request con `amount: "0"` → 400.

**Tipo:** unit.

### AC-REC-03 — `type` inválido

**Enunciado:** `POST /recurrences` con `type` que no sea `INCOME` o `EXPENSE` → 400.

**Verificación:** request con `type: "TRANSFER"` → 400.

**Tipo:** unit.

### AC-REC-04 — `frequency` inválida

**Enunciado:** `POST /recurrences` con `frequency` que no sea `WEEKLY`, `MONTHLY` o `YEARLY` → 400.

**Verificación:** request con `frequency: "DAILY"` → 400.

**Tipo:** unit.

### AC-REC-05 — `dayOfPeriod` fuera de rango

**Enunciado:** `POST /recurrences` con `dayOfPeriod` fuera del rango según `frequency` → 422.

**Verificación:** `frequency: "MONTHLY"`, `dayOfPeriod: 32` → 422.

**Tipo:** unit.

### AC-REC-06 — `endDate` menor a `startDate`

**Enunciado:** `POST /recurrences` con `endDate < startDate` → 400.

**Verificación:** request con fechas invertidas → 400.

**Tipo:** unit.

### AC-REC-07 — `categoryId` de tipo incorrecto

**Enunciado:** `POST /recurrences` con `type: "INCOME"` y `categoryId` de tipo `EXPENSE` → 422.

**Verificación:** request con tipo/categoría inconsistentes → 422.

**Tipo:** integration.

### AC-REC-08 — Listar recurrencias del usuario

**Enunciado:** `GET /recurrences` devuelve solo las del usuario autenticado.

**Verificación:** usuario A crea recurrencia → usuario B hace `GET` → no la ve.

**Tipo:** integration.

### AC-REC-09 — Filtro `active`

**Enunciado:** `GET /recurrences?active=true` devuelve solo las activas.

**Verificación:** crear 2 recurrencias (1 activa, 1 pausada) → `?active=true` → solo la activa.

**Tipo:** integration.

### AC-REC-10 — Editar recurrencia

**Enunciado:** `PATCH /recurrences/:id` con campos válidos → 200.

**Verificación:** request con `{ amount: "150" }` → 200, `GET` devuelve el nuevo monto.

**Tipo:** integration.

### AC-REC-11 — Toggle pausa/reactiva

**Enunciado:** `PATCH /recurrences/:id/toggle` → 200 con `active: !active`.

**Verificación:** toggle → `active: false`; toggle de nuevo → `active: true`.

**Tipo:** integration.

### AC-REC-12 — Recurrencia pausada no genera obligaciones

**Enunciado:** una recurrencia con `active: false` no genera nuevas obligaciones en el cron.

**Verificación:** pausar recurrencia → correr cron → no se crean obligaciones nuevas.

**Tipo:** integration.

### AC-REC-13 — Borrar recurrencia conserva obligaciones PAID

**Enunciado:** `DELETE /recurrences/:id` → obligaciones `PENDING` y `OVERDUE` se borran; obligaciones `PAID` se conservan con `recurrenceId = null`.

**Verificación:** crear recurrencia → generar 3 obligaciones (1 pagada) → `DELETE` → `GET /obligations?includeDeleted=true` → la pagada sigue, las otras 2 no.

**Tipo:** integration.

### AC-REC-14 — Restaurar recurrencia

**Enunciado:** `POST /recurrences/:id/restore` → 200.

**Verificación:** borrar → restaurar → 200.

**Tipo:** integration.

---

## 10. Obligations

### AC-OBL-01 — Crear obligación puntual

**Enunciado:** `POST /obligations` con `name`, `amount`, `dueDate` válidos → 201 con `recurrenceId: null`.

**Verificación:** request válido → 201.

**Tipo:** integration.

### AC-OBL-02 — `amount` debe ser > 0

**Enunciado:** `POST /obligations` con `amount <= 0` → 400.

**Verificación:** request con `amount: "-50"` → 400.

**Tipo:** unit.

### AC-OBL-03 — Listar obligaciones con filtros

**Enunciado:** `GET /obligations?status=PENDING&from=2026-10-01&to=2026-10-31` devuelve solo las que cumplen.

**Verificación:** crear 3 obligaciones con estados/fechas distintas → `GET` con filtros → subconjunto correcto.

**Tipo:** integration.

### AC-OBL-04 — Próximas obligaciones

**Enunciado:** `GET /obligations/upcoming?days=30` devuelve obligaciones `PENDING`/`OVERDUE` con `dueDate <= now() + 30 days`.

**Verificación:** crear obligaciones con distintas fechas → `GET` → solo las próximas 30 días.

**Tipo:** integration.

### AC-OBL-05 — Pagar obligación

**Enunciado:** `POST /obligations/:id/pay` con cuenta y categoría válidas → 200 con `obligation.status: "PAID"` y `transaction` creado.

**Verificación:** request válido → 200, movimiento `EXPENSE` creado con `obligationId`.

**Tipo:** integration.

### AC-OBL-06 — Pagar dos veces

**Enunciado:** `POST /obligations/:id/pay` de una obligación ya `PAID` → 409.

**Verificación:** pagar → pagar de nuevo → 409.

**Tipo:** integration.

### AC-OBL-07 — Pago crea movimiento `EXPENSE`

**Enunciado:** al pagar, se crea un movimiento `EXPENSE` con `status: "CONFIRMED"` y `obligationId` seteado.

**Verificación:** pagar → `GET /transactions` → el movimiento tiene `type: "EXPENSE"`, `obligationId`.

**Tipo:** integration.

### AC-OBL-08 — Pago afecta saldo

**Enunciado:** al pagar, `accounts.balance` se reduce en el monto de la obligación.

**Verificación:** crear cuenta con `balance: 1000` → pagar obligación de 200 → `balance: 800`.

**Tipo:** integration.

### AC-OBL-09 — Obligación `PENDING` no afecta saldo

**Enunciado:** una obligación `PENDING` no reduce `accounts.balance`.

**Verificación:** crear obligación de 200 → `GET /accounts/:id` → `balance` sin cambios.

**Tipo:** unit.

### AC-OBL-10 — Pagar sin `accountId`

**Enunciado:** `POST /obligations/:id/pay` sin `accountId` → 400.

**Verificación:** request sin `accountId` → 400.

**Tipo:** unit.

### AC-OBL-11 — Pagar sin `categoryId`

**Enunciado:** `POST /obligations/:id/pay` sin `categoryId` → 400.

**Verificación:** request sin `categoryId` → 400.

**Tipo:** unit.

### AC-OBL-12 — Editar obligación `PENDING`

**Enunciado:** `PATCH /obligations/:id` de una `PENDING` con campos válidos → 200.

**Verificación:** request con `{ amount: "150" }` → 200.

**Tipo:** integration.

### AC-OBL-13 — Editar obligación `PAID`

**Enunciado:** `PATCH /obligations/:id` de una `PAID` → 409.

**Verificación:** pagar → `PATCH` → 409.

**Tipo:** integration.

### AC-OBL-14 — Borrar obligación `PENDING`

**Enunciado:** `DELETE /obligations/:id` de una `PENDING` → 204.

**Verificación:** crear obligación → `DELETE` → 204.

**Tipo:** integration.

### AC-OBL-15 — Borrar obligación `PAID`

**Enunciado:** `DELETE /obligations/:id` de una `PAID` → 409.

**Verificación:** pagar → `DELETE` → 409.

**Tipo:** integration.

### AC-OBL-16 — Borrado es soft delete

**Enunciado:** después de `DELETE`, la obligación queda con `deletedAt` seteado.

**Verificación:** `DELETE` → `GET /obligations?includeDeleted=true` → aparece.

**Tipo:** integration.

### AC-OBL-17 — Restaurar obligación

**Enunciado:** `POST /obligations/:id/restore` → 200.

**Verificación:** borrar → restaurar → 200.

**Tipo:** integration.

### AC-OBL-18 — CHECK de idempotencia

**Enunciado:** no se puede crear una obligación con `recurrenceId` seteado y `periodStart` null, o viceversa.

**Verificación:** insert directo en BD con `recurrenceId = X, periodStart = null` → falla por CHECK.

**Tipo:** integration (SQL).

### AC-OBL-19 — Idempotencia de cron

**Enunciado:** correr el cron dos veces para el mismo período no crea obligaciones duplicadas.

**Verificación:** correr cron → correr cron de nuevo → no hay duplicados (`(recurrenceId, periodStart)` único).

**Tipo:** integration.

### AC-OBL-20 — Marcar `OVERDUE` automáticamente

**Enunciado:** el cron diario marca como `OVERDUE` las obligaciones `PENDING` con `dueDate < now()`.

**Verificación:** crear obligación con `dueDate` pasada → correr cron → `status: "OVERDUE"`.

**Tipo:** integration.

---

## 11. Budgets

### AC-BUD-01 — Crear presupuesto válido

**Enunciado:** `POST /budgets` con `name`, `period`, `amount`, `startDate`, `categoryIds` válidos → 201.

**Verificación:** request válido → 201, response con `categories`.

**Tipo:** integration.

### AC-BUD-02 — `amount` debe ser > 0

**Enunciado:** `POST /budgets` con `amount <= 0` → 400.

**Verificación:** request con `amount: "0"` → 400.

**Tipo:** unit.

### AC-BUD-03 — `period` inválido

**Enunciado:** `POST /budgets` con `period` que no sea `WEEKLY` o `MONTHLY` → 400.

**Verificación:** request con `period: "YEARLY"` → 400.

**Tipo:** unit.

### AC-BUD-04 — `alertThreshold` fuera de rango

**Enunciado:** `POST /budgets` con `alertThreshold < 1` o `> 100` → 400.

**Verificación:** request con `alertThreshold: 150` → 400.

**Tipo:** unit.

### AC-BUD-05 — Al menos 1 categoría

**Enunciado:** `POST /budgets` sin `categoryIds` o con array vacío → 400.

**Verificación:** request sin `categoryIds` → 400.

**Tipo:** unit.

### AC-BUD-06 — Categorías duplicadas

**Enunciado:** `POST /budgets` con `categoryIds` duplicados → 422.

**Verificación:** request con `["A", "A"]` → 422.

**Tipo:** unit.

### AC-BUD-07 — Categorías de tipo incorrecto

**Enunciado:** `POST /budgets` con categorías de tipo `INCOME` → 422.

**Verificación:** request con categoría `INCOME` → 422.

**Tipo:** integration.

### AC-BUD-08 — Uso del presupuesto

**Enunciado:** `GET /budgets/:id/usage` calcula el gasto computable correctamente.

**Verificación:** presupuesto de 800 → crear 2 egresos de 100 y 200 con categoría del presupuesto → `GET /budgets/:id/usage` → `gastoComputable: "300"`, `saldoRestante: "500"`, `porcentajeUtilizado: 37.5`.

**Tipo:** integration.

### AC-BUD-09 — Excluye transferencias

**Enunciado:** el gasto computable no incluye transferencias.

**Verificación:** crear transferencia de 500 → `GET /budgets/:id/usage` → `gastoComputable` sin cambios.

**Tipo:** integration.

### AC-BUD-10 — Excluye movimientos `PENDING`

**Enunciado:** el gasto computable solo incluye movimientos `CONFIRMED`.

**Verificación:** crear egreso `PENDING` de 100 → `GET /budgets/:id/usage` → `gastoComputable` sin cambios.

**Tipo:** integration.

### AC-BUD-11 — Excluye movimientos sin categoría

**Enunciado:** el gasto computable excluye movimientos sin categoría.

**Verificación:** crear egreso sin `categoryId` → `GET /budgets/:id/usage` → `gastoComputable` sin cambios.

**Tipo:** integration.

### AC-BUD-12 — Excluye movimientos fuera del período

**Enunciado:** el gasto computable solo incluye movimientos dentro del período.

**Verificación:** crear egreso de 100 dentro del período y otro fuera → `GET /budgets/:id/usage` → solo cuenta el de dentro.

**Tipo:** integration.

### AC-BUD-13 — Alerta activa

**Enunciado:** cuando `porcentajeUtilizado >= alertThreshold`, `alertaActiva: true`.

**Verificación:** presupuesto de 800, alertThreshold 80 → crear egreso de 700 → `alertaActiva: true`.

**Tipo:** integration.

### AC-BUD-14 — Alerta inactiva

**Enunciado:** cuando `porcentajeUtilizado < alertThreshold`, `alertaActiva: false`.

**Verificación:** presupuesto de 800, alertThreshold 80 → crear egreso de 100 → `alertaActiva: false`.

**Tipo:** integration.

### AC-BUD-15 — Copiar presupuesto

**Enunciado:** `POST /budgets/:id/copy` crea un nuevo presupuesto con `amount`, `alertThreshold` y categorías del original.

**Verificación:** copiar → `GET /budgets` → 2 presupuestos con los mismos datos (excepto fechas).

**Tipo:** integration.

### AC-BUD-16 — No copia el gasto computable

**Enunciado:** al copiar, el nuevo presupuesto no hereda el gasto del original.

**Verificación:** copiar presupuesto con gasto de 300 → `GET /budgets/:newId/usage` → `gastoComputable: "0"`.

**Tipo:** integration.

### AC-BUD-17 — Borrar presupuesto

**Enunciado:** `DELETE /budgets/:id` → 204.

**Verificación:** crear → `DELETE` → 204.

**Tipo:** integration.

### AC-BUD-18 — Restaurar presupuesto

**Enunciado:** `POST /budgets/:id/restore` → 200.

**Verificación:** borrar → restaurar → 200.

**Tipo:** integration.

---

## 12. Savings Goals

### AC-GOL-01 — Crear meta válida

**Enunciado:** `POST /savings-goals` con `name`, `targetAmount` válidos → 201.

**Verificación:** request válido → 201, `currentAmount: "0"`, `status: "ACTIVE"`.

**Tipo:** integration.

### AC-GOL-02 — `targetAmount` debe ser > 0

**Enunciado:** `POST /savings-goals` con `targetAmount <= 0` → 400.

**Verificación:** request con `targetAmount: "0"` → 400.

**Tipo:** unit.

### AC-GOL-03 — `targetDate` futura

**Enunciado:** `POST /savings-goals` con `targetDate` pasada → 400.

**Verificación:** request con `targetDate: "2020-01-01"` → 400.

**Tipo:** unit.

### AC-GOL-04 — Progreso calculado

**Enunciado:** `GET /savings-goals` devuelve `progreso` calculado.

**Verificación:** meta con `targetAmount: "2000"`, `currentAmount: "500"` → `progreso: 25.00`.

**Tipo:** integration.

### AC-GOL-05 — Actualizar meta

**Enunciado:** `PATCH /savings-goals/:id` con campos válidos → 200.

**Verificación:** request con `{ targetAmount: "2500" }` → 200.

**Tipo:** integration.

### AC-GOL-06 — Editar meta `COMPLETED`

**Enunciado:** `PATCH /savings-goals/:id` de una `COMPLETED` → 409.

**Verificación:** completar meta → `PATCH` → 409.

**Tipo:** integration.

### AC-GOL-07 — Borrar meta

**Enunciado:** `DELETE /savings-goals/:id` → 204.

**Verificación:** crear → `DELETE` → 204.

**Tipo:** integration.

### AC-GOL-08 — Borrado borra aportes en cascada

**Enunciado:** al borrar una meta, sus `goal_contributions` se borran en cascada.

**Verificación:** crear meta con 3 aportes → `DELETE` → `GET /savings-goals/:goalId/contributions` → 404 o vacío.

**Tipo:** integration.

### AC-GOL-09 — Borrado no borra movimientos de la cuenta

**Enunciado:** al borrar una meta con `accountId`, los movimientos de la cuenta NO se borran.

**Verificación:** meta con cuenta asociada y movimientos → `DELETE` meta → movimientos siguen existiendo.

**Tipo:** integration.

### AC-GOL-10 — Restaurar meta

**Enunciado:** `POST /savings-goals/:id/restore` → 200.

**Verificación:** borrar → restaurar → 200.

**Tipo:** integration.

---

## 13. Goal Contributions

### AC-CON-01 — Crear aporte válido

**Enunciado:** `POST /savings-goals/:goalId/contributions` con `type: "DEPOSIT"`, `amount > 0` → 201.

**Verificación:** request válido → 201, `savings_goals.currentAmount` aumentó.

**Tipo:** integration.

### AC-CON-02 — `amount` debe ser > 0

**Enunciado:** `POST /savings-goals/:goalId/contributions` con `amount <= 0` → 400.

**Verificación:** request con `amount: "0"` → 400.

**Tipo:** unit.

### AC-CON-03 — `type` inválido

**Enunciado:** `POST /savings-goals/:goalId/contributions` con `type` que no sea `DEPOSIT` o `WITHDRAWAL` → 400.

**Verificación:** request con `type: "TRANSFER"` → 400.

**Tipo:** unit.

### AC-CON-04 — Retiro mayor al acumulado

**Enunciado:** `POST /savings-goals/:goalId/contributions` con `type: "WITHDRAWAL"` y `amount > currentAmount` → 422.

**Verificación:** meta con `currentAmount: "500"` → retiro de 600 → 422.

**Tipo:** integration.

### AC-CON-05 — Retiro válido

**Enunciado:** `POST /savings-goals/:goalId/contributions` con `type: "WITHDRAWAL"` y `amount <= currentAmount` → 201.

**Verificación:** meta con `currentAmount: "500"` → retiro de 200 → 201, `currentAmount: "300"`.

**Tipo:** integration.

### AC-CON-06 — Completar meta automáticamente

**Enunciado:** cuando `currentAmount >= targetAmount`, `status: "COMPLETED"`.

**Verificación:** meta con `targetAmount: "1000"`, `currentAmount: "900"` → aporte de 100 → `status: "COMPLETED"`.

**Tipo:** integration.

### AC-CON-07 — Retiro revierte `COMPLETED`

**Enunciado:** si después de `COMPLETED` se hace un retiro que baja `currentAmount` por debajo de `targetAmount`, `status` vuelve a `ACTIVE`.

**Verificación:** meta `COMPLETED` → retiro de 100 → `status: "ACTIVE"`.

**Tipo:** integration.

### AC-CON-08 — Movimiento vinculado de tipo incorrecto

**Enunciado:** `POST /savings-goals/:goalId/contributions` con `transactionId` de un movimiento `EXPENSE` y `type: "DEPOSIT"` → 422.

**Verificación:** request con tipo/movimiento inconsistentes → 422.

**Tipo:** integration.

### AC-CON-09 — Movimiento ya vinculado a otra meta

**Enunciado:** `POST /savings-goals/:goalId/contributions` con un `transactionId` ya vinculado a otra meta → 409.

**Verificación:** aporte con movimiento → segundo aporte con el mismo movimiento → 409.

**Tipo:** integration.

### AC-CON-10 — Borrar aporte

**Enunciado:** `DELETE /savings-goals/:goalId/contributions/:id` → 204, `currentAmount` se revierte.

**Verificación:** aporte de 500 → borrar → `currentAmount` vuelve a 0.

**Tipo:** integration.

### AC-CON-11 — Restaurar aporte

**Enunciado:** `POST /savings-goals/:goalId/contributions/:id/restore` → 200, `currentAmount` se reaplica.

**Verificación:** borrar → restaurar → `currentAmount` vuelve a 500.

**Tipo:** integration.

---

## 14. Tags

### AC-TAG-01 — Crear etiqueta válida

**Enunciado:** `POST /tags` con `name` válido → 201.

**Verificación:** request válido → 201.

**Tipo:** integration.

### AC-TAG-02 — Nombre duplicado

**Enunciado:** `POST /tags` con nombre que ya existe para el mismo usuario → 409.

**Verificación:** crear "urgente" → crear otra "urgente" → 409.

**Tipo:** integration.

### AC-TAG-03 — Nombre muy largo

**Enunciado:** `POST /tags` con `name > 30 caracteres` → 400.

**Verificación:** request con nombre de 50 chars → 400.

**Tipo:** unit.

### AC-TAG-04 — Actualizar etiqueta

**Enunciado:** `PATCH /tags/:id` con campos válidos → 200.

**Verificación:** request con `{ name: "muy-urgente" }` → 200.

**Tipo:** integration.

### AC-TAG-05 — Borrar etiqueta

**Enunciado:** `DELETE /tags/:id` → 204.

**Verificación:** crear → `DELETE` → 204.

**Tipo:** integration.

### AC-TAG-06 — Borrado no borra movimientos

**Enunciado:** al borrar una etiqueta, los movimientos asociados NO se borran (solo se desetiquetan).

**Verificación:** crear tag → asociar a movimiento → `DELETE` tag → movimiento sigue existiendo.

**Tipo:** integration.

### AC-TAG-07 — Restaurar etiqueta

**Enunciado:** `POST /tags/:id/restore` → 200.

**Verificación:** borrar → restaurar → 200.

**Tipo:** integration.

### AC-TAG-08 — Restaurar con conflicto

**Enunciado:** si al restaurar hay otra etiqueta con el mismo nombre, `POST /tags/:id/restore` → 409.

**Verificación:** crear "urgente" → borrar → crear "urgente" → restaurar la primera → 409.

**Tipo:** integration.

---

## 15. Notifications

### AC-NOT-01 — Listar notificaciones

**Enunciado:** `GET /notifications` devuelve las del usuario, ordenadas por `createdAt` descendente.

**Verificación:** crear 3 notificaciones → `GET` → devuelve las 3 en orden.

**Tipo:** integration.

### AC-NOT-02 — Filtro `unreadOnly`

**Enunciado:** `GET /notifications?unreadOnly=true` devuelve solo las no leídas.

**Verificación:** crear 2 notificaciones (1 leída, 1 no) → `GET` → solo la no leída.

**Tipo:** integration.

### AC-NOT-03 — Paginación

**Enunciado:** `GET /notifications?page=1&limit=10` devuelve `{ data, meta }`.

**Verificación:** crear 15 notificaciones → `GET` con `limit=10` → 10 items, `meta.total: 15`.

**Tipo:** integration.

### AC-NOT-04 — Marcar como leída

**Enunciado:** `PATCH /notifications/:id/read` → 200 con `readAt` seteado.

**Verificación:** request válido → 200, `GET` → la notificación tiene `readAt`.

**Tipo:** integration.

### AC-NOT-05 — Marcar todas como leídas

**Enunciado:** `PATCH /notifications/read-all` → 200 con `{ updated: N }`.

**Verificación:** crear 3 notificaciones → `PATCH read-all` → `updated: 3`.

**Tipo:** integration.

### AC-NOT-06 — Notificaciones de otro usuario

**Enunciado:** `PATCH /notifications/:id/read` de una notificación de otro usuario → 404.

**Verificación:** usuario A crea notificación → usuario B intenta marcarla → 404.

**Tipo:** integration.

---

## 16. Criterios transversales

### 16.1 Seguridad

### AC-SEC-01 — Password hasheada con argon2id

**Enunciado:** `users.passwordHash` está hasheado con argon2id, nunca en texto plano.

**Verificación:** inspeccionar `users.passwordHash` en BD → empieza con `$argon2id$`.

**Tipo:** integration (SQL).

### AC-SEC-02 — Tokens nunca en logs

**Enunciado:** los access tokens y refresh tokens nunca se loguean.

**Verificación:** `grep -r "accessToken\|refreshToken" logs/` → no aparecen valores.

**Tipo:** unit.

### AC-SEC-03 — Secrets en env

**Enunciado:** los secrets (JWT_SECRET, DATABASE_URL) están en variables de entorno, nunca en el código.

**Verificación:** `grep -r "JWT_SECRET\|DATABASE_URL" src/` → solo referencias a `process.env`.

**Tipo:** unit.

### AC-SEC-04 — `.env` en `.gitignore`

**Enunciado:** `.env` y `.env.*` están en `.gitignore`.

**Verificación:** `grep ".env" .gitignore` → aparece.

**Tipo:** unit.

### AC-SEC-05 — CORS restringido

**Enunciado:** CORS solo permite el origen del frontend (`http://localhost:3000` en dev).

**Verificación:** request desde otro origen → bloqueado.

**Tipo:** integration.

### AC-SEC-06 — Headers de seguridad

**Enunciado:** la API devuelve `X-Content-Type-Options: nosniff` y `Referrer-Policy`.

**Verificación:** `curl -I` → headers presentes.

**Tipo:** integration.

### AC-SEC-07 — Rate limiting en auth

**Enunciado:** `POST /auth/login` tiene rate limiting (máximo 5 intentos por minuto por IP).

**Verificación:** 6 intentos seguidos → 429 en el 6to.

**Tipo:** integration.

### AC-SEC-08 — SQL injection

**Enunciado:** todos los queries usan parámetros (Prisma) o `Prisma.sql` con placeholders. Nunca concatenación.

**Verificación:** `grep -r "queryRaw.*\${" src/` → solo `Prisma.sql` con template literals.

**Tipo:** unit.

### 16.2 Rendimiento

### AC-PERF-01 — Endpoints de listado < 200ms

**Enunciado:** `GET /accounts`, `/categories`, `/budgets` responden en < 200ms con 100 filas.

**Verificación:** benchmark con 100 filas → tiempo < 200ms.

**Tipo:** integration.

### AC-PERF-02 — Endpoints paginados < 500ms

**Enunciado:** `GET /transactions?limit=20` responde en < 500ms con 1000 filas.

**Verificación:** benchmark con 1000 filas → tiempo < 500ms.

**Tipo:** integration.

### AC-PERF-03 — Índices en queries frecuentes

**Enunciado:** las queries de `transactions` por `(userId, date)` usan el índice.

**Verificación:** `EXPLAIN ANALYZE` → muestra `Index Scan`.

**Tipo:** integration (SQL).

### AC-PERF-04 — Paginación eficiente

**Enunciado:** `GET /transactions?page=50` no es más lento que `page=1`.

**Verificación:** benchmark con 1000 filas → diferencia < 20%.

**Tipo:** integration.

### 16.3 Accesibilidad (frontend)

### AC-A11Y-01 — Un solo `<h1>` por página

**Enunciado:** cada página del frontend tiene exactamente un `<h1>`.

**Verificación:** inspeccionar HTML → 1 `<h1>` por página.

**Tipo:** e2e.

### AC-A11Y-02 — Jerarquía de headings

**Enunciado:** los headings siguen `h1 → h2 → h3` sin saltos.

**Verificación:** axe-core → 0 violaciones de `heading-order`.

**Tipo:** e2e.

### AC-A11Y-03 — Contraste AA

**Enunciado:** todos los textos cumplen contraste AA (4.5:1 para texto normal, 3:1 para grande).

**Verificación:** axe-core → 0 violaciones de `color-contrast`.

**Tipo:** e2e.

### AC-A11Y-04 — Focus visible

**Enunciado:** todos los elementos interactivos tienen `focus-visible` claro.

**Verificación:** navegación por teclado → focus visible en todos los elementos.

**Tipo:** e2e.

### AC-A11Y-05 — Labels en formularios

**Enunciado:** todos los inputs tienen `<label>` asociado o `aria-label`.

**Verificación:** axe-core → 0 violaciones de `label`.

**Tipo:** e2e.

### AC-A11Y-06 — Navegación por teclado

**Enunciado:** todos los flujos principales son navegables por teclado.

**Verificación:** recorrer los flujos con Tab + Enter → todos funcionan.

**Tipo:** e2e.

### AC-A11Y-07 — `prefers-reduced-motion`

**Enunciado:** las animaciones respetan `prefers-reduced-motion`.

**Verificación:** activar la preferencia → las animaciones se desactivan.

**Tipo:** e2e.

### 16.4 Responsive

### AC-RESP-01 — 320px sin scroll horizontal

**Enunciado:** en 320px de ancho no hay scroll horizontal.

**Verificación:** Chrome DevTools → 320px → `document.body.scrollWidth === window.innerWidth`.

**Tipo:** e2e.

### AC-RESP-02 — 375px sin scroll horizontal

**Enunciado:** en 375px no hay scroll horizontal.

**Verificación:** idem.

**Tipo:** e2e.

### AC-RESP-03 — 768px layout tablet

**Enunciado:** en 768px el layout se adapta (navbar colapsa o se reorganiza).

**Verificación:** inspección visual.

**Tipo:** e2e.

### AC-RESP-04 — 1024px layout desktop

**Enunciado:** en 1024px el layout es desktop.

**Verificación:** inspección visual.

**Tipo:** e2e.

### AC-RESP-05 — 1280px layout desktop completo

**Enunciado:** en 1280px el layout es desktop completo (sidebar, header, contenido).

**Verificación:** inspección visual.

**Tipo:** e2e.

### AC-RESP-06 — Mobile menu funcional

**Enunciado:** en mobile el menú hamburguesa abre y cierra correctamente.

**Verificación:** click en hamburguesa → menú abre; click en X o en un link → cierra.

**Tipo:** e2e.

---

## 17. Resumen de criterios

| Módulo | Prefijo | Cantidad |
|---|---|---|
| Generales | AC-GEN | 12 |
| Auth | AC-AUTH | 11 |
| Users | AC-USR | 10 |
| Accounts | AC-ACC | 20 |
| Categories | AC-CAT | 15 |
| Transactions | AC-TRX | 20 |
| Transfers | AC-TRF | 8 |
| Recurrences | AC-REC | 14 |
| Obligations | AC-OBL | 20 |
| Budgets | AC-BUD | 18 |
| Savings Goals | AC-GOL | 10 |
| Goal Contributions | AC-CON | 11 |
| Tags | AC-TAG | 8 |
| Notifications | AC-NOT | 6 |
| Seguridad | AC-SEC | 8 |
| Rendimiento | AC-PERF | 4 |
| Accesibilidad | AC-A11Y | 7 |
| Responsive | AC-RESP | 6 |
| **Total** | | **202** |

**202 criterios de aceptación.**

---

## 18. Preguntas abiertas

**(Esta sección debe quedar vacía antes de cerrar el Sprint 1.)**

*Sin preguntas abiertas por el momento.*
