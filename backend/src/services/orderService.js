import mongoose from "mongoose";
import { Order, ReturnRequest, User } from "../models/schema.js";
import { getCommandFromAI, getFriendlyReply } from "./groqService.js";
import { extractJSONCommand } from "../utils/extractCommand.js";
import {
  activeOrderMap,
  pendingReasonMap,
  confirmationMap,
  resetContext,
} from "./contextService.js";

const greetings = ["hi", "hello", "hey", "yo", "greetings"];
const declineWords = ["no", "nah", "nahi", "not", "cancel", "stop"];

export const handleMessageLogic = async (message, userId) => {
  const normalized = message.trim().toLowerCase();
  if (greetings.includes(normalized)) {
    const user = await User.findById(userId);
    return {
      reply: `Hello ${user?.name || "there"}, how can I help you today?`,
    };
  }

  if (normalized === "clear order") {
    resetContext();
    return { reply: "Active order context cleared." };
  }

  const waitingOrderId = pendingReasonMap.get("awaiting_reason");
  const confirmingOrderId = confirmationMap.get("awaiting_confirmation");
  const activeOrderId = activeOrderMap.get(userId);

  if (waitingOrderId) {
    if (
      !message.trim() ||
      message.toLowerCase().includes("help") ||
      message.toLowerCase().includes("cancel")
    ) {
      return {
        reply:
          "Please provide a more specific reason for cancelling your order.",
      };
    }

    confirmationMap.set("awaiting_confirmation", waitingOrderId);
    pendingReasonMap.delete("awaiting_reason");
    return {
      reply: `You want to cancel order ${waitingOrderId} for: "${message}". Please type 'Yes' to confirm or 'No' to abort.`,
    };
  }

  if (confirmingOrderId) {
    if (declineWords.includes(normalized)) {
      confirmationMap.delete("awaiting_confirmation");
      return {
        reply:
          "Okay, cancellation aborted. Let me know if you need help with anything else.",
      };
    }

    const order = await Order.findById(confirmingOrderId);
    if (!order || order.userId.toString() !== userId) {
      confirmationMap.delete("awaiting_confirmation");
      return { reply: "Order not found or doesn't belong to you." };
    }

    const reason = "Confirmed cancellation by user.";
    const existing = await ReturnRequest.findOne({ order_id: order._id });

    if (existing) {
      confirmationMap.delete("awaiting_confirmation");
      return {
        reply: `A return request already exists.\n\nReturn ID: ${existing._id}\nInstructions: ${existing.instructions}`,
      };
    }

    const user = await User.findById(order.userId);
    const newReturn = await ReturnRequest.create({
      order_id: order._id,
      reason,
    });

    confirmationMap.delete("awaiting_confirmation");

    const prompt = `Cancelled Order ID: ${order._id} for: ${reason}.
User: ${user?.name || "the customer"}
Return ID: ${newReturn._id}
Instructions: ${newReturn.instructions}
Write a friendly message.`;

    const reply = await getFriendlyReply(prompt);
    return { reply };
  }

  const rawCommand = await getCommandFromAI(message);
  const command = extractJSONCommand(rawCommand);

  if (!command) return { reply: "Sorry, I couldn’t understand your request." };

  if (command.command === "greet") {
    const user = await User.findById(userId);
    return {
      reply: `Hello ${user?.name || "there"}, how can I help you today?`,
    };
  }

  if (command.command === "listOrders") {
    const orders = await Order.find({ userId });
    if (!orders.length) return { reply: "You have no orders yet." };

    const returns = await ReturnRequest.find({
      order_id: { $in: orders.map((o) => o._id) },
    });
    const returnMap = new Map();
    returns.forEach((r) => returnMap.set(r.order_id.toString(), r));

    const lines = orders.map((o) => {
      const returned = returnMap.get(o._id.toString());
      return returned
        ? `• ${o._id} — CANCELLED (Return ID: ${returned._id})`
        : `• ${o._id} — ${o.status} (${o.items.length} items, ETA: ${o.eta})`;
    });

    return {
      reply: `Here are your orders:\n\n${lines.join("\n")}`,
    };
  }

  return {
    reply: `Hello! I can assist with tracking or cancelling orders.`,
  };
};
