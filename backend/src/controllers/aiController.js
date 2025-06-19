import OpenAI from "openai";
import dotenv from "dotenv";
import mongoose from "mongoose";
import { Order, ReturnRequest, User } from "../models/schema.js";

dotenv.config();

const openai = new OpenAI({
  apiKey: process.env.GROQ_API_KEY,
  baseURL: "https://api.groq.com/openai/v1",
});

const pendingReasonMap = new Map();
const activeOrderMap = new Map();

export const handleAIMessage = async (req, res) => {
  const { message } = req.body;

  try {
    if (message.trim().toLowerCase() === "clear order") {
      activeOrderMap.delete("active");
      pendingReasonMap.delete("awaiting_reason");
      return res.json({ reply: "Active order context cleared." });
    }

    const previousOrderId = pendingReasonMap.get("awaiting_reason");

    if (previousOrderId) {
      if (!message.trim()) {
        return res.json({
          reply: "Please provide a valid reason for cancellation.",
        });
      }

      const order = await Order.findById(previousOrderId);
      if (!order) {
        pendingReasonMap.delete("awaiting_reason");
        return res.json({ reply: "Order ID not found." });
      }

      const user = await User.findById(order.userId);

      const existingReturn = await ReturnRequest.findOne({
        order_id: order._id,
      });
      if (existingReturn) {
        pendingReasonMap.delete("awaiting_reason");
        return res.json({
          reply: `A return request already exists.\n\nReturn ID: ${existingReturn._id}\nInstructions: ${existingReturn.instructions}`,
        });
      }

      const returnRequest = await ReturnRequest.create({
        order_id: order._id,
        reason: message,
      });

      pendingReasonMap.delete("awaiting_reason");

      const prompt = `Cancelled Order ID: ${order._id} for: ${message}.
User: ${user?.name || "the customer"}
Return ID: ${returnRequest._id}
Instructions: ${returnRequest.instructions}
Write a friendly message.`;

      const response = await openai.chat.completions.create({
        model: "llama3-70b-8192",
        messages: [{ role: "user", content: prompt }],
      });

      return res.json({ reply: response.choices[0].message.content });
    }

    const commandResponse = await openai.chat.completions.create({
      model: "llama3-70b-8192",
      messages: [
        {
          role: "system",
          content: `
Extract one of:
{ "command": "getOrderStatus", "order_id": "..." }
{ "command": "cancelOrder", "order_id": "...", "reason": "..." }
{ "command": "cancelOrder", "order_id": "..." }
{ "command": "unknown" }

If the user says something like "I want to return it 6853d2b1d6137151fcca9e57", return:
{ "command": "cancelOrder", "order_id": "6853d2b1d6137151fcca9e57" }

Return only the JSON.`,
        },
        { role: "user", content: message },
      ],
    });

    const raw = commandResponse.choices[0].message.content.trim();
    const jsonMatch = raw.match(/\{[\s\S]*?\}/);
    if (!jsonMatch)
      return res.json({ reply: "Sorry, I couldn’t understand your request." });

    let command;
    try {
      command = JSON.parse(jsonMatch[0]);
    } catch {
      return res.json({ reply: "Invalid command format." });
    }

    if (
      command.command === "unknown" &&
      mongoose.Types.ObjectId.isValid(message.trim())
    ) {
      activeOrderMap.set("active", message.trim());
      return res.json({
        reply: `Order ID ${message.trim()} selected. You can now ask to cancel or track it.`,
      });
    }

    let finalPrompt = "";

    if (command.command === "getOrderStatus") {
      if (!mongoose.Types.ObjectId.isValid(command.order_id)) {
        return res.json({ reply: "Invalid order ID." });
      }

      const order = await Order.findById(command.order_id);
      if (!order) return res.json({ reply: "Order not found." });

      const user = await User.findById(order.userId);

      finalPrompt = `Order ID: ${order._id}
Status: ${order.status}
ETA: ${order.eta}
Items: ${order.items.join(", ")}
Customer: ${user?.name || "the customer"}
Write a friendly message.`;
    } else if (command.command === "cancelOrder") {
      let { order_id, reason } = command;

      if (!order_id) {
        const active = activeOrderMap.get("active");
        if (active) order_id = active;
      }

      if (!mongoose.Types.ObjectId.isValid(order_id)) {
        return res.json({ reply: "Invalid or missing order ID." });
      }

      const order = await Order.findById(order_id);
      if (!order) return res.json({ reply: "Order ID not found." });

      const user = await User.findById(order.userId);

      const existingReturn = await ReturnRequest.findOne({
        order_id: order._id,
      });
      if (existingReturn) {
        return res.json({
          reply: `A return request already exists.\n\nReturn ID: ${existingReturn._id}\nInstructions: ${existingReturn.instructions}`,
        });
      }

      if (!reason) {
        pendingReasonMap.set("awaiting_reason", order_id);
        return res.json({
          reply: "Please provide a reason for cancelling your order.",
        });
      }

      const returnRequest = await ReturnRequest.create({
        order_id: order._id,
        reason,
      });

      finalPrompt = `Cancelled Order ID: ${order._id} for: ${reason}.
User: ${user?.name || "the customer"}
Return ID: ${returnRequest._id}
Instructions: ${returnRequest.instructions}
Write a friendly message.`;
    } else {
      return res.json({
        reply: "I can assist with tracking or cancelling orders.",
      });
    }

    const finalResponse = await openai.chat.completions.create({
      model: "llama3-70b-8192",
      messages: [{ role: "user", content: finalPrompt }],
    });

    res.json({ reply: finalResponse.choices[0].message.content });
  } catch (err) {
    res.status(500).json({ reply: "Internal error. Try again later." });
  }
};
