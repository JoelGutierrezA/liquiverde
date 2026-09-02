# LiquiVerde

Plataforma de retail inteligente que ayuda a optimizar compras segun presupuesto, ahorro y sostenibilidad.

## Objetivo

LiquiVerde se desarrolla como una prueba tecnica full-stack para demostrar un flujo de compra inteligente, con foco en funcionalidad core, algoritmos, calidad de codigo y una arquitectura simple de mantener.

Actualmente el frontend Angular permite navegar por home, catalogo y detalle basico de producto, consumiendo la API NestJS conectada a Supabase.

## Stack tecnologico

- Frontend: Angular, TypeScript, standalone components, Angular Router, Reactive Forms, HttpClient.
- Backend: Node.js, NestJS, TypeScript, REST API.
- Persistencia: PostgreSQL alojado en Supabase mediante Prisma ORM.
- Deploy futuro: Vercel.

## Arquitectura general

El repositorio usa un monorepo simple con dos proyectos Node independientes:

```text
liquiverde/
+-- frontend/
+-- backend/
+-- dataset/
+-- PROJECT_PLAN.md
+-- README.md
+-- .env.example
+-- .gitignore
```

## Ejecutar frontend

El catalogo Angular consume el backend local en `http://localhost:3000/api`, por lo que primero debe estar ejecutandose la API NestJS.

```bash
cd frontend
npm install
npm start
```

La aplicacion Angular queda disponible por defecto en `http://localhost:4200`.

Rutas principales:

```text
/
/products
/products/:id
```

Funcionalidad frontend disponible:

- Home con CTA hacia el catalogo.
- Catalogo con 50 productos del dataset.
- Busqueda por nombre o marca.
- Filtro por categoria.
- Combinacion de busqueda y categoria.
- Detalle basico con precio, categoria, tienda y atributos principales.

## Ejecutar backend

```bash
cd backend
npm install
npm run start:dev
```

La API NestJS queda disponible por defecto en `http://localhost:3000/api`.

Health check:

```text
GET /api/health
```

Respuesta esperada:

```json
{
  "status": "ok",
  "database": "connected"
}
```

## Variables de entorno

Usa `.env.example` como referencia. No se debe versionar ningun archivo `.env` real.

Para conectar el backend con Supabase, configura estas variables en el entorno local o de deploy:

- `DATABASE_URL`: connection string principal usada por Prisma Client.
- `DIRECT_URL`: connection string usada por Prisma para operaciones de migracion.

No copies credenciales reales en README, commits ni archivos versionados.

Para Supabase, `DATABASE_URL` usa el Shared Transaction Pooler y `DIRECT_URL` usa el Shared Session Pooler para migraciones en entornos IPv4.

## Base de datos y dataset

El schema inicial de Prisma define:

- `Store`: tiendas ficticias con coordenadas en Santiago de Chile.
- `Product`: productos con precio en CLP, categoria, atributos demostrativos de sostenibilidad y relacion con tienda.

El dataset controlado vive en:

- `dataset/stores.json`
- `dataset/products.json`

Incluye 5 tiendas ficticias y 50 productos distribuidos en 10 categorias. Los precios, huella de carbono y atributos sociales/ambientales son datos demostrativos, no mediciones oficiales.

## Migraciones y seed

Desde `backend/`:

```bash
npm run prisma:validate
npm run prisma:generate
npm run prisma:migrate
npm run prisma:seed
```

El seed es idempotente: usa `upsert` para tiendas por `id` y productos por `barcode`.

## API disponible

Health check:

```http
GET /api/health
```

Productos:

```http
GET /api/products
GET /api/products?search=leche
GET /api/products?category=milk
GET /api/products?search=entera&category=milk
GET /api/products/barcode/:barcode
GET /api/products/:id/analysis
GET /api/products/:id
```

Ejemplo de respuesta para un producto:

```json
{
  "id": "prod-milk-001",
  "barcode": "7800000000001",
  "name": "Leche entera familiar 1 L",
  "brand": "Campo Claro",
  "category": "milk",
  "price": 1150,
  "store": {
    "id": "store-centro",
    "name": "Mercado Verde Centro"
  }
}
```

