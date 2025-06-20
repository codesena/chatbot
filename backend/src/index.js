import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import allRoutes from "./routes/allRoutes.js";
import { connectDB } from "./db.js";

dotenv.config();

const app = express();
app.use(cors());
app.use(
  cors({
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);
connectDB();
app.use(express.json());
app.use("/", allRoutes);

const PORT = 5000;
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
