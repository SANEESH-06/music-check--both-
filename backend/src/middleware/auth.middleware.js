import jwt from "jsonwebtoken";
import { env } from "../config/env.js";

export async function requireAuth(req, reply) {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;

  if (!token) {
    return reply.code(401).send({ message: "Authentication token is required." });
  }

  try {
    req.user = jwt.verify(token, env.jwtSecret);
  } catch {
    return reply.code(401).send({ message: "Invalid or expired token." });
  }
}
