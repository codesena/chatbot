import mongoose from "mongoose";
import { Order, ReturnRequest } from "../models/schema.js";

export const cancelOrder = async (req, res) => {
  const { order_id, reason } = req.body;

  if (!mongoose.Types.ObjectId.isValid(order_id)) {
    return res.status(400).json({ error: "Invalid order ID." });
  }

  try {
    const order = await Order.findById(order_id);
    if (!order) {
      return res.status(404).json({ error: "Order not found." });
    }

    const returnRequest = await ReturnRequest.create({
      order_id: order._id,
      reason,
    });

    res.json({
      return_id: returnRequest._id,
      instructions: returnRequest.instructions,
    });
  } catch (error) {
    res.status(500).json({ error: "Server error." });
  }
};
