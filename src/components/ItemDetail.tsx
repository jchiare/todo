"use client";

import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { TaskList } from "./TaskList";
import { ChatThread } from "./ChatThread";
import { ProgressBar } from "./ProgressBar";
import { NoticeCard } from "./NoticeCard";
import { Id } from "../../convex/_generated/dataModel";

export function ItemDetail({
  itemId,
  onClose,
}: {
  itemId: Id<"items">;
  onClose: () => void;
}) {
  const item = useQuery(api.items.get, { id: itemId });
  const tasks = useQuery(api.tasks.listByItem, { itemId });

  if (!item) return null;

  const topLevel = tasks?.filter((t) => !t.parentTaskId) || [];
  const completed = topLevel.filter((t) => t.completed).length;
  const progress = topLevel.length > 0 ? completed / topLevel.length : 0;
  const isThinking = item.status === "clarifying" || item.status === "planning";
  const hasActiveTasks = item.status === "active" || item.status === "done";

  return (
    <div className="flex flex-col h-full">
      {/* Header — just title and progress, no duplication */}
      <div className="px-6 pt-6 pb-4 flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <h2 className="text-lg font-medium text-stone-800 leading-snug">
            {item.title}
          </h2>
          {topLevel.length > 0 && (
            <div className="mt-3">
              <ProgressBar progress={progress} />
              <p className="text-xs text-stone-400 mt-1.5">
                {completed} of {topLevel.length} done
              </p>
            </div>
          )}
        </div>
        <button
          onClick={onClose}
          className="text-stone-400 hover:text-stone-600 transition-colors p-1 cursor-pointer"
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path
              d="M15 5L5 15M5 5l10 10"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </svg>
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-6 pb-4 space-y-5">
        {isThinking && item.status === "planning" && (
          <div className="flex items-center gap-2 text-stone-400 text-sm py-4">
            <span className="inline-block w-2 h-2 rounded-full bg-sage-400 animate-pulse" />
            Breaking this down into steps...
          </div>
        )}

        {hasActiveTasks && <TaskList itemId={itemId} />}

        {item.notices && item.notices.length > 0 && hasActiveTasks && (
          <NoticeCard notices={item.notices} />
        )}

        <ChatThread itemId={itemId} />
      </div>
    </div>
  );
}
