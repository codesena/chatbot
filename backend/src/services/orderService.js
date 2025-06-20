import mongoose from "mongoose";
import { Order, ReturnRequest, User } from "../models/schema.js";
import { getCommandFromAI, getFriendlyReply } from "./groqService.js";
import { extractJSONCommand } from "../utils/extractCommand.js";
import {
  activeOrderMap,
  pendingReasonMap,
  resetContext,
} from "./contextService.js";

const greetings = ["hi", "hello", "hey", "yo", "greetings"];

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

  if (waitingOrderId) {
    if (!message.trim()) {
      return { reply: "Please provide a valid reason for cancellation." };
    }

    const order = await Order.findById(waitingOrderId);
    if (!order || order.userId.toString() !== userId) {
      pendingReasonMap.delete("awaiting_reason");
      return { reply: "Order ID not found or doesn't belong to you." };
    }

    const existing = await ReturnRequest.findOne({ order_id: order._id });
    if (existing) {
      pendingReasonMap.delete("awaiting_reason");
      return {
        reply: `A return request already exists.\n\nReturn ID: ${existing._id}\nInstructions: ${existing.instructions}`,
      };
    }

    const user = await User.findById(userId);
    const newReturn = await ReturnRequest.create({
      order_id: order._id,
      reason: message,
    });

    pendingReasonMap.delete("awaiting_reason");

    const prompt = `Cancelled Order ID: ${order._id} for: ${message}.
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

  if (command.command === "listOrders") {
    const orders = await Order.find({ userId });
    if (!orders.length) return { reply: "You have no orders yet." };

    const returns = await ReturnRequest.find({});
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

  if (
    command.command === "unknown" &&
    mongoose.Types.ObjectId.isValid(message.trim())
  ) {
    activeOrderMap.set("active", message.trim());
    return {
      reply: `Order ID ${message.trim()} selected. You can now ask to cancel or track it.`,
    };
  }

  if (command.command === "getOrderStatus") {
    if (!mongoose.Types.ObjectId.isValid(command.order_id))
      return { reply: "Invalid order ID." };

    const order = await Order.findById(command.order_id);
    if (!order || order.userId.toString() !== userId)
      return { reply: "Order not found or doesn't belong to you." };

    const existing = await ReturnRequest.findOne({ order_id: order._id });
    if (existing) {
      return {
        reply: `A return request exists for this order.\n\nReturn ID: ${existing._id}\nInstructions: ${existing.instructions}`,
      };
    }

    const user = await User.findById(order.userId);
    const prompt = `Order ID: ${order._id}
Status: ${order.status}
ETA: ${order.eta}
Items: ${order.items.join(", ")}
Customer: ${user?.name || "the customer"}
Write a friendly message.`;

    const reply = await getFriendlyReply(prompt);
    return { reply };
  }

  if (command.command === "cancelOrder") {
    let { order_id, reason } = command;
    if (!order_id) order_id = activeOrderMap.get("active");

    if (!mongoose.Types.ObjectId.isValid(order_id))
      return { reply: "Invalid or missing order ID." };

    const order = await Order.findById(order_id);
    if (!order || order.userId.toString() !== userId)
      return { reply: "Order not found or doesn't belong to you." };

    const existing = await ReturnRequest.findOne({ order_id: order._id });
    if (existing) {
      return {
        reply: `A return request already exists.\n\nReturn ID: ${existing._id}\nInstructions: ${existing.instructions}`,
      };
    }

    if (!reason) {
      pendingReasonMap.set("awaiting_reason", order_id);
      return { reply: "Please provide a reason for cancelling your order." };
    }

    const user = await User.findById(order.userId);
    const newReturn = await ReturnRequest.create({
      order_id: order._id,
      reason,
    });

    const prompt = `Cancelled Order ID: ${order._id} for: ${reason}.
User: ${user?.name || "the customer"}
Return ID: ${newReturn._id}
Instructions: ${newReturn.instructions}
Write a friendly message.`;

    const reply = await getFriendlyReply(prompt);
    return { reply };
  }

  return { reply: "I can assist with tracking or cancelling orders." };
};
