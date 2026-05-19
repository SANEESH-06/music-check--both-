import dotenv from "dotenv";

dotenv.config();

export const env = {
  port: process.env.PORT || 5000,
  host: process.env.HOST || "127.0.0.1",
  nodeEnv: process.env.NODE_ENV || "development",
  clientUrl: process.env.CLIENT_URL || "http://localhost:3000",
  jwtSecret: process.env.JWT_SECRET || "dev-secret-change-me",
  mongoUri: process.env.MONGO_URI || "mongodb://127.0.0.1:27017/sounddeck",
  useMemoryDb: process.env.USE_MEMORY_DB !== "false"
};
