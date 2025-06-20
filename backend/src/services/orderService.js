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
import {
  declineWords,
  greetingReplies,
  greetings,
} from "../utils/templates.js";

export const handleMessageLogic = async (message, userId) => {
  const normalized = message.trim().toLowerCase();

  if (greetings.includes(normalized)) {
    const name = (await User.findById(userId))?.name || null;
    return {
      reply:
        greetingReplies[Math.floor(Math.random() * greetingReplies.length)](
          name
        ),
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
      !normalized ||
      normalized.includes("help") ||
      normalized.includes("cancel")
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

  if (!command) return { reply: "Sorry, I couldn't understand your request." };

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

  if (command.command === "getOrderStatus") {
    const orderDetails = await Order.findById({ _id: command.order_id });

    if (!orderDetails) {
      return { reply: "No order found with the given ID." };
    }

    const returnRequest = await ReturnRequest.findOne({
      order_id: command.order_id,
    });

    if (returnRequest) {
      return {
        reply: `Order ${command.order_id} has been CANCELLED.\n\nReturn ID: ${returnRequest._id}\nInstructions: ${returnRequest.instructions}`,
      };
    }

    const { _id, status, eta, items, createdAt } = orderDetails;

    const formattedItems = items
      .map((item, i) => `   ${i + 1}. ${item}`)
      .join("\n");

    return {
      reply: `Order Details:
        • Order ID: ${_id}
        • Status: ${status}
        • ETA: ${eta}
        • Items:\n${formattedItems}
        • Created On: ${new Date(createdAt).toLocaleDateString()}`,
    };
  }

  if (command.command === "cancelOrder") {
    let { order_id, reason } = command;

    if (!order_id && activeOrderId) {
      order_id = activeOrderId;
    }

    if (!order_id || !mongoose.Types.ObjectId.isValid(order_id)) {
      return { reply: "Please specify a valid order ID to cancel." };
    }

    const order = await Order.findById(order_id);
    if (!order || order.userId.toString() !== userId) {
      return { reply: "Order not found or doesn't belong to you." };
    }

    const existing = await ReturnRequest.findOne({ order_id: order._id });
    if (existing) {
      return {
        reply: `A return request already exists.\n\nReturn ID: ${existing._id}\nInstructions: ${existing.instructions}`,
      };
    }

    if (
      !reason ||
      reason.toLowerCase().includes("cancel") ||
      reason.toLowerCase().includes("help")
    ) {
      activeOrderMap.set(userId, order_id);
      pendingReasonMap.set("awaiting_reason", order_id);
      return {
        reply: "Please tell me the reason for cancelling your order.",
      };
    }

    confirmationMap.set("awaiting_confirmation", order_id);
    return {
      reply: `You want to cancel order ${order_id} for: "${reason}". Please type 'Yes' to confirm or 'No' to abort.`,
    };
  }

  if (command.command === "requestCancellation") {
    const orders = await Order.find({ userId });
    if (!orders.length) return { reply: "You have no orders to cancel." };

    const lines = orders.map(
      (o) => `• ${o._id} — ${o.status} (${o.items.length} items)`
    );

    return {
      reply: `Sure. Please provide the Order ID you want to cancel.\n\nHere are your orders:\n\n${lines.join(
        "\n"
      )}`,
    };
  }

  // if (command.command === "confirmCancellation") {
  //   const confirmingOrderId = confirmationMap.get("awaiting_confirmation");

  //   if (!confirmingOrderId) {
  //     return {
  //       reply: "There is no cancellation in progress to confirm.",
  //     };
  //   }

  //   const order = await Order.findById(confirmingOrderId);
  //   if (!order || order.userId.toString() !== userId) {
  //     confirmationMap.delete("awaiting_confirmation");
  //     return { reply: "Order not found or doesn't belong to you." };
  //   }

  //   const existing = await ReturnRequest.findOne({ order_id: order._id });
  //   if (existing) {
  //     confirmationMap.delete("awaiting_confirmation");
  //     return {
  //       reply: `A return request already exists.\n\nReturn ID: ${existing._id}\nInstructions: ${existing.instructions}`,
  //     };
  //   }

  //   const reason = "Confirmed cancellation by user.";
  //   const user = await User.findById(userId);

  //   const returnRequest = await ReturnRequest.create({
  //     order_id: order._id,
  //     reason,
  //   });

  //   confirmationMap.delete("awaiting_confirmation");

  //   const prompt = `Cancelled Order ID: ${order._id} for: ${reason}.
  // User: ${user?.name || "the customer"}
  // Return ID: ${returnRequest._id}
  // Instructions: ${returnRequest.instructions}
  // Write a friendly message.`;

  //   const reply = await getFriendlyReply(prompt);
  //   return { reply };
  // }

  return {
    reply: `Hello! I can assist with tracking or cancelling orders.\n
    Unable to understand kindly explain your issue.`,
  };
};
