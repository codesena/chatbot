import express from "express";
import { handleAIMessage } from "../controllers/aiController.js";
import { getOrderStatus } from "../controllers/orderController.js";
import { cancelOrder } from "../controllers/cancelController.js";
import { loginUser, registerUser } from "../controllers/authControllers.js";

const allRoutes = express.Router();

allRoutes.post("/handleAIMessage", handleAIMessage);
allRoutes.post("/cancel", cancelOrder);
allRoutes.get("/:order_id", getOrderStatus);
allRoutes.post("/signup", registerUser);
allRoutes.post("/signin", loginUser);

export default allRoutes;
