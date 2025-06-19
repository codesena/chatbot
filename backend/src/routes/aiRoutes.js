import express from "express";
import { handleAIMessage } from "../controllers/aiController.js";

const router = express.Router();

router.post("/", handleAIMessage);

export default router;
