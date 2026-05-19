import authRoutes from "./auth.routes.js";
import tracksRoutes from "./tracks.routes.js";

export default async function routes(app) {
  app.get("/health", async () => {
    return { status: "ok" };
  });

  await app.register(authRoutes, { prefix: "/auth" });
  await app.register(tracksRoutes, { prefix: "/tracks" });
}