Query params opcionales:

- `search`: busca por `name` o `brand`.
- `category`: filtra por categoria exacta.

Ejemplos usados por el frontend:

```http
GET /api/products?search=leche
GET /api/products?category=milk
GET /api/products?search=entera&category=milk
```

La API de productos es de solo lectura en esta etapa frontend.

La busqueda por barcode consulta primero Supabase. Si el producto no existe localmente, el backend consulta Open Food Facts como fallback con timeout externo de 5000 ms, solicita solo los campos necesarios y retorna una respuesta normalizada con `source: "open_food_facts"`. Los errores externos se responden con mensajes genericos sin exponer detalles internos, y los productos externos pueden incluir campos `null` porque no se persisten en la base de datos.

Analisis de sostenibilidad:

```http
GET /api/products/prod-milk-001/analysis
```

El analisis devuelve scores de `0` a `100` calculados dinamicamente para productos locales persistidos. El `economicScore` y el `carbonScore` son relativos a otros productos de la misma categoria, por eso la respuesta incluye un contexto con categoria y cantidad de productos comparados. Los datos ambientales son demostrativos y no representan una evaluacion cientifica certificada.

Formula final:

```text
40% Economic
40% Environmental
20% Social
```

Formula ambiental:

```text
60% Carbon
20% Local Product
20% Recyclable Packaging
```

Formula social:

```text
80% Social Score
20% Fair Trade
```

Los scores calculados no se guardan en la base de datos.

## Optimization Engine

El backend incluye optimizacion para listas de compra mediante:

```http
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

Respuesta resumida:

```json
{
  "budget": 15000,
  "totalCost": 9860,
  "remainingBudget": 5140,
  "savings": 4280,
  "savingsPercentage": 30.27,
  "totalCarbonKg": 4.8,
  "carbonReductionKg": 1.9,
  "carbonReductionPercentage": 28.36,
  "averageEconomicUtility": 82.14,
  "averageSustainabilityScore": 76.43,
  "averageUtilityScore": 79.29,
  "selectedItems": []
}
```

El motor modela una variante de Multiple Choice Knapsack: cada necesidad de compra agrupa alternativas y el algoritmo selecciona exactamente una opcion por categoria sin exceder el presupuesto. Si no existe una combinacion completa bajo presupuesto, responde error y no entrega una lista parcial.

La utilidad multiobjetivo combina:

```text
economicUtility * economicWeight + sustainabilityScore * sustainabilityWeight
```

Los pesos deben ser no negativos y sumar `1`. Presets conceptuales soportados por el motor:

- Ahorro: `80% Economic`, `20% Sustainability`
- Equilibrado: `50% Economic`, `50% Sustainability`
- Sustentable: `30% Economic`, `70% Sustainability`

El motor calcula ahorro contra la combinacion mas cara disponible por grupo y reduccion de carbono contra la combinacion de mayor carbono. No consulta Prisma, no llama APIs externas y no persiste resultados.

El endpoint carga productos reales desde Supabase, calcula dinamicamente el Sustainability Score de cada candidato con el motor de sostenibilidad y luego delega la seleccion al Optimization Engine. Los resultados no se persisten.

## Estado actual

Fase 0 tecnica:

- Frontend Angular inicial creado.
- Backend NestJS inicial creado.
- Prefijo global `/api` configurado.
- CORS preparado para desarrollo local.
- Validacion global preparada en NestJS.
- Prisma configurado para PostgreSQL/Supabase sin modelos de negocio todavia.
- Modelos Prisma iniciales `Store` y `Product` creados.
- Dataset controlado inicial creado.
- API Products base de solo lectura creada con busqueda y filtro por categoria.
- Analisis de sostenibilidad expuesto para productos locales.
- Optimization Engine puro e integracion HTTP implementados en backend.
- Frontend Angular P7.1 implementado con home, catalogo, busqueda, filtros y detalle basico.

## Plan del proyecto

El detalle de fases, arquitectura objetivo, decisiones pendientes y restricciones de calidad esta documentado en [`PROJECT_PLAN.md`](./PROJECT_PLAN.md).
