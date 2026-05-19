import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import { env } from "./env.js";

let memoryServer;

export async function connectDb() {
  mongoose.set("strictQuery", true);

  try {
    await mongoose.connect(env.mongoUri, {
      serverSelectionTimeoutMS: 5000
    });

    console.log("MongoDB connected");
  } catch (error) {
    if (!env.useMemoryDb) {
      throw error;
    }

    console.warn("MongoDB not available, starting in-memory MongoDB for development.");
    memoryServer = await MongoMemoryServer.create();
    await mongoose.connect(memoryServer.getUri());
    console.log("In-memory MongoDB connected");
  }
}

export async function disconnectDb() {
  await mongoose.disconnect();

  if (memoryServer) {
    await memoryServer.stop();
  }
}
