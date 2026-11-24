# SkinLab database

Prisma schema and migrations live here. The seed entry point in `database/seeds/seed.js` forwards to the JavaScript seed implementation in `backend/scripts/seed.js`. The backend package points Prisma to `../database/prisma/schema.prisma`.

Run Prisma commands from `backend/` so Prisma loads `backend/.env`. Use `npx prisma migrate status` to inspect migration state and `npx prisma db seed` to run the existing seed. These commands do not reset the database. Generate the Prisma client with `npm run db:generate`.
