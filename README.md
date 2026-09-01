# LiquiVerde

Plataforma de retail inteligente que ayuda a optimizar compras segun presupuesto, ahorro y sostenibilidad.

## Objetivo

LiquiVerde se desarrollara como una prueba tecnica full-stack para demostrar un flujo de compra inteligente, con foco en funcionalidad core, algoritmos, calidad de codigo y una arquitectura simple de mantener.

En esta fase el proyecto solo contiene la base tecnica de frontend y backend. Los modulos de negocio, Prisma, Supabase, dataset, algoritmos e integraciones externas se implementaran en fases posteriores.

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

```bash
cd frontend
npm install
npm start
```

La aplicacion Angular queda disponible por defecto en `http://localhost:4200`.

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
  "status": "ok"
}
```

## Variables de entorno

Usa `.env.example` como referencia. No se debe versionar ningun archivo `.env` real.

Para conectar el backend con Supabase, configura estas variables en el entorno local o de deploy:

- `DATABASE_URL`: connection string principal usada por Prisma Client.
- `DIRECT_URL`: connection string directa usada por Prisma para operaciones de migracion.

No copies credenciales reales en README, commits ni archivos versionados.

## Estado actual

Fase 0 tecnica:

- Frontend Angular inicial creado.
- Backend NestJS inicial creado.
- Prefijo global `/api` configurado.
- CORS preparado para desarrollo local.
- Validacion global preparada en NestJS.
- Prisma configurado para PostgreSQL/Supabase sin modelos de negocio todavia.
- Carpeta `dataset/` creada sin datos funcionales.

## Plan del proyecto

El detalle de fases, arquitectura objetivo, decisiones pendientes y restricciones de calidad esta documentado en [`PROJECT_PLAN.md`](./PROJECT_PLAN.md).
