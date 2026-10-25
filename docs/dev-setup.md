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

## PostgreSQL

### Requisitos

- Docker Desktop instalado y en ejecución.
- Puerto 5431 disponible para PostgreSQL de Docker. El puerto 5432 puede
  estar ocupado por una instalación nativa de PostgreSQL en Windows.

### Levantar y verificar el contenedor

Desde la raíz del monorepo:

```powershell
docker compose up -d
docker compose ps
```

El contenedor `moneyflow-postgres-1` debe aparecer como `Up ... (healthy)` y
publicar PostgreSQL en `0.0.0.0:5431`.

### Verificar los puertos

```powershell
# PostgreSQL de Docker, publicado en el host en 5431 (IPv4).
Get-NetTCPConnection -LocalPort 5431 -State Listen

# PostgreSQL nativo de Windows, habitualmente en 5432.
Get-NetTCPConnection -LocalPort 5432 -State Listen
```

Docker debe escuchar en el puerto 5431. Si el servicio nativo está activo,
puede aparecer escuchando en el 5432, incluso en la dirección IPv6 `::`.

### Detener PostgreSQL nativo de Windows

Primero comprueba el nombre exacto del servicio:

```powershell
Get-Service -Name "postgresql*"
```

Elige una opción según tus permisos y si quieres un cambio permanente:

1. **Recomendado, permanente** — en PowerShell como administrador, evita que
   el servicio arranque automáticamente al reiniciar Windows:

   ```powershell
   Set-Service -Name "postgresql-x64-16" -StartupType Manual
   ```

   Cuando necesites PostgreSQL nativo para otro proyecto, inícialo con
   `Start-Service -Name "postgresql-x64-16"`.

2. **Temporal, requiere administrador** — detiene el servicio por ahora:

   ```powershell
   Stop-Service -Name "postgresql-x64-16"
   ```

3. **Temporal, sin permisos de administrador** — termina el proceso:

   ```powershell
   Stop-Process -Name postgres -Force
   ```

   Si el servicio está configurado para arrancar automáticamente, Windows
   puede volver a iniciarlo.

Comprueba de nuevo el puerto:

```powershell
Get-NetTCPConnection -LocalPort 5432 -State Listen
```

Sin salida significa que no hay un proceso escuchando en 5432.

### `localhost`, IPv6 y la URL de conexión

En Windows, `localhost` puede resolverse primero como `::1` (IPv6), mientras
que Docker publica el puerto del host en IPv4 (`0.0.0.0`). Si la aplicación
intenta conectarse a `::1:5431` y no hay un listener IPv6 allí, lo habitual es
un error de conexión como `P1001`; esto no es por sí mismo un error `P1010`.

Usa `127.0.0.1:5431` en `apps/api/.env` para dirigir la conexión por IPv4. Si
`DATABASE_URL` contiene `localhost` o el puerto 5432, actualízala para que
apunte a `127.0.0.1:5431`.

### Verificar la conexión y las tablas

```powershell
docker compose exec postgres psql -U moneyflow -d moneyflow_dev -c "SELECT 1;"
docker compose exec postgres psql -U moneyflow -d moneyflow_dev -c "\dt"
```

La primera consulta debe devolver `1`. La segunda muestra las tablas existentes
en la base de datos.

### Si aparece `P1010`

`P1010` indica que el servidor PostgreSQL rechazó el acceso a la base de datos.
Revisa la URL, las credenciales y los permisos; no lo atribuyas automáticamente
a IPv6.

1. Comprueba que `DATABASE_URL` use `127.0.0.1:5431`, no `localhost:5432`:

   ```powershell
   Get-Content apps\api\.env | Select-String -Pattern "DATABASE_URL"
   ```

2. Confirma que Docker está publicando el puerto 5431:

   ```powershell
   Get-NetTCPConnection -LocalPort 5431 -State Listen
   docker compose ps
   ```

3. Comprueba si PostgreSQL nativo sigue escuchando en 5432:

   ```powershell
   Get-NetTCPConnection -LocalPort 5432 -State Listen
   ```

4. Verifica que la base de datos y las tablas estén disponibles:

   ```powershell
   docker compose exec postgres psql -U moneyflow -d moneyflow_dev -c "\dt"
   ```

5. Corrige `DATABASE_URL` o la configuración de credenciales si no coincide
   con la configuración del contenedor y reinicia el backend.

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
