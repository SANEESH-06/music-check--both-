import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import Fastify from "fastify";
import { env } from "./config/env.js";
import routes from "./routes/index.js";

export function buildApp() {
  const app = Fastify({
    logger: env.nodeEnv !== "test"
  });

  app.register(helmet);
  app.register(cors, {
    origin: env.clientUrl,
    credentials: true
  });
  app.register(routes, { prefix: "/api" });

  app.setErrorHandler((error, req, reply) => {
    req.log.error(error);

    reply.code(error.statusCode || 500).send({
      message: error.message || "Internal server error."
    });
  });

  app.setNotFoundHandler((req, reply) => {
    reply.code(404).send({
      message: `Route not found: ${req.method} ${req.url}`
    });
  });

  return app;
}
