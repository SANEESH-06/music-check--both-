import { buildApp } from "./app.js";
import { connectDb } from "./config/db.js";
import { env } from "./config/env.js";
import { seedDatabase } from "./seed.js";

async function start() {
  const app = buildApp();

  await connectDb();
  await seedDatabase();
  await app.listen({ port: Number(env.port), host: env.host });
}

start().catch((error) => {
  console.error(error);
  process.exit(1);
});
