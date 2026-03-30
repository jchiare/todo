"use client";

import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { ProgressBar } from "./ProgressBar";
import { Id } from "../../convex/_generated/dataModel";

type Item = {
  _id: Id<"items">;
  title: string;
  status: string;
  progress: number;
  taskCount: number;
  completedCount: number;
};

export function ItemCard({
  item,
  selected,
  onClick,
  onDeleted,
}: {
  item: Item;
  selected: boolean;
  onClick: () => void;
  onDeleted: () => void;
}) {
  const remove = useMutation(api.items.remove);
  const isDone = item.status === "done";
  const isThinking = item.status === "clarifying" || item.status === "planning";

  return (
    <div
      onClick={onClick}
      className={`w-full text-left px-5 py-4 rounded-2xl transition-all duration-200 cursor-pointer group relative
        ${selected ? "bg-warm shadow-sm" : "hover:bg-warm/60"}
        ${isDone ? "opacity-60" : ""}`}
    >
      {/* Delete button — shows on hover */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          remove({ id: item._id });
          onDeleted();
        }}
        className="absolute top-3 right-3 w-6 h-6 rounded-full flex items-center justify-center
          text-stone-400 opacity-0 group-hover:opacity-100 hover:bg-sage-100 hover:text-stone-600
          transition-all cursor-pointer"
      >
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <path
            d="M10.5 3.5L3.5 10.5M3.5 3.5l7 7"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>
      </button>

      <div className="flex items-center gap-3">
        {isDone && (
          <span className="text-sage-400 text-lg">&#10003;</span>
        )}
        <div className="flex-1 min-w-0">
          <p
            className={`text-stone-800 text-[15px] truncate ${
              isDone ? "line-through text-stone-400" : ""
            }`}
          >
            {item.title}
          </p>
          {isThinking && (
            <p className="text-xs text-stone-400 mt-1 flex items-center gap-1.5">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-sage-400 animate-pulse" />
              thinking...
            </p>
          )}
          {item.taskCount > 0 && !isThinking && (
            <p className="text-xs text-stone-400 mt-1">
              {item.completedCount}/{item.taskCount} done
            </p>
          )}
        </div>
      </div>
      {item.taskCount > 0 && (
        <ProgressBar progress={item.progress} className="mt-3" />
      )}
    </div>
  );
}
