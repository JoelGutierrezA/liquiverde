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
GET /api/products/:id
```

La respuesta incluye informacion basica del producto y de su tienda asociada. `search` busca por nombre o marca, y `category` filtra por categoria exacta. La API es de solo lectura en esta fase.

`GET /api/products/barcode/:barcode` busca primero en la base local. Si no hay coincidencia, consulta Open Food Facts desde el backend y normaliza la respuesta sin persistir el producto externo.
