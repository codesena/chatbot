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

User intent mapping rules:

- If the user says: 
  "track order", "check status", "check my order", "where is my order", "order update", followed by an order ID like 6853..., then return:
  { "command": "getOrderStatus", "order_id": "6853..." }

- If the user says: 
  "cancel my order 6853...", "return order 6853...", "initiate return for 6853...", then return:
  { "command": "cancelOrder", "order_id": "6853..." }

- If the user says:
  "cancel my order 6853... because it's damaged", "cancel 6853..., it was a mistake", etc., then return:
  { "command": "cancelOrder", "order_id": "6853...", "reason": "..." }

- If the user says:
  "I want to return an item", "how to cancel my order", "can you cancel for me", "I changed my mind", then return:
  { "command": "requestCancellation" }

- If the user says:
  "show my orders", "list my orders", "what did I buy", "my past orders", "see my orders", "orders I placed"," all my order details","all orders", then return:
  { "command": "listOrders" }

- If the user says:
  "Yes", "yes please", "go ahead", "confirm it", "do it", "proceed", "confirm cancellation", after being asked to confirm, return:
  { "command": "confirmCancellation", "confirm": "yes" }

- If the user says:
  "Hello", "Hi", "Hey", "Greetings", "Howdy", return:
  { "command": "greet" }

- If the user says:
  "I need help", "what can you do", "options?", "assist me", "help", return:
  { "command": "greet" }

- If the input doesn't match anything clearly, return:
  { "command": "unknown" }

Return only the JSON.
`,
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
