import { useState } from "react";
import MessageBubble from "./MessageBubble";
import InputBox from "./InputBox";

export default function ChatWindow() {
  const [messages, setMessages] = useState([
    { text: "Hi! I am here to help with your queries.", isUser: false },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const sendMessage = async () => {
    if (!input.trim() || loading) return;

    const userMessage = { text: input, isUser: true };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("https://chatbot-60i9.onrender.com/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: input }),
      });

      const data = await res.json();
      const botMessage = {
        text: data.reply || "No response received.",
        isUser: false,
      };

      setMessages((prev) => [...prev, botMessage]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          text: "Something went wrong. Please try again later.",
          isUser: false,
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-screen">
      <div className="flex-grow overflow-y-auto p-4 space-y-2 bg-gray-50">
        {messages.map((m, i) => (
          <MessageBubble key={i} text={m.text} isUser={m.isUser} />
        ))}
        {loading && <MessageBubble text="Typing..." isUser={false} />}
      </div>
      <InputBox
        value={input}
        setValue={setInput}
        onSend={sendMessage}
        disabled={loading}
      />
    </div>
  );
}
