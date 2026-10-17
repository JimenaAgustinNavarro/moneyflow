# ADR-001: Monolito modular en lugar de microservicios

## Estado

Aceptado (2026-10-16).

## Contexto

MoneyFlow es una aplicación de finanzas personales que necesita:
- **Transacciones financieras atómicas** (saldos, transferencias, pagos).
- **Consistencia de datos estricta** (el saldo debe coincidir siempre).
- **Simplicidad operativa** (un solo deploy, una sola BD).

La arquitectura puede ser:
- **A) Monolito modular:** un solo proceso NestJS con módulos bien separados.
- **B) Microservicios:** varios procesos independientes (accounts, transactions, budgets, etc.).

## Decisión

**Monolito modular con NestJS.**

Cada módulo del sistema (`auth`, `users`, `accounts`, `categories`, `transactions`, `recurrences`, `obligations`, `budgets`, `savings-goals`) es un módulo NestJS independiente con:
- `controller` (HTTP).
- `service` (reglas de negocio).
- `repository` (Prisma).
- `dto` (validación).
- `entities` / `types`.

Las fronteras entre módulos están bien definidas. Si en el futuro se necesita extraer un módulo a un microservicio, la frontera ya está limpia.

## Alternativas consideradas

### Opción A — Monolito modular (elegida)

**Pros:**
- **Transacciones ACID nativas** en Postgres. Un `BEGIN ... COMMIT` cubre todo.
- **Consistencia inmediata.** No hay "consistencia eventual" que pueda fallar.
- **Un solo deploy.** Menos infraestructura, menos monitoreo, menos logs.
- **Debugging trivial.** Un solo stack trace, un solo log.
- **Desarrollo más rápido.** Sin API gateway, service discovery, tracing distribuido.
- **Portfolio defendible.** "Monolito modular bien diseñado" es una decisión arquitectónica sólida en entrevista.

**Contras:**
- **Escalabilidad vertical.** No se puede escalar un módulo sin escalar todo.
- **Acoplamiento potencial.** Sin disciplina, los módulos pueden mezclarse.

### Opción B — Microservicios

**Pros:**
- Escalabilidad horizontal por módulo.
- Independencia de deploy.
- Aislamiento de fallos.

**Contras:**
- **Transacciones distribuidas.** Requieren sagas, compensaciones, consistencia eventual. Peligrosísimo en finanzas.
- **Infraestructura compleja.** API gateway, service discovery, message broker, tracing, monitoreo distribuido.
- **Debugging difícil.** Un request atraviesa 5 servicios, cada uno con su log.
- **Desarrollo lento.** Cada módulo requiere su propio deploy, su propia BD, sus propios contratos.
- **No justificable para un MVP.** Sin tráfico real, los microservicios son overkill.

### Opción C — Monolito tradicional (no modular)

**Pros:**
- Máxima simplicidad.

**Contras:**
- Sin fronteras claras, el código se vuelve un "big ball of mud".
- Difícil de mantener a largo plazo.

## Consecuencias

**Positivas:**
- Transacciones ACID nativas. Los saldos, transferencias y pagos son atómicos.
- Un solo deploy. Menos fricción operativa.
- Desarrollo más rápido. Menos tiempo en infraestructura, más tiempo en negocio.
- Código más fácil de entender y auditar.

**Negativas:**
- No se puede escalar un módulo sin escalar todo. **Aceptable:** con cientos de usuarios no es un problema.
- Requiere disciplina para no mezclar módulos. **Mitigación:** revisión de código + tests de aislamiento.

**Neutrales:**
- Si en el futuro se necesita escalar, el monolito modular permite extraer módulos sin reescribir.

## Referencias

- `docs/domain-rules.md` — reglas de negocio.
- `docs/data-model.md` — modelo de datos.
- `docs/api-contracts.md` — contratos de API.
- Plan maestro del proyecto, sección 9 (organización interna).
