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
```

Variables requeridas:

- `DATABASE_URL`
- `DIRECT_URL`

No se han creado modelos de negocio todavia.
