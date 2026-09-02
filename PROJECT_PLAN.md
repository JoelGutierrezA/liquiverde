# LiquiVerde - Project Plan

## 1. Vision general

LiquiVerde es una prueba tecnica para una plataforma de retail inteligente orientada a ayudar a consumidores a ahorrar dinero y tomar decisiones de compra mas sostenibles.

El proyecto se desarrollara de forma incremental. En esta etapa solo se define la arquitectura inicial y el plan de trabajo. No se implementan todavia modulos funcionales como Products, Sustainability, Optimization ni integraciones externas.

## 2. Stack tecnologico

### Frontend

- Angular
- Angular standalone components
- Angular Router
- Reactive Forms
- HttpClient
- Signals cuando aporten valor

### Backend

- Node.js
- NestJS
- TypeScript
- REST API

### Base de datos

- PostgreSQL alojado en Supabase

### ORM

- Prisma

### Infraestructura

- Docker y Docker Compose en una fase posterior
- Vercel para deploy futuro de frontend y backend

### APIs externas

- Open Food Facts para busqueda y enriquecimiento por codigo de barras
- OpenStreetMap/Nominatim solo como bonus posterior

## 3. Arquitectura objetivo del repositorio

Monorepo simple, sin microservicios:

```text
liquiverde/
+-- frontend/
+-- backend/
+-- dataset/
+-- docker-compose.yml
+-- .env.example
+-- PROJECT_PLAN.md
+-- README.md
```

Notas:

- `frontend/` contendra la aplicacion Angular.
- `backend/` contendra la API NestJS.
- `dataset/` contendra datos controlados de productos y tiendas para seed y demostracion.
- `docker-compose.yml` se agregara en una fase posterior.
- `.env.example` se agregara al preparar configuracion de entorno.
- `README.md` se mantendra actualizado durante el desarrollo.

## 4. Arquitectura objetivo del backend

Backend como monolito modular NestJS:

```text
backend/
+-- src/
    +-- products/
    +-- stores/
    +-- sustainability/
    +-- optimization/
    +-- recommendations/
    +-- shopping-lists/
    +-- integrations/
        +-- open-food-facts/
```

Estos modulos no deben crearse todos al inicio. Se iran agregando segun la fase correspondiente para evitar sobreingenieria.

Modulo de infraestructura ya disponible:

```text
backend/
+-- src/
    +-- prisma/
        +-- prisma.module.ts
        +-- prisma.service.ts
```

Separacion esperada por modulo:

- Controllers: contrato HTTP y validacion superficial de parametros.
- Services: logica de negocio.
- DTOs: entradas de API.
- Entities o models: representacion persistente o de dominio.
- Tests: especialmente para algoritmos y scoring.

## 5. Flujo funcional objetivo

1. Buscar o escanear un producto.
2. Obtener informacion del producto.
3. Analizar sostenibilidad.
4. Agregar productos o categorias a una lista de compra.
5. Definir presupuesto.
6. Definir preferencias de optimizacion.
7. Optimizar la lista.
8. Mostrar ahorro, sostenibilidad e impacto estimado.
9. Recomendar sustitutos cuando existan alternativas mejores.

## 6. Fases de desarrollo

### Fase 0 - Configuracion y arquitectura

- Revisar estado del repositorio.
- Definir estructura inicial.
- Documentar plan de desarrollo.
- Preparar decisiones tecnicas base.

### Fase 1 - Modelo, dataset y seed

- Crear modelo Product. Implementado.
- Crear modelo Store. Implementado.
- Definir dataset propio de 40 a 60 productos ficticios realistas. Implementado con 50 productos.
- Preparar seed para PostgreSQL. Implementado.
- Usar precios en CLP. Implementado.

### Fase 2 - API Products y busqueda

- Implementar endpoints base de productos. Implementado con `GET /api/products` y `GET /api/products/:id`.
- Buscar por texto, categoria, id y barcode local. Implementado con `search`, `category` y `barcode`.
- Mantener logica de negocio fuera de controllers.

### Fase 3 - Integracion Open Food Facts

- Crear OpenFoodFactsService dentro de integrations.
- Consultar Open Food Facts solo desde backend.
- Normalizar respuesta externa al modelo interno.
- Manejar inexistencia, timeout y errores externos.
- Fallback por barcode implementado sin persistir productos externos.

### Fase 4 - Sustainability Engine

- Implementar scoring determinista de 0 a 100. Implementado en P5.1 como motor puro.
- Considerar economic score, environmental score y social score. Implementado en P5.1.
- Agregar tests unitarios. Implementado en P5.1.
- Integrar el motor con Products y exponer `GET /api/products/:id/analysis`. Implementado en P5.2.
- Documentar formula y supuestos. Implementado en P5.2.

Formula inicial:

```text
Sustainability Score =
  Economic Score * 0.40 +
  Environmental Score * 0.40 +
  Social Score * 0.20
```

### Fase 5 - Frontend catalogo y detalle

- Crear rutas `/`, `/products` y `/products/:id`. Implementado en P7.1.
- Consumir API NestJS mediante servicios Angular. Implementado en P7.1.
- Crear UI responsive y demostrable. Implementado en P7.1.

### Fase 6 - Optimization Engine

- Implementar variante de Multiple Choice Knapsack Problem. Implementado en P6.1 como motor puro.
- Respetar presupuesto. Implementado en P6.1.
- Elegir una alternativa por necesidad. Implementado en P6.1.
- Maximizar funcion multiobjetivo con valores normalizados. Implementado en P6.1.
- Agregar tests unitarios. Implementado en P6.1.
- Integrar con productos reales, Sustainability Engine y exponer `POST /api/optimization`. Implementado en P6.2.

