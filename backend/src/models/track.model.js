import mongoose from "mongoose";

const trackSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      index: true
    },
    artist: {
      type: String,
      required: true,
      trim: true,
      index: true
    },
    album: {
      type: String,
      required: true,
      trim: true
    },
    duration: {
      type: String,
      required: true
    },
    mood: {
      type: String,
      required: true
    },
    color: {
      type: String,
      required: true
    },
    audioUrl: {
      type: String,
      required: true
    },
    plays: {
      type: Number,
      default: 0
    }
  },
  {
    timestamps: true
  }
);

trackSchema.index({ title: "text", artist: "text", album: "text", mood: "text" });

export const Track = mongoose.model("Track", trackSchema);

