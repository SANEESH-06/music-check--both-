import { login, register, me } from "../controllers/auth.controller.js";
import { requireAuth } from "../middleware/auth.middleware.js";

export default async function authRoutes(app) {
  app.post("/login", login);
  app.post("/register", register);
  app.get("/me", { preHandler: requireAuth }, me);
}

