import express from "express";
import { cancelOrder } from "../controllers/cancelController.js";

const router = express.Router();

router.post("/", cancelOrder);

export default router;
