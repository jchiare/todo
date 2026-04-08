"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";

type TraceEvent = {
  node: string;
  status: "success" | "error";
  startedAt: number;
  durationMs: number;
  error?: string;
  tokensUsed?: number;
};

const NODE_LABELS: Record<string, string> = {
  resolveUrl: "Find PDF URL",
  downloadPdf: "Download PDF",
  retryUrl: "Retry URL search",
  extractFields: "Extract form fields",
  mapFields: "Map user data to fields",
  validateMapping: "Validate field names",
  fillAndStore: "Fill PDF & save",
};

function formatMs(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

function NodeRow({ event }: { event: TraceEvent }) {
  const label = NODE_LABELS[event.node] ?? event.node;
  const isError = event.status === "error";

  return (
    <div className="flex items-center gap-2 py-1.5 text-[12px]">
      {isError ? (
        <span className="w-4 h-4 flex items-center justify-center flex-shrink-0 text-red-400">
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <circle cx="6" cy="6" r="5" stroke="currentColor" strokeWidth="1.5"/>
            <path d="M4 4l4 4M8 4l-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
        </span>
      ) : (
        <span className="w-4 h-4 flex items-center justify-center flex-shrink-0 text-sage-400">
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <circle cx="6" cy="6" r="5" stroke="currentColor" strokeWidth="1.5"/>
            <path d="M4 6l1.5 1.5L8 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </span>
      )}
      <span className={`flex-1 ${isError ? "text-red-400" : "text-stone-600"}`}>
        {label}
      </span>
      <span className="text-stone-400 tabular-nums">{formatMs(event.durationMs)}</span>
      {event.tokensUsed != null && (
        <span className="text-stone-300 tabular-nums">{event.tokensUsed} tok</span>
      )}
    </div>
  );
}

function FieldIssues({
  label,
  fields,
  color,
}: {
  label: string;
  fields: string[];
  color: "red" | "amber" | "stone";
}) {
  if (fields.length === 0) return null;
  const textColor =
    color === "red"
      ? "text-red-400"
      : color === "amber"
        ? "text-amber-500"
        : "text-stone-400";

  return (
    <div className="mt-2">
      <div className={`text-[11px] font-medium ${textColor} mb-0.5`}>
        {label} ({fields.length})
      </div>
      <div className="flex flex-wrap gap-1">
        {fields.map((f, i) => (
          <span
            key={i}
            className={`text-[10px] px-1.5 py-0.5 rounded bg-warm/40 ${textColor}`}
          >
            {f}
          </span>
        ))}
      </div>
    </div>
  );
}

export function AgentTraceView({ taskId }: { taskId: Id<"tasks"> }) {
  const [expanded, setExpanded] = useState(false);
  const run = useQuery(api.agentQueries.getAgentRun, { taskId });

  if (!run) return null;

  const totalTokens = run.events.reduce(
    (sum: number, e: TraceEvent) => sum + (e.tokensUsed ?? 0),
    0
  );

  return (
    <div className="mt-1.5">
      <button
        onClick={(e) => {
          e.stopPropagation();
          setExpanded(!expanded);
        }}
        className="inline-flex items-center gap-1 text-[11px] text-stone-400
          hover:text-stone-600 transition-colors cursor-pointer"
      >
        <svg
          width="10"
          height="10"
          viewBox="0 0 10 10"
          fill="none"
          className={`transition-transform duration-150 ${expanded ? "rotate-90" : ""}`}
        >
          <path
            d="M3.5 2l4 3-4 3"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        trace
        {run.status === "failed" && (
          <span className="text-red-400 ml-1">failed</span>
        )}
        {run.durationMs != null && (
          <span className="text-stone-300 ml-1">{formatMs(run.durationMs)}</span>
        )}
      </button>

      {expanded && (
        <div
          className="mt-1 ml-1 p-3 rounded-lg bg-white border border-stone-100 shadow-sm"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Summary bar */}
          <div className="flex items-center gap-3 text-[11px] text-stone-400 mb-2 pb-2 border-b border-stone-100">
            <span>
              {run.status === "completed" ? "Completed" : "Failed"}
            </span>
            {run.durationMs != null && <span>{formatMs(run.durationMs)} total</span>}
            {totalTokens > 0 && <span>{totalTokens} tokens</span>}
            {run.events.length > 0 && <span>{run.events.length} steps</span>}
          </div>

          {/* Node timeline */}
          <div className="space-y-0">
            {run.events.map((event: TraceEvent, i: number) => (
              <NodeRow key={i} event={event} />
            ))}
          </div>

          {/* Error message */}
          {run.error && (
            <div className="mt-2 p-2 rounded bg-red-50 text-[11px] text-red-400 break-words">
              {run.error}
            </div>
          )}

          {/* Field issues */}
          <FieldIssues
            label="Invalid fields (not in PDF)"
            fields={run.invalidFields ?? []}
            color="red"
          />
          <FieldIssues
            label="Skipped fields (write failed)"
            fields={run.skippedFields ?? []}
            color="amber"
          />
          <FieldIssues
            label="Missing info"
            fields={run.missingFields ?? []}
            color="stone"
          />

          {/* LangSmith link */}
          {run.langsmithUrl && (
            <a
              href={run.langsmithUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 mt-2 text-[11px] text-sage-600
                hover:text-sage-400 transition-colors"
            >
              <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
                <path d="M2 10V2h3M7 2h3v3M6 6l4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              View in LangSmith
            </a>
          )}
        </div>
      )}
    </div>
  );
}
