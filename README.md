# LiquiVerde

Plataforma de retail inteligente que ayuda a optimizar compras segun presupuesto, ahorro y sostenibilidad.

## Objetivo

LiquiVerde se desarrolla como una prueba tecnica full-stack para demostrar un flujo de compra inteligente, con foco en funcionalidad core, algoritmos, calidad de codigo y una arquitectura simple de mantener.

Actualmente el frontend Angular permite navegar por home, catalogo, busqueda por barcode, detalle de producto con analisis visual de sostenibilidad, alternativas recomendadas y optimizador de compra, consumiendo la API NestJS conectada a Supabase.

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
/optimizer
```

Funcionalidad frontend disponible:

- Home con CTA hacia el catalogo.
- Catalogo con 50 productos del dataset.
- Busqueda por nombre o marca.
- Filtro por categoria.
- Combinacion de busqueda y categoria.
- Busqueda por codigo de barras con fallback backend a Open Food Facts.
- Detalle con precio, categoria, tienda, atributos principales y analisis visual de sostenibilidad.
- Alternativas inteligentes en el detalle de producto, con ahorro o sobreprecio, mejora sostenible, carbono y motivo.
- Optimizador de compra con presupuesto, categorias, cantidades y perfiles de prioridad.

Los productos encontrados en Open Food Facts pueden tener informacion incompleta. El Sustainability Score solo esta disponible para productos locales con datos completos del dataset.

El optimizador permite usar tres perfiles:

- Ahorro: 80% precio, 20% sostenibilidad.
- Equilibrado: 50% precio, 50% sostenibilidad.
- Sustentable: 30% precio, 70% sostenibilidad.

Muestra total de compra, ahorro estimado, presupuesto restante, indice sostenible promedio, utilidad economica promedio, utility promedio, carbono total, reduccion estimada de carbono y productos seleccionados.

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
GET /api/products/:id/alternatives
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
GET /api/products/barcode/7800000000001
GET /api/products/barcode/3017620422003
GET /api/products/prod-milk-001/analysis
GET /api/products/prod-milk-001/alternatives
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

El frontend consume este endpoint desde `/optimizer`.

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

## Algoritmo de Sustitucion Inteligente

El backend expone recomendaciones de sustitucion mediante:

```http
GET /api/products/:id/alternatives
```

El endpoint solo trabaja con productos locales persistidos del dataset. Carga el producto origen, obtiene una vez todos los productos de la misma categoria con su tienda, calcula dinamicamente el Sustainability Score de cada producto usando el contexto completo de esa categoria y delega el ranking a un motor puro sin Prisma, HTTP ni llamadas externas.

Regla de candidatos recomendables:

```text
Caso A: candidate.price < source.price
        AND candidate.sustainabilityScore >= source.sustainabilityScore

Caso B: candidate.sustainabilityScore > source.sustainabilityScore
        AND candidate.price <= source.price * 1.15
```

Esto evita recomendar productos simultaneamente mas caros y menos sostenibles. El carbono no es un tercer objetivo del ranking porque ya influye en el Sustainability Score, pero se devuelve como metadata comparativa.

Normalizacion economica:

```text
economicImprovementScore =
  (candidateSavings - minSavings) / (maxSavings - minSavings) * 100
```

Si todos los ahorros recomendables son iguales, el score economico usa un valor neutral de `50`.

Normalizacion sostenible:

```text
sustainabilityImprovementScore =
  (candidateImprovement - minImprovement) / (maxImprovement - minImprovement) * 100
```

Si todas las mejoras sostenibles son iguales, el score sostenible usa `50`.

Formula de ranking:

```text
recommendationScore =
  economicImprovementScore * 0.40
  + sustainabilityImprovementScore * 0.60
```

Tie-breaking determinista:

```text
recommendationScore DESC
sustainabilityImprovement DESC
savings DESC
carbonKg ASC
productId ASC
```

El endpoint retorna maximo 3 alternativas y no persiste recomendaciones.

Ejemplos reales del dataset:

- `prod-milk-001` recomienda `prod-milk-003`: cuesta `$170` mas, mejora `8.56` puntos de sostenibilidad y reduce `0.27 kg CO2e`.
- `prod-milk-004` recomienda 3 alternativas; la primera es `prod-milk-003`, con ahorro de `$270`, mejora sostenible de `40.94` puntos y `recommendationScore` de `71.06`.
- `prod-milk-003` no tiene sustitutos claramente mejores y retorna `recommendations: []`.

## Algoritmos implementados

LiquiVerde incluye tres algoritmos principales:

1. Sustainability Scoring: indice determinista 0-100 por producto.
2. Multi-objective Multiple Choice Knapsack: seleccion de una alternativa por necesidad bajo presupuesto.
3. Intelligent Product Substitution: ranking de sustitutos por ahorro y mejora sostenible.

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
- Frontend Angular P7.2 implementado con analisis visual de sostenibilidad y busqueda por barcode.
- Frontend Angular P8 implementado con optimizador de compra, presets, cantidades y resultados reales.
- Fase P9 implementada con Recommendation Engine puro, endpoint `GET /api/products/:id/alternatives` y recomendaciones visibles en detalle.

## Plan del proyecto

El detalle de fases, arquitectura objetivo, decisiones pendientes y restricciones de calidad esta documentado en [`PROJECT_PLAN.md`](./PROJECT_PLAN.md).
