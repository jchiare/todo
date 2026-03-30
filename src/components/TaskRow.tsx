"use client";

import { useState, useRef } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";

type Task = {
  _id: Id<"tasks">;
  text: string;
  detail?: string;
  completed: boolean;
  parentTaskId?: Id<"tasks">;
  agentAction?: string;
  agentStatus?: "ready" | "running" | "done" | "error";
  agentError?: string;
  artifactStorageId?: Id<"_storage">;
  artifactName?: string;
  inputPrompt?: string;
  inputValue?: string;
};

function linkify(text: string) {
  const urlRegex = /(https?:\/\/[^\s)]+)/g;
  const parts = text.split(urlRegex);
  return parts.map((part, i) =>
    urlRegex.test(part) ? (
      <a
        key={i}
        href={part}
        target="_blank"
        rel="noopener noreferrer"
        className="text-sage-600 underline underline-offset-2 hover:text-sage-400 transition-colors"
        onClick={(e) => e.stopPropagation()}
      >
        {(() => {
          try {
            const url = new URL(part);
            return url.hostname.replace("www.", "");
          } catch {
            return part.length > 40 ? part.slice(0, 40) + "..." : part;
          }
        })()}
      </a>
    ) : (
      <span key={i}>{part}</span>
    )
  );
}

function DetailTooltip({
  detail,
  footnote,
}: {
  detail: string;
  footnote: number;
}) {
  const [show, setShow] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const ref = useRef<HTMLSpanElement>(null);
  const [openAbove, setOpenAbove] = useState(true);

  const handleEnter = () => {
    clearTimeout(timeoutRef.current);
    if (ref.current) {
      const rect = ref.current.getBoundingClientRect();
      setOpenAbove(rect.top > 200);
    }
    setShow(true);
  };

  const handleLeave = () => {
    timeoutRef.current = setTimeout(() => setShow(false), 150);
  };

  return (
    <span
      ref={ref}
      className="relative inline-block"
      onMouseEnter={handleEnter}
      onMouseLeave={handleLeave}
    >
      <sup className="text-[10px] text-sage-400 ml-0.5 cursor-help tabular-nums">
        {footnote}
      </sup>
      {show && (
        <span
          className={`absolute left-4 z-50 w-72
            rounded-xl bg-white shadow-lg px-4 py-3
            text-[13px] leading-relaxed text-stone-600
            ${openAbove ? "bottom-full mb-1.5" : "top-full mt-1.5"}`}
          onMouseEnter={handleEnter}
          onMouseLeave={handleLeave}
        >
          {linkify(detail)}
        </span>
      )}
    </span>
  );
}

function ArtifactDownload({ storageId, name }: { storageId: Id<"_storage">; name: string }) {
  const url = useQuery(api.agentQueries.getArtifactUrl, { storageId });
  if (!url) return null;

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1.5 mt-1.5 px-3 py-1.5 rounded-lg
        bg-sage-100 text-sage-600 text-[12px] font-medium
        hover:bg-sage-200 transition-colors cursor-pointer"
      onClick={(e) => e.stopPropagation()}
    >
      <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
        <path d="M2 10V2h3M7 2h3v3M6 6l4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
      {name}
    </a>
  );
}

function AgentBadge({ status, error }: { status: string; error?: string }) {
  if (status === "running") {
    return (
      <span className="inline-flex items-center gap-1.5 text-[11px] text-sage-400 ml-2 italic">
        <span className="w-1.5 h-1.5 rounded-full bg-sage-400 animate-pulse" />
        filling out form for you...
      </span>
    );
  }
  if (status === "done") {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] text-sage-600 ml-2">
        done — download below
      </span>
    );
  }
  if (status === "error") {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] text-red-400 ml-2" title={error}>
        couldn&apos;t complete — try manually
      </span>
    );
  }
  if (status === "ready") {
    return (
      <span className="inline-flex items-center gap-1.5 text-[11px] text-sage-400 ml-2 italic">
        <span className="w-1.5 h-1.5 rounded-full bg-stone-300" />
        queued
      </span>
    );
  }
  return null;
}

