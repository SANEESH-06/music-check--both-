import bcrypt from "bcryptjs";
import { tracks } from "./data/tracks.js";
import { Track } from "./models/track.model.js";
import { User } from "./models/user.model.js";

export async function seedDatabase() {
  const passwordHash = await bcrypt.hash("password123", 10);

  await User.updateOne(
    { email: "admin@example.com" },
    {
      $setOnInsert: {
        name: "Admin User",
        email: "admin@example.com",
        passwordHash,
        plan: "premium"
      }
    },
    { upsert: true }
  );

  // Clear existing tracks to avoid duplicate/stale sample tracks
  await Track.deleteMany({});

  await Promise.all(
    tracks.map((track) => {
      return Track.updateOne(
        { title: track.title, artist: track.artist },
        { $set: track },
        { upsert: true }
      );
    })
  );

  console.log("Seed data ready");
}
