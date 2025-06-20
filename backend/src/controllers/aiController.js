import { handleMessageLogic } from "../services/orderService.js";

export const handleAIMessage = async (req, res) => {
  const { message, userId } = req.body;
  const response = await handleMessageLogic(message, userId);
  res.status(response.status || 200).json({ reply: response.reply });
};
