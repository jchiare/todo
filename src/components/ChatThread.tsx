"use client";

import { useQuery } from "convex/react";
import { useEffect, useRef } from "react";
import { api } from "../../convex/_generated/api";
import { ChatBubble } from "./ChatBubble";
import { Id } from "../../convex/_generated/dataModel";

export function ChatThread({ itemId }: { itemId: Id<"items"> }) {
  const messages = useQuery(api.messages.listByItem, { itemId });
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages?.length]);

  if (!messages) return null;

  // Skip the first user message (it's the raw input, shown as the title)
  const visibleMessages = messages.slice(1);

  if (visibleMessages.length === 0) return null;

  return (
    <div className="space-y-3 px-1">
      {visibleMessages.map((msg) => (
        <ChatBubble key={msg._id} role={msg.role} content={msg.content} />
      ))}
      <div ref={bottomRef} />
    </div>
  );
}
