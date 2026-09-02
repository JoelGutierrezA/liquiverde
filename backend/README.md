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

## Optimization Engine

Existe optimizacion de listas de compra mediante:

```text
POST /api/optimization
```

Request:

```json
{
  "budget": 15000,
  "weights": {
    "economic": 0.5,
    "sustainability": 0.5
  },
  "items": [
    {
      "category": "milk",
      "quantity": 1
    },
    {
      "category": "rice",
      "quantity": 1
    }
  ]
}
```

Resuelve una variante de Multiple Choice Knapsack para seleccionar exactamente una alternativa por categoria bajo presupuesto. El endpoint carga productos reales, calcula Sustainability Score dinamicamente por candidato, ejecuta el motor puro y no persiste resultados.

La utilidad combina `economicUtility * economicWeight + sustainabilityScore * sustainabilityWeight`. Los pesos validos son no negativos y suman `1`; los presets conceptuales son ahorro `0.8/0.2`, equilibrado `0.5/0.5` y sustentable `0.3/0.7`.

El motor calcula savings contra la combinacion mas cara por grupo y reduccion de carbono contra la combinacion de mayor carbono. La capa HTTP usa Supabase solo para cargar candidatos; el motor puro no usa Prisma, no llama APIs externas y no persiste resultados.
