# ADR-005: JWT propio con refresh token rotativo

## Estado

Aceptado (2026-10-16).

## Contexto

La autenticación puede implementarse con:
- **A) JWT propio:** access token + refresh token, generados por el backend.
- **B) NextAuth / Auth.js:** framework de auth para Next.js.
- **C) Clerk / Auth0:** servicio externo de auth.
- **D) Supabase Auth:** si se usa Supabase como backend.

## Decisión

**Opción A — JWT propio con refresh token rotativo.**

- **Access token:** JWT firmado con `RS256` (o `HS256` con secreto fuerte). Expira en **15 minutos**. Payload: `{ sub: userId, email, iat, exp }`.
- **Refresh token:** opaco (no JWT). Expira en **30 días**. Se guarda hasheado en `refresh_tokens`. Se rota en cada uso.
- **Hash de password:** `argon2id` (superior a bcrypt).
- **Guard NestJS:** `JwtAuthGuard` global + `@Public()` decorator para endpoints abiertos.
- **Aislamiento:** `CurrentUserInterceptor` inyecta `req.user.id`. Todos los servicios filtran por `userId`.

## Alternativas consideradas

### Opción A — JWT propio (elegida)

**Pros:**
- **Control total.** Se entiende cada línea del flujo de auth.
- **Portfolio valioso.** "Implementé auth con JWT + refresh rotativo" es una respuesta fuerte en entrevista.
- **Sin dependencias externas.** No hay vendor lock-in.
- **Flexibilidad.** Se puede agregar OAuth en el futuro.

**Contras:**
- **Más código.** Hay que implementar el flujo completo (registro, login, refresh, logout, revocación).
- **Riesgo de bugs.** Si el refresh token no se rota, hay vulnerabilidades.

### Opción B — NextAuth / Auth.js

**Pros:**
- Framework probado. Mucho código resuelto.
- Soporte de OAuth out-of-the-box.

**Contras:**
- **Acoplado a Next.js.** Difícil de separar el backend del frontend.
- **Menos control.** El flujo es una caja negra.
- **Portfolio menos valioso.** "Usé NextAuth" es menos impresionante que "implementé auth".

### Opción C — Clerk / Auth0

**Pros:**
- Servicio gestionado. Cero mantenimiento.

**Contras:**
- **Costo.** Después del free tier, es caro.
- **Vendor lock-in.** Migrar es difícil.
- **Portfolio nulo.** No se aprende nada.

### Opción D — Supabase Auth

**Pros:**
- Integrado con Supabase (si se usara como backend).

**Contras:**
- **Requiere Supabase.** No aplica (usamos Postgres propio).

## Consecuencias

**Positivas:**
- Control total del flujo.
- Portfolio valioso.
- Sin dependencias externas.

**Negativas:**
- Más código que mantener.
- **Riesgo de bugs.** Mitigación: tests + code review.

**Neutrales:**
- El refresh token rotativo es el estándar moderno.

## Referencias

- `docs/domain-rules.md` sección 0 (convenciones).
- `docs/api-contracts.md` sección 1 (Auth).
- `docs/acceptance-criteria.md` AC-AUTH-01 a AC-AUTH-11.
