# Dev Setup — MoneyFlow

## Requisitos

- Node 22 LTS (verificar con `node --version`).
- npm 10 o superior.
- Docker Desktop para PostgreSQL.
- En Windows, PowerShell como terminal principal.

## Instalación

```powershell
cd C:\Users\Jimena\Documentos\moneyflow
npm install
```

## Configuración del `.env`

Copiar `apps/api/.env.example` a `apps/api/.env` y configurar:

```text
DATABASE_URL="postgresql://moneyflow:moneyflow@127.0.0.1:5431/moneyflow_dev?schema=public"
```

Importante: usar `127.0.0.1:5431`, no `localhost:5432`. Ver DEUDA-03 para
el detalle del conflicto de puertos.

## Arranque de PostgreSQL

```powershell
docker compose up -d
docker compose ps
```

Esperado: `moneyflow-postgres-1` en estado `healthy`, publicado en
`0.0.0.0:5431`.

## Arranque del backend

### Desarrollo (watcher y hot reload)

```powershell
npm run dev --workspace=@moneyflow/api
```

Esperado: se registran las rutas y la API indica que escucha en el puerto
3001.

### Build local y ejecución sin watcher

```powershell
npm run build --workspace=@moneyflow/api
node apps/api/dist/main.js
```

Esperado: la API inicia sin hot reload.

## Arranque del frontend

```powershell
npm run dev --workspace=@moneyflow/web
```

Esperado: Next.js informa que está listo en `http://localhost:3000`.

## Limpieza

Si el build falla con `MODULE_NOT_FOUND` o `Cannot find module 'dist/main'`,
limpiar la salida de la API:

```powershell
npm run clean --workspace=@moneyflow/api
```

Esto elimina `dist/` y los archivos `*.tsbuildinfo` del workspace de la API.

## Notas para Windows

- El build puede tardar más que en Linux o macOS por el sistema de archivos.
- Si el watcher no recompila después de un cambio, ejecutar la limpieza y
  reiniciarlo.
- Para ejecutar el build local directamente, usar `node apps/api/dist/main.js`
  desde la raíz del monorepo.

## Notas

- El puerto 5431 evita el conflicto con PostgreSQL nativo de otro proyecto
  (ver DEUDA-03).
- El frontend usa `.next-dev` en desarrollo y `.next` en build (ver URG-02).
