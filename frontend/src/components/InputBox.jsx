export default function InputBox({ value, setValue, onSend }) {
  return (
    <div className="flex items-center gap-2 p-4 border-t">
      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && onSend()}
        className="flex-grow p-2 border rounded-xl outline-none"
        placeholder="Ask about your order..."
      />
      <button
        onClick={onSend}
        className="bg-blue-500 text-white px-4 py-2 rounded-xl"
      >
        Send
      </button>
    </div>
  );
}
