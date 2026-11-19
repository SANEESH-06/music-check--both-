import mongoose from "mongoose";
import { Track } from "../models/track.model.js";

function isAdminUser(user) {
  return String(user?.email).toLowerCase() === "admin@example.com";
}

function normalizeTrackValue(value) {
  return String(value ?? "").trim();
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export async function listTracks(req, reply) {
  const search = req.query?.search?.trim();
  const filter = search
    ? { $text: { $search: search } }
    : {};

  const tracks = await Track.find(filter)
    .select("title artist album duration mood color audioUrl plays coverUrl")
    .sort({ createdAt: 1 })
    .lean();

  return reply.send({
    tracks
  });
}

export async function createTrack(req, reply) {
  const user = req.user;
  const isAdmin = isAdminUser(user);

  if (!isAdmin) {
    return reply.code(403).send({
      message: "Admin upload access is required."
    });
  }

  const title = normalizeTrackValue(req.body?.title);
  const artist = normalizeTrackValue(req.body?.artist);
  const album = normalizeTrackValue(req.body?.album);
  const duration = normalizeTrackValue(req.body?.duration);
  const mood = normalizeTrackValue(req.body?.mood);
  const color = normalizeTrackValue(req.body?.color);
  const audioUrl = normalizeTrackValue(req.body?.audioUrl);
  const coverUrl = normalizeTrackValue(req.body?.coverUrl);

  if (!title || !artist || !album || !duration || !mood || !color || !audioUrl) {
    return reply.code(400).send({
      message: "Please complete all required song fields."
    });
  }

  const duplicate = await Track.findOne({
    $or: [
      {
        title: new RegExp(`^${escapeRegExp(title)}$`, "i"),
        artist: new RegExp(`^${escapeRegExp(artist)}$`, "i")
      },
      { audioUrl }
    ]
  }).select("_id title artist");

  if (duplicate) {
    return reply.code(409).send({
      message: `Duplicate song blocked: "${duplicate.title}" by ${duplicate.artist} already exists.`
    });
  }

  const track = await Track.create({
    title,
    artist,
    album,
    duration,
    mood,
    color,
    audioUrl,
    coverUrl
  });

  return reply.code(201).send({
    track
  });
}

export async function deleteTrack(req, reply) {
  const user = req.user;
  const isAdmin = isAdminUser(user);

  if (!isAdmin) {
    return reply.code(403).send({
      message: "Admin delete access is required."
    });
  }

  const { id } = req.params ?? {};

  if (!mongoose.isValidObjectId(id)) {
    return reply.code(400).send({
      message: "Invalid song id."
    });
  }

  const track = await Track.findByIdAndDelete(id).lean();

  if (!track) {
    return reply.code(404).send({
      message: "Song not found."
    });
  }

  return reply.send({
    message: `Deleted "${track.title}" from your app.`,
    track
  });
}

export async function deleteAllTracks(req, reply) {
  const user = req.user;
  const isAdmin = isAdminUser(user);

  if (!isAdmin) {
    return reply.code(403).send({
      message: "Admin delete access is required."
    });
  }

  if (req.body?.confirm !== "DELETE_ALL_TRACKS") {
    return reply.code(400).send({
      message: "Delete-all confirmation is required."
    });
  }

  const result = await Track.deleteMany({});

  return reply.send({
    message: `Deleted ${result.deletedCount} song${result.deletedCount === 1 ? "" : "s"} from your app.`,
    deletedCount: result.deletedCount
  });
}

export async function incrementPlays(req, reply) {
  const { id } = req.params ?? {};

  if (!mongoose.isValidObjectId(id)) {
    return reply.code(400).send({ message: "Invalid song id." });
  }

  const track = await Track.findByIdAndUpdate(
    id,
    { $inc: { plays: 1 } },
    { new: true }
  ).select("plays").lean();

  if (!track) {
    return reply.code(404).send({ message: "Song not found." });
  }

  return reply.send({ plays: track.plays });
}

export async function getRecommendations(req, reply) {
  const { mood, artist, limit = 6 } = req.query ?? {};

  const conditions = [];

  if (mood) {
    conditions.push({ mood: new RegExp(escapeRegExp(mood.trim()), "i") });
  }

  if (artist) {
    conditions.push({ artist: new RegExp(escapeRegExp(artist.trim()), "i") });
  }

  let tracks = [];

  if (conditions.length > 0) {
    // Fetch mood + artist matches, exclude exact artist if we have mood results
    tracks = await Track.find({ $or: conditions })
      .select("title artist album duration mood color audioUrl plays coverUrl")
      .sort({ plays: -1 })
      .limit(Number(limit) * 3)
      .lean();
  }

  // If not enough results, pad with popular tracks
  if (tracks.length < Number(limit)) {
    const existingIds = tracks.map((t) => t._id.toString());
    const popular = await Track.find({ _id: { $nin: existingIds } })
      .select("title artist album duration mood color audioUrl plays coverUrl")
      .sort({ plays: -1 })
      .limit(Number(limit) - tracks.length)
      .lean();
    tracks = [...tracks, ...popular];
  }

  // Shuffle for variety, then trim to limit
  tracks = tracks
    .map((t) => ({ t, sort: Math.random() }))
    .sort((a, b) => a.sort - b.sort)
    .map(({ t }) => t)
    .slice(0, Number(limit));

  return reply.send({ tracks });
}

export async function scrapeTracks(req, reply) {
  const user = req.user;
  const isAdmin = isAdminUser(user);

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

