import mongoose from "mongoose";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { User } from "./models/schema.js";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const filePath = path.join(__dirname, "../users.json");

try {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("MongoDB connected");

  const raw = fs.readFileSync(filePath);
  const users = JSON.parse(raw);

  const inserted = await User.insertMany(users);

  console.log(`${inserted.length} users inserted`);
  process.exit();
} catch (err) {
  console.error(" Error inserting users:", err);
  process.exit(1);
}