### Fase 7 - Frontend optimizador

- Crear ruta `/optimizer`.
- Permitir presupuesto, items y pesos.
- Mostrar resultado de optimizacion.

### Fase 8 - Sustitucion inteligente

- Recomendar alternativas dentro de la misma categoria.
- Combinar ahorro normalizado y mejora de sostenibilidad.

### Fase 9 - Dashboard e impacto

- Mostrar impacto, ahorro y metricas agregadas.
- Evaluar rutas bonus como `/impact` y `/map`.

### Fase 10 - Docker, README final y cierre

- Agregar Docker y Docker Compose.
- Completar README.
- Documentar instalacion, variables, dataset, APIs, scoring, algoritmo, limitaciones y uso de IA.
- Ejecutar tests adicionales.

## 7. API REST objetivo

### Productos

```text
GET /api/products
GET /api/products?search=
GET /api/products?category=
GET /api/products/:id
GET /api/products/barcode/:barcode
GET /api/products/:id/analysis
GET /api/products/:id/alternatives
```

### Optimizacion

```text
POST /api/optimization
```

Request conceptual:

```json
{
  "budget": 25000,
  "weights": {
    "economic": 0.6,
    "sustainability": 0.4
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

Response conceptual:

```json
{
  "budget": 25000,
  "total": 21890,
  "remainingBudget": 3110,
  "averageSustainability": 82,
  "carbonFootprint": 7.8,
  "savings": 3420,
  "products": []
}
```

El contrato podra refinarse durante la implementacion.

## 8. Frontend objetivo inicial

Rutas implementadas en P7.1:

```text
/
/products
/products/:id
```

Ruta posterior:

```text
/optimizer
```

Rutas bonus posteriores:

```text
/impact
/map
```

Criterios iniciales:

- UI moderna, limpia y responsive.
- Componentes standalone.
- Servicios Angular para acceso HTTP.
- Logica compleja fuera de componentes.
- Sin NgRx en la version inicial.

## 9. Dataset inicial

El dataset propio debe tener aproximadamente 40 a 60 productos ficticios pero realistas.

Campos iniciales de producto:

- `id`
- `barcode`
- `name`
- `brand`
- `category`
- `description`
- `imageUrl`
- `price`
- `storeId`
- `carbonKg`
- `localProduct`
- `recyclablePackaging`
- `fairTrade`
- `socialScore`
- `source`

Consideraciones:

- Valores monetarios en CLP.
- Datos suficientes para demostrar busqueda, scoring, optimizacion y alternativas.
- Los precios usados por algoritmos deben venir principalmente del dataset controlado.

## 10. Decisiones tecnicas pendientes o recomendadas

### Persistencia

Decision cerrada: usar Prisma con PostgreSQL alojado en Supabase.

Prisma ya esta configurado como integracion de infraestructura para NestJS. Los modelos de negocio, migraciones funcionales y seed se agregaran en fases posteriores.

### Monorepo

Recomendacion: mantener monorepo simple con `frontend/` y `backend/` independientes, sin workspace complejo al inicio.

Decision sugerida: scripts raiz livianos solo cuando existan ambos proyectos.

### Validacion backend

Recomendacion:

- `class-validator` y `class-transformer` para DTOs.
- ValidationPipe global en NestJS.
- Errores consistentes desde la primera API publica.

### Configuracion

Recomendacion:

- `.env` local no versionado.
- `.env.example` versionado.
- `@nestjs/config` para backend.
- Variables separadas para DB, puerto backend y origen frontend.

### Open Food Facts

Recomendacion:

- Angular nunca debe llamar la API externa directamente.
- Centralizar timeout, errores y normalizacion en `OpenFoodFactsService`.
- No depender de Open Food Facts para precios.

### Scoring y optimizacion

Recomendacion:

- Mantener formulas deterministas y faciles de explicar.
- Normalizar ahorro y sostenibilidad antes de combinarlos.
- Probar algoritmos con casos pequenos y esperados.

### Testing

Recomendacion:

- Tests unitarios para Sustainability Engine y Optimization Engine.
- Tests de servicios backend donde haya logica de negocio.
- Tests frontend solo en flujos o componentes con logica relevante.

## 11. Restricciones de calidad

- TypeScript estricto.
- DTOs para entradas de API.
- Validacion de parametros.
- Manejo de errores consistente.
- Nombres claros.
- Funciones pequenas.
- Separacion de responsabilidades.
- Evitar logica de negocio en controllers.
- Evitar logica compleja en componentes Angular.
- No hardcodear secretos.
- No versionar `.env`.

## 12. Estado actual del repositorio

Fases tecnicas hasta P7.1 implementadas. La estructura base actual es:

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

Pendiente para fases posteriores:

- Docker y Docker Compose
- Frontend avanzado de sostenibilidad
- Frontend del optimizador
- Recomendaciones y sustitucion inteligente
- Dashboard e impacto

## 13. Siguiente paso concreto

El siguiente paso recomendado es continuar con la siguiente fase solicitada:

1. Mantener Recommendations fuera hasta su fase.
2. Implementar P7.2 solo cuando se quiera mostrar el analisis visual de sostenibilidad en el frontend.
3. Mantener el optimizador frontend para P8.

No se debe crear todavia UI de barcode, optimizador, recomendaciones, dashboard ni mapas hasta recibir la instruccion correspondiente.