function InputSubtask({ task }: { task: Task }) {
  const [value, setValue] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const answerInput = useMutation(api.tasks.answerInput);

  // Already answered
  if (task.inputValue) {
    return (
      <div className="flex items-center gap-3 py-1.5 px-1">
        <svg width="16" height="16" viewBox="0 0 16 16" className="text-sage-400 flex-shrink-0">
          <circle cx="8" cy="8" r="7" fill="none" stroke="currentColor" strokeWidth="1.5"/>
          <path d="M5 8l2 2 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
        </svg>
        <div className="flex-1 min-w-0">
          <span className="text-[12px] text-stone-400">{task.text}</span>
          <span className="text-[13px] text-stone-600 ml-2">{task.inputValue}</span>
        </div>
      </div>
    );
  }

  const handleSubmit = async () => {
    if (!value.trim() || submitting) return;
    setSubmitting(true);
    await answerInput({ id: task._id, value: value.trim() });
    setSubmitting(false);
  };

  return (
    <div className="py-1.5 px-1">
      <label className="text-[12px] text-stone-500 mb-1 block">{task.text}</label>
      <div className="flex items-center gap-2">
        <input
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
          placeholder="Type here..."
          className="flex-1 text-[13px] px-3 py-1.5 rounded-lg border border-stone-200
            bg-white text-stone-700 placeholder:text-stone-300
            focus:outline-none focus:ring-1 focus:ring-sage-400 focus:border-sage-400
            transition-colors"
          disabled={submitting}
        />
        <button
          onClick={handleSubmit}
          disabled={!value.trim() || submitting}
          className="px-3 py-1.5 rounded-lg bg-sage-100 text-sage-600 text-[12px] font-medium
            hover:bg-sage-200 disabled:opacity-40 disabled:cursor-not-allowed
            transition-colors"
        >
          Save
        </button>
      </div>
    </div>
  );
}

export function TaskRow({
  task,
  subtasks,
  footnote,
  defaultExpanded = false,
}: {
  task: Task;
  subtasks: Task[];
  footnote?: number;
  defaultExpanded?: boolean;
}) {
  const toggleMutation = useMutation(api.tasks.toggle);
  const [expanded, setExpanded] = useState(defaultExpanded);
  const isParent = subtasks.length > 0;
  const hasDetail = task.detail && task.detail.trim() !== "" && !task.parentTaskId && footnote;
  const isAgent = !!task.agentAction;
  const isInput = !!task.inputPrompt;

  // Input subtasks render differently
  if (isInput) {
    return <InputSubtask task={task} />;
  }

  const doneCount = subtasks.filter((s) => s.completed).length;
  const totalCount = subtasks.length;

  const handleToggle = () => {
    if (isParent && !task.completed) {
      // About to check parent — save which subtasks are already completed
      const alreadyChecked = subtasks
        .filter((s) => s.completed)
        .map((s) => s._id);
      localStorage.setItem(
        `subtask-state:${task._id}`,
        JSON.stringify(alreadyChecked)
      );
      toggleMutation({ id: task._id });
    } else if (isParent && task.completed) {
      // Unchecking parent — restore subtasks to prior state
      const raw = localStorage.getItem(`subtask-state:${task._id}`);
      const preserveIds = raw ? JSON.parse(raw) : [];
      localStorage.removeItem(`subtask-state:${task._id}`);
      toggleMutation({ id: task._id, preserveSubtaskIds: preserveIds });
    } else {
      toggleMutation({ id: task._id });
    }
  };

  return (
    <div>
      <div className="flex items-start gap-2 py-2 px-1 rounded-lg hover:bg-warm/40 transition-colors">
        {/* Expand/collapse chevron — only for parent tasks */}
        {isParent ? (
          <button
            onClick={() => setExpanded(!expanded)}
            className="mt-0.5 w-5 h-5 flex items-center justify-center flex-shrink-0
              text-stone-300 hover:text-stone-500 cursor-pointer transition-colors"
            aria-label={expanded ? "Collapse subtasks" : "Expand subtasks"}
          >
            <svg
              width="12"
              height="12"
              viewBox="0 0 12 12"
              fill="none"
              className={`transition-transform duration-150 ${expanded ? "rotate-90" : ""}`}
            >
              <path d="M4.5 2.5l4 3.5-4 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        ) : (
          <span className="w-5 flex-shrink-0" />
        )}
        <input
          type="checkbox"
          checked={task.completed}
          onChange={handleToggle}
          className="mt-0.5 w-4 h-4 rounded cursor-pointer flex-shrink-0"
        />
        <div
          className="flex-1 min-w-0 cursor-pointer"
          onClick={handleToggle}
        >
          <span
            className={`text-[14px] leading-snug transition-colors ${
              task.completed
                ? "text-stone-400 line-through"
                : "text-stone-700"
            }`}
          >
            {task.text}
            {hasDetail && (
              <DetailTooltip detail={task.detail!} footnote={footnote} />
            )}
            {isAgent && task.agentStatus && (
              <AgentBadge status={task.agentStatus} error={task.agentError} />
            )}
          </span>

          {/* Collapsed subtask count */}
          {isParent && !expanded && (
            <span className="ml-2 text-[11px] text-stone-400 tabular-nums">
              {doneCount}/{totalCount}
            </span>
          )}

          {isAgent && task.agentStatus === "done" && task.artifactStorageId && task.artifactName && (
            <ArtifactDownload storageId={task.artifactStorageId} name={task.artifactName} />
          )}
        </div>
      </div>
      {isParent && expanded && (
        <div className="ml-7 border-l border-stone-200 pl-3 space-y-0.5">
          {subtasks.map((sub) => (
            <TaskRow key={sub._id} task={sub} subtasks={[]} />
          ))}
        </div>
      )}
    </div>
  );
}
