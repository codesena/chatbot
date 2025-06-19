import express from "express";
import { getOrderStatus } from "../controllers/orderController.js";

const router = express.Router();

router.get("/:order_id", getOrderStatus);

export default router;
