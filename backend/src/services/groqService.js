import dotenv from "dotenv";
import OpenAI from "openai";
dotenv.config();

const openai = new OpenAI({
  apiKey: process.env.GROQ_API_KEY,
  baseURL: "https://api.groq.com/openai/v1",
});

export const getCommandFromAI = async (userMessage) => {
  const res = await openai.chat.completions.create({
    model: "llama3-70b-8192",
    messages: [
      {
        role: "system",
        content: `
  Extract one of:
  { "command": "getOrderStatus", "order_id": "..." }
  { "command": "cancelOrder", "order_id": "...", "reason": "..." }
  { "command": "cancelOrder", "order_id": "..." }
  { "command": "listOrders" }
  { "command": "requestCancellation" }
  { "command": "confirmCancellation", "confirm": "yes" }
  { "command": "unknown" }
  
  If user says: "I want to return it 6853...", return:
  { "command": "cancelOrder", "order_id": "6853..." }
  If user says something like: "show my orders", "list my orders", "my orders", "what have I ordered", "all orders", return:
  { "command": "listOrders" }
  If user says something like: "I need help cancelling an order", return:
  { "command": "requestCancellation" }
  If user says something like: "Yes", "Yes please", etc., after being asked for confirmation, return:
  { "command": "confirmCancellation", "confirm": "yes" }
  If user says: "track order", "check order status", followed by an ID like 6853..., return:
  { "command": "getOrderStatus", "order_id": "6853..." }
  If user says: "cancel my order 6853...", return:
  { "command": "cancelOrder", "order_id": "6853..." }
  If user says: "cancel one of my orders" or "cancel an order I placed", return:
  { "command": "requestCancellation" }
  If user says something vague like "I need help" or "what can you do", return:
  { "command": "greet" }
  If no clear match, return:
  { "command": "unknown" }
  
  Return only the JSON.`,
      },
      { role: "user", content: userMessage },
    ],
  });

  return res.choices[0].message.content.trim();
};

export const getFriendlyReply = async (prompt) => {
  const res = await openai.chat.completions.create({
    model: "llama3-70b-8192",
    messages: [{ role: "user", content: prompt }],
  });

  return res.choices[0].message.content;
};
