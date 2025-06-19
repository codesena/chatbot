import { Order } from "../models/schema.js";

export const getOrderStatus = async (req, res) => {
  const { order_id } = req.params;

  try {
    const order = await Order.findById(order_id); // uses MongoDB _id

    if (!order) {
      return res.status(404).json({ error: "Order not found." });
    }

    res.json({
      status: order.status,
      eta: order.eta,
      items: order.items,
    });
  } catch (err) {
    console.error("❌ Error fetching order:", err.message);
    res.status(500).json({ error: "Server error." });
  }
};
