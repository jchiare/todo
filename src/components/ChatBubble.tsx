"use client";

export function ChatBubble({
  role,
  content,
}: {
  role: "user" | "assistant";
  content: string;
}) {
  const isUser = role === "user";

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[85%] px-4 py-2.5 rounded-2xl text-[14px] leading-relaxed
          ${isUser ? "bg-warm text-stone-600" : "bg-sage-100 text-stone-600"}
          ${isUser ? "rounded-br-md" : "rounded-bl-md"}`}
      >
        {content}
      </div>
    </div>
  );
}
