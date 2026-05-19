import { Track } from "../models/track.model.js";

export async function listTracks(req, reply) {
  const search = req.query?.search?.trim();
  const filter = search
    ? { $text: { $search: search } }
    : {};

  const tracks = await Track.find(filter)
    .select("title artist album duration mood color audioUrl plays")
    .sort({ createdAt: 1 })
    .lean();

  return reply.send({
    tracks
  });
}

export async function createTrack(req, reply) {
  const user = req.user;
  const isAdmin = String(user?.email).toLowerCase() === "admin@example.com";

  if (!isAdmin) {
    return reply.code(403).send({
      message: "Admin upload access is required."
    });
  }

  const { title, artist, album, duration, mood, color, audioUrl } = req.body ?? {};

  if (!title || !artist || !album || !duration || !mood || !color || !audioUrl) {
    return reply.code(400).send({
      message: "All track fields are required."
    });
  }

  const track = await Track.create({
    title,
    artist,
    album,
    duration,
    mood,
    color,
    audioUrl
  });

  return reply.code(201).send({
    track
  });
}

export async function scrapeTracks(req, reply) {
  const user = req.user;
  const isAdmin = String(user?.email).toLowerCase() === "admin@example.com";

  if (!isAdmin) {
    return reply.code(403).send({
      message: "Admin access is required to trigger scraping."
    });
  }

  try {
    const response = await fetch("https://api.music-to-scrape.org/charts/top-tracks");
    if (!response.ok) {
      throw new Error(`Failed to fetch charts: ${response.status}`);
    }
    const data = await response.json();
    const scrapedTracks = data.chart || [];

    if (scrapedTracks.length === 0) {
      return reply.send({
        message: "No new tracks found to scrape.",
        insertedCount: 0
      });
    }

    const colors = [
      "#146c5f", "#d96b43", "#4b6cb7", "#7d5a50", "#8f3d56",
      "#1ed760", "#0ea5e9", "#f97316", "#d946ef", "#facc15",
      "#6d5dfc", "#4f46e5", "#0f766e", "#dc2626", "#ec4899", "#8b5cf6"
    ];

    const moods = [
      "Chillwave", "Dream Pop", "Synthwave", "Folk Fusion", "Electronic",
      "Ambient", "Lo-Fi Beats", "Indie Rock", "Future Pop", "Techno"
    ];

    let insertedCount = 0;
    const results = [];

    for (let i = 0; i < scrapedTracks.length; i++) {
      const scraped = scrapedTracks[i];
      const title = scraped.name || `Scraped Song ${i + 1}`;
      const artist = scraped.artist || "Scraped Artist";
      
      const existing = await Track.findOne({ title, artist });
      if (existing) {
        continue;
      }

      const songIndex = (i % 16) + 1;
      const trackData = {
        title,
        artist,
        album: scraped.album || "Charts Volume " + (Math.floor(i / 5) + 1),
        duration: scraped.duration || `${4 + (i % 3)}:${10 + (i * 7) % 50}`,
        mood: moods[i % moods.length],
        color: colors[i % colors.length],
        audioUrl: `https://www.soundhelix.com/examples/mp3/SoundHelix-Song-${songIndex}.mp3`,
        plays: scraped.plays || 0
      };

      const newTrack = await Track.create(trackData);
      results.push(newTrack);
      insertedCount++;
    }

    return reply.send({
      message: `Successfully scraped and imported ${insertedCount} tracks.`,
      insertedCount,
      tracks: results
    });

  } catch (err) {
    req.log.error(err);
    return reply.code(500).send({
      message: "Failed to scrape Spotify-like website: " + err.message
    });
  }
}

