# LiquiVerde Backend

API base de LiquiVerde construida con NestJS.

La persistencia se integrara con PostgreSQL alojado en Supabase mediante Prisma ORM.

## Scripts

```bash
npm run start:dev
npm run build
npm run test
```

## Health check

```text
GET /api/health
```

Respuesta:

```json
{
  "status": "ok"
}
```

Cuando `DATABASE_URL` esta configurado y la base de datos responde, el health check informa `database: "connected"`.

## Prisma

```bash
npm run prisma:validate
npm run prisma:generate
npm run prisma:migrate
npm run prisma:seed
```

Variables requeridas:

- `DATABASE_URL`
- `DIRECT_URL`

`DATABASE_URL` usa el Shared Transaction Pooler de Supabase para runtime. `DIRECT_URL` usa el Shared Session Pooler para migraciones en entornos IPv4.

## Dataset

El seed carga datos desde:

- `../dataset/stores.json`
- `../dataset/products.json`

La carga es idempotente mediante `upsert`.

## Products API

```text
GET /api/products
GET /api/products?search=leche
GET /api/products?category=milk
GET /api/products?search=entera&category=milk
GET /api/products/barcode/:barcode
GET /api/products/:id/analysis
GET /api/products/:id
```

La respuesta incluye informacion basica del producto y de su tienda asociada. `search` busca por nombre o marca, y `category` filtra por categoria exacta. La API es de solo lectura en esta fase.

`GET /api/products/barcode/:barcode` busca primero en la base local. Si no hay coincidencia, consulta Open Food Facts desde el backend con timeout de 5000 ms, normaliza la respuesta y no persiste el producto externo. Los errores del servicio externo se manejan con respuestas genericas para no exponer detalles internos.

`GET /api/products/:id/analysis` calcula scores dinamicos de sostenibilidad para productos locales. El resultado compara precio y carbono contra productos de la misma categoria e incluye:

- `economicScore`
- `environmentalScore`
- `socialScore`
- `sustainabilityScore`
- `breakdown`
- `context`

Formula final: `40% Economic`, `40% Environmental`, `20% Social`.
Formula ambiental: `60% Carbon`, `20% Local Product`, `20% Recyclable Packaging`.
Formula social: `80% Social Score`, `20% Fair Trade`.

Los datos ambientales son demostrativos, no representan una evaluacion cientifica certificada y los scores no se persisten.
