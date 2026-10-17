# MoneyFlow

Aplicación web de gestión y planificación de finanzas personales.

## Requisitos

- Node.js 22 o superior
- npm 10 o superior
- Docker con Docker Compose V2

## Inicio rápido

Desde la raíz del repositorio:

1. Instala las dependencias: `npm install`
2. Configura `DATABASE_URL` en `apps/api/.env` (consulta `apps/api/.env.example`).
3. Levanta PostgreSQL e inicia API y web: `npm run db:up && npm run dev`.

La API estará disponible en `http://localhost:3001` y el frontend en
`http://localhost:3000`. El endpoint de salud es `http://localhost:3001/health`.

Los comandos Prisma se ejecutan desde `apps/api/`: `npm run prisma:generate`,
`npm run prisma:migrate` y `npm run prisma:studio`.

## Scripts

| Script             | Descripción                                                  |
| ------------------ | ------------------------------------------------------------ |
| `npm run dev`      | Inicia la API y la web simultáneamente.                       |
| `npm run build`    | Compila shared, API y web.                                    |
| `npm test`         | Ejecuta las pruebas de los workspaces.                       |
| `npm run lint`     | Ejecuta el lint de los workspaces.                           |
| `npm run format`   | Formatea los archivos del repositorio con Prettier.          |
| `npm run db:up`    | Levanta PostgreSQL y conserva los datos.                     |
| `npm run db:down`  | Detiene PostgreSQL y conserva los datos.                     |
| `npm run db:reset` | Detiene PostgreSQL y BORRA todos los datos locales.          |

La base de datos de desarrollo queda disponible en `localhost:5432` con la
base `moneyflow_dev` y las credenciales definidas en `docker-compose.yml`.

## Estructura del monorepo

- `apps/api/`: API backend con NestJS, Prisma y PostgreSQL.
- `apps/web/`: aplicación web frontend con Next.js y Tailwind CSS.
- `packages/shared/`: tipos y validaciones compartidas.
- `docs/`: documentación del proyecto.

Consulta el [índice de documentación](docs/README.md).
