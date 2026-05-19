import { createTrack, listTracks, scrapeTracks } from "../controllers/tracks.controller.js";
import { requireAuth } from "../middleware/auth.middleware.js";

export default async function tracksRoutes(app) {
  app.get("/", { preHandler: requireAuth }, listTracks);
  app.post("/", { preHandler: requireAuth }, createTrack);
  app.post("/scrape", { preHandler: requireAuth }, scrapeTracks);
}

