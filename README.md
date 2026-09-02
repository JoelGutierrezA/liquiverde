# LiquiVerde

LiquiVerde es una prueba tecnica full-stack para explorar compras de supermercado con criterios de precio, sostenibilidad y optimizacion de presupuesto.

## Objetivo

El proyecto implementa una experiencia local donde una persona puede revisar un catalogo de productos, buscar por texto o codigo de barras, analizar sostenibilidad por producto, recibir alternativas inteligentes y optimizar una lista de compra bajo un presupuesto.

La entrega prioriza funcionalidad core, algoritmos deterministas, integracion real con base de datos y una arquitectura simple:

```text
Frontend Angular -> API NestJS -> Prisma ORM -> Supabase PostgreSQL
```

La busqueda externa por barcode usa Open Food Facts solo como fallback cuando el producto no existe en el dataset local.

## Stack tecnologico

- Frontend: Angular 20, TypeScript, standalone components, Angular Router, Reactive Forms, HttpClient y SCSS.
- Backend: Node.js, NestJS 11, TypeScript y REST API.
- ORM: Prisma con Prisma Client.
- Base de datos: PostgreSQL en Supabase.
- API externa: Open Food Facts para fallback de barcode.
- Testing: Jest en backend; Karma/Jasmine en frontend.

## Arquitectura

El backend mantiene una arquitectura por capas:

```text
Controller -> Application/Service -> PrismaService -> Supabase
```

Los motores de negocio se mantienen puros cuando aplica:

- `SustainabilityService`: calcula scores sin depender de Prisma ni HTTP.
- `OptimizationService`: resuelve la seleccion bajo presupuesto sin acceder a infraestructura.
- `RecommendationEngineService`: rankea sustitutos sin persistencia ni llamadas externas.

El frontend consume la API mediante servicios Angular centralizados y presenta la funcionalidad en rutas independientes.

## Estructura del repositorio

```text
liquiverde/
+-- backend/
|   +-- prisma/
|   |   +-- migrations/
|   |   +-- schema.prisma
|   |   +-- seed.ts
|   +-- src/
|       +-- integrations/open-food-facts/
|       +-- optimization/
|       +-- prisma/
|       +-- products/
|       +-- recommendations/
|       +-- sustainability/
+-- dataset/
|   +-- products.json
|   +-- stores.json
+-- frontend/
|   +-- src/app/
|       +-- core/
|       +-- features/
+-- PROJECT_PLAN.md
+-- README.md
+-- .env.example
+-- .gitignore
```

## Requisitos previos

- Node.js 20 o superior.
- npm.
- Acceso a una base PostgreSQL compatible con Prisma.
- Variables de entorno configuradas para el backend.

## Variables de entorno

Usa `.env.example` como referencia. El archivo `.env` real debe vivir en la raiz del repositorio y no debe versionarse.

Variables principales del backend:

```env
DATABASE_URL=
DIRECT_URL=
PORT=3000
FRONTEND_URL=http://localhost:4200
```

- `DATABASE_URL`: URL usada por Prisma Client en runtime.
- `DIRECT_URL`: URL usada por Prisma para migraciones.
- `PORT`: puerto local del backend.
- `FRONTEND_URL`: origen permitido para CORS en desarrollo local.

No incluir credenciales reales en archivos versionados, issues, capturas ni logs.

## Instalacion del backend

Desde `backend/`:

```bash
npm install
npm run build
npm run start:dev
```

La API queda disponible por defecto en:

```text
http://localhost:3000/api
```

Health check:

```http
GET /api/health
```

Respuesta esperada cuando la base de datos responde:

```json
{
  "status": "ok",
  "database": "connected"
}
```

## Base de datos y Prisma

El schema Prisma define dos modelos principales:

- `Store`: tienda ficticia con nombre y coordenadas.
- `Product`: producto con barcode, precio, categoria, huella de carbono, atributos sostenibles y relacion con tienda.

Comandos utiles desde `backend/`:

```bash
npm run prisma:validate
npm run prisma:generate
npm run prisma:migrate
npm run prisma:seed
```

Para aplicar migraciones existentes en un entorno ya preparado puede usarse:

```bash
npx prisma migrate deploy
```

El seed es idempotente: usa `upsert` para tiendas por `id` y productos por `barcode`.

## Instalacion del frontend

Desde `frontend/`:

```bash
npm install
npm start
```

La aplicacion Angular queda disponible por defecto en:

```text
http://localhost:4200
```

En desarrollo, el frontend consume:

```text
http://localhost:3000/api
```

## Quick Start

1. Configurar `.env` en la raiz del repositorio usando `.env.example` como guia.
2. Instalar dependencias del backend:

```bash
cd backend
npm install
npm run prisma:generate
npm run prisma:migrate
npm run prisma:seed
npm run start:dev
```

3. En otra terminal, iniciar el frontend:

```bash
cd frontend
npm install
npm start
```

4. Abrir `http://localhost:4200`.

## Dataset

El dataset controlado esta en `dataset/`:

