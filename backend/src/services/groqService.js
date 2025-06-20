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
  { "command": "unknown" }
  
  If user says: "I want to return it 6853...", return:
  { "command": "cancelOrder", "order_id": "6853..." }
  If user says: "show my orders", "list my orders", return:
  { "command": "listOrders" }
  
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
