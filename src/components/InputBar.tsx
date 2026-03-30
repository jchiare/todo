"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";

export function InputBar({
  selectedItemId,
  selectedItemStatus,
  onItemCreated,
}: {
  selectedItemId: Id<"items"> | null;
  selectedItemStatus: string | null;
  onItemCreated: (id: Id<"items">) => void;
}) {
  const [input, setInput] = useState("");
  const createItem = useMutation(api.items.create);
  const sendMessage = useMutation(api.messages.send);

  const isClarifying =
    selectedItemId && selectedItemStatus === "clarifying";
  const isDisabled =
    selectedItemId &&
    selectedItemStatus !== "clarifying";

  const placeholder = isClarifying
    ? "Reply..."
    : selectedItemId
      ? ""
      : "What do you want to get done?";

  const handleSubmit = async () => {
    const text = input.trim();
    if (!text) return;
    setInput("");

    if (isClarifying && selectedItemId) {
      await sendMessage({ itemId: selectedItemId, content: text });
    } else if (!selectedItemId) {
      const id = await createItem({ rawInput: text });
      onItemCreated(id);
    }
  };

  if (isDisabled) return null;

  return (
    <div className="px-4 pb-4 pt-2">
      <div className="relative max-w-2xl mx-auto">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSubmit();
            }
          }}
          placeholder={placeholder}
          className="w-full px-5 py-3.5 rounded-2xl bg-white/80 backdrop-blur-sm
            text-stone-600 text-[15px] placeholder:text-stone-400
            shadow-sm focus:shadow-md
            outline-none focus:ring-2 focus:ring-sage-200
            transition-all duration-200"
        />
        {input.trim() && (
          <button
            onClick={handleSubmit}
            className="absolute right-3 top-1/2 -translate-y-1/2
              w-8 h-8 rounded-full bg-sage-400 text-white
              flex items-center justify-center
              hover:bg-sage-600 transition-colors cursor-pointer"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path
                d="M3 8h10M9 4l4 4-4 4"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}
