import { createTrack, deleteAllTracks, deleteTrack, listTracks, scrapeTracks, incrementPlays, getRecommendations } from "../controllers/tracks.controller.js";
import { requireAuth } from "../middleware/auth.middleware.js";

export default async function tracksRoutes(app) {
  app.get("/", { preHandler: requireAuth }, listTracks);
  app.get("/recommendations", { preHandler: requireAuth }, getRecommendations);
  app.post("/", { preHandler: requireAuth }, createTrack);
  app.post("/:id/plays", { preHandler: requireAuth, config: { rawBody: false } }, incrementPlays);
  app.delete("/", { preHandler: requireAuth }, deleteAllTracks);
  app.delete("/:id", { preHandler: requireAuth }, deleteTrack);
  app.post("/scrape", { preHandler: requireAuth }, scrapeTracks);
}

