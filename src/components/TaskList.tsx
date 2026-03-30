"use client";

import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { TaskRow } from "./TaskRow";
import { Id } from "../../convex/_generated/dataModel";

export function TaskList({ itemId }: { itemId: Id<"items"> }) {
  const tasks = useQuery(api.tasks.listByItem, { itemId });

  if (!tasks || tasks.length === 0) return null;

  const parents = tasks.filter((t) => !t.parentTaskId);
  const subtasksByParent = new Map<string, typeof tasks>();
  for (const t of tasks) {
    if (t.parentTaskId) {
      const existing = subtasksByParent.get(t.parentTaskId) || [];
      existing.push(t);
      subtasksByParent.set(t.parentTaskId, existing);
    }
  }

  // Assign footnote numbers only to tasks that have detail
  let footnoteCounter = 0;
  const footnotes = new Map<string, number>();
  for (const task of parents) {
    if (task.detail && task.detail.trim() !== "") {
      footnoteCounter++;
      footnotes.set(task._id, footnoteCounter);
    }
  }

  // Auto-expand a task if:
  // - it has a running agent
  // - its agent is done but not all subtasks are checked off
  // - it's the first incomplete task (and no agent tasks match above)
  const expandedIds = new Set<string>();
  for (const task of parents) {
    const subs = subtasksByParent.get(task._id) || [];
    if (task.agentStatus === "running") {
      expandedIds.add(task._id);
    } else if (task.agentStatus === "done" && subs.some((s) => !s.completed)) {
      expandedIds.add(task._id);
    }
  }
  // If nothing matched, expand the first incomplete task
  if (expandedIds.size === 0) {
    const firstIncomplete = parents.find((t) => !t.completed);
    if (firstIncomplete) expandedIds.add(firstIncomplete._id);
  }

  return (
    <div className="space-y-1">
      {parents.map((task) => (
        <TaskRow
          key={task._id}
          task={task}
          subtasks={subtasksByParent.get(task._id) || []}
          footnote={footnotes.get(task._id)}
          defaultExpanded={expandedIds.has(task._id)}
        />
      ))}
    </div>
  );
}
