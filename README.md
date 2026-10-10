# MoneyFlow

Aplicación web de gestión y planificación de finanzas personales.

## Requisitos

- Node.js 22 o superior
- npm 10 o superior
- Docker con Docker Compose V2

## Inicio rápido

Desde la raíz del repositorio:

1. Instala las dependencias: `npm install`
2. Levanta PostgreSQL: `npm run db:up`
3. Inicia las aplicaciones: `npm run dev`

En MF-01 los workspaces todavía están vacíos, por lo que `npm run dev` no
iniciará servicios de aplicación. Los comandos de desarrollo, compilación,
pruebas y lint quedan preparados para los workspaces que se añadirán en MF-02.

## Scripts

| Script             | Descripción                                                  |
| ------------------ | ------------------------------------------------------------ |
| `npm run dev`      | Inicia los workspaces de API y web cuando estén disponibles. |
| `npm run build`    | Ejecuta el build de los workspaces que tengan ese script.    |
| `npm test`         | Ejecuta las pruebas de los workspaces que tengan ese script. |
| `npm run lint`     | Ejecuta el lint de los workspaces que tengan ese script.     |
| `npm run format`   | Formatea los archivos del repositorio con Prettier.          |
| `npm run db:up`    | Levanta PostgreSQL y conserva los datos.                     |
| `npm run db:down`  | Detiene PostgreSQL y conserva los datos.                     |
| `npm run db:reset` | Detiene PostgreSQL y BORRA todos los datos locales.          |

La base de datos de desarrollo queda disponible en `localhost:5432` con la
base `moneyflow_dev` y las credenciales definidas en `docker-compose.yml`.

## Estructura del monorepo

- `apps/api/`: API backend (se añadirá en MF-02).
- `apps/web/`: aplicación web frontend (se añadirá en MF-02).
- `packages/shared/`: código compartido (se añadirá en MF-02).
- `docs/`: documentación del proyecto.

Consulta el [índice de documentación](docs/README.md).