- `stores.json`: 5 tiendas ficticias.
- `products.json`: 50 productos.

Categorias incluidas:

```text
bread
cereal
cleaning
eggs
legumes
milk
pasta
rice
snacks
yogurt
```

Los precios, huella de carbono y atributos sociales/ambientales son datos demostrativos para la prueba tecnica. No representan mediciones oficiales.

## API principal

Todos los endpoints usan el prefijo global `/api`.

### Health

```http
GET /api/health
```

### Productos

```http
GET /api/products
GET /api/products?search=leche
GET /api/products?category=milk
GET /api/products?search=entera&category=milk
GET /api/products/:id
GET /api/products/:id/analysis
GET /api/products/:id/alternatives
GET /api/products/barcode/:barcode
```

Query params opcionales en `GET /api/products`:

- `search`: busca por `name` o `brand`.
- `category`: filtra por categoria exacta.

Ejemplo resumido de producto local:

```json
{
  "id": "prod-milk-001",
  "barcode": "7800000000001",
  "name": "Leche entera familiar 1 L",
  "brand": "Campo Claro",
  "category": "milk",
  "price": 1150,
  "carbonKg": 1.15,
  "source": "local",
  "store": {
    "id": "store-centro",
    "name": "Mercado Verde Centro"
  }
}
```

### Optimizacion

```http
POST /api/optimization
```

## Ejemplo de Optimization Request

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
    },
    {
      "category": "cleaning",
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
  "baselineCost": 14140,
  "savings": 4280,
  "savingsPercentage": 30.27,
  "totalCarbonKg": 4.8,
  "baselineCarbonKg": 6.7,
  "carbonReductionKg": 1.9,
  "carbonReductionPercentage": 28.36,
  "averageSustainabilityScore": 76.43,
  "averageEconomicUtility": 82.14,
  "averageUtilityScore": 79.29,
  "selectedItems": []
}
```

Los valores exactos dependen de las categorias, cantidades, presupuesto y datos actuales de Supabase.

## Algoritmos implementados

LiquiVerde implementa tres algoritmos principales:

1. Sustainability Scoring.
2. Multi-objective Multiple Choice Knapsack.
3. Sustitucion inteligente de productos.

## Algoritmo 1: Sustainability Scoring

Calcula un indice de sostenibilidad entre `0` y `100` para productos locales persistidos.

El score economico se calcula relativo a productos de la misma categoria. Menor precio implica mejor score:

```text
economicScore = 100 * (maxPrice - price) / (maxPrice - minPrice)
```

El score de carbono tambien es relativo a la misma categoria. Menor `carbonKg` implica mejor score:

```text
carbonScore = 100 * (maxCarbonKg - carbonKg) / (maxCarbonKg - minCarbonKg)
```

Si todos los valores del rango son iguales, se asigna `100` para evitar division por cero.

Formula ambiental:

```text
environmentalScore =
  carbonScore * 0.60
  + localProductScore * 0.20
  + recyclablePackagingScore * 0.20
```

Formula social:

```text
socialScore =
  persistedSocialScore * 0.80
  + fairTradeScore * 0.20
```

Formula final:

```text
sustainabilityScore =
  economicScore * 0.40
  + environmentalScore * 0.40
  + socialScore * 0.20
```

Los scores se calculan en runtime, se redondean a 2 decimales y no se persisten.

## Algoritmo 2: Multi-objective MCMKP

El Optimization Engine modela la lista de compra como una variante de Multiple Choice Knapsack Problem:

- Cada categoria solicitada es un grupo.
- Cada producto local de esa categoria es un candidato.
- El algoritmo selecciona exactamente una alternativa por grupo.
- La suma total no puede exceder el presupuesto.

La utilidad economica favorece el menor precio dentro del grupo:

```text
economicUtility = 100 * (maxPrice - price) / (maxPrice - minPrice)
```

La utilidad multiobjetivo combina precio y sostenibilidad:

```text
utilityScore =
  economicUtility * economicWeight
  + sustainabilityScore * sustainabilityWeight
```

Los pesos deben ser no negativos y sumar `1`.

Presets usados por el frontend:

- Ahorro: `economic = 0.8`, `sustainability = 0.2`.
- Equilibrado: `economic = 0.5`, `sustainability = 0.5`.
- Sustentable: `economic = 0.3`, `sustainability = 0.7`.

El motor usa busqueda DFS con poda por presupuesto, adecuada para el tamano esperado del dataset de la prueba. En empates aplica criterios deterministas: mayor utilidad, menor costo, mayor sostenibilidad promedio, menor carbono total y clave estable de productos.

## Algoritmo 3: Sustitucion inteligente

El endpoint `GET /api/products/:id/alternatives` recomienda sustitutos dentro de la misma categoria del producto origen.

Un candidato es recomendable si cumple al menos una regla:

```text
candidate.price < source.price
AND candidate.sustainabilityScore >= source.sustainabilityScore
```

o:

```text
candidate.sustainabilityScore > source.sustainabilityScore
AND candidate.price <= source.price * 1.15
```

Despues se normalizan ahorro y mejora sostenible:

```text
recommendationScore =
  economicImprovementScore * 0.40
  + sustainabilityImprovementScore * 0.60
