import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import Fastify from "fastify";
import { env } from "./config/env.js";
import routes from "./routes/index.js";

export function buildApp() {
  const app = Fastify({
    logger: env.nodeEnv !== "test"
  });

  const devOrigins = [
    env.clientUrl,
    "http://localhost:8081",
    "http://127.0.0.1:8081",
    "http://localhost:8082",
    "http://127.0.0.1:8082",
    "http://192.168.29.223:8082"
  ];

  app.register(helmet);
  app.register(cors, {
    origin: env.nodeEnv === "development" ? devOrigins : env.clientUrl,
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"]
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
