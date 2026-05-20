import mongoose from "mongoose";

const MONGO_URI = "mongodb://127.0.0.1:27017/echowave";

const trackSchema = new mongoose.Schema({}, { strict: false });
const Track = mongoose.models.Track || mongoose.model("Track", trackSchema);

async function check() {
  await mongoose.connect(MONGO_URI);
  console.log("Connected to DB");
  const tracks = await Track.find({});
  console.log("Total tracks:", tracks.length);
  tracks.forEach((t) => {
    console.log(`- ${t.title} by ${t.artist} (Cover: ${t.coverUrl})`);
  });
  await mongoose.disconnect();
}

check().catch(console.error);