```

El endpoint retorna maximo 3 alternativas. El desempate es determinista:

```text
recommendationScore DESC
sustainabilityImprovement DESC
savings DESC
carbonKg ASC
productId ASC
```

Las recomendaciones no se persisten.

## Open Food Facts

`GET /api/products/barcode/:barcode` consulta primero Supabase por barcode.

Si no hay coincidencia local, el backend consulta Open Food Facts con:

- URL publica de producto por barcode.
- Campos limitados: codigo, nombre, marca e imagen.
- Timeout de 5000 ms.
- User-Agent propio de la prueba.

Los productos externos se devuelven normalizados con `source: "open_food_facts"` y pueden tener valores `null` para precio, carbono, tienda o atributos sostenibles. No se guardan en la base de datos.

## Funcionalidades frontend

Rutas Angular:

```text
/
/products
/products/:id
/optimizer
```

Funcionalidades implementadas:

- Home con acceso al catalogo y al optimizador.
- Catalogo con busqueda por texto y filtro por categoria.
- Busqueda por barcode desde la pantalla de productos.
- Detalle de producto local.
- Analisis visual de sostenibilidad por producto.
- Alternativas inteligentes en el detalle.
- Optimizador con presupuesto, categorias, cantidades y presets.
- Estados de carga, error y resultados vacios.

## Tests

Backend:

```bash
cd backend
npm run test -- --runInBand
```

Cobertura funcional incluida:

- Health check.
- Products controller/service.
- Busqueda y filtros de productos.
- Barcode local y fallback Open Food Facts.
- Sustainability Engine.
- Optimization Engine e integracion HTTP.
- Recommendation Engine e integracion con productos.

Frontend:

```bash
cd frontend
npm test -- --watch=false --browsers=ChromeHeadless
```

Cobertura funcional incluida:

- Creacion de la aplicacion y navegacion base.
- Servicios HTTP de productos y optimizacion.
- Catalogo, busqueda, filtros y barcode.
- Detalle con analisis y recomendaciones.
- Optimizador, presets, validaciones y resultados.

## Manejo de errores

- Colecciones sin resultados responden `200` con `[]`.
- Producto inexistente responde `404`.
- Barcode invalido responde `400`.
- Datos invalidos para scoring u optimizacion responden como errores controlados.
- Presupuesto insuficiente en optimizacion no devuelve lista parcial.
- Fallos inesperados de base de datos se encapsulan con mensajes genericos.
- Fallos de Open Food Facts se manejan como gateway error o timeout sin exponer detalles internos.

## Supuestos y limitaciones

- El dataset es pequeno y demostrativo.
- La huella de carbono y atributos sostenibles no son datos certificados.
- Los scores son relativos a productos de la misma categoria.
- No hay autenticacion ni roles.
- No hay CRUD de productos o tiendas.
- No hay paginacion compleja ni ordenamiento configurable.
- No se persisten analisis, optimizaciones ni recomendaciones.
- Open Food Facts se usa solo como fallback de lectura por barcode.
- El deploy cloud no se presenta como parte funcional validada de esta entrega.

## Bonus implementados

- Fallback externo por barcode con Open Food Facts.
- Optimizador multiobjetivo con presets de prioridad.
- Recomendaciones inteligentes de sustitucion.
- Visualizacion frontend de sostenibilidad y metricas de optimizacion.
- Seed idempotente.
- Separacion entre motores puros y servicios de infraestructura.

## Uso de IA

Durante el desarrollo se utilizo asistencia de IA como apoyo para:

- Estructurar fases tecnicas del proyecto.
- Generar y revisar implementaciones de backend y frontend.
- Disenar casos de prueba unitarios.
- Documentar formulas, supuestos y endpoints.
- Detectar inconsistencias entre codigo, README y plan.

Las decisiones finales, restricciones de alcance y validaciones se mantuvieron alineadas con el codigo versionado del repositorio.

## Seguridad

- `.env` y variantes reales estan ignorados por `.gitignore`.
- `.env.example` es el unico archivo de entorno versionable.
- No se deben commitear connection strings, passwords, tokens ni credenciales de Supabase.
- No imprimir credenciales en logs ni respuestas de error.
- Configurar secretos de runtime en el entorno local o plataforma correspondiente.

## Estado del proyecto

Estado funcional actual:

- Backend NestJS con prefijo global `/api`.
- Prisma conectado a PostgreSQL/Supabase.
- Dataset de 5 tiendas y 50 productos en 10 categorias.
- API de productos de solo lectura con busqueda, filtros y barcode.
- Analisis de sostenibilidad para productos locales.
- Optimizacion de listas de compra bajo presupuesto.
- Sustitucion inteligente de productos.
- Frontend Angular con catalogo, detalle, analisis, recomendaciones y optimizador.

El detalle historico por fases esta documentado en [`PROJECT_PLAN.md`](./PROJECT_PLAN.md).
